import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartBarIcon, ArrowLeftIcon, TrophyIcon, AwardIcon, StarIcon } from "lucide-react";

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

// interface for project data
interface Project {
  id: number;
  name: string;
  jury_info?: string;
  objectives_results?: string;
  organization_name?: string;
  project_title?: string;
  project_category?: string;
  organization_type?: string;
  therapeutic_area?: string;
  presentation_link?: string;
  created_at?: string;
  updated_at?: string;
}

// interface for winners
interface CategoryWinner {
  position: number;
  project: Project;
  averageScore: number;
}

interface SpecialMention {
  type: 'Giuria Tecnica' | 'Insieme Per' | 'Impatto Sociale';
  project: Project;
  score: number;
  description: string;
}

// helper function to truncate text
const truncateText = (text: string, maxLength: number = 150): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export default async function ResultsPage() {
  const supabase = await createClient();

  // check if user is authenticated
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    redirect("/auth/login");
  }

  // check if user is admin by email
  const userEmail = sessionData.session.user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !userEmail || userEmail !== adminEmail) {
    redirect("/protected?error=unauthorized");
  }

  // get all votes with user emails and flags (excluding admin)
  const { data: votesWithEmails, error: votesError } = await supabase
    .rpc('get_votes_with_emails_and_weights');

  if (votesError) {
    console.error("Error fetching votes with emails and weights:", votesError);
  }

  const normalUserVotes = (votesWithEmails as VoteWithEmailAndWeight[]) || [];

  // fetch projects and criteria
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

  // helper function to calculate weighted average for a project
  const calculateProjectAverage = (projectId: number, filterFn?: (vote: VoteWithEmailAndWeight) => boolean) => {
    const projectVotes = normalUserVotes.filter(vote => 
      vote.project_id === projectId && (!filterFn || filterFn(vote))
    );

    if (projectVotes.length === 0) return 0;

    // group by criteria and calculate average for each
    const criteriaAverages: { [key: number]: number } = {};
    
    (criteria || []).forEach(criterion => {
      const criteriaVotes = projectVotes.filter(vote => vote.criteria_id === criterion.id);
      
      if (criteriaVotes.length === 0) {
        criteriaAverages[criterion.id] = 0;
        return;
      }

      // weighted voting system: 60% associations + 40% individuals
      const associationVotes = criteriaVotes.filter(vote => vote.rappresenta_associazione);
      const individualVotes = criteriaVotes.filter(vote => !vote.rappresenta_associazione);
      
      const associationAvg = associationVotes.length > 0
        ? associationVotes.reduce((sum, vote) => sum + vote.score, 0) / associationVotes.length
        : 0;
        
      const individualAvg = individualVotes.length > 0
        ? individualVotes.reduce((sum, vote) => sum + vote.score, 0) / individualVotes.length
        : 0;

      let weightedAverage = 0;
      if (associationVotes.length > 0 && individualVotes.length > 0) {
        weightedAverage = (associationAvg * 0.6) + (individualAvg * 0.4);
      } else if (associationVotes.length > 0) {
        weightedAverage = associationAvg;
      } else if (individualVotes.length > 0) {
        weightedAverage = individualAvg;
      }

      criteriaAverages[criterion.id] = weightedAverage;
    });

    // calculate overall average
    const validAverages = Object.values(criteriaAverages).filter(avg => avg > 0);
    return validAverages.length > 0 
      ? validAverages.reduce((sum, avg) => sum + avg, 0) / validAverages.length 
      : 0;
  };

  // calculate category winners
  const categories = [
    "PATIENT SUPPORT PROGRAM",
    "EMPOWERMENT", 
    "ACCESSO E POLICY MAKING",
    "AWARENESS",
    "PATIENT EXPERIENCE"
  ];

  const categoryWinners: { [category: string]: CategoryWinner[] } = {};

  categories.forEach(category => {
    const categoryProjects = (projects || []).filter(p => p.project_category === category);
    
    const projectsWithScores = categoryProjects.map(project => ({
      project,
      averageScore: calculateProjectAverage(project.id)
    })).filter(p => p.averageScore > 0);

    // sort by average score descending and take top 3
    const sortedProjects = projectsWithScores
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3);

    categoryWinners[category] = sortedProjects.map((p, index) => ({
      position: index + 1,
      project: p.project,
      averageScore: parseFloat(p.averageScore.toFixed(1))
    }));
  });

  // calculate special mentions
  const specialMentions: SpecialMention[] = [];

  // 1. menzione speciale giuria tecnica (rappresenta_associazione = false)
  const technicalJuryProjects = (projects || []).map(project => ({
    project,
    score: calculateProjectAverage(project.id, vote => !vote.rappresenta_associazione)
  })).filter(p => p.score > 0);

  if (technicalJuryProjects.length > 0) {
    const topTechnical = technicalJuryProjects
      .sort((a, b) => b.score - a.score)[0];
    
    specialMentions.push({
      type: 'Giuria Tecnica',
      project: topTechnical.project,
      score: parseFloat(topTechnical.score.toFixed(1)),
      description: 'progetto con la media più alta sui tre criteri dai soli giurati della giuria tecnica'
    });
  }

  // 2. menzione speciale insieme per (rappresenta_associazione = true)
  const insiemePerProjects = (projects || []).map(project => ({
    project,
    score: calculateProjectAverage(project.id, vote => vote.rappresenta_associazione)
  })).filter(p => p.score > 0);

  if (insiemePerProjects.length > 0) {
    const topInsieme = insiemePerProjects
      .sort((a, b) => b.score - a.score)[0];
    
    specialMentions.push({
      type: 'Insieme Per',
      project: topInsieme.project,
      score: parseFloat(topInsieme.score.toFixed(1)),
      description: 'progetto con la media più alta sui tre criteri dai soli giurati appartenenti a insieme per'
    });
  }

  // 3. menzione speciale impatto sociale (criteria_id = 3)
  const socialImpactProjects = (projects || []).map(project => {
    const socialImpactVotes = normalUserVotes.filter(vote => 
      vote.project_id === project.id && vote.criteria_id === 3
    );

    if (socialImpactVotes.length === 0) return { project, score: 0 };

    // weighted average for social impact criterion
    const associationVotes = socialImpactVotes.filter(vote => vote.rappresenta_associazione);
    const individualVotes = socialImpactVotes.filter(vote => !vote.rappresenta_associazione);
    
    const associationAvg = associationVotes.length > 0
      ? associationVotes.reduce((sum, vote) => sum + vote.score, 0) / associationVotes.length
      : 0;
      
    const individualAvg = individualVotes.length > 0
      ? individualVotes.reduce((sum, vote) => sum + vote.score, 0) / individualVotes.length
      : 0;

    let weightedAverage = 0;
    if (associationVotes.length > 0 && individualVotes.length > 0) {
      weightedAverage = (associationAvg * 0.6) + (individualAvg * 0.4);
    } else if (associationVotes.length > 0) {
      weightedAverage = associationAvg;
    } else if (individualVotes.length > 0) {
      weightedAverage = individualAvg;
    }

    return { project, score: weightedAverage };
  }).filter(p => p.score > 0);

  if (socialImpactProjects.length > 0) {
    const topSocialImpact = socialImpactProjects
      .sort((a, b) => b.score - a.score)[0];
    
    specialMentions.push({
      type: 'Impatto Sociale',
      project: topSocialImpact.project,
      score: parseFloat(topSocialImpact.score.toFixed(1)),
      description: 'progetto con il punteggio più alto nel criterio "impatto sociale"'
    });
  }

  // get total number of normal users who voted
  const uniqueNormalUsers = new Set(normalUserVotes.map(vote => vote.user_id));
  const uniqueVoterCount = uniqueNormalUsers.size;

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Vincitori pea awards 2025</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/protected/admin" className="flex items-center gap-2">
            <ArrowLeftIcon size={16} />
            Torna alla dashboard
          </Link>
        </Button>
      </div>

      <div className="bg-[#ffea1d]/10 dark:bg-[#ffea1d] p-4 rounded-md flex flex-col gap-2 border border-[#ffea1d]/20">
        <div className="flex items-center gap-3">
          <ChartBarIcon size={20} className="text-[#04516f]" />
          <div className="text-[#04516f]">
            <span className="font-medium">giurati votanti: </span>
            <span>{uniqueVoterCount}</span>
            <span className="text-[#04516f]/70 ml-2">({normalUserVotes.length} voti totali)</span>
          </div>
        </div>
      </div>

      {/* vincitori per categoria */}
      <div className="space-y-8">
        <div className="flex items-center gap-3 mb-6">
          <TrophyIcon size={28} className="text-[#04516f]" />
          <h2 className="text-2xl font-bold">Vincitori per categoria</h2>
        </div>

        {categories.map(category => (
          <Card key={category} className="p-6">
            <h3 className="text-xl font-bold mb-4 text-[#04516f]">
              {category.toLowerCase()}
            </h3>
            
            {categoryWinners[category] && categoryWinners[category].length > 0 ? (
              <div className="space-y-4">
                {categoryWinners[category].map((winner) => (
                  <div key={winner.project.id} className={`flex items-center justify-between p-4 rounded-lg ${
                    winner.position === 1 ? 'bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                    winner.position === 2 ? 'bg-gray-100 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700' :
                    winner.position === 3 ? 'bg-orange-100 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' :
                    'bg-muted/50'
                  }`}>
                    <div className="flex items-center gap-4">
                      <Badge 
                        variant="secondary" 
                        className={`text-lg px-3 py-1 font-bold ${
                          winner.position === 1 ? 'bg-yellow-500 text-white hover:bg-yellow-600' :
                          winner.position === 2 ? 'bg-gray-500 text-white hover:bg-gray-600' :
                          winner.position === 3 ? 'bg-orange-500 text-white hover:bg-orange-600' :
                          ''
                        }`}
                      >
                        {winner.position}°
                      </Badge>
                      <div>
                        <Link 
                          href={`/protected/admin/project/${winner.project.id}`}
                          className="text-lg font-semibold text-[#04516f] hover:text-[#033d5a] dark:text-[#6ba3c7] dark:hover:text-[#8bb8d4] underline hover:no-underline transition-colors"
                        >
                          {winner.project.name}
                        </Link>
                        <p className="text-sm text-muted-foreground mt-1">
                          {truncateText(
                            winner.project.jury_info || 
                            winner.project.objectives_results || 
                            'nessuna descrizione disponibile',
                            100
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">
                        {winner.averageScore} <span className="text-sm text-muted-foreground">/ 5</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">nessun progetto votato in questa categoria</p>
            )}
          </Card>
        ))}
      </div>

      {/* menzioni speciali */}
      {specialMentions.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <StarIcon size={28} className="text-[#04516f]" />
            <h2 className="text-2xl font-bold">Menzioni speciali</h2>
          </div>

          {specialMentions.map((mention, index) => (
            <Card key={index} className="p-6 border-l-4 border-l-[#ffea1d]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <AwardIcon size={20} className="text-[#04516f]" />
                    <h3 className="text-lg font-bold text-[#04516f]">
                      menzione speciale {mention.type.toLowerCase()}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {mention.description}
                  </p>
                  <Link 
                    href={`/protected/admin/project/${mention.project.id}`}
                    className="text-xl font-semibold text-[#04516f] hover:text-[#033d5a] dark:text-[#6ba3c7] dark:hover:text-[#8bb8d4] underline hover:no-underline transition-colors"
                  >
                    {mention.project.name}
                  </Link>
                  <p className="text-sm text-muted-foreground mt-2">
                    {truncateText(
                      mention.project.jury_info || 
                      mention.project.objectives_results || 
                      'nessuna descrizione disponibile',
                      150
                    )}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <div className="text-xl font-bold">
                    {mention.score} <span className="text-sm text-muted-foreground">/ 5</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
} 