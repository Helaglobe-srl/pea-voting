import { NextRequest, NextResponse } from 'next/server';
import { cleanText } from '@/lib/validators';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formData, summaryData, fileIds } = body;

    // validazione dei dati obbligatori
    if (!formData || !summaryData || !fileIds) {
      return NextResponse.json(
        { error: 'dati mancanti' },
        { status: 400 }
      );
    }

    // pulizia dei dati del form da eventuali caratteri problematici
    const cleanedFormData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [key, cleanText(String(value))])
    );
    const cleanedSummaryData = Object.fromEntries(
      Object.entries(summaryData).map(([key, value]) => [key, cleanText(String(value))])
    );

    // prepara i dati per n8n webhook
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

    // ottieni l'url del webhook da variabili d'ambiente
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'configurazione webhook mancante' },
        { status: 500 }
      );
    }

    // invia i dati a n8n
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('errore webhook n8n:', errorText);
      return NextResponse.json(
        { error: `errore nell'invio dei dati: ${response.status}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('errore durante la sottomissione:', error);
    return NextResponse.json(
      { error: 'errore durante la sottomissione della registrazione' },
      { status: 500 }
    );
  }
}


