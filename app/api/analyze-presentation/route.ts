import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ANALYZE_PRESENTATION_PROMPT, ANALYZE_PRESENTATION_SYSTEM } from '@/lib/prompts';

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
      return NextResponse.json(
        { error: 'openai api key non configurata. aggiungi OPENAI_API_KEY al file .env.local' },
        { status: 500 }
      );
    }

    // replace placeholder with actual content
    const prompt = ANALYZE_PRESENTATION_PROMPT.replace('{textContent}', textContent);

    const { text } = await generateText({
      model: openai('gpt-4.1-mini'),
      system: ANALYZE_PRESENTATION_SYSTEM,
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

