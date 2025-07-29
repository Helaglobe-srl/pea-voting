import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InfoIcon, UserIcon, AlertCircleIcon, CheckCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// helper function to truncate text
const truncateText = (text: string, maxLength: number = 150): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export default async function ProtectedPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient();
  
  // await searchParams in Next.js 15+
  const params = await searchParams;

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const userEmail = sessionData.session.user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = adminEmail && userEmail === adminEmail;

  // If admin, redirect to admin dashboard
  if (isAdmin) {
    redirect("/protected/admin");
  }

  // Fetch projects from the database (only for regular users)
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select(`
      *,
      project_details (
        jury_info,
        objectives_results
      )
    `)
    .order("id");

  if (projectsError) {
    console.error("Error fetching projects:", projectsError);
  }

  // Get user's votes to check which projects they've already voted on
  const { data: userVotes, error: votesError } = await supabase
    .from("votes")
    .select("project_id, criteria_id")
    .eq("user_id", sessionData.session.user.id);

  if (votesError) {
    console.error("Error fetching user votes:", votesError);
  }

  // Get the total number of criteria to check if user completed voting for a project
  const { data: criteria, error: criteriaError } = await supabase
    .from("voting_criteria")
    .select("id");

  if (criteriaError) {
    console.error("Error fetching criteria:", criteriaError);
  }

  const totalCriteria = criteria?.length || 0;

  // Function to check if user has completed voting for a project
  const hasCompletedVoting = (projectId: number) => {
    if (!userVotes) return false;
    const projectVotes = userVotes.filter(vote => vote.project_id === projectId);
    return projectVotes.length === totalCriteria;
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          benvenuto nella piattaforma di votazione per l&apos;engagement dei pazienti
        </div>
      </div>

      {params.error === 'unauthorized' && (
        <div className="w-full">
          <div className="bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 text-sm p-3 px-5 rounded-md flex gap-3 items-center">
            <AlertCircleIcon size="16" strokeWidth={2} />
            accesso negato: solo gli amministratori possono visualizzare la pagina dei risultati
          </div>
        </div>
      )}
      
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center w-full">
          <h2 className="font-bold text-2xl">progetti disponibili per la votazione</h2>
          <div className="flex gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/protected/profile" className="flex items-center gap-2">
                <UserIcon size={16} />
                visualizza profilo
              </Link>
            </Button>
          </div>
        </div>
        
        <p className="text-muted-foreground">
          seleziona un progetto per votare sui seguenti criteri: conformità rispetto al bisogno, scalabilità e impatto sociale.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          {projects && projects.map((project, index) => {
            const hasVoted = hasCompletedVoting(project.id);
            
            return (
              <Card key={project.id} className="flex flex-col overflow-hidden border rounded-lg relative">
                {hasVoted && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-green-500 rounded-full p-1 shadow-md">
                      <CheckCircleIcon size={20} className="text-white" />
                    </div>
                  </div>
                )}
                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold">{index + 1}. {project.name}</h3>
                      {hasVoted && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                          ✓ votazione completata
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-muted-foreground flex-grow">
                    {truncateText(
                      project.project_details?.[0]?.jury_info || 
                      project.project_details?.[0]?.objectives_results || 
                      'nessuna descrizione disponibile'
                    )}
                  </p>
                  <Button asChild className="w-full mt-4" variant={hasVoted ? "outline" : "default"}>
                    <Link href={`/protected/vote/${project.id}`}>
                      {hasVoted ? "aggiorna il tuo voto" : "vota questo progetto"}
                    </Link>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
