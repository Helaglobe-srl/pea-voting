import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ProjectVotingForm from "@/components/project-voting-form";

export default async function VotePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const projectId = parseInt(resolvedParams.id);
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    redirect("/auth/login");
  }

  // Fetch project details with detailed information
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`
      *,
      project_details (*)
    `)
    .eq("id", projectId)
    .single();

  if (projectError || !project) {
    redirect("/protected");
  }

  // Fetch voting criteria
  const { data: criteria, error: criteriaError } = await supabase
    .from("voting_criteria")
    .select("*")
    .order("id");

  if (criteriaError) {
    console.error("Error fetching criteria:", criteriaError);
    redirect("/protected");
  }

  // Fetch user's existing votes for this project
  const { data: existingVotes, error: votesError } = await supabase
    .from("votes")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", sessionData.session.user.id);

  if (votesError) {
    console.error("Error fetching votes:", votesError);
  }

  // Convert existing votes to a map for easier lookup
  const userVotes = existingVotes?.reduce((acc, vote) => {
    acc[vote.criteria_id] = vote.score;
    return acc;
  }, {} as Record<number, number>) || {};

  const projectDetails = project.project_details?.[0];

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🎯 {project.name}</h1>
        <Button asChild variant="outline">
          <Link href="/protected">← torna ai progetti</Link>
        </Button>
      </div>

      {/* Project Information Section */}
      {projectDetails && (
        <div className="space-y-6">
          {/* Jury Information - Most Important */}
          {projectDetails.jury_info && (
            <Card className="p-6 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
              <h2 className="text-xl font-semibold mb-4 text-blue-800 dark:text-blue-200">
                ⚖️ informazioni per la giuria
              </h2>
              <p className="text-blue-900 dark:text-blue-100 leading-relaxed">
                {projectDetails.jury_info}
              </p>
            </Card>
          )}

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectDetails.organization_name && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">🏢 organizzazione</h3>
                <p className="font-medium">{projectDetails.organization_name}</p>
              </Card>
            )}

            {projectDetails.organization_type && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">🏷️ tipo di organizzazione</h3>
                <p className="font-medium">{projectDetails.organization_type}</p>
              </Card>
            )}

            {projectDetails.project_category && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">📂 categoria</h3>
                <p className="font-medium">{projectDetails.project_category}</p>
              </Card>
            )}

            {projectDetails.therapeutic_area && (
              <Card className="p-4">
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">🩺 area terapeutica</h3>
                <p className="font-medium">{projectDetails.therapeutic_area}</p>
              </Card>
            )}


          </div>

          {/* Objectives and Results */}
          {projectDetails.objectives_results && (
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">🎯 obiettivi e risultati</h3>
              <p className="text-muted-foreground leading-relaxed">
                {projectDetails.objectives_results}
              </p>
            </Card>
          )}



          {/* Presentation Link */}
          {projectDetails.presentation_link && (
            <Card className="p-6">
              <h3 className="font-semibold text-lg mb-4">📊 presentazione</h3>
              <a 
                href={projectDetails.presentation_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline flex items-center gap-2"
              >
                🔗 visualizza presentazione del progetto →
              </a>
            </Card>
          )}
        </div>
      )}

      {/* Fallback for projects without detailed information */}
      {!projectDetails && (
        <p className="text-lg text-muted-foreground">📝 nessuna descrizione disponibile</p>
      )}

      {/* Voting Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">🗳️ vota questo progetto</h2>
        <ProjectVotingForm 
          projectId={projectId} 
          criteria={criteria || []} 
          existingVotes={userVotes} 
          userId={sessionData.session.user.id} 
        />
      </Card>
    </div>
  );
} 