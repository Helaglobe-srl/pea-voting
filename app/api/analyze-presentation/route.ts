import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { ANALYZE_PRESENTATION_PROMPT, ANALYZE_PRESENTATION_SYSTEM } from '@/lib/prompts';

// function to estimate token count (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// function to intelligently truncate text while preserving important content
function truncateContent(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  
  if (estimatedTokens <= maxTokens) {
    return text;
  }
  
  // calculate how many characters we can keep (leaving room for prompt overhead)
  const maxChars = maxTokens * 4;
  
  // try to split by slides or sections to keep coherent content
  const lines = text.split('\n');
  let truncated = '';
  let currentLength = 0;
  
  // prioritize beginning and end of presentation
  const beginningLines = lines.slice(0, Math.floor(lines.length * 0.6));
  const endLines = lines.slice(Math.floor(lines.length * 0.8));
  
  // add beginning content
  for (const line of beginningLines) {
    if (currentLength + line.length > maxChars * 0.7) break;
    truncated += line + '\n';
    currentLength += line.length;
  }
  
  truncated += '\n[... contenuto intermedio omesso ...]\n\n';
  
  // add ending content
  for (const line of endLines) {
    if (currentLength + line.length > maxChars) break;
    truncated += line + '\n';
    currentLength += line.length;
  }
  
  return truncated;
}

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

    // estimate tokens and truncate if necessary
    // gpt-4o has 128k context, but rate limits apply
    // limit to 25000 tokens to stay under 30000 TPM limit (leaving room for prompt ~500 tokens and response ~4000 tokens)
    const maxInputTokens = 25000;
    const estimatedTokens = estimateTokens(textContent);
    const wasTruncated = estimatedTokens > maxInputTokens;
    const processedContent = truncateContent(textContent, maxInputTokens);
    
    console.log(`presentation analysis: original tokens: ${estimatedTokens}, truncated: ${wasTruncated}`);
    
    // replace placeholder with actual content
    const prompt = ANALYZE_PRESENTATION_PROMPT.replace('{textContent}', processedContent);

    // use gpt-5.1 for better analysis with large context window
    // note: newer models may use different parameters
    const { text } = await generateText({
      model: openai('gpt-5-mini'),
      system: ANALYZE_PRESENTATION_SYSTEM,
      prompt: prompt,
      temperature: 1,
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
      risultati: risultatiMatch ? risultatiMatch[1].trim() : "Non specificati",
      wasTruncated: wasTruncated
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

