"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { AREE_TERAPEUTICHE, TIPOLOGIE, CATEGORIE } from "@/lib/constants";
import { validateEmail, validatePhoneNumber, validateText, getInvalidChars } from "@/lib/validators";
import Image from "next/image";

interface ExtractedContent {
  categoria: string;
  info_giuria: string;
  sintesi_ebook: string;
  obiettivi: string;
  risultati: string;
}

export default function IscrizioniPage() {
  const router = useRouter();
  
  // form state
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [tipologia, setTipologia] = useState("Azienda Farmaceutica");
  const [tipologiaCustom, setTipologiaCustom] = useState("");
  const [titoloProgetto, setTitoloProgetto] = useState("");
  const [areeTerapeutiche, setAreeTerapeutiche] = useState<string[]>([]);
  const [areaTerapeuticaCustom, setAreaTerapeuticaCustom] = useState("");
  const [nomeReferente, setNomeReferente] = useState("");
  const [cognomeReferente, setCognomeReferente] = useState("");
  const [ruolo, setRuolo] = useState("");
  const [mail, setMail] = useState("");
  const [mailConfirm, setMailConfirm] = useState("");
  const [telefono, setTelefono] = useState("");

  // file state
  const [marchioFile, setMarchioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [presentationFile, setPresentationFile] = useState<File | null>(null);

  // extracted content state
  const [extractedContent, setExtractedContent] = useState<ExtractedContent | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [categoria, setCategoria] = useState("");
  const [sintesiEbook, setSintesiEbook] = useState("");
  const [obiettivi, setObiettivi] = useState("");
  const [risultati, setRisultati] = useState("");

  // consent state
  const [aiConsent, setAiConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [juryConsent, setJuryConsent] = useState(false);
  const [regulationConsent, setRegulationConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);

  // upload state - removed: now using transactional api

  // ui state
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleAreaTerapeuticaChange = (area: string, checked: boolean) => {
    if (checked) {
      setAreeTerapeutiche([...areeTerapeutiche, area]);
    } else {
      setAreeTerapeutiche(areeTerapeutiche.filter((a) => a !== area));
    }
  };

  const handleAnalyzePresentation = async () => {
    if (!presentationFile) {
      setError("per favore carica la presentazione prima di procedere");
      // scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // validazione dimensione file (10mb = 10 * 1024 * 1024 bytes)
    const maxFileSize = 10 * 1024 * 1024;
    const filesToCheck = [
      { file: marchioFile, name: "logo aziendale" },
      { file: imageFile, name: "immagine rappresentativa" },
      { file: presentationFile, name: "presentazione" }
    ];

    for (const { file, name } of filesToCheck) {
      if (file && file.size > maxFileSize) {
        setError(`Il file caricato supera il limite di 10 mb. Si consiglia di utilizzare il template fornito appositamente per l'evento o comprimere il file.`);
        // scroll to top to show error message
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    setLoading(true);
    setError("");

    // scroll down smoothly after a short delay to show the loading state
    setTimeout(() => {
      window.scrollBy({
        top: 400,
        behavior: 'smooth'
      });
    }, 100);

    try {
      // estrai il testo dalla presentazione usando pdf-parse per pdf
      const textContent = await extractTextFromFile(presentationFile);

      // invia il testo all'api per l'analisi
      const response = await fetch("/api/analyze-presentation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ textContent }),
      });

      if (!response.ok) {
        // try to parse error response
        let errorMessage = "errore durante l'analisi della presentazione";
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
            if (errorData.details) {
              errorMessage += `: ${errorData.details}`;
            }
          }
        } catch {
          // if json parsing fails, use default message
          errorMessage = `errore durante l'analisi della presentazione (status: ${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setExtractedContent(data);
      setCategoria(data.categoria);
      setSintesiEbook(data.sintesi_ebook);
      setObiettivi(data.obiettivi);
      setRisultati(data.risultati);
      setAnalysisComplete(true);
      
      // show success message with warning if content was truncated
      if (data.wasTruncated) {
        setSuccess("✅ presentazione analizzata con successo! ⚠️ nota: la presentazione era molto lunga, è stata analizzata una parte del contenuto.");
      } else {
        setSuccess("✅ presentazione analizzata con successo!");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "errore sconosciuto";
      const templateSuggestion = " è fortemente consigliato utilizzare il template fornito appositamente per l'evento affinché la procedura vada a buon fine.";
      setError(`errore durante l'analisi: ${errorMessage}${templateSuggestion}`);
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    // for pdf files, use pdf-parse
    if (file.name.toLowerCase().endsWith('.pdf')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // use pdfjs-dist to extract text
      const pdfjsLib = await import('pdfjs-dist');
      // use the worker from the local package instead of cdn to avoid fetch errors
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();
      
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      
      let textContent = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
        textContent += pageText + '\n';
      }
      
      return textContent;
    } else if (file.name.toLowerCase().endsWith('.pptx') || file.name.toLowerCase().endsWith('.ppt')) {
      // for powerpoint files, send to server for text extraction
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/extract-pptx-text', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'errore durante l\'estrazione del testo dalla presentazione');
      }
      
      const data = await response.json();
      return data.textContent;
    }
    
    return "";
  };


  const handleSubmit = async () => {
    // reset errori
    setFieldErrors({});
    setError("");
    
    const errors: Record<string, string> = {};

    // validazione campi obbligatori
    if (!ragioneSociale.trim()) errors.ragione_sociale = "campo obbligatorio";
    if (!titoloProgetto.trim()) errors.titolo_progetto = "campo obbligatorio";
    if (!nomeReferente.trim()) errors.nome_referente = "campo obbligatorio";
    if (!cognomeReferente.trim()) errors.cognome_referente = "campo obbligatorio";
    if (!ruolo.trim()) errors.ruolo = "campo obbligatorio";
    if (!mail.trim()) errors.mail = "campo obbligatorio";
    if (!mailConfirm.trim()) errors.mail_confirm = "campo obbligatorio";
    if (!telefono.trim()) errors.telefono = "campo obbligatorio";
    if (areeTerapeutiche.length === 0) errors.area_terapeutica = "seleziona almeno un'area terapeutica";

    // validazione email
    if (mail && !validateEmail(mail)) {
      errors.mail = "indirizzo email non valido";
    }

    // validazione conferma email
    if (mail && mailConfirm && mail !== mailConfirm) {
      errors.mail_confirm = "gli indirizzi email non corrispondono";
    }

    // validazione telefono
    if (telefono && !validatePhoneNumber(telefono)) {
      errors.telefono = "numero di telefono non valido (es: 3401234567)";
    }

    // validazione consensi
    if (!privacyConsent) errors.privacy_consent = "consenso obbligatorio";
    if (!juryConsent) errors.jury_consent = "consenso obbligatorio";
    if (!regulationConsent) errors.regulation_consent = "consenso obbligatorio";
    if (!aiConsent) errors.ai_consent = "consenso obbligatorio";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError("per favore correggi i campi evidenziati prima di procedere");
      // scroll to first error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      // prepara i dati del form
      const finalTipologia = tipologia === "Altro" && tipologiaCustom ? tipologiaCustom : tipologia;
      const finalAreeTerapeutiche = areeTerapeutiche
        .map((area) => (area === "Altro" && areaTerapeuticaCustom ? areaTerapeuticaCustom : area))
        .filter((area) => area !== "Altro")
        .join(", ");

      const formData = {
        ragione_sociale: ragioneSociale,
        tipologia: finalTipologia,
        titolo_progetto: titoloProgetto,
        nome_referente: nomeReferente,
        cognome_referente: cognomeReferente,
        ruolo: ruolo,
        mail: mail,
        telefono: telefono,
        area_terapeutica: finalAreeTerapeutiche,
        privacy_consent: privacyConsent,
        jury_consent: juryConsent,
        regulation_consent: regulationConsent,
        marketing_consent: marketingConsent,
        ai_consent: aiConsent,
      };

      const summaryData = {
        categoria: categoria,
        info_giuria: extractedContent?.info_giuria || "",
        sintesi_ebook: sintesiEbook,
        obiettivi: obiettivi,
        risultati: risultati,
      };

      // prepara i file per l'upload transazionale usando formdata
      const cleanName = (s: string) => s.toLowerCase().replace(/\s/g, "_");
      const baseFilename = `${cleanName(ragioneSociale)}_${cleanName(titoloProgetto)}`;
      
      // crea formdata per inviare file e dati
      const uploadFormData = new FormData();
      
      // aggiungi i dati json
      uploadFormData.append('formData', JSON.stringify(formData));
      uploadFormData.append('summaryData', JSON.stringify(summaryData));
      
      // aggiungi i file
      let fileCount = 0;
      if (marchioFile) {
        const ext = marchioFile.name.split('.').pop();
        const fileName = `${baseFilename}_marchio.${ext}`;
        uploadFormData.append('marchio', marchioFile);
        uploadFormData.append('marchio_fileName', fileName);
        fileCount++;
      }

      if (imageFile) {
        const ext = imageFile.name.split('.').pop();
        const fileName = `${baseFilename}_immagine.${ext}`;
        uploadFormData.append('image', imageFile);
        uploadFormData.append('image_fileName', fileName);
        fileCount++;
      }

      if (presentationFile) {
        const ext = presentationFile.name.split('.').pop();
        const fileName = `${baseFilename}_presentazione.${ext}`;
        uploadFormData.append('presentation', presentationFile);
        uploadFormData.append('presentation_fileName', fileName);
        fileCount++;
      }

      // invia tutto in modo transazionale (upload + scrittura su google sheets)
      // se qualcosa fallisce, viene fatto automaticamente il rollback
      console.log('invio registrazione con', fileCount, 'file');
      const registrationResponse = await fetch("/api/submit-registration-transactional", {
        method: "POST",
        body: uploadFormData, // no content-type header - browser sets it automatically with boundary
      });
      console.log('risposta ricevuta:', registrationResponse.status);

      if (!registrationResponse.ok) {
        let errorMessage = `errore durante la sottomissione: ${registrationResponse.status}`;
        
        // gestione speciale per errori 413 (file troppo grande)
        if (registrationResponse.status === 413) {
          errorMessage = "Il file caricato supera il limite di 10 mb. Si consiglia di alleggerire il file rimpicciolendo le immagini o comprimendo il pdf. È fortemente consigliato utilizzare il template fornito appositamente per l'evento affinché la procedura vada a buon fine.";
        } else {
          try {
            const errorData = await registrationResponse.json();
            errorMessage = errorData.details || errorData.error || errorMessage;
          } catch {
            // se non è json, prova a leggere come testo
            try {
              const errorText = await registrationResponse.text();
              if (errorText) {
                errorMessage = errorText.substring(0, 200); // limita la lunghezza
              }
            } catch {
              // usa il messaggio di default
            }
          }
        }
        throw new Error(errorMessage);
      }

      const registrationData = await registrationResponse.json();
      const uploadedFileIds = registrationData.fileIds || {};

      // invia email di conferma (questo è opzionale e non causa rollback se fallisce)
      try {
        const emailResponse = await fetch("/api/send-confirmation-email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientEmail: mail,
            formData,
            fileIds: uploadedFileIds,
          }),
        });

        if (!emailResponse.ok) {
          console.warn("email di conferma non inviata");
        }
      } catch (emailError) {
        console.warn("errore durante l'invio dell'email:", emailError);
        // non bloccare il processo se l'email fallisce
      }

      // salva i dati del form in session storage per la pagina di successo
      sessionStorage.setItem('pea_form_data', JSON.stringify(formData));
      
      // redirect alla pagina di successo
      router.push("/iscrizioni/success");
    } catch (err) {
      const errorMessage = "L'iscrizione è fallita probabilmente a causa dell'eccessiva dimensione della presentazione caricata o perché non è compatibile. È fortemente consigliato utilizzare il template fornito appositamente per l'evento affinché la procedura vada a buon fine.";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* header with logo */}
      <div className="w-full border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-5 py-4 flex justify-between items-center">
          <Link href="https://helaglobe.com/patient-engagement-award/" target="_blank" rel="noopener noreferrer">
            <Image src="/pea-logo.png" alt="PEA Logo" width={180} height={60} className="h-10 w-auto cursor-pointer" />
          </Link>
          {/* <Button asChild variant="outline" size="sm">
            <Link href="/">
              Torna a Home
            </Link>
          </Button> */}
        </div>
      </div>

      {/* hero section */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950 dark:via-purple-950 dark:to-pink-950 py-12">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Form di Iscrizione
          </h1>
          <h2 className="text-3xl font-semibold mb-2">Patient Engagement Award</h2>
          <h3 className="text-xl text-muted-foreground">4th Edition</h3>
        </div>
      </div>

      {/* main content */}
      <div className="flex-1 max-w-5xl mx-auto px-5 py-8 w-full">
        <div className="flex items-center justify-between mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <span className="font-semibold">ℹ️ Nota:</span> I campi contrassegnati con <span className="text-red-600 font-bold">*</span> sono obbligatori
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6 border-2 shadow-md">
            <AlertDescription className="flex items-start gap-2">
              <span className="text-lg">⚠️</span>
              <span>{error}</span>
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-2 border-green-300 dark:bg-green-950 dark:border-green-700 mb-6 shadow-md">
            <AlertDescription className="text-green-800 dark:text-green-200 flex items-start gap-2">
              <span className="text-lg">✅</span>
              <span>{success}</span>
            </AlertDescription>
          </Alert>
        )}

        <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
            <CardTitle className="text-2xl">📋 Informazioni Candidato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
          <div>
            <Label htmlFor="ragione-sociale">Ragione Sociale *</Label>
            <Input
              id="ragione-sociale"
              value={ragioneSociale}
              onChange={(e) => {
                setRagioneSociale(e.target.value);
                if (fieldErrors.ragione_sociale) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.ragione_sociale;
                  setFieldErrors(newErrors);
                }
              }}
              className={fieldErrors.ragione_sociale ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {fieldErrors.ragione_sociale && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.ragione_sociale}
              </p>
            )}
            {ragioneSociale && !validateText(ragioneSociale) && !fieldErrors.ragione_sociale && (
              <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> la ragione sociale contiene caratteri non consentiti: {getInvalidChars(ragioneSociale)}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="tipologia">Tipologia Candidato *</Label>
            <select
              id="tipologia"
              value={tipologia}
              onChange={(e) => setTipologia(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2"
            >
              {TIPOLOGIE.map((tip) => (
                <option key={tip} value={tip}>
                  {tip}
                </option>
              ))}
            </select>
          </div>

          {tipologia === "Altro" && (
            <div>
              <Label htmlFor="tipologia-custom">Specifica la Tipologia *</Label>
              <Input
                id="tipologia-custom"
                value={tipologiaCustom}
                onChange={(e) => setTipologiaCustom(e.target.value)}
              />
              {tipologiaCustom && !validateText(tipologiaCustom) && (
                <p className="text-sm text-red-600 mt-1">
                  la tipologia contiene caratteri non consentiti: {getInvalidChars(tipologiaCustom)}
                </p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="titolo-progetto">Titolo Progetto *</Label>
            <Input
              id="titolo-progetto"
              value={titoloProgetto}
              onChange={(e) => {
                setTitoloProgetto(e.target.value);
                if (fieldErrors.titolo_progetto) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.titolo_progetto;
                  setFieldErrors(newErrors);
                }
              }}
              className={fieldErrors.titolo_progetto ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {fieldErrors.titolo_progetto && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.titolo_progetto}
              </p>
            )}
            {titoloProgetto && !validateText(titoloProgetto) && !fieldErrors.titolo_progetto && (
              <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> il titolo progetto contiene caratteri non consentiti: {getInvalidChars(titoloProgetto)}
              </p>
            )}
          </div>

          <div>
            <Label>Area Terapeutica Progetto *</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {AREE_TERAPEUTICHE.map((area) => (
                <div key={area} className="flex items-center space-x-2">
                  <Checkbox
                    id={`area-${area}`}
                    checked={areeTerapeutiche.includes(area)}
                    onCheckedChange={(checked) => {
                      handleAreaTerapeuticaChange(area, checked as boolean);
                      if (fieldErrors.area_terapeutica) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.area_terapeutica;
                        setFieldErrors(newErrors);
                      }
                    }}
                  />
                  <label htmlFor={`area-${area}`} className="text-sm">
                    {area}
                  </label>
                </div>
              ))}
            </div>
            {fieldErrors.area_terapeutica && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.area_terapeutica}
              </p>
            )}
          </div>

          {areeTerapeutiche.includes("Altro") && (
            <div>
              <Label htmlFor="area-custom">Specifica l&apos;Area Terapeutica *</Label>
              <Input
                id="area-custom"
                value={areaTerapeuticaCustom}
                onChange={(e) => setAreaTerapeuticaCustom(e.target.value)}
              />
              {areaTerapeuticaCustom && !validateText(areaTerapeuticaCustom) && (
                <p className="text-sm text-red-600 mt-1">
                  l&apos;area terapeutica contiene caratteri non consentiti: {getInvalidChars(areaTerapeuticaCustom)}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome Referente *</Label>
              <Input
                id="nome"
                value={nomeReferente}
                onChange={(e) => {
                  setNomeReferente(e.target.value);
                  if (fieldErrors.nome_referente) {
                    const newErrors = { ...fieldErrors };
                    delete newErrors.nome_referente;
                    setFieldErrors(newErrors);
                  }
                }}
                className={fieldErrors.nome_referente ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {fieldErrors.nome_referente && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> {fieldErrors.nome_referente}
                </p>
              )}
              {nomeReferente && !validateText(nomeReferente) && !fieldErrors.nome_referente && (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> il nome contiene caratteri non consentiti: {getInvalidChars(nomeReferente)}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="cognome">Cognome Referente *</Label>
              <Input
                id="cognome"
                value={cognomeReferente}
                onChange={(e) => {
                  setCognomeReferente(e.target.value);
                  if (fieldErrors.cognome_referente) {
                    const newErrors = { ...fieldErrors };
                    delete newErrors.cognome_referente;
                    setFieldErrors(newErrors);
                  }
                }}
                className={fieldErrors.cognome_referente ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {fieldErrors.cognome_referente && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> {fieldErrors.cognome_referente}
                </p>
              )}
              {cognomeReferente && !validateText(cognomeReferente) && !fieldErrors.cognome_referente && (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> il cognome contiene caratteri non consentiti: {getInvalidChars(cognomeReferente)}
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="ruolo">Ruolo *</Label>
            <Input
              id="ruolo"
              value={ruolo}
              onChange={(e) => {
                setRuolo(e.target.value);
                if (fieldErrors.ruolo) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.ruolo;
                  setFieldErrors(newErrors);
                }
              }}
              className={fieldErrors.ruolo ? "border-red-500 focus-visible:ring-red-500" : ""}
            />
            {fieldErrors.ruolo && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.ruolo}
              </p>
            )}
            {ruolo && !validateText(ruolo) && !fieldErrors.ruolo && (
              <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> il ruolo contiene caratteri non consentiti: {getInvalidChars(ruolo)}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="mail">Mail *</Label>
              <Input
                id="mail"
                type="email"
                value={mail}
                onChange={(e) => {
                  setMail(e.target.value.toLowerCase());
                  if (fieldErrors.mail) {
                    const newErrors = { ...fieldErrors };
                    delete newErrors.mail;
                    setFieldErrors(newErrors);
                  }
                }}
                className={fieldErrors.mail ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {fieldErrors.mail && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> {fieldErrors.mail}
                </p>
              )}
              {mail && !validateEmail(mail) && !fieldErrors.mail && (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> per favore inserisci un indirizzo email valido (esempio: nome@dominio.com)
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="mail-confirm">Conferma Mail *</Label>
              <Input
                id="mail-confirm"
                type="email"
                value={mailConfirm}
                onChange={(e) => {
                  setMailConfirm(e.target.value.toLowerCase());
                  if (fieldErrors.mail_confirm) {
                    const newErrors = { ...fieldErrors };
                    delete newErrors.mail_confirm;
                    setFieldErrors(newErrors);
                  }
                }}
                className={fieldErrors.mail_confirm ? "border-red-500 focus-visible:ring-red-500" : ""}
              />
              {fieldErrors.mail_confirm && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> {fieldErrors.mail_confirm}
                </p>
              )}
              {mail && mailConfirm && mail !== mailConfirm && !fieldErrors.mail_confirm && (
                <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                  <span>⚠️</span> gli indirizzi email non corrispondono
                </p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="telefono">Telefono *</Label>
            <Input
              id="telefono"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value);
                if (fieldErrors.telefono) {
                  const newErrors = { ...fieldErrors };
                  delete newErrors.telefono;
                  setFieldErrors(newErrors);
                }
              }}
              className={fieldErrors.telefono ? "border-red-500 focus-visible:ring-red-500" : ""}
              placeholder="es: 3401234567"
            />
            {fieldErrors.telefono && (
              <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> {fieldErrors.telefono}
              </p>
            )}
            {telefono && !validatePhoneNumber(telefono) && !fieldErrors.telefono && (
              <p className="text-sm text-amber-600 mt-1 flex items-center gap-1">
                <span>⚠️</span> per favore inserisci un numero di telefono valido (esempio: 3401234567 o +39 340 1234567)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
          <CardTitle className="text-2xl">📁 Caricamento File</CardTitle>
          <CardDescription className="text-base pt-2">
            💡 È fortemente consigliato utilizzare il{" "}
            <a 
              href="https://helaglobe.com/wp-content/uploads/2026/02/PATIENT-ENGAGEMENT-AWARD-2026-TEMPLATE-CANDIDATURA-1-1.pptx" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-blue-600 dark:text-blue-400 underline font-semibold hover:text-blue-700 dark:hover:text-blue-300"
            >
              template ufficiale
            </a>
            {" "}fornito da Helaglobe per garantire il corretto caricamento dei file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div>
            <Label htmlFor="marchio">Logo aziendale JPEG o AI (in alta risoluzione o vettoriale) *</Label>
            <Input
              id="marchio"
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,.svg,.ai"
              onChange={(e) => setMarchioFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <Label htmlFor="image">Immagine rappresentativa del progetto JPEG o PNG (preferibilmente 1920x1080 pixel) *</Label>
            <Input
              id="image"
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            />
          </div>

          <div>
            <Label htmlFor="presentation">
              Presentazione del progetto (in un unico file, formato PowerPoint o PDF) *
            </Label>
            <Input
              id="presentation"
              type="file"
              accept=".ppt,.pptx,.pdf"
              onChange={(e) => {
                setPresentationFile(e.target.files?.[0] || null);
                if (analysisComplete) {
                  setAnalysisComplete(false);
                  setSuccess("");
                }
              }}
            />
            <p className="text-xs text-red-600 mt-1">Dimensione massima consentita: 10 MB</p>
          </div>

          {!marchioFile || !imageFile || !presentationFile ? (
            <Alert>
              <AlertDescription>carica tutti i file richiesti prima di procedere.</AlertDescription>
            </Alert>
          ) : null}

          <Button
            onClick={handleAnalyzePresentation}
            disabled={!marchioFile || !imageFile || !presentationFile || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                analisi in corso...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-5 w-5" />
                carica files e analizza
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {analysisComplete && extractedContent && (
        <>
          <Card className="border-2 border-green-200 dark:border-green-800 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950 dark:to-teal-950">
              <CardTitle className="text-2xl flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                Dati estratti dalla presentazione
              </CardTitle>
              <CardDescription className="text-base leading-relaxed pt-2">
                🤖 <strong>Analisi AI completata!</strong> Abbiamo analizzato i contenuti che hai condiviso con noi e, sulla base degli obiettivi e dei risultati
                che ci hai indicato, crediamo che il tuo progetto possa essere descritto come leggerai qui di seguito.
                <br />
                <br />
                Ogni campo riprende i contenuti riportati nella presentazione, ma puoi modificare se necessario e, una
                volta che avrai verificato che tutto sia corretto, premi il pulsante <strong>&apos;Sottometti Iscrizione&apos;</strong> per
                completare la procedura.
                <br />
                <br />
                Grazie!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <select
                  id="categoria"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  {CATEGORIE.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="sintesi-ebook">Sintesi informazioni per l&apos;Ebook (max 5 frasi)</Label>
                <textarea
                  id="sintesi-ebook"
                  value={sintesiEbook}
                  onChange={(e) => setSintesiEbook(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[150px]"
                />
                {sintesiEbook && !validateText(sintesiEbook) && (
                  <p className="text-sm text-red-600 mt-1">
                    la sintesi contiene caratteri non consentiti: {getInvalidChars(sintesiEbook)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="obiettivi">Obiettivi</Label>
                <textarea
                  id="obiettivi"
                  value={obiettivi}
                  onChange={(e) => setObiettivi(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[150px]"
                />
              </div>

              <div>
                <Label htmlFor="risultati">Risultati</Label>
                <textarea
                  id="risultati"
                  value={risultati}
                  onChange={(e) => setRisultati(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[150px]"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950">
              <CardTitle className="text-2xl">🔒 Privacy e Consensi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="ai-consent"
                    checked={aiConsent}
                    onCheckedChange={(checked) => {
                      setAiConsent(checked as boolean);
                      if (fieldErrors.ai_consent) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.ai_consent;
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={fieldErrors.ai_consent ? "border-red-500" : ""}
                  />
                  <label htmlFor="ai-consent" className="text-sm">
                    Acconsento all&apos;utilizzo di tecnologie di Intelligenza Artificiale per l&apos;analisi della presentazione,
                    esclusivamente allo scopo di velocizzare il processo di iscrizione. I contenuti non verranno in alcun
                    modo utilizzati per l&apos;addestramento di modelli e saranno trattati nel rispetto del GDPR 2016/679 e
                    della normativa vigente in materia di protezione dei dati personali *
                  </label>
                </div>
                {fieldErrors.ai_consent && (
                  <p className="text-sm text-red-600 mt-1 ml-6 flex items-center gap-1">
                    <span>⚠️</span> {fieldErrors.ai_consent}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="privacy-consent"
                    checked={privacyConsent}
                    onCheckedChange={(checked) => {
                      setPrivacyConsent(checked as boolean);
                      if (fieldErrors.privacy_consent) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.privacy_consent;
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={fieldErrors.privacy_consent ? "border-red-500" : ""}
                  />
                  <label htmlFor="privacy-consent" className="text-sm">
                    Acconsento al{" "}
                    <a href="https://www.helaglobe.com/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      trattamento dei dati personali
                    </a>{" "}
                    ai sensi degli articoli 13-14 del GDPR 2016/679 *
                  </label>
                </div>
                {fieldErrors.privacy_consent && (
                  <p className="text-sm text-red-600 mt-1 ml-6 flex items-center gap-1">
                    <span>⚠️</span> {fieldErrors.privacy_consent}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="jury-consent"
                    checked={juryConsent}
                    onCheckedChange={(checked) => {
                      setJuryConsent(checked as boolean);
                      if (fieldErrors.jury_consent) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.jury_consent;
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={fieldErrors.jury_consent ? "border-red-500" : ""}
                  />
                  <label htmlFor="jury-consent" className="text-sm">
                    Autorizzo HELAGLOBE S.R.L. a condividere con la giuria la documentazione presentata *
                  </label>
                </div>
                {fieldErrors.jury_consent && (
                  <p className="text-sm text-red-600 mt-1 ml-6 flex items-center gap-1">
                    <span>⚠️</span> {fieldErrors.jury_consent}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="regulation-consent"
                    checked={regulationConsent}
                    onCheckedChange={(checked) => {
                      setRegulationConsent(checked as boolean);
                      if (fieldErrors.regulation_consent) {
                        const newErrors = { ...fieldErrors };
                        delete newErrors.regulation_consent;
                        setFieldErrors(newErrors);
                      }
                    }}
                    className={fieldErrors.regulation_consent ? "border-red-500" : ""}
                  />
                  <label htmlFor="regulation-consent" className="text-sm">
                    Dichiaro di aver letto e accettato il{" "}
                    <a href="https://helaglobe.com/regolamento-patient-engagement-award-2026/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      Regolamento
                    </a>{" "}
                    del Patient Engagement Award 2026 *
                  </label>
                </div>
                {fieldErrors.regulation_consent && (
                  <p className="text-sm text-red-600 mt-1 ml-6 flex items-center gap-1">
                    <span>⚠️</span> {fieldErrors.regulation_consent}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="marketing-consent"
                    checked={marketingConsent}
                    onCheckedChange={(checked) => setMarketingConsent(checked as boolean)}
                  />
                  <label htmlFor="marketing-consent" className="text-sm">
                    Acconsento a ricevere novità e informazioni sui progetti di Helaglobe
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSubmit} 
            disabled={submitting} 
            size="lg" 
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-8 text-xl shadow-lg hover:shadow-xl transition-all"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                iscrizione in corso...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-6 w-6" />
                Sottometti iscrizione
              </>
            )}
          </Button>
        </>
      )}
      </div>

      {/* footer */}
      <footer className="w-full border-t py-6 mt-12">
        <div className="max-w-5xl mx-auto px-5 text-center text-sm text-muted-foreground">
          <p>
            Tutti i diritti riservati ©{" "}
            <a
              href="https://helaglobe.com/"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Helaglobe
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

