import { NextRequest, NextResponse } from 'next/server';
import officeParser from 'officeparser';
import JSZip from 'jszip';
import { parseStringPromise } from 'xml2js';
import { google } from 'googleapis';
import pdfParse from 'pdf-parse';

// Extract Google Drive file ID from various URL formats
function extractFileId(url: string): string | null {
  const patterns = [
    /\/d\/([a-zA-Z0-9_-]+)/,
    /id=([a-zA-Z0-9_-]+)/,
    /file\/d\/([a-zA-Z0-9_-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Extract text from PPTX buffer
async function extractTextFromPPTX(buffer: Buffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    let allText = '';
    
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.match(/ppt\/slides\/slide\d+\.xml/)
    );
    
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0');
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0');
      return numA - numB;
    });
    
    for (const slideFile of slideFiles) {
      const slideXml = await zip.files[slideFile].async('text');
      const result = await parseStringPromise(slideXml);
      
      const extractTextRecursive = (obj: unknown): string => {
        let text = '';
        if (typeof obj === 'string') return obj;
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
      
      const slideText = extractTextRecursive(result);
      if (slideText.trim()) {
        allText += slideText.trim() + '\n\n';
      }
    }
    
    return allText.trim();
  } catch (error) {
    console.error('Error extracting PPTX text:', error);
    throw error;
  }
}

// Extract text from PDF buffer using pdf-parse
async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw error;
  }
}

// Maximum file size to process (20MB to stay within memory limits)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

export const maxDuration = 60; // 60 seconds for Pro plan

// Create authenticated Google Drive client
async function createDriveClient() {
  const serviceAccountEmail = process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    throw new Error('Google Drive credentials missing');
  }

  const auth = new google.auth.JWT(
    serviceAccountEmail,
    undefined,
    serviceAccountPrivateKey,
    ['https://www.googleapis.com/auth/drive.readonly']
  );

  return google.drive({ version: 'v3', auth });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const { driveUrl, projectId, useCache = true } = await request.json();

    if (!driveUrl) {
      return NextResponse.json({ error: 'Missing driveUrl' }, { status: 400 });
    }

    // Only cache for finalist_projects, not for registrations
    // Registrations are processed on-demand without caching
    if (projectId && useCache) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        
        const { data: cached } = await supabase
          .from('finalist_projects')
          .select('extracted_text')
          .eq('id', projectId)
          .single();
        
        if (cached?.extracted_text && cached.extracted_text.length > 100) {
          console.log(`[Extract] Using cached text for finalist_projects ${projectId}`);
          return NextResponse.json({ 
            text: cached.extracted_text,
            length: cached.extracted_text.length,
            cached: true
          });
        }
      } catch {
        // Ignore cache errors (column might not exist yet)
        console.log('[Extract] Cache not available, proceeding with extraction');
      }
    }

    // Extract file ID from Google Drive URL
    const fileId = extractFileId(driveUrl);
    if (!fileId) {
      return NextResponse.json({ 
        error: 'Invalid Google Drive URL format' 
      }, { status: 400 });
    }

    console.log(`[Extract] Downloading file from Google Drive: ${fileId}`);

    // Use Google Drive API with service account authentication
    const drive = await createDriveClient();
    
    // Get file metadata first to check size
    const fileMetadata = await drive.files.get({
      fileId: fileId,
      fields: 'size, mimeType, name'
    });

    const fileSize = parseInt(fileMetadata.data.size || '0');
    if (fileSize > MAX_FILE_SIZE) {
      console.error(`[Extract] File too large: ${fileSize} bytes`);
      return NextResponse.json({ 
        error: `File too large (${(fileSize / 1024 / 1024).toFixed(2)}MB). Maximum supported: 20MB.` 
      }, { status: 413 });
    }

    console.log(`[Extract] Downloading ${fileMetadata.data.name} (${fileSize} bytes, ${fileMetadata.data.mimeType})`);

    // Download file content using service account
    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    if (!response.data) {
      console.error(`[Extract] Failed to download file`);
      return NextResponse.json({ 
        error: 'Failed to download file from Google Drive' 
      }, { status: 400 });
    }

    // Get file buffer (in memory - no storage)
    const buffer = Buffer.from(response.data as ArrayBuffer);
    
    console.log(`[Extract] Downloaded ${buffer.length} bytes, extracting text...`);
    console.log(`[Extract] First 4 bytes (hex):`, buffer.slice(0, 4).toString('hex'));
    console.log(`[Extract] First 20 chars:`, buffer.slice(0, 20).toString('utf8'));

    // Detect file type from buffer
    let extractedText = '';
    
    // Check if it's a PPTX (ZIP format with specific structure)
    if (buffer[0] === 0x50 && buffer[1] === 0x4B) { // PK header (ZIP)
      try {
        extractedText = await extractTextFromPPTX(buffer);
        console.log(`[Extract] PPTX text extracted: ${extractedText.length} chars`);
      } catch {
        console.error('[Extract] PPTX extraction failed, trying generic parser');
        extractedText = await officeParser.parseOfficeAsync(buffer);
      }
    } 
    // Check if it's a PDF
    else if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) { // %PDF
      extractedText = await extractTextFromPDF(buffer);
      console.log(`[Extract] PDF text extracted: ${extractedText.length} chars`);
    }
    // Try generic office parser as fallback
    else {
      console.error(`[Extract] Unknown file format. Magic bytes: ${buffer.slice(0, 4).toString('hex')}`);
      try {
        extractedText = await officeParser.parseOfficeAsync(buffer);
        console.log(`[Extract] Generic parser extracted: ${extractedText.length} chars`);
      } catch {
        return NextResponse.json({ 
          error: `Unsupported file format. Please use PPT, PPTX, or PDF. Detected bytes: ${buffer.slice(0, 4).toString('hex')}` 
        }, { status: 400 });
      }
    }

    if (!extractedText || extractedText.trim().length < 50) {
      return NextResponse.json({ 
        error: 'Extracted text is too short or empty. File might be corrupted or unsupported.' 
      }, { status: 400 });
    }

    const finalText = extractedText.trim();
    const duration = Date.now() - startTime;

    // Cache the extracted text only for finalist_projects
    // Registrations are processed on-demand without caching
    if (projectId) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        
        await supabase
          .from('finalist_projects')
          .update({ 
            extracted_text: finalText,
            text_extracted_at: new Date().toISOString()
          })
          .eq('id', projectId);
        
        console.log(`[Extract] Cached text for finalist_projects ${projectId}`);
      } catch {
        // Ignore cache errors (column might not exist yet)
        console.log('[Extract] Cache save failed, continuing anyway');
      }
    }

    console.log(`[Extract] Completed in ${duration}ms`);

    return NextResponse.json({ 
      text: finalText,
      length: finalText.length,
      cached: false,
      duration 
    });

  } catch (err) {
    console.error('[Extract] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
