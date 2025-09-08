import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UsersIcon, BarChart3Icon, UploadIcon } from "lucide-react";

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

interface Project {
  id: number;
  name: string;
  project_category: string | null;
  organization_name?: string;
  [key: string]: string | number | null | undefined;
}

export default async function AdminDashboard() {
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

  // Get all votes with user emails and weights (excluding admin)
  const { data: votesWithEmails, error: votesError } = await supabase
    .rpc('get_votes_with_emails_and_weights');

  if (votesError) {
    console.error("Error fetching votes with emails and weights:", votesError);
  }

  const regularUserVotes = (votesWithEmails as VoteWithEmailAndWeight[]) || [];
  
  // Get total count of registered users (excluding admin) from auth.users using RPC
  const { data: totalUsersCount, error: usersCountError } = await supabase
    .rpc('get_total_users_count', { admin_email_param: adminEmail });
  
  if (usersCountError) {
    console.error("Error fetching total users count:", usersCountError);
  }

  // Get unique users from votes for the matrix (users who have voted)
  const userEmailMap = new Map<string, string>();
  regularUserVotes.forEach(vote => {
    if (vote.email) {
      userEmailMap.set(vote.user_id, vote.email);
    }
  });
  
  const regularUsers = Array.from(userEmailMap.entries()).map(([userId, email]) => ({
    id: userId,
    email: email
  }));

  // Total registered users count (for "Giurati totali")
  const totalJurors = (totalUsersCount as number) || 0;
  
  // Calculate number of users who have voted at least 1 project (Giurati Votanti)
  const usersWhoVoted = new Set<string>();
  const associationUsers = new Set<string>();
  const individualUsers = new Set<string>();
  
  regularUserVotes.forEach(vote => {
    usersWhoVoted.add(vote.user_id);
    if (vote.rappresenta_associazione) {
      associationUsers.add(vote.user_id);
    } else {
      individualUsers.add(vote.user_id);
    }
  });
  
  const giuratiVotanti = usersWhoVoted.size;
  const rappresentantiAssociazioni = associationUsers.size;
  const giuratiIndividuali = individualUsers.size;
  
  // Fetch projects and criteria
  const { data: projects } = await supabase.from("projects").select("*").order("id");

  // Group projects by category and sort by organization_name
  const projectsByCategory = projects?.reduce((acc, project) => {
    const category = project.project_category || 'senza categoria';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(project);
    return acc;
  }, {} as Record<string, Project[]>) || {};

  // Sort projects within each category by organization_name (ascending)
  Object.keys(projectsByCategory).forEach(category => {
    projectsByCategory[category].sort((a: Project, b: Project) => {
      const orgA = a.organization_name || '';
      const orgB = b.organization_name || '';
      return orgA.localeCompare(orgB);
    });
  });

  // Fetch voting criteria for display
  const { data: criteria } = await supabase.from("voting_criteria").select("*").order("id");

  // Create vote matrix: user -> project -> criteria -> score
  const voteMatrix = new Map<string, Map<number, Map<number, number>>>();
  regularUserVotes.forEach(vote => {
    const userId = vote.user_id;
    const projectId = vote.project_id;
    const criteriaId = vote.criteria_id;
    
    if (!voteMatrix.has(userId)) {
      voteMatrix.set(userId, new Map());
    }
    if (!voteMatrix.get(userId)!.has(projectId)) {
      voteMatrix.get(userId)!.set(projectId, new Map());
    }
    voteMatrix.get(userId)!.get(projectId)!.set(criteriaId, vote.score);
  });

  // Get individual criteria scores for a user-project combination
  const getIndividualScores = (userId: string, projectId: number): { [criteriaId: number]: number } | null => {
    const userVotes = voteMatrix.get(userId);
    if (!userVotes || !userVotes.has(projectId)) return null;
    
    const projectVotes = userVotes.get(projectId)!;
    const scores: { [criteriaId: number]: number } = {};
    
    projectVotes.forEach((score, criteriaId) => {
      scores[criteriaId] = score;
    });
    
    return scores;
  };

  // Calculate averages for each project-user combination
  const getAverageScore = (userId: string, projectId: number): number | null => {
    const userVotes = voteMatrix.get(userId);
    if (!userVotes || !userVotes.has(projectId)) return null;
    
    const projectVotes = userVotes.get(projectId)!;
    const scores = Array.from(projectVotes.values());
    
    if (scores.length === 0) return null;
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return parseFloat(average.toFixed(1));
  };

  // Calculate project averages across all users
  const getProjectAverage = (projectId: number): number => {
    const allScores: number[] = [];
    regularUsers.forEach(user => {
      const avgScore = getAverageScore(user.id, projectId);
      if (avgScore !== null) allScores.push(avgScore);
    });
    
    if (allScores.length === 0) return 0;
    const average = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
    return parseFloat(average.toFixed(1));
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">🛠️ Pannello amministratore</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Panoramica completa delle votazioni</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Link href="/protected/admin/upload" className="flex items-center justify-center gap-2">
              <UploadIcon size={16} />
              <span className="hidden xs:inline">carica excel</span>
              <span className="xs:hidden">carica</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Link href="/protected/results" className="flex items-center justify-center gap-2">
              <BarChart3Icon size={16} />
              <span className="hidden xs:inline">risultati dettagliati</span>
              <span className="xs:hidden">risultati</span>
            </Link>
          </Button>
          {/* Dashboard label removed as requested */}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <UsersIcon className="h-8 w-8 text-[#04516f]" />
            <div>
              <p className="text-sm text-muted-foreground">Giurati totali</p>
              <p className="text-2xl font-bold">{totalJurors}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BarChart3Icon className="h-8 w-8 text-[#ffea1d]" />
            <div>
              <p className="text-sm text-muted-foreground">Giurati votanti</p>
              <p className="text-2xl font-bold">{giuratiVotanti}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-green-600 rounded flex items-center justify-center text-white text-sm font-bold">
              A
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rappresentanti associazioni</p>
              <p className="text-2xl font-bold">{rappresentantiAssociazioni}</p>
              <p className="text-xs text-muted-foreground">(peso 60%)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white text-sm font-bold">
              I
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Giurati individuali</p>
              <p className="text-2xl font-bold">{giuratiIndividuali}</p>
              <p className="text-xs text-muted-foreground">(peso 40%)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#04516f] rounded flex items-center justify-center text-white text-sm font-bold">
              P
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Progetti totali</p>
              <p className="text-2xl font-bold">{projects?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Criteria and Legend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">📋 Criteri di valutazione</h3>
          <div className="space-y-3 text-sm">
            {criteria?.map((criterion, index) => (
              <div key={criterion.id} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#04516f] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-[#04516f]">{criterion.name}</div>
                  <div className="text-muted-foreground text-xs">{criterion.description}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        <Card className="p-4">
          <h3 className="font-semibold mb-3">🎨 Legenda punteggi</h3>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#04516f] rounded"></div>
              <span>4.0-5.0 (eccellente)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-[#ffea1d] rounded"></div>
              <span>3.0-3.9 (buono)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>2.0-2.9 (discreto)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>1.0-1.9 (scarso)</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Voting Matrix Tables by Category */}
      {Object.entries(projectsByCategory).map(([category, categoryProjects]) => (
        <Card key={category} className="p-6">
          <h2 className="text-xl font-semibold mb-6">📊 {category}</h2>
          
          {/* Mobile-first responsive table */}
          <div className="block lg:hidden">
            {/* Mobile Card Layout */}
            <div className="space-y-4">
              {regularUsers.map(user => {
                const userScores = (categoryProjects as Project[])?.map(project => getAverageScore(user.id, project.id)).filter((score): score is number => score !== null) || [];
                const userAverage = userScores.length > 0 
                  ? parseFloat((userScores.reduce((sum: number, score: number) => sum + score, 0) / userScores.length).toFixed(1))
                  : 0;

                return (
                  <Card key={user.id} className="p-4">
                    <div className="space-y-3">
                      <div className="font-medium text-sm border-b pb-2">
                        {user.email}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {(categoryProjects as Project[])?.map(project => {
                          const score = getAverageScore(user.id, project.id);
                          const individualScores = getIndividualScores(user.id, project.id);
                          return (
                            <div key={project.id} className="flex flex-col gap-2 p-2 bg-muted/50 rounded">
                              <div className="flex justify-between items-center">
                                <Link href={`/protected/admin/project/${project.id}`} className="flex-1 min-w-0 hover:bg-muted/30 transition-colors rounded p-1">
                                  <div className="font-medium truncate text-[#04516f] hover:text-[#033d5a] dark:text-[#6ba3c7] dark:hover:text-[#8bb8d4] underline">
                                    {project.name}
                                  </div>
                                  {project.organization_name && (
                                    <div className="text-xs text-muted-foreground truncate">
                                      {project.organization_name}
                                    </div>
                                  )}
                                </Link>
                                {score !== null ? (
                                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ml-2 flex-shrink-0 ${
                                    score >= 4 ? 'bg-[#04516f] text-white' : 
                                    score >= 3 ? 'bg-[#ffea1d] text-[#04516f]' : 
                                    score >= 2 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                                  }`}>
                                    avg: {score}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground ml-2 flex-shrink-0">-</span>
                                )}
                              </div>
                              {individualScores && criteria && (
                                <div className="flex flex-wrap gap-1 text-xs">
                                  {criteria.map(criterion => (
                                    <div key={criterion.id} className="flex items-center gap-1 px-2 py-1 bg-background rounded border">
                                      <span className="text-muted-foreground">{criterion.name.substring(0, 10)}:</span>
                                      <span className="font-medium">
                                        {individualScores[criterion.id] || '-'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-right text-sm font-bold border-t pt-2">
                        Media Utente: {userAverage > 0 ? userAverage : '-'}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Desktop Table Layout */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="p-3 text-left border">email utente</th>
                  {(categoryProjects as Project[])?.map(project => (
                    <th key={project.id} className="p-3 text-center border min-w-[150px]">
                      <Link href={`/protected/admin/project/${project.id}`} className="block hover:bg-muted/50 transition-colors rounded p-1">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-sm text-[#04516f] hover:text-[#033d5a] dark:text-[#6ba3c7] dark:hover:text-[#8bb8d4] underline">
                            {project.name}
                          </div>
                          {project.organization_name && (
                            <div className="text-xs text-muted-foreground font-normal">
                              {project.organization_name}
                            </div>
                          )}
                        </div>
                      </Link>
                    </th>
                  ))}
                  <th className="p-3 text-center border">media utente</th>
                </tr>
              </thead>
              <tbody>
                {regularUsers.map(user => {
                  const userScores = (categoryProjects as Project[])?.map(project => getAverageScore(user.id, project.id)).filter((score): score is number => score !== null) || [];
                  const userAverage = userScores.length > 0 
                    ? parseFloat((userScores.reduce((sum: number, score: number) => sum + score, 0) / userScores.length).toFixed(1))
                    : 0;

                  return (
                    <tr key={user.id} className="hover:bg-muted/50">
                      <td className="p-3 border font-medium">{user.email}</td>
                      {(categoryProjects as Project[])?.map(project => {
                        const score = getAverageScore(user.id, project.id);
                        const individualScores = getIndividualScores(user.id, project.id);
                        return (
                          <td key={project.id} className="p-3 text-center border">
                            {score !== null && individualScores ? (
                              <div className="flex flex-col gap-1 items-center">
                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  score >= 4 ? 'bg-[#04516f] text-white' : 
                                  score >= 3 ? 'bg-[#ffea1d] text-[#04516f]' : 
                                  score >= 2 ? 'bg-orange-500 text-white' : 'bg-red-500 text-white'
                                }`}>
                                  avg: {score}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {criteria?.map((criterion, index) => (
                                    <span key={criterion.id}>
                                      {individualScores[criterion.id] || '-'}
                                      {index < criteria.length - 1 && ' | '}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="p-3 text-center border font-bold">
                        {userAverage > 0 ? userAverage : '-'}
                      </td>
                    </tr>
                  );
                })}
                {/* Project averages row */}
                <tr className="bg-muted font-bold">
                  <td className="p-3 border">medie progetti</td>
                  {(categoryProjects as Project[])?.map(project => {
                    const projectAvg = getProjectAverage(project.id);
                    return (
                      <td key={project.id} className="p-3 text-center border font-bold">
                        {projectAvg > 0 ? projectAvg : '-'}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center border">
                    {categoryProjects && (categoryProjects as Project[]).length > 0 
                      ? parseFloat(((categoryProjects as Project[]).reduce((sum: number, project: Project) => sum + getProjectAverage(project.id), 0) / (categoryProjects as Project[]).length).toFixed(1))
                      : '-'
                    }
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ))}

    </div>
  );
} 