import { NextRequest, NextResponse } from 'next/server';
import officeParser from 'officeparser';
import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';

// extract text from pptx using manual xml parsing for better results
async function extractTextFromPPTX(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    let allText = '';
    
    // get all slide files
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.match(/ppt\/slides\/slide\d+\.xml/)
    );
    
    // sort slides numerically
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
      return numA - numB;
    });
    
    // extract text from each slide
    for (const slideFile of slideFiles) {
      const slideXml = await zip.files[slideFile].async('text');
      const result = await parseStringPromise(slideXml);
      
      // extract all text nodes recursively
      const extractTextRecursive = (obj: unknown): string => {
        let text = '';
        if (typeof obj === 'string') {
          return obj;
        }
        if (Array.isArray(obj)) {
          for (const item of obj) {
            text += extractTextRecursive(item) + ' ';
          }
        } else if (typeof obj === 'object' && obj !== null) {
          const objRecord = obj as Record<string, unknown>;
          // look for text in 'a:t' nodes (text nodes in powerpoint xml)
          if (objRecord['a:t']) {
            text += extractTextRecursive(objRecord['a:t']) + ' ';
          }
          // recursively search all properties
          for (const key in objRecord) {
            if (key !== 'a:t') {
              text += extractTextRecursive(objRecord[key]);
            }
          }
        }
        return text;
      };
      
      const slideText = extractTextRecursive(result);
      if (slideText.trim()) {
        allText += slideText.trim() + '\n\n';
      }
    }
    
    // also try to get notes
    const notesFiles = Object.keys(zip.files).filter(name => 
      name.match(/ppt\/notesSlides\/notesSlide\d+\.xml/)
    );
    
    for (const notesFile of notesFiles) {
      const notesXml = await zip.files[notesFile].async('text');
      const result = await parseStringPromise(notesXml);
      
      const extractTextRecursive = (obj: unknown): string => {
        let text = '';
        if (typeof obj === 'string') {
          return obj;
        }
        if (Array.isArray(obj)) {
          for (const item of obj) {
            text += extractTextRecursive(item) + ' ';
          }
        } else if (typeof obj === 'object' && obj !== null) {
          const objRecord = obj as Record<string, unknown>;
          if (objRecord['a:t']) {
            text += extractTextRecursive(objRecord['a:t']) + ' ';
          }
          for (const key in objRecord) {
            if (key !== 'a:t') {
              text += extractTextRecursive(objRecord[key]);
            }
          }
        }
        return text;
      };
      
      const notesText = extractTextRecursive(result);
      if (notesText.trim()) {
        allText += 'Note: ' + notesText.trim() + '\n\n';
      }
    }
    
    return allText.trim();
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'nessun file fornito' },
        { status: 400 }
      );
    }

    // check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pptx') && !fileName.endsWith('.ppt')) {
      return NextResponse.json(
        { error: 'il file deve essere un powerpoint (.ppt o .pptx)' },
        { status: 400 }
      );
    }

    // convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let textContent = '';
    
    // try manual extraction first for .pptx files (better results)
    if (fileName.endsWith('.pptx')) {
      try {
        textContent = await extractTextFromPPTX(buffer);
      } catch {
        // fallback to officeparser on error
      }
    }
    
    // fallback to officeparser if manual extraction failed or for .ppt files
    if (!textContent || textContent.trim().length === 0) {
      textContent = await officeParser.parseOfficeAsync(buffer);
    }

    if (!textContent || textContent.trim().length === 0) {
      return NextResponse.json(
        { error: 'impossibile estrarre testo dalla presentazione' },
        { status: 400 }
      );
    }

    return NextResponse.json({ textContent: textContent.trim() });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'errore sconosciuto';
    return NextResponse.json(
      { 
        error: 'errore durante l\'estrazione del testo dalla presentazione',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

