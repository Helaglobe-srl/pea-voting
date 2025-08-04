import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartBarIcon, ArrowLeftIcon } from "lucide-react";

interface VoteWithEmail {
  id: number;
  user_id: string;
  project_id: number;
  criteria_id: number;
  score: number;
  created_at: string;
  email: string;
}

// helper function to truncate text
const truncateText = (text: string, maxLength: number = 150): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export default async function ResultsPage() {
  const supabase = await createClient();

  // Check if user is authenticated
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    redirect("/auth/login");
  }

  // Check if user is admin by email
  const userEmail = sessionData.session.user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || userEmail !== adminEmail) {
    redirect("/protected?error=unauthorized");
  }

  // Get all votes with user emails (excluding admin)
  const { data: votesWithEmails, error: votesError } = await supabase
    .rpc('get_votes_with_emails');

  if (votesError) {
    console.error("Error fetching votes with emails:", votesError);
  }

  const normalUserVotes = (votesWithEmails as VoteWithEmail[]) || [];

  // Fetch projects and criteria
  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select("*")
    .order("id");

  const { data: criteria, error: criteriaError } = await supabase
    .from("voting_criteria")
    .select("*")
    .order("id");

  if (projectsError) {
    console.error("Error fetching projects:", projectsError);
  }

  if (criteriaError) {
    console.error("Error fetching criteria:", criteriaError);
  }

  // For each project, get average score for each criteria (from normal users only)
  const projectResults = await Promise.all(
    (projects || []).map(async (project) => {
      const results = await Promise.all(
        (criteria || []).map(async (criterion) => {
          // Filter votes for this project and criteria from normal users only
          const projectCriteriaVotes = normalUserVotes.filter(
            vote => vote.project_id === project.id && vote.criteria_id === criterion.id
          );

          const scores = projectCriteriaVotes.map(vote => vote.score);
          const averageScore = scores.length > 0
            ? scores.reduce((sum, score) => sum + score, 0) / scores.length
            : 0;

          return {
            criterionId: criterion.id,
            criterionName: criterion.name,
            averageScore: parseFloat(averageScore.toFixed(1)),
            voteCount: scores.length,
          };
        })
      );

      // Calculate overall average for the project
      const overallAverage = results.length > 0
        ? results.reduce((sum, result) => sum + result.averageScore, 0) / results.length
        : 0;

      return {
        project,
        criteriaResults: results,
        overallAverage: parseFloat(overallAverage.toFixed(1)),
      };
    })
  );

  // Get total number of normal users who voted
  const uniqueNormalUsers = new Set(normalUserVotes.map(vote => vote.user_id));
  const uniqueVoterCount = uniqueNormalUsers.size;

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Risultati della votazione</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/protected/admin" className="flex items-center gap-2">
            <ArrowLeftIcon size={16} />
            torna al dashboard
          </Link>
        </Button>
      </div>

      <div className="bg-[#ffea1d]/10 dark:bg-[#ffea1d] p-4 rounded-md flex items-center gap-3 border border-[#ffea1d]/20">
        <ChartBarIcon size={20} className="text-[#04516f]" />
        <div className="text-[#04516f]">
          <span className="font-medium">Giurati votanti: </span>
          <span>{uniqueVoterCount}</span>
          <span className="text-[#04516f]/70 ml-2">({normalUserVotes.length} voti totali)</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {projectResults.map(({ project, criteriaResults, overallAverage }, index) => (
          <Card key={project.id} className="p-6 pea-card-hover">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{index + 1}. {project.name}</h2>
              <div className="text-xl font-bold">
                {overallAverage} <span className="text-sm text-muted-foreground">/ 5</span>
              </div>
            </div>
            
            <p className="text-muted-foreground mb-6">
              {truncateText(
                project.jury_info || 
                project.objectives_results || 
                'nessuna descrizione disponibile'
              )}
            </p>
            
            <div className="space-y-4">
              {criteriaResults.map((result) => (
                <div key={result.criterionId} className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{result.criterionName}</span>
                    <span className="text-sm">
                      {result.averageScore} <span className="text-xs text-muted-foreground">/ 5</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({result.voteCount} vot{result.voteCount !== 1 ? 'i' : 'o'})
                      </span>
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-accent h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(result.averageScore / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

    </div>
  );
} 