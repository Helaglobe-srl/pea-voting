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
    .select("*")
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

  // Fetch all projects to determine the next project
  const { data: allProjects } = await supabase
    .from("projects")
    .select("id")
    .order("id");

  // Get all user's votes to check completion status
  const { data: allUserVotes } = await supabase
    .from("votes")
    .select("project_id, criteria_id")
    .eq("user_id", sessionData.session.user.id);

  const totalCriteria = criteria?.length || 0;

  // Function to check if user has completed voting for a project
  const hasCompletedVoting = (checkProjectId: number) => {
    if (!allUserVotes) return false;
    const projectVotes = allUserVotes.filter(vote => vote.project_id === checkProjectId);
    return projectVotes.length === totalCriteria;
  };

  // Find the minimum project ID among those that the user hasn't completed voting on yet
  // Exclude the current project since they're about to vote on it
  const unvotedProjects = allProjects?.filter(p => 
    p.id !== projectId && !hasCompletedVoting(p.id)
  ) || [];
  const nextProjectId = unvotedProjects.length > 0 ? 
    Math.min(...unvotedProjects.map(p => p.id)) : undefined;

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">🎯 {project.name}</h1>
        <Button asChild variant="outline">
          <Link href="/protected">← Torna ai progetti</Link>
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
            <p className="text-muted-foreground leading-relaxed">
              {project.objectives_results}
            </p>
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

      {/* Voting Section */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">🗳️ Vota questo progetto</h2>
        <ProjectVotingForm 
          projectId={projectId} 
          criteria={criteria || []} 
          existingVotes={userVotes} 
          userId={sessionData.session.user.id}
          nextProjectId={nextProjectId}
        />
      </Card>
    </div>
  );
} 