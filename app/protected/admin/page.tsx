import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { 
  BarChart3Icon, 
  UploadIcon, 
  BrainCircuitIcon, 
  UsersIcon, 
  TrendingUpIcon,
  FileSpreadsheetIcon,
  ArrowRightIcon
} from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // check if user is admin
  const userEmail = user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || userEmail !== adminEmail) {
    redirect("/protected?error=unauthorized");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">🛠️ Pannello amministratore</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Gestisci il processo completo di valutazione e votazione</p>
      </div>

      {/* Workflow Cards - Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Step 1: AI Scoring */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BrainCircuitIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">1. Valuta candidature con AI</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Analizza i progetti candidati con intelligenza artificiale
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              • Carica automaticamente tutte le candidature<br/>
              • Valutazione AI su 7 criteri<br/>
              • Esporta i punteggi in Excel per la selezione
            </div>
            <Button asChild className="w-full">
              <Link href="/protected/admin/ai-scoring" className="flex items-center justify-center gap-2">
                <BrainCircuitIcon size={16} />
                Apri AI Scoring
                <ArrowRightIcon size={16} />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Step 2: Upload Finalists */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <UploadIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">2. Carica progetti finalisti</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Importa l&apos;Excel dei progetti selezionati per la votazione
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              • Carica Excel con i finalisti selezionati<br/>
              • Validazione automatica dei dati<br/>
              • I giurati potranno votare questi progetti
            </div>
            <Button asChild variant="default" className="w-full">
              <Link href="/protected/admin/upload" className="flex items-center justify-center gap-2">
                <FileSpreadsheetIcon size={16} />
                Carica Excel
                <ArrowRightIcon size={16} />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Step 3: Monitor Voting */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">3. Monitora votazioni giurati</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Visualizza lo stato in tempo reale delle votazioni
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              • Statistiche in tempo reale<br/>
              • Matrice completa delle votazioni<br/>
              • Esporta report dettagliati
            </div>
            <Button asChild variant="default" className="w-full">
              <Link href="/protected/admin/monitor" className="flex items-center justify-center gap-2">
                <UsersIcon size={16} />
                Monitora votazioni
                <ArrowRightIcon size={16} />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Step 4: Results */}
        <Card className="border-2 hover:border-primary/50 transition-colors">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <TrendingUpIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-lg">4. Visualizza risultati finali</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Classifica finale e statistiche dei vincitori
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground">
              • Classifica finale per categoria<br/>
              • Punteggi aggregati e statistiche<br/>
              • Esporta risultati in Excel
            </div>
            <Button asChild variant="default" className="w-full">
              <Link href="/protected/results" className="flex items-center justify-center gap-2">
                <BarChart3Icon size={16} />
                Visualizza risultati
                <ArrowRightIcon size={16} />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 