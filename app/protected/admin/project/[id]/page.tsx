import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function AdminProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const projectId = parseInt(resolvedParams.id);
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

  // Fetch project details with detailed information
  const { data: project, error: projectError } = await supabase
    .from("finalist_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    redirect("/protected/admin");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">👁️ {project.name}</h1>
        <Button asChild variant="outline">
          <Link href="/protected/admin">← Torna al pannello amministratore</Link>
        </Button>
      </div>

      {/* Project Information Section */}
      <div className="space-y-6">
        {/* Jury Information - Most Important */}
        {project.jury_info && (
          <Card className="p-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
            <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">
              ⚖️ Informazioni per la giuria
            </h2>
            <p className="text-blue-900 dark:text-blue-100 leading-relaxed">
              {project.jury_info}
            </p>
          </Card>
        )}

        {/* Project Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {project.organization_name && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">🏢 Organizzazione</h3>
              <p className="font-medium">{project.organization_name}</p>
            </Card>
          )}

          {project.organization_type && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">🏷️ Tipo di organizzazione</h3>
              <p className="font-medium">{project.organization_type}</p>
            </Card>
          )}

          {project.project_category && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">📂 Categoria</h3>
              <p className="font-medium">{project.project_category}</p>
            </Card>
          )}

          {project.therapeutic_area && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">🩺 Area terapeutica</h3>
              <p className="font-medium">{project.therapeutic_area}</p>
            </Card>
          )}
        </div>

        {/* Objectives and Results */}
        {project.objectives_results && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">🎯 Obiettivi e risultati</h3>
            <div className="text-muted-foreground leading-relaxed space-y-2">
              {project.objectives_results.split('-').map((item: string, index: number) => {
                const trimmedItem = item.trim();
                if (trimmedItem) {
                  return (
                    <div key={index} className="flex items-start gap-2">
                      <span className="text-blue-600 dark:text-blue-400 mt-1">•</span>
                      <span>{trimmedItem}</span>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </Card>
        )}

        {/* Presentation Link */}
        {project.presentation_link && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">📊 Presentazione</h3>
            <a 
              href={project.presentation_link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-2"
            >
              🔗 Visualizza presentazione del progetto →
            </a>
          </Card>
        )}

        {/* Fallback message if no detailed information is available */}
        {!project.jury_info && !project.objectives_results && !project.organization_name && (
          <p className="text-lg text-muted-foreground">📝 Nessuna descrizione disponibile</p>
        )}
      </div>

      {/* Admin Note */}
      <Card className="p-6 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <h3 className="font-semibold text-lg mb-2 text-amber-800 dark:text-amber-200">
          👨‍💼 Vista amministratore
        </h3>
        <p className="text-amber-900 dark:text-amber-100">
          Questa è la vista completa del progetto che i giurati vedono durante la votazione. 
          Come amministratore, puoi visualizzare tutte le informazioni del progetto ma non puoi votare.
        </p>
      </Card>
    </div>
  );
} 