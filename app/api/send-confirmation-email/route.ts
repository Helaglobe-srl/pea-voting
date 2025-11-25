import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const { recipientEmail, formData, fileIds } = await request.json();

    if (!recipientEmail || !formData) {
      return NextResponse.json(
        { error: 'dati mancanti' },
        { status: 400 }
      );
    }

    // configurazione smtp
    const senderEmail = process.env.EMAIL_SENDER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const organizerEmail = process.env.EMAIL_ORGANIZER;

    if (!senderEmail || !emailPassword || !organizerEmail) {
      return NextResponse.json(
        { error: 'configurazione email mancante' },
        { status: 500 }
      );
    }

    // crea il transporter smtp
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: senderEmail,
        pass: emailPassword,
      },
    });

    // prepara i link ai file caricati in google drive
    const marchioLink = (fileIds && fileIds.marchio) ? `https://drive.google.com/file/d/${fileIds.marchio}/view` : "#";
    const imageLink = (fileIds && fileIds.image) ? `https://drive.google.com/file/d/${fileIds.image}/view` : "#";
    const presentationLink = (fileIds && fileIds.presentation) ? `https://drive.google.com/file/d/${fileIds.presentation}/view` : "#";

    // corpo email html
    const htmlBody = `
      <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Gentile ${formData.nome_referente} ${formData.cognome_referente},</p>
          
          <p>la candidatura del progetto <strong>${formData.titolo_progetto}</strong> è stata registrata correttamente.</p>
          
          <p>Riepiloghiamo di seguito i dati da te inseriti:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <ul style="list-style-type: none; padding-left: 0;">
                  <li><strong>Ragione Sociale:</strong> ${formData.ragione_sociale}</li>
                  <li><strong>Tipologia:</strong> ${formData.tipologia}</li>
                  <li><strong>Titolo Progetto:</strong> ${formData.titolo_progetto}</li>
                  <li><strong>Area Terapeutica:</strong> ${formData.area_terapeutica}</li>
                  <li><strong>Nome Referente:</strong> ${formData.nome_referente}</li>
                  <li><strong>Cognome Referente:</strong> ${formData.cognome_referente}</li>
                  <li><strong>Ruolo:</strong> ${formData.ruolo}</li>
                  <li><strong>Email:</strong> ${formData.mail}</li>
                  <li><strong>Telefono:</strong> ${formData.telefono}</li>
                  <li style="margin-top: 15px;"><strong>File ricevuti:</strong></li>
                  <li style="margin-left: 20px; margin-top: 5px;">
                      <span style="color: #4CAF50; font-size: 18px;">✓</span> Logo aziendale [<a href="${marchioLink}" style="color: #0066cc;">Link</a>]
                  </li>
                  <li style="margin-left: 20px;">
                      <span style="color: #4CAF50; font-size: 18px;">✓</span> Immagine rappresentativa del progetto [<a href="${imageLink}" style="color: #0066cc;">Link</a>]
                  </li>
                  <li style="margin-left: 20px;">
                      <span style="color: #4CAF50; font-size: 18px;">✓</span> Presentazione del progetto [<a href="${presentationLink}" style="color: #0066cc;">Link</a>]
                  </li>
              </ul>
          </div>
          
          <p>Per eventuali necessità non esitare a contattarci scrivendo a <a href="mailto:peaward@helaglobe.com">peaward@helaglobe.com</a> o chiamando il numero 055.4939527.</p>
          
          <p>Per aggiornamenti sul Patient Engagament Award segui la nostra pagina <a href="https://www.linkedin.com/company/helaglobe/">LinkedIn</a> e iscriviti alla newsletter di Helaglobe, visitando il nostro sito <a href="https://helaglobe.com/">https://helaglobe.com/</a></p>
          
          <p>Grazie</p>
          
          <p>Il team Helaglobe</p>
          
          <hr>
          <p style="font-size: 12px; color: #666;">
              Questa è una email automatica. Per favore non rispondere a questo indirizzo.<br>
              Data invio: ${new Date().toLocaleString('it-IT')}
          </p>
      </body>
      </html>
    `;

    // invia l'email al partecipante con copia all'organizzatore
    await transporter.sendMail({
      from: `"Patient Engagement Award – Helaglobe" <${senderEmail}>`,
      to: recipientEmail,
      bcc: organizerEmail,
      subject: 'Conferma registrazione al Patient Engagament Award 2026',
      html: htmlBody,
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('errore durante l\'invio dell\'email:', error);
    
    // gestisci errori specifici smtp
    if (error && typeof error === 'object' && 'code' in error) {
      const smtpError = error as { code: string; responseCode?: number };
      if (smtpError.responseCode === 550) {
        return NextResponse.json(
          { error: "l'indirizzo email non è stato trovato o non può ricevere email" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'errore durante l\'invio dell\'email' },
      { status: 500 }
    );
  }
}


