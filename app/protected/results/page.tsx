import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartBarIcon, ArrowLeftIcon } from "lucide-react";
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface VoteWithEmailAndWeight {
  id: number;
  user_id: string;
  project_id: number;
  criteria_id: number;
  score: number;
  created_at: string;
  email: string;
  rappresenta_associazione: boolean;
}

// helper function to truncate text
const truncateText = (text: string, maxLength: number = 150): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

interface ResultsPageProps {
  searchParams: {
    page?: string;
  };
}

export default async function ResultsPage({ searchParams }: ResultsPageProps) {
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

  // Get all votes with user emails and association flag (excluding admin)
  const { data: votesWithEmails, error: votesError } = await supabase
    .rpc('get_votes_with_emails_and_weights');

  if (votesError) {
    console.error("Error fetching votes with emails and weights:", votesError);
  }

  const normalUserVotes = (votesWithEmails as VoteWithEmailAndWeight[]) || [];

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

  // For each project, get weighted average score for each criteria (from normal users only)
  const projectResults = await Promise.all(
    (projects || []).map(async (project) => {
      const results = await Promise.all(
        (criteria || []).map(async (criterion) => {
          // Filter votes for this project and criteria from normal users only
          const projectCriteriaVotes = normalUserVotes.filter(
            vote => vote.project_id === project.id && vote.criteria_id === criterion.id
          );

          // calculate weighted average based on voter type
          // weighted voting system:
          // - rappresentanti associazioni: 60% weight  
          // - giurati individuali: 40% weight
          // if only one type has voted, use their average directly
          const associationVotes = projectCriteriaVotes.filter(vote => vote.rappresenta_associazione);
          const individualVotes = projectCriteriaVotes.filter(vote => !vote.rappresenta_associazione);
          
          const associationAvg = associationVotes.length > 0
            ? associationVotes.reduce((sum, vote) => sum + vote.score, 0) / associationVotes.length
            : 0;
            
          const individualAvg = individualVotes.length > 0
            ? individualVotes.reduce((sum, vote) => sum + vote.score, 0) / individualVotes.length
            : 0;

          // weighted average: 60% associations + 40% individuals
          let weightedAverage = 0;
          if (associationVotes.length > 0 && individualVotes.length > 0) {
            weightedAverage = (associationAvg * 0.6) + (individualAvg * 0.4);
          } else if (associationVotes.length > 0) {
            // only association votes
            weightedAverage = associationAvg;
          } else if (individualVotes.length > 0) {
            // only individual votes
            weightedAverage = individualAvg;
          }

          return {
            criterionId: criterion.id,
            criterionName: criterion.name,
            averageScore: parseFloat(weightedAverage.toFixed(1)),
            voteCount: projectCriteriaVotes.length,
            associationVoteCount: associationVotes.length,
            individualVoteCount: individualVotes.length,
            associationAvg: parseFloat(associationAvg.toFixed(1)),
            individualAvg: parseFloat(individualAvg.toFixed(1)),
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
  
  // Count association vs individual voters
  const associationVoters = new Set(
    normalUserVotes
      .filter(vote => vote.rappresenta_associazione)
      .map(vote => vote.user_id)
  );
  const individualVoters = new Set(
    normalUserVotes
      .filter(vote => !vote.rappresenta_associazione)
      .map(vote => vote.user_id)
  );
  
  const associationVoterCount = associationVoters.size;
  const individualVoterCount = individualVoters.size;

  // pagination logic
  const currentPage = parseInt(searchParams.page || "1", 10);
  const itemsPerPage = 10;
  const totalProjects = projectResults.length;
  const totalPages = Math.ceil(totalProjects / itemsPerPage);
  
  // ensure current page is valid
  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));
  
  // get projects for current page
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPageProjects = projectResults.slice(startIndex, endIndex);

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

      <div className="bg-[#ffea1d]/10 dark:bg-[#ffea1d] p-4 rounded-md flex flex-col gap-2 border border-[#ffea1d]/20">
        <div className="flex items-center gap-3">
          <ChartBarIcon size={20} className="text-[#04516f]" />
          <div className="text-[#04516f]">
            <span className="font-medium">Giurati votanti: </span>
            <span>{uniqueVoterCount}</span>
            <span className="text-[#04516f]/70 ml-2">({normalUserVotes.length} voti totali)</span>
            <span className="text-[#04516f]/70 ml-4">
              Pagina {validCurrentPage} di {totalPages} 
              ({totalProjects} progetti totali)
            </span>
          </div>
        </div>
        <div className="text-[#04516f] text-sm flex items-center gap-4">
          <span>
            <span className="font-medium">Rappresentanti associazioni:</span> {associationVoterCount} 
            <span className="text-[#04516f]/70">(peso 60%)</span>
          </span>
          <span>
            <span className="font-medium">Giurati individuali:</span> {individualVoterCount}
            <span className="text-[#04516f]/70">(peso 40%)</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {currentPageProjects.map(({ project, criteriaResults, overallAverage }, index) => (
          <Card key={project.id} className="p-6 pea-card-hover">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">
                {startIndex + index + 1}. 
                <Link 
                  href={`/protected/admin/project/${project.id}`}
                  className="text-[#04516f] hover:text-[#033d5a] dark:text-[#6ba3c7] dark:hover:text-[#8bb8d4] underline hover:no-underline transition-colors ml-2"
                >
                  {project.name}
                </Link>
              </h2>
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
                <div key={result.criterionId} className="flex flex-col gap-2">
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
                  {(result.associationVoteCount > 0 || result.individualVoteCount > 0) && (
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      {result.associationVoteCount > 0 && (
                        <span>
                          Associazioni: {result.associationAvg}/5 ({result.associationVoteCount} vot{result.associationVoteCount !== 1 ? 'i' : 'o'})
                        </span>
                      )}
                      {result.individualVoteCount > 0 && (
                        <span>
                          Individuali: {result.individualAvg}/5 ({result.individualVoteCount} vot{result.individualVoteCount !== 1 ? 'i' : 'o'})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination className="mt-8">
          <PaginationContent>
            {validCurrentPage > 1 && (
              <PaginationItem>
                <Link href={`/protected/results?page=${validCurrentPage - 1}`}>
                  <PaginationPrevious />
                </Link>
              </PaginationItem>
            )}
            
            {/* show first page if not visible */}
            {validCurrentPage > 3 && (
              <>
                <PaginationItem>
                  <Link href="/protected/results?page=1">
                    <PaginationLink>1</PaginationLink>
                  </Link>
                </PaginationItem>
                {validCurrentPage > 4 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
              </>
            )}
            
            {/* show page numbers around current page */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = Math.max(1, validCurrentPage - 2) + i;
              if (page > totalPages) return null;
              
              return (
                <PaginationItem key={page}>
                  <Link href={`/protected/results?page=${page}`}>
                    <PaginationLink isActive={page === validCurrentPage}>
                      {page}
                    </PaginationLink>
                  </Link>
                </PaginationItem>
              );
            }).filter(Boolean)}
            
            {/* show last page if not visible */}
            {validCurrentPage < totalPages - 2 && (
              <>
                {validCurrentPage < totalPages - 3 && (
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                )}
                <PaginationItem>
                  <Link href={`/protected/results?page=${totalPages}`}>
                    <PaginationLink>{totalPages}</PaginationLink>
                  </Link>
                </PaginationItem>
              </>
            )}
            
            {validCurrentPage < totalPages && (
              <PaginationItem>
                <Link href={`/protected/results?page=${validCurrentPage + 1}`}>
                  <PaginationNext />
                </Link>
              </PaginationItem>
            )}
          </PaginationContent>
        </Pagination>
      )}

    </div>
  );
} 