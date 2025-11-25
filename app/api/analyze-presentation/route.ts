import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export async function POST(request: NextRequest) {
  try {
    const { textContent } = await request.json();

    if (!textContent) {
      return NextResponse.json(
        { error: 'nessun contenuto testuale fornito' },
        { status: 400 }
      );
    }

    // check if openai api key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('openai api key non configurata');
      return NextResponse.json(
        { error: 'openai api key non configurata. aggiungi OPENAI_API_KEY al file .env.local' },
        { status: 500 }
      );
    }

    const prompt = `Analizza questa presentazione PowerPoint e fornisci una risposta strutturata con questi elementi:

1. CATEGORIA: [specifica una sola categoria tra: ACCESSO E POLICY MAKING, AWARENESS, EMPOWERMENT, PATIENT EXPERIENCE, PATIENT SUPPORT PROGRAM]

2. INFORMAZIONI NECESSARIE ALLA GIURIA: [fornisci una descrizione molto dettagliata del progetto, includendo obiettivi e risultati.]

3. SINTESI INFORMAZIONI PER L'EBOOK: [riassumi le informazioni principali del progetto in massimo 8 frasi, raccontando obiettivi e risultati brevemente]

4. OBIETTIVI: [elenca tutti i principali obiettivi del progetto in modo conciso. Metti ogni obiettivo su una nuova riga, iniziando con - e andando a capo dopo ogni obiettivo]

5. RISULTATI: [elenca tutti i principali risultati raggiunti in modo conciso. Metti ogni risultato su una nuova riga, iniziando con - e andando a capo dopo ogni risultato]

Usa esattamente questi delimitatori nella tua risposta:
<CATEGORIA>categoria</CATEGORIA>
<INFO_GIURIA>informazioni complete</INFO_GIURIA>
<SINTESI_EBOOK>sintesi breve</SINTESI_EBOOK>
<OBIETTIVI>
- primo obiettivo
- secondo obiettivo
(e così via per tutti gli obiettivi trovati)
</OBIETTIVI>
<RISULTATI>
- primo risultato
- secondo risultato
(e così via per tutti i risultati trovati)
</RISULTATI>

IMPORTANTE: 
- Non usare MAI virgolette doppie (") nel testo
- Se devi citare qualcosa, usa solo virgolette singole (')
- Non usare MAI il carattere backslash (\\)
- Non usare MAI <br> per andare a capo
- Usa un vero ritorno a capo dopo ogni elemento con -
- Elenca TUTTI gli obiettivi e risultati trovati

Contenuto della presentazione:
${textContent}`;

    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      system: "Sei un assistente esperto nell'analisi di presentazioni in formato PowerPoint o PDF. Fornisci riassunti strutturati e completi.",
      prompt: prompt,
      maxTokens: 4096,
      temperature: 0.2,
    });

    // estrai le sezioni dalla risposta
    const categoriaMatch = text.match(/<CATEGORIA>([\s\S]*?)<\/CATEGORIA>/);
    const infoGiuriaMatch = text.match(/<INFO_GIURIA>([\s\S]*?)<\/INFO_GIURIA>/);
    const sintesiEbookMatch = text.match(/<SINTESI_EBOOK>([\s\S]*?)<\/SINTESI_EBOOK>/);
    const obiettiviMatch = text.match(/<OBIETTIVI>([\s\S]*?)<\/OBIETTIVI>/);
    const risultatiMatch = text.match(/<RISULTATI>([\s\S]*?)<\/RISULTATI>/);

    const extractedData = {
      categoria: categoriaMatch ? categoriaMatch[1].trim() : "Non specificata",
      info_giuria: infoGiuriaMatch ? infoGiuriaMatch[1].trim() : "Non disponibile",
      sintesi_ebook: sintesiEbookMatch ? sintesiEbookMatch[1].trim() : "Non disponibile",
      obiettivi: obiettiviMatch ? obiettiviMatch[1].trim() : "Non specificati",
      risultati: risultatiMatch ? risultatiMatch[1].trim() : "Non specificati"
    };

    return NextResponse.json(extractedData);

  } catch (error: unknown) {
    console.error('errore durante l\'analisi:', error);
    const errorMessage = error instanceof Error ? error.message : 'errore sconosciuto';
    return NextResponse.json(
      { 
        error: 'errore durante l\'analisi della presentazione',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}

