import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    const folderId = formData.get('folderId') as string;

    if (!file || !fileName || !folderId) {
      return NextResponse.json(
        { error: 'file, fileName, o folderId mancanti' },
        { status: 400 }
      );
    }

    // ottieni le credenziali dal service account
    const serviceAccountEmail = process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountPrivateKey = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    // alternatively, use the full service account json if provided
    const serviceAccountJson = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountEmail || !serviceAccountPrivateKey) {
      if (!serviceAccountJson) {
        return NextResponse.json(
          { error: 'credenziali google drive mancanti' },
          { status: 500 }
        );
      }
    }

    // crea il client oauth2 usando JWT (service account)
    let auth;
    
    if (serviceAccountJson) {
      const credentials = JSON.parse(serviceAccountJson);
      auth = new google.auth.JWT(
        credentials.client_email,
        undefined,
        credentials.private_key,
        ['https://www.googleapis.com/auth/drive.file']
      );
    } else {
      auth = new google.auth.JWT(
        serviceAccountEmail,
        undefined,
        serviceAccountPrivateKey,
        ['https://www.googleapis.com/auth/drive.file']
      );
    }

    const drive = google.drive({ version: 'v3', auth });

    // converti il file in buffer e poi in stream
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // crea uno stream dal buffer
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null); // segnala la fine dello stream

    // carica il file su google drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: bufferStream,
      },
      fields: 'id',
    });

    const fileId = response.data.id;

    if (!fileId) {
      return NextResponse.json(
        { error: 'file id non restituito da google drive' },
        { status: 500 }
      );
    }

    return NextResponse.json({ fileId });

  } catch (error: unknown) {
    console.error('errore durante il caricamento su google drive:', error);
    const errorMessage = error instanceof Error ? error.message : 'errore sconosciuto';
    return NextResponse.json(
      { 
        error: 'errore durante il caricamento del file',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

