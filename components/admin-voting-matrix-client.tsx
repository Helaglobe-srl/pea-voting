'use client';

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { VotingMatrixLoading } from "./admin-loading-skeleton";
import { exportAdminVotingMatrix } from "@/lib/excel-export";
import { FileSpreadsheetIcon } from "lucide-react";

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

interface Juror {
  user_id: string;
  email: string;
  rappresenta_associazione: boolean;
  nome: string | null;
  cognome: string | null;
}

interface Project {
  id: number;
  name: string;
  project_category: string | null;
  organization_name?: string;
  [key: string]: string | number | null | undefined;
}

interface Criterion {
  id: number;
  name: string;
  description: string;
}

interface AdminVotingMatrixClientProps {
  initialData: {
    votes: VoteWithEmailAndWeight[];
    jurors: Juror[];
    projects: Project[];
    criteria: Criterion[];
  };
}

export function AdminVotingMatrixClient({ initialData }: AdminVotingMatrixClientProps) {
  const [isProcessing, setIsProcessing] = useState(true);
  const [processedData, setProcessedData] = useState<{
    projectsByCategory: Record<string, Project[]>;
    regularUsers: { id: string; email: string; rappresenta_associazione: boolean; nome: string | null; cognome: string | null }[];
    voteMatrix: Map<string, Map<number, Map<number, number>>>;
  } | null>(null);

  useEffect(() => {
    // use settimeout to allow the ui to render first
    setTimeout(() => {
      const { votes, jurors, projects } = initialData;

      // use all jurors instead of just those who voted
      const regularUsers = jurors.map(juror => ({
        id: juror.user_id,
        email: juror.email,
        rappresenta_associazione: juror.rappresenta_associazione,
        nome: juror.nome,
        cognome: juror.cognome
      }));

      // group projects by category and sort by organization_name
      const projectsByCategory = projects?.reduce((acc, project) => {
        const category = project.project_category || 'senza categoria';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(project);
        return acc;
      }, {} as Record<string, Project[]>) || {};

      // sort projects within each category by organization_name (ascending)
      Object.keys(projectsByCategory).forEach(category => {
        projectsByCategory[category].sort((a: Project, b: Project) => {
          const orgA = a.organization_name || '';
          const orgB = b.organization_name || '';
          return orgA.localeCompare(orgB);
        });
      });

      // create vote matrix: user -> project -> criteria -> score
      const voteMatrix = new Map<string, Map<number, Map<number, number>>>();
      votes.forEach(vote => {
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

      setProcessedData({
        projectsByCategory,
        regularUsers,
        voteMatrix
      });
      setIsProcessing(false);
    }, 100); // small delay to ensure ui renders
  }, [initialData]);

  if (isProcessing || !processedData) {
    return <VotingMatrixLoading />;
  }

  const { projectsByCategory, regularUsers, voteMatrix } = processedData;
  const { criteria, votes, jurors, projects } = initialData;

  // handle excel export
  const handleExportToExcel = () => {
    exportAdminVotingMatrix(votes, jurors, projects, criteria);
  };

  // get individual criteria scores for a user-project combination
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

  // calculate averages for each project-user combination
  const getAverageScore = (userId: string, projectId: number): number | null => {
    const userVotes = voteMatrix.get(userId);
    if (!userVotes || !userVotes.has(projectId)) return null;
    
    const projectVotes = userVotes.get(projectId)!;
    const scores = Array.from(projectVotes.values());
    
    if (scores.length === 0) return null;
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return parseFloat(average.toFixed(1));
  };

  // calculate project averages across all users
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
    <>
      {/* export button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📊 Matrice di votazione</h2>
        <Button onClick={handleExportToExcel} variant="outline" className="flex items-center gap-2">
          <FileSpreadsheetIcon size={16} />
          Esporta Excel
        </Button>
      </div>

      {/* voting matrix tables by category */}
      {Object.entries(projectsByCategory).map(([category, categoryProjects]) => (
        <Card key={category} className="p-6">
          <h3 className="text-xl font-semibold mb-6">📊 {category}</h3>
          
          {/* mobile-first responsive table */}
          <div className="block lg:hidden">
            {/* mobile card layout */}
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

          {/* desktop table layout */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-muted">
                  <th className="p-3 text-left border sticky left-0 bg-muted z-10">Giurato</th>
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
                       <td className="p-3 border font-medium sticky left-0 bg-background z-10 hover:bg-muted/50">{user.email}</td>
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
                 {/* project averages row */}
                 <tr className="bg-muted font-bold">
                   <td className="p-3 border sticky left-0 bg-muted z-10">medie progetti</td>
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
    </>
  );
}
