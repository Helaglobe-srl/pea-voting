import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, UploadIcon, DownloadIcon } from "lucide-react";
import ExcelUploader from "@/components/excel-uploader";

export default async function AdminUploadPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const userEmail = user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || userEmail !== adminEmail) {
    redirect("/protected?error=unauthorized");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Carica dati progetti</h1>
          </div>
        <Button asChild variant="outline">
          <Link href="/protected/admin" className="flex items-center gap-2">
            <ArrowLeftIcon size={16} />
            torna alla dashboard
          </Link>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <h3 className="font-semibold">Colonne previste nel file xlsx:</h3>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• <strong>categoria</strong></p>
            <p>• <strong>ragione sociale</strong></p>
            <p>• <strong>tipologia</strong></p>
            <p>• <strong>titolo progetto</strong></p>
            <p>• <strong>area terapeutica</strong></p>
            <p>• <strong>info giuria</strong></p>
            <p>• <strong>obiettivi risultati</strong></p>
            <p>• <strong>link presentazione</strong></p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <DownloadIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100">File di esempio</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">scarica un file excel di esempio con la struttura corretta</p>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-fit">
                <a href="/mockup_finalisti.xlsx" download="mockup_finalisti.xlsx">
                  Scarica esempio
                </a>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <UploadIcon className="h-8 w-8 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold">Caricamento file excel</h2>
            </div>
          </div>
          
          <div className="border-2 border-dashed border-muted rounded-lg p-8">
            <ExcelUploader />
          </div>
        </div>
      </Card>
    </div>
  );
} 