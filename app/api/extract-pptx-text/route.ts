import { NextRequest, NextResponse } from 'next/server';
import officeParser from 'officeparser';
import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';
import pdfParse from 'pdf-parse';

// Increase body size limit for file uploads (20MB)
export const runtime = 'nodejs';
export const maxDuration = 60;

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
    console.error('PPTX extraction error:', error);
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
    const isPPT = fileName.endsWith('.pptx') || fileName.endsWith('.ppt');
    const isPDF = fileName.endsWith('.pdf');
    
    if (!isPPT && !isPDF) {
      return NextResponse.json(
        { error: 'il file deve essere un powerpoint (.ppt, .pptx) o PDF (.pdf)' },
        { status: 400 }
      );
    }

    // convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let textContent = '';
    
    // Handle PDF files with pdf-parse
    if (isPDF) {
      try {
        console.log('Using pdf-parse for PDF file:', fileName);
        const pdfData = await pdfParse(buffer);
        textContent = pdfData.text;
        console.log('PDF extraction succeeded, length:', textContent.length);
      } catch (pdfError) {
        console.error('PDF extraction failed:', pdfError);
        throw new Error(`PDF parsing failed: ${pdfError instanceof Error ? pdfError.message : 'unknown error'}`);
      }
    }
    // Handle PowerPoint files
    else if (isPPT) {
      // try manual extraction first for .pptx files (better results)
      if (fileName.endsWith('.pptx')) {
        try {
          textContent = await extractTextFromPPTX(buffer);
          console.log('PPTX manual extraction succeeded, length:', textContent.length);
        } catch (pptxError) {
          console.error('PPTX manual extraction failed, falling back to officeparser:', pptxError);
          // fallback to officeparser on error
        }
      }
      
      // use officeparser for .ppt files, or if manual extraction failed
      if (!textContent || textContent.trim().length === 0) {
        try {
          console.log('Using officeparser for PPT file:', fileName);
          textContent = await officeParser.parseOfficeAsync(buffer);
          console.log('Officeparser extraction succeeded, length:', textContent.length);
        } catch (parserError) {
          console.error('Officeparser extraction failed:', parserError);
          throw new Error(`Officeparser failed: ${parserError instanceof Error ? parserError.message : 'unknown error'}`);
        }
      }
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
    console.error('Extract text error:', error);
    return NextResponse.json(
      { 
        error: `Errore estrazione testo: ${errorMessage}`,
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

