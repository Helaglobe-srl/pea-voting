"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Loader2 } from "lucide-react";
import Image from "next/image";

export default function SuccessPage() {
  const router = useRouter();
  
  const [gradimento, setGradimento] = useState(5);
  const [adozione, setAdozione] = useState("Sì");
  const [suggerimenti, setSuggerimenti] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSubmitFeedback = async () => {
    setSubmitting(true);

    try {
      // ottieni i dati del candidato dalla session storage se disponibili
      const formDataString = sessionStorage.getItem('pea_form_data');
      const formData = formDataString ? JSON.parse(formDataString) : {};

      // prepara il feedback in formato json
      const timestamp = new Date().toISOString();
      const feedbackData = {
        timestamp: timestamp,
        feedback: {
          gradimento: gradimento,
          adozione: adozione,
          suggerimenti: suggerimenti
        },
        dati_candidato: {
          nome: formData.nome_referente || "utente_anonimo",
          cognome: formData.cognome_referente || "anonimo",
          azienda: formData.ragione_sociale || "n/a",
          email: formData.mail || "n/a"
        }
      };

      // invia il feedback all'api
      const response = await fetch("/api/submit-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feedbackData }),
      });

      if (!response.ok) {
        throw new Error("errore durante l'invio del feedback");
      }

      setFeedbackSent(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "errore sconosciuto";
      // mostra l'errore ma non bloccare l'utente
      alert(`attenzione: il feedback non è stato salvato (${errorMessage}). puoi comunque continuare.`);
      setFeedbackSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewRegistration = () => {
    router.push("/iscrizioni");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* header with logo */}
      <div className="w-full border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 py-4">
          <Link href="/">
            <Image src="/pea-logo.png" alt="PEA Logo" width={180} height={60} className="h-10 w-auto cursor-pointer" />
          </Link>
        </div>
      </div>

      {/* success hero */}
      <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950 py-16">
        <div className="max-w-4xl mx-auto px-5 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            Iscrizione completata!
          </h1>
          <p className="text-xl text-muted-foreground">
            Il tuo progetto è stato registrato con successo
          </p>
        </div>
      </div>

      {/* main content */}
      <div className="flex-1 max-w-4xl mx-auto px-5 py-12 w-full space-y-8">

        <Card className="border-2 border-blue-200 dark:border-blue-800 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
            <CardTitle className="text-2xl flex items-center gap-2">
              📧 Prossimi Passi
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4 text-base leading-relaxed">
            <p className="font-semibold text-lg">Grazie per aver candidato il tuo progetto!</p>
            
            <div className="space-y-3">
              <p>✅ Riceverai un&apos;e-mail di conferma con il riepilogo dei dati inseriti.</p>
              <p>📬 Controlla la tua casella di posta per tutti i dettagli. Se non ricevi l&apos;email, controlla anche la cartella spam.</p>
              <p className="pt-4 border-t">
                <strong>Per eventuali necessità:</strong><br/>
                📧 Email: <a href="mailto:peaward@helaglobe.com" className="text-blue-600 hover:underline">peaward@helaglobe.com</a><br/>
                📞 Telefono: <a href="tel:0554939527" className="text-blue-600 hover:underline">055.4939527</a>
              </p>
            </div>

            <p className="text-muted-foreground pt-4">
              Grazie,<br/>
              <strong>Il team Helaglobe</strong>
            </p>
          </CardContent>
        </Card>

        {/* feedback section - temporarily commented out */}
        {/* {!feedbackSent ? (
          <Card className="border-2 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
              <CardTitle className="text-2xl">💭 Il tuo feedback è importante per noi!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
            <div>
              <Label htmlFor="gradimento" className="mb-4 block">
                Quanto ti è piaciuto il processo di candidatura? (1-5)
              </Label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => setGradimento(value)}
                    className={`px-4 py-2 rounded-md border-2 transition-colors ${
                      gradimento === value
                        ? "border-blue-600 bg-blue-50 text-blue-900 font-semibold"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="adozione" className="mb-2 block">
                Adotteresti questo sistema per i tuoi form?
              </Label>
              <div className="flex gap-4">
                <button
                  onClick={() => setAdozione("Sì")}
                  className={`px-6 py-2 rounded-md border-2 transition-colors ${
                    adozione === "Sì"
                      ? "border-green-600 bg-green-50 text-green-900 font-semibold"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  Sì
                </button>
                <button
                  onClick={() => setAdozione("No")}
                  className={`px-6 py-2 rounded-md border-2 transition-colors ${
                    adozione === "No"
                      ? "border-red-600 bg-red-50 text-red-900 font-semibold"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  No
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="suggerimenti" className="mb-2 block">
                Hai suggerimenti?
              </Label>
              <textarea
                id="suggerimenti"
                value={suggerimenti}
                onChange={(e) => setSuggerimenti(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 min-h-[120px]"
                placeholder="Scrivi qui i tuoi suggerimenti..."
              />
            </div>

              <Button 
                onClick={handleSubmitFeedback} 
                disabled={submitting} 
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-6 text-lg"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    invio in corso...
                  </>
                ) : (
                  "invia feedback"
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <AlertDescription className="text-green-800 dark:text-green-200 text-lg">
              ✨ Grazie per il tuo feedback!
            </AlertDescription>
          </Alert>
        )} */}

        <div className="flex justify-center pt-4">
          <Button 
            onClick={handleNewRegistration} 
            variant="outline" 
            size="lg"
            className="border-2 hover:bg-blue-50 dark:hover:bg-blue-950 py-6 px-8 text-lg"
          >
            ➕ candida un altro progetto
          </Button>
        </div>
      </div>

      {/* footer */}
      <footer className="w-full border-t py-6 mt-12">
        <div className="max-w-4xl mx-auto px-5 text-center text-sm text-muted-foreground">
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

