import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, UploadIcon } from "lucide-react";
import ExcelUploader from "@/components/excel-uploader";

export default async function AdminUploadPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const userEmail = sessionData.session.user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || userEmail !== adminEmail) {
    redirect("/protected?error=unauthorized");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">upload project data</h1>
          <p className="text-muted-foreground">upload excel file with project candidatures</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/protected/admin" className="flex items-center gap-2">
            <ArrowLeftIcon size={16} />
            back to dashboard
          </Link>
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <UploadIcon className="h-8 w-8 text-blue-500" />
            <div>
              <h2 className="text-xl font-semibold">excel file upload</h2>
              <p className="text-muted-foreground">upload candidature_pea_2025.xlsx or similar format</p>
            </div>
          </div>
          
          <div className="border-2 border-dashed border-muted rounded-lg p-8">
            <ExcelUploader />
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-semibold mb-3">expected columns</h3>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>• <strong>categoria</strong> - project category</p>
          <p>• <strong>ragione sociale</strong> - organization name</p>
          <p>• <strong>tipologia</strong> - organization type</p>
          <p>• <strong>titolo progetto</strong> - project title</p>
          <p>• <strong>area terapeutica</strong> - therapeutic area</p>
          <p>• <strong>info giuria</strong> - information for jury (shown to voters)</p>
          <p>• <strong>obiettivi risultati</strong> - objectives and results</p>
          <p>• <strong>link presentazione</strong> - presentation link</p>
        </div>
      </Card>
    </div>
  );
} 