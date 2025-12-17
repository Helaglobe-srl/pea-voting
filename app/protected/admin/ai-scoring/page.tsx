"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, PlayIcon, DownloadIcon, CheckCircle2Icon, Loader2Icon, AlertCircleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Registration {
  id: number;
  ragione_sociale: string;
  tipologia: string;
  titolo_progetto: string;
  area_terapeutica: string;
  categoria: string;
  nome_referente: string;
  cognome_referente: string;
  ruolo: string;
  mail: string;
  telefono: string;
  info_giuria?: string;
  sintesi_ebook?: string;
  obiettivi?: string;
  risultati?: string;
  link_presentazione?: string;
  link_marchio?: string;
  link_immagine?: string;
  data_sottomissione: string;
}

interface AIScore {
  registration_id: number;
  engagement_score: number;
  methodology_score: number;
  inclusivity_score: number;
  patient_impact_score: number;
  business_value_score: number;
  system_value_score: number;
  sustainability_score: number;
  engagement_reasoning: string;
  methodology_reasoning: string;
  inclusivity_reasoning: string;
  patient_impact_reasoning: string;
  business_value_reasoning: string;
  system_value_reasoning: string;
  sustainability_reasoning: string;
  strengths: string[];
  improvements: string[];
  average_score: number;
  final_percentage_score: number;
  evaluated_at: string;
}

interface RegistrationWithScore extends Registration {
  aiScore?: AIScore;
  status: 'pending' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
}

export default function AIScoring() {
  const [registrations, setRegistrations] = useState<RegistrationWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentProcessing, setCurrentProcessing] = useState<number | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<RegistrationWithScore | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadRegistrationsAndScores();
  }, []);

  const loadRegistrationsAndScores = async () => {
    try {
      const supabase = createClient();
      
      // Load only candidate projects with presentation links (Google Drive files)
      const { data: registrationsData, error: registrationsError } = await supabase
        .from('candidate_projects')
        .select('*')
        .not('link_presentazione', 'is', null)
        .order('id');

      if (registrationsError) throw registrationsError;

      // Load existing AI scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('ai_registration_scores')
        .select('*');

      if (scoresError) throw scoresError;

      // Merge registrations with scores
      const registrationsWithScores: RegistrationWithScore[] = (registrationsData || []).map(registration => {
        const aiScore = scoresData?.find(score => score.registration_id === registration.id);
        return {
          ...registration,
          aiScore,
          status: aiScore ? 'completed' : 'pending'
        };
      });

      setRegistrations(registrationsWithScores);
    } catch (error) {
      console.error('Error loading registrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractTextFromPresentation = async (registrationId: number, presentationLink: string): Promise<string> => {
    // Use server-side extraction API with caching
    const extractResponse = await fetch('/api/extract-from-drive-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        driveUrl: presentationLink,
        registrationId,
        useCache: true 
      }),
    });

    if (!extractResponse.ok) {
      const errorData = await extractResponse.json();
      throw new Error(errorData.error || 'Failed to extract text from presentation');
    }

    const { text, cached } = await extractResponse.json();
    if (cached) {
      console.log(`Using cached text for registration ${registrationId}`);
    }
    return text;
  };

  const scoreRegistration = async (registration: RegistrationWithScore) => {
    if (!registration.link_presentazione) {
      updateRegistrationStatus(registration.id, 'error', 'No presentation link available');
      return;
    }

    try {
      setCurrentProcessing(registration.id);
      updateRegistrationStatus(registration.id, 'processing');

      // Extract text from presentation (with caching)
      console.log(`Extracting text from registration ${registration.id}...`);
      const extractedText = await extractTextFromPresentation(registration.id, registration.link_presentazione);

      if (!extractedText || extractedText.length < 100) {
        throw new Error('Extracted text is too short or empty');
      }

      console.log(`Text extracted (${extractedText.length} chars), scoring...`);

      // Score with AI
      const scoreResponse = await fetch('/api/ai-score-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          registrationId: registration.id,
          extractedText,
        }),
      });

      if (!scoreResponse.ok) {
        const errorData = await scoreResponse.json();
        throw new Error(errorData.error || 'Failed to score registration');
      }

      const { evaluation } = await scoreResponse.json();
      
      // Update registration with score
      setRegistrations(prev => prev.map(r => 
        r.id === registration.id 
          ? { ...r, aiScore: evaluation, status: 'completed', errorMessage: undefined }
          : r
      ));

      console.log(`Registration ${registration.id} scored successfully`);
    } catch (error) {
      console.error(`Error scoring registration ${registration.id}:`, error);
      updateRegistrationStatus(
        registration.id, 
        'error', 
        error instanceof Error ? error.message : 'Unknown error'
      );
    } finally {
      setCurrentProcessing(null);
    }
  };

  const scoreAllRegistrations = async () => {
    setProcessing(true);
    
    const registrationsToScore = registrations.filter(r => r.status === 'pending' || r.status === 'error');
    
    console.log(`Starting batch scoring of ${registrationsToScore.length} registrations...`);
    
    // Process in smaller batches to avoid overwhelming the system
    const BATCH_SIZE = 3; // Process 3 at a time
    const BATCH_DELAY = 5000; // 5 seconds between batches
    
    for (let i = 0; i < registrationsToScore.length; i += BATCH_SIZE) {
      const batch = registrationsToScore.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(registrationsToScore.length / BATCH_SIZE)}`)
      
      // Process batch in parallel
      await Promise.allSettled(
        batch.map(registration => scoreRegistration(registration))
      );
      
      // Delay between batches (except for the last one)
      if (i + BATCH_SIZE < registrationsToScore.length) {
        console.log(`Waiting ${BATCH_DELAY / 1000}s before next batch...`);
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }
    
    console.log('Batch scoring completed!');
    setProcessing(false);
  };

  const updateRegistrationStatus = (registrationId: number, status: RegistrationWithScore['status'], errorMessage?: string) => {
    setRegistrations(prev => prev.map(r => 
      r.id === registrationId 
        ? { ...r, status, errorMessage }
        : r
    ));
  };



  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // Main scores sheet
    const scoresData = registrations
      .filter(r => r.aiScore)
      .map(r => ({
        'ID Registrazione': r.id,
        'Ragione Sociale': r.ragione_sociale,
        'Titolo Progetto': r.titolo_progetto,
        'Categoria': r.categoria,
        'Area Terapeutica': r.area_terapeutica,
        'Referente': `${r.nome_referente} ${r.cognome_referente}`,
        'Email': r.mail,
        'Punteggio Engagement': r.aiScore!.engagement_score,
        'Punteggio Metodologia': r.aiScore!.methodology_score,
        'Punteggio Inclusività': r.aiScore!.inclusivity_score,
        'Punteggio Impatto Pazienti': r.aiScore!.patient_impact_score,
        'Punteggio Valore Aziendale': r.aiScore!.business_value_score,
        'Punteggio Valore Sistemico': r.aiScore!.system_value_score,
        'Punteggio Sostenibilità': r.aiScore!.sustainability_score,
        'Media Punteggi': r.aiScore!.average_score,
        'Punteggio Finale %': r.aiScore!.final_percentage_score,
        'Data Valutazione': new Date(r.aiScore!.evaluated_at).toLocaleString('it-IT'),
      }));

    const scoresSheet = XLSX.utils.json_to_sheet(scoresData);
    XLSX.utils.book_append_sheet(workbook, scoresSheet, 'Punteggi');

    // Detailed feedback sheet
    const feedbackData = registrations
      .filter(r => r.aiScore)
      .map(r => ({
        'ID Registrazione': r.id,
        'Titolo Progetto': r.titolo_progetto,
        'Punti di Forza': r.aiScore!.strengths.join('; '),
        'Aree di Miglioramento': r.aiScore!.improvements.join('; '),
        'Motivazione Engagement': r.aiScore!.engagement_reasoning,
        'Motivazione Metodologia': r.aiScore!.methodology_reasoning,
        'Motivazione Inclusività': r.aiScore!.inclusivity_reasoning,
        'Motivazione Impatto Pazienti': r.aiScore!.patient_impact_reasoning,
        'Motivazione Valore Aziendale': r.aiScore!.business_value_reasoning,
        'Motivazione Valore Sistemico': r.aiScore!.system_value_reasoning,
        'Motivazione Sostenibilità': r.aiScore!.sustainability_reasoning,
      }));

    const feedbackSheet = XLSX.utils.json_to_sheet(feedbackData);
    XLSX.utils.book_append_sheet(workbook, feedbackSheet, 'Feedback Dettagliato');

    // Generate and download file
    XLSX.writeFile(workbook, `ai-scores-registrations-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export in format compatible with finalist upload (for easy workflow)
  const exportForFinalistUpload = () => {
    const workbook = XLSX.utils.book_new();
    
    // Format matching upload-excel expectations
    const finalistData = registrations
      .filter(r => r.aiScore)
      .map(r => ({
        'RAGIONE SOCIALE': r.ragione_sociale,
        'TITOLO PROGETTO': r.titolo_progetto,
        'CATEGORIA': r.categoria,
        'TIPOLOGIA': r.tipologia,
        'AREA TERAPEUTICA': r.area_terapeutica,
        'INFO GIURIA': r.info_giuria,
        'OBIETTIVI RISULTATI': `${r.obiettivi}\n\n${r.risultati}`,
        'LINK PRESENTAZIONE': r.link_presentazione || '',
        'Punteggio AI %': r.aiScore!.final_percentage_score,
      }));

    const sheet = XLSX.utils.json_to_sheet(finalistData);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Finalisti');

    // Generate and download file
    XLSX.writeFile(workbook, `finalisti-candidati-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Calculate stats
  const completedCount = registrations.filter(r => r.status === 'completed').length;
  const pendingCount = registrations.filter(r => r.status === 'pending').length;
  const errorCount = registrations.filter(r => r.status === 'error').length;

  if (loading) {
    return (
      <div className="flex-1 w-full flex items-center justify-center">
        <Loader2Icon className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">🤖 AI Scoring Candidature</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Valutazione automatica delle candidature con intelligenza artificiale
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/protected/admin" className="flex items-center gap-2">
            <ArrowLeftIcon size={16} />
            Dashboard
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Totale Candidature</div>
          <div className="text-2xl font-bold">{registrations.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Completati</div>
          <div className="text-2xl font-bold text-green-600">{completedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">In Attesa</div>
          <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Errori</div>
          <div className="text-2xl font-bold text-red-600">{errorCount}</div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={scoreAllRegistrations}
          disabled={processing || pendingCount === 0}
          className="flex items-center gap-2"
        >
          {processing ? (
            <>
              <Loader2Icon size={16} className="animate-spin" />
              Elaborazione in corso...
            </>
          ) : (
            <>
              <PlayIcon size={16} />
              Valuta tutte le candidature ({pendingCount})
            </>
          )}
        </Button>
        <Button
          onClick={exportToExcel}
          disabled={completedCount === 0}
          variant="outline"
          className="flex items-center gap-2"
        >
          <DownloadIcon size={16} />
          Esporta Punteggi
        </Button>
        <Button
          onClick={exportForFinalistUpload}
          disabled={completedCount === 0}
          variant="outline"
          className="flex items-center gap-2"
        >
          <DownloadIcon size={16} />
          Esporta per Finalisti
        </Button>
      </div>

      {/* Registrations List */}
      <div className="space-y-3">
        {registrations.map(registration => (
          <Card key={registration.id} className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{registration.titolo_progetto}</h3>
                  {registration.status === 'completed' && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle2Icon size={12} className="mr-1" />
                      Valutato
                    </Badge>
                  )}
                  {registration.status === 'processing' && (
                    <Badge variant="default" className="bg-blue-600">
                      <Loader2Icon size={12} className="mr-1 animate-spin" />
                      In corso
                    </Badge>
                  )}
                  {registration.status === 'error' && (
                    <Badge variant="destructive">
                      <AlertCircleIcon size={12} className="mr-1" />
                      Errore
                    </Badge>
                  )}
                  {registration.status === 'pending' && (
                    <Badge variant="outline">In attesa</Badge>
                  )}
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>{registration.ragione_sociale}</div>
                  <div className="font-medium">{registration.categoria}</div>
                  <div className="text-xs">
                    {registration.nome_referente} {registration.cognome_referente} • {registration.mail}
                  </div>
                  {registration.aiScore && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <span className="text-sm">Media: <strong className="text-base">{registration.aiScore.average_score.toFixed(2)}</strong></span>
                        <span className="text-sm">Punteggio finale: <strong className="text-base text-green-600">{registration.aiScore.final_percentage_score}%</strong></span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Engagement</span>
                          <strong>{registration.aiScore.engagement_score}/4</strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Metodologia</span>
                          <strong>{registration.aiScore.methodology_score}/4</strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Inclusività</span>
                          <strong>{registration.aiScore.inclusivity_score}/4</strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Impatto pazienti</span>
                          <strong>{registration.aiScore.patient_impact_score}/4</strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Valore aziendale</span>
                          <strong>{registration.aiScore.business_value_score}/4</strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Valore sistemico</span>
                          <strong>{registration.aiScore.system_value_score}/4</strong>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Sostenibilità</span>
                          <strong>{registration.aiScore.sustainability_score}/4</strong>
                        </div>
                      </div>
                    </div>
                  )}
                  {registration.errorMessage && (
                    <div className="text-red-600 text-xs mt-1">{registration.errorMessage}</div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {registration.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => scoreRegistration(registration)}
                    disabled={processing || !registration.link_presentazione}
                  >
                    Valuta
                  </Button>
                )}
                {registration.status === 'error' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => scoreRegistration(registration)}
                    disabled={processing || !registration.link_presentazione}
                  >
                    Riprova
                  </Button>
                )}
                {registration.status === 'completed' && registration.aiScore && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedRegistration(registration);
                      setIsDialogOpen(true);
                    }}
                  >
                    Dettagli
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedRegistration?.titolo_progetto}
            </DialogTitle>
            <DialogDescription className="text-sm">
              {selectedRegistration?.ragione_sociale} • {selectedRegistration?.categoria}
            </DialogDescription>
          </DialogHeader>

          {selectedRegistration?.aiScore && (
            <div className="space-y-6 mt-4">
              {/* Overall Score */}
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Punteggio finale</div>
                <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {selectedRegistration.aiScore.final_percentage_score}%
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Media criteri: {selectedRegistration.aiScore.average_score.toFixed(2)}/4
                </div>
              </div>

              {/* Criteria Scores */}
              <div>
                <h3 className="font-semibold mb-3">Punteggi per criterio</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="font-medium">Engagement pazienti/caregiver</span>
                    <Badge variant="outline" className="text-base">{selectedRegistration.aiScore.engagement_score}/4</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground pl-3 -mt-2 mb-3">
                    {selectedRegistration.aiScore.engagement_reasoning}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="font-medium">Metodologia ed evidenze</span>
                    <Badge variant="outline" className="text-base">{selectedRegistration.aiScore.methodology_score}/4</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground pl-3 -mt-2 mb-3">
                    {selectedRegistration.aiScore.methodology_reasoning}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="font-medium">Inclusività</span>
                    <Badge variant="outline" className="text-base">{selectedRegistration.aiScore.inclusivity_score}/4</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground pl-3 -mt-2 mb-3">
                    {selectedRegistration.aiScore.inclusivity_reasoning}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="font-medium">Impatto sui pazienti</span>
                    <Badge variant="outline" className="text-base">{selectedRegistration.aiScore.patient_impact_score}/4</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground pl-3 -mt-2 mb-3">
                    {selectedRegistration.aiScore.patient_impact_reasoning}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="font-medium">Valore aziendale</span>
                    <Badge variant="outline" className="text-base">{selectedRegistration.aiScore.business_value_score}/4</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground pl-3 -mt-2 mb-3">
                    {selectedRegistration.aiScore.business_value_reasoning}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="font-medium">Valore sistemico</span>
                    <Badge variant="outline" className="text-base">{selectedRegistration.aiScore.system_value_score}/4</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground pl-3 -mt-2 mb-3">
                    {selectedRegistration.aiScore.system_value_reasoning}
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <span className="font-medium">Sostenibilità</span>
                    <Badge variant="outline" className="text-base">{selectedRegistration.aiScore.sustainability_score}/4</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground pl-3 -mt-2 mb-3">
                    {selectedRegistration.aiScore.sustainability_reasoning}
                  </div>
                </div>
              </div>

              {/* Strengths */}
              <div>
                <h3 className="font-semibold mb-2 text-green-600 dark:text-green-400">✓ Punti di forza</h3>
                <ul className="space-y-1.5">
                  {selectedRegistration.aiScore.strengths.map((strength, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div>
                <h3 className="font-semibold mb-2 text-amber-600 dark:text-amber-400">⚠ Aree di miglioramento</h3>
                <ul className="space-y-1.5">
                  {selectedRegistration.aiScore.improvements.map((improvement, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <span className="text-amber-600 dark:text-amber-400 mt-0.5">•</span>
                      <span>{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Metadata */}
              <div className="text-xs text-muted-foreground border-t pt-3">
                Valutato il: {new Date(selectedRegistration.aiScore.evaluated_at).toLocaleString('it-IT')}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
