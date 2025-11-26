import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { cleanText } from '@/lib/validators';

/**
 * transactional registration submission endpoint
 * 
 * this endpoint ensures that all operations (file uploads to google drive and 
 * data writes to google sheets via n8n webhook) are committed only when everything 
 * is successful. if any operation fails, all uploaded files are automatically 
 * deleted from google drive (rollback).
 * 
 * workflow:
 * 1. upload all files to google drive
 * 2. send data to n8n webhook (which writes to google sheets)
 * 3. if any step fails, delete all uploaded files and return error
 * 4. if all steps succeed, return success with file ids
 */

// helper function to create google drive client
async function createDriveClient() {
  const serviceAccountEmail = process.env.GDRIVE_SERVICE_ACCOUNT_EMAIL;
  const serviceAccountPrivateKey = process.env.GDRIVE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const serviceAccountJson = process.env.GDRIVE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountEmail || !serviceAccountPrivateKey) {
    if (!serviceAccountJson) {
      throw new Error('credenziali google drive mancanti');
    }
  }

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

  return google.drive({ version: 'v3', auth });
}

// helper function to upload a file to google drive
async function uploadFileToDrive(
  drive: any,
  file: { buffer: Buffer; mimeType: string },
  fileName: string,
  folderId: string
): Promise<string> {
  const bufferStream = new Readable();
  bufferStream.push(file.buffer);
  bufferStream.push(null);

  const response = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: file.mimeType,
      body: bufferStream,
    },
    fields: 'id',
  });

  const fileId = response.data.id;
  if (!fileId) {
    throw new Error('file id non restituito da google drive');
  }

  return fileId;
}

// helper function to delete a file from google drive
async function deleteFileFromDrive(drive: any, fileId: string): Promise<void> {
  try {
    await drive.files.delete({ fileId });
  } catch (error) {
    console.error(`errore durante l'eliminazione del file ${fileId}:`, error);
    // non lanciare l'errore per non bloccare il rollback degli altri file
  }
}

export async function POST(request: NextRequest) {
  const uploadedFileIds: string[] = [];
  let drive: any = null;

  try {
    const body = await request.json();
    const { formData, summaryData, files } = body;

    // validazione dei dati obbligatori
    if (!formData || !summaryData) {
      return NextResponse.json(
        { error: 'dati mancanti' },
        { status: 400 }
      );
    }

    // ottieni il folder id da variabili d'ambiente
    const folderId = process.env.NEXT_PUBLIC_DRIVE_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json(
        { error: 'configurazione google drive mancante' },
        { status: 500 }
      );
    }

    // crea il client google drive
    drive = await createDriveClient();

    // step 1: carica tutti i file su google drive
    const fileIds: { [key: string]: string } = {};

    if (files && Object.keys(files).length > 0) {
      for (const [key, fileData] of Object.entries(files)) {
        const file = fileData as { buffer: string; mimeType: string; fileName: string };
        
        // converti il buffer da base64 a buffer
        const buffer = Buffer.from(file.buffer, 'base64');
        
        try {
          const fileId = await uploadFileToDrive(
            drive,
            { buffer, mimeType: file.mimeType },
            file.fileName,
            folderId
          );
          
          fileIds[key] = fileId;
          uploadedFileIds.push(fileId);
        } catch (error) {
          // se un upload fallisce, fai rollback di tutti i file caricati finora
          console.error(`errore durante il caricamento del file ${key}:`, error);
          await rollbackFiles(drive, uploadedFileIds);
          throw new Error(`errore durante il caricamento del file ${key}`);
        }
      }
    }

    // step 2: prepara i dati per n8n webhook
    const cleanedFormData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, cleanText(String(value))])
    );
    const cleanedSummaryData = Object.fromEntries(
      Object.entries(summaryData).map(([key, value]) => [key, cleanText(String(value))])
    );

    const payload = {
      CATEGORIA: cleanedSummaryData.categoria.toUpperCase(),
      RAGIONE_SOCIALE: cleanedFormData.ragione_sociale,
      TIPOLOGIA: cleanedFormData.tipologia,
      TITOLO_PROGETTO: cleanedFormData.titolo_progetto,
      NOME_REFERENTE: cleanedFormData.nome_referente,
      COGNOME_REFERENTE: cleanedFormData.cognome_referente,
      RUOLO: cleanedFormData.ruolo,
      MAIL: cleanedFormData.mail,
      TELEFONO: cleanedFormData.telefono,
      AREA_TERAPEUTICA: cleanedFormData.area_terapeutica,
      INFO_GIURIA: cleanedSummaryData.info_giuria,
      SINTESI_EBOOK: cleanedSummaryData.sintesi_ebook,
      OBIETTIVI: cleanedSummaryData.obiettivi,
      RISULTATI: cleanedSummaryData.risultati,
      LINK_PRESENTAZIONE: fileIds.presentation ? `https://drive.google.com/file/d/${fileIds.presentation}/view` : '',
      LINK_MARCHIO: fileIds.marchio ? `https://drive.google.com/file/d/${fileIds.marchio}/view` : '',
      LINK_IMMAGINE: fileIds.image ? `https://drive.google.com/file/d/${fileIds.image}/view` : '',
      DATA_SOTTOMISSIONE: new Date().toISOString().replace('T', ' ').substring(0, 19),
      CONSENSO_PRIVACY: formData.privacy_consent === true ? 1 : 0,
      CONSENSO_GIURIA: formData.jury_consent === true ? 1 : 0,
      CONSENSO_MARKETING: formData.marketing_consent === true ? 1 : 0,
      CONSENSO_AI: formData.ai_consent === true ? 1 : 0
    };

    // step 3: invia i dati a n8n webhook (che scrive su google sheets)
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      // rollback: elimina i file caricati
      await rollbackFiles(drive, uploadedFileIds);
      return NextResponse.json(
        { error: 'configurazione webhook mancante' },
        { status: 500 }
      );
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('errore webhook n8n:', errorText);
      
      // rollback: elimina i file caricati
      await rollbackFiles(drive, uploadedFileIds);
      
      return NextResponse.json(
        { error: `errore nell'invio dei dati al webhook: ${webhookResponse.status}` },
        { status: 500 }
      );
    }

    // tutto è andato a buon fine, restituisci i file ids per l'email di conferma
    return NextResponse.json({ 
      success: true,
      fileIds 
    });

  } catch (error: unknown) {
    console.error('errore durante la sottomissione:', error);
    
    // rollback: elimina tutti i file caricati
    if (drive && uploadedFileIds.length > 0) {
      await rollbackFiles(drive, uploadedFileIds);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'errore sconosciuto';
    return NextResponse.json(
      { 
        error: 'errore durante la sottomissione della registrazione',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

// helper function to rollback all uploaded files
async function rollbackFiles(drive: any, fileIds: string[]): Promise<void> {
  console.log(`rollback: eliminazione di ${fileIds.length} file da google drive...`);
  
  const deletePromises = fileIds.map(fileId => deleteFileFromDrive(drive, fileId));
  await Promise.all(deletePromises);
  
  console.log('rollback completato');
}

