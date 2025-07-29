import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, UsersIcon, BarChart3Icon, UploadIcon } from "lucide-react";

interface VoteWithEmail {
  id: number;
  user_id: string;
  project_id: number;
  criteria_id: number;
  score: number;
  created_at: string;
  email: string;
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

  // Get all votes with user emails (excluding admin)
  const { data: votesWithEmails, error: votesError } = await supabase
    .rpc('get_votes_with_emails');

  if (votesError) {
    console.error("Error fetching votes with emails:", votesError);
  }

  const regularUserVotes = (votesWithEmails as VoteWithEmail[]) || [];
  
  // Get unique regular users
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
  
  // Fetch projects and criteria
  const { data: projects } = await supabase.from("projects").select("*").order("id");

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🛠️ admin dashboard</h1>
          <p className="text-muted-foreground">comprehensive voting overview (normal users only)</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/protected/admin/upload" className="flex items-center gap-2">
              <UploadIcon size={16} />
              upload excel
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/protected/results" className="flex items-center gap-2">
              <BarChart3Icon size={16} />
              detailed results
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/protected/profile" className="flex items-center gap-2">
              <ArrowLeftIcon size={16} />
              profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <UsersIcon className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">normal users</p>
              <p className="text-2xl font-bold">{regularUsers.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <BarChart3Icon className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">total votes</p>
              <p className="text-2xl font-bold">{regularUserVotes.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-purple-500 rounded flex items-center justify-center text-white text-sm font-bold">
              P
            </div>
            <div>
              <p className="text-sm text-muted-foreground">projects</p>
              <p className="text-2xl font-bold">{projects?.length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Voting Matrix Table */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">📊 voting matrix - average scores per user</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted">
                <th className="p-3 text-left border">user email</th>
                {projects?.map(project => (
                  <th key={project.id} className="p-3 text-center border min-w-[120px]">
                    {project.name}
                  </th>
                ))}
                <th className="p-3 text-center border">user average</th>
              </tr>
            </thead>
            <tbody>
              {regularUsers.map(user => {
                const userScores = projects?.map(project => getAverageScore(user.id, project.id)).filter((score): score is number => score !== null) || [];
                const userAverage = userScores.length > 0 
                  ? parseFloat((userScores.reduce((sum, score) => sum + score, 0) / userScores.length).toFixed(1))
                  : 0;

                return (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="p-3 border font-medium">{user.email}</td>
                    {projects?.map(project => {
                      const score = getAverageScore(user.id, project.id);
                      return (
                        <td key={project.id} className="p-3 text-center border">
                          {score !== null ? (
                            <span className={`inline-block px-2 py-1 rounded text-white text-xs font-medium ${
                              score >= 4 ? 'bg-green-500' : 
                              score >= 3 ? 'bg-yellow-500' : 
                              score >= 2 ? 'bg-orange-500' : 'bg-red-500'
                            }`}>
                              {score}
                            </span>
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
                <td className="p-3 border">project averages</td>
                {projects?.map(project => {
                  const projectAvg = getProjectAverage(project.id);
                  return (
                    <td key={project.id} className="p-3 text-center border">
                      {projectAvg > 0 ? projectAvg : '-'}
                    </td>
                  );
                })}
                <td className="p-3 text-center border">
                  {projects && projects.length > 0 
                    ? parseFloat((projects.reduce((sum, project) => sum + getProjectAverage(project.id), 0) / projects.length).toFixed(1))
                    : '-'
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">🎨 score legend</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>4.0-5.0 (excellent)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>3.0-3.9 (good)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>2.0-2.9 (fair)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>1.0-1.9 (poor)</span>
          </div>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        note: admin votes are excluded from this view. only votes from normal users are displayed.
      </div>
    </div>
  );
} 