import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: NextRequest) {
  try {
    const { feedbackData } = await request.json();

    if (!feedbackData) {
      return NextResponse.json(
        { error: 'dati feedback mancanti' },
        { status: 400 }
      );
    }

    // ottieni le credenziali dal service account
    const serviceAccountEmail = process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountPrivateKey = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const serviceAccountJson = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;
    const feedbackFolderId = process.env.NEXT_PUBLIC_DRIVE_FEEDBACK_FOLDER_ID;

    if (!feedbackFolderId) {
      return NextResponse.json(
        { error: 'folder id feedback mancante - aggiungi NEXT_PUBLIC_DRIVE_FEEDBACK_FOLDER_ID al file .env.local' },
        { status: 500 }
      );
    }

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

    // crea il nome del file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const azienda = feedbackData.dati_candidato?.azienda || 'azienda_anonima';
    const aziendaClean = azienda.toLowerCase().replace(/[^\w]/g, '_');
    const fileName = `feedback_${aziendaClean}_${timestamp}.json`;

    // converti il feedback in JSON formattato
    const feedbackJson = JSON.stringify(feedbackData, null, 2);
    const buffer = Buffer.from(feedbackJson, 'utf-8');

    // converti il buffer in uno stream readable (stesso metodo usato per file upload)
    const { Readable } = await import('stream');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // carica il file su google drive
    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [feedbackFolderId],
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: stream,
      },
      fields: 'id',
    });

    const fileId = response.data.id;

    return NextResponse.json({ 
      success: true,
      fileId 
    });

  } catch (error: unknown) {
    console.error('errore durante il salvataggio del feedback:', error);
    const errorMessage = error instanceof Error ? error.message : 'errore sconosciuto';
    return NextResponse.json(
      { 
        error: 'errore durante il salvataggio del feedback',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}


