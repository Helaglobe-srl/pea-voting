// ai prompts for presentation analysis

export const ANALYZE_PRESENTATION_PROMPT = `Analizza questa presentazione PowerPoint e fornisci una risposta strutturata con questi elementi:

1. CATEGORIA: [specifica una sola categoria tra: ACCESSO E POLICY MAKING, AWARENESS, EMPOWERMENT, PATIENT EXPERIENCE, PATIENT SUPPORT PROGRAM]

2. INFORMAZIONI NECESSARIE ALLA GIURIA: [fornisci una descrizione molto dettagliata del progetto, includendo obiettivi e risultati.]

3. SINTESI INFORMAZIONI PER L'EBOOK: [riassumi le informazioni principali del progetto in massimo 8 frasi, raccontando obiettivi e risultati brevemente]

4. OBIETTIVI: [elenca al massimo 3 obiettivi principali del progetto in modo conciso. Metti ogni obiettivo su una nuova riga, iniziando con - e andando a capo dopo ogni obiettivo]

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
- Elenca MASSIMO 3 obiettivi (i più importanti)
- Elenca TUTTI i risultati trovati

Contenuto della presentazione:
{textContent}`;

export const ANALYZE_PRESENTATION_SYSTEM = "Sei un assistente esperto nell'analisi di presentazioni in formato PowerPoint o PDF. Fornisci riassunti strutturati e completi.";

