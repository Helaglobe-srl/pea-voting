import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { UserIcon, AlertCircleIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, InfoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UserVote {
  project_id: number;
  criteria_id: number;
}

// helper function to truncate text
const truncateText = (text: string, maxLength: number = 150): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

export default async function ProtectedPage({ searchParams }: { searchParams: Promise<{ error?: string; page?: string }> }) {
  const supabase = await createClient();
  
  // await searchParams in Next.js 15+
  const params = await searchParams;
  
  // pagination setup
  const currentPage = parseInt(params.page || '1', 10);
  const projectsPerPage = 9;

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
    .select("*")
    .order("id");

  if (projectsError) {
    console.error("Error fetching projects:", projectsError);
  }

  // Get user's votes to check which projects they've already voted on
  const { data: userVotes, error: votesError } = await supabase
    .rpc('get_user_votes');

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
    const projectVotes = (userVotes as UserVote[]).filter((vote: UserVote) => vote.project_id === projectId);
    return projectVotes.length === totalCriteria;
  };

  // pagination calculations
  const totalProjects = projects?.length || 0;
  const totalPages = Math.ceil(totalProjects / projectsPerPage);
  const startIndex = (currentPage - 1) * projectsPerPage;
  const endIndex = startIndex + projectsPerPage;
  const currentProjects = projects?.slice(startIndex, endIndex) || [];

  // calculate voting progress
  const completedProjects = projects?.filter(project => hasCompletedVoting(project.id)).length || 0;
  const remainingProjects = totalProjects - completedProjects;
  const progressPercentage = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

  return (
    <div className="flex-1 w-full flex flex-col gap-12">
      <div className="w-full">
        <div className="bg-[#04516f] rounded-xl p-6 shadow-lg">
          <div className="flex flex-col items-center text-center mb-4">
            <Image
              src="/pea-banner.png"
              alt="Patient Engagement Award"
              width={420}
              height={200}
              className="h-48 w-auto mb-4"
              priority
            />
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-full p-2">
                <UserIcon size="24" strokeWidth={2} className="text-white" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">
                Benvenuto nella piattaforma di votazione del Patient Engagement Award
              </h1>
            </div>
          </div>
          <p className="text-white/90 text-sm sm:text-base text-center">
            Vota i progetti per il Patient Engagement Award e contribuisci a premiare le migliori iniziative per il coinvolgimento dei pazienti
          </p>
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

      {/* voting progress diagram */}
      <div className="w-full">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-lg sm:text-xl border-b pb-3">Il tuo progresso di votazione</h2>
            
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* progress bar */}
              <div className="flex-1">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-muted-foreground">Progresso generale</span>
                  <span className="text-sm font-bold">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[#04516f] to-[#033d5a] dark:from-[#6ba3c7] dark:to-[#8bb8d4] transition-all duration-300 ease-in-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>

              {/* statistics */}
              <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
                <div className="flex items-center gap-3 bg-[#ffea1d]/10 dark:bg-[#ffea1d]/20 p-3 rounded-lg">
                  <div className="bg-[#ffea1d] rounded-full p-2">
                    <CheckCircleIcon size="16" className="text-[#04516f]" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#04516f] dark:text-[#6ba3c7]">{completedProjects}</div>
                    <div className="text-xs text-[#04516f] dark:text-[#6ba3c7] font-medium">progetti votati</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#04516f]/10 dark:bg-[#04516f]/20 p-3 rounded-lg">
                  <div className="bg-[#04516f] rounded-full p-2">
                    <div className="w-4 h-4 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[#04516f] dark:text-[#6ba3c7]">{remainingProjects}</div>
                    <div className="text-xs text-[#04516f] dark:text-[#6ba3c7] font-medium">progetti da votare</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-950 p-3 rounded-lg">
                  <div className="bg-gray-500 rounded-full p-2">
                    <div className="w-4 h-4 border-2 border-white rounded-full"></div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{totalProjects}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">progetti totali</div>
                  </div>
                </div>
              </div>
            </div>

            {/* progress message */}
            {completedProjects > 0 && (
              <div className="mt-2">
                {completedProjects === totalProjects ? (
                  <p className="text-sm text-[#04516f] dark:text-[#04516f] font-medium">
                    🎉 congratulazioni! hai completato la votazione di tutti i progetti.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    hai votato {completedProjects} su {totalProjects} progetti. continua a votare per completare la tua valutazione.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-xl sm:text-2xl border-b pb-3">Progetti disponibili per la votazione</h2>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <p className="text-base font-medium mb-2">Seleziona un progetto e valutalo secondo i criteri:</p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-bold">Conformità rispetto al bisogno:</span>
                      <p className="text-sm mt-1">Il grado di appropriatezza con cui le azioni di progetto hanno risposto al bisogno che il progetto stesso mira a soddisfare</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-bold">Scalabilità:</span>
                      <p className="text-sm mt-1">La possibilità di replicare in maniera esponenziale, di espandere, il progetto senza dover sostenere ulteriori importanti investimenti</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <div>
                      <span className="font-bold">Impatto sociale:</span>
                      <p className="text-sm mt-1">La capacità, del progetto, di aver generato un risultato positivo nella vita delle persone con patologia e dei caregiver, dal miglioramento della qualità di vita alla soluzione di problemi</p>
                    </div>
                  </li>
                </ul>
                
                <div className="flex items-center gap-2 mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <InfoIcon size="16" className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Puoi modificare il tuo voto in qualsiasi momento.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-4 auto-rows-fr">
          {currentProjects && currentProjects.map((project, index) => {
            const hasVoted = hasCompletedVoting(project.id);
            
            return (
              <Card key={project.id} className="flex flex-col overflow-hidden rounded-lg relative pea-card-hover h-full">
                {hasVoted && (
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-green-500 rounded-full p-1 shadow-md">
                      <CheckCircleIcon size={16} className="text-white sm:w-5 sm:h-5" />
                    </div>
                  </div>
                )}
                <div className="p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 h-full">
                  <div className="flex items-start gap-3">
                    <div className="flex-grow">
                      <h3 className="text-lg sm:text-xl font-bold leading-tight">{startIndex + index + 1}. {project.name}</h3>
                      {hasVoted && (
                        <p className="text-xs sm:text-sm text-green-600 dark:text-green-400 mt-1 font-medium">
                          ✓ votazione completata
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-muted-foreground flex-grow leading-relaxed">
                    {truncateText(
                      project.jury_info || 
                      project.objectives_results || 
                      'nessuna descrizione disponibile',
                      120
                    )}
                  </p>
                  <div className="mt-auto">
                    <Button asChild className="w-full mt-3 sm:mt-4 text-sm sm:text-base" variant={hasVoted ? "outline" : "default"}>
                      <Link href={`/protected/vote/${project.id}`}>
                        {hasVoted ? "aggiorna il tuo voto" : "vota questo progetto"}
                      </Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* pagination controls */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
            <div className="text-sm text-muted-foreground">
              mostrando {startIndex + 1}-{Math.min(endIndex, totalProjects)} di {totalProjects} progetti
            </div>
            
            <div className="flex items-center gap-2">
              {/* previous button */}
              {currentPage > 1 && (
                <Link href={`/protected?page=${currentPage - 1}`}>
                  <Button variant="outline" size="sm">
                    <ChevronLeftIcon className="h-4 w-4" />
                    precedente
                  </Button>
                </Link>
              )}
              
              {/* page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  const isCurrentPage = pageNum === currentPage;
                  
                  // show first page, last page, current page, and pages around current
                  const showPage = pageNum === 1 || 
                                 pageNum === totalPages || 
                                 Math.abs(pageNum - currentPage) <= 1;
                  
                  if (!showPage) {
                    // show ellipsis
                    if (pageNum === 2 && currentPage > 4) {
                      return <span key={pageNum} className="px-2 text-muted-foreground">...</span>;
                    }
                    if (pageNum === totalPages - 1 && currentPage < totalPages - 3) {
                      return <span key={pageNum} className="px-2 text-muted-foreground">...</span>;
                    }
                    return null;
                  }
                  
                  return (
                    <Link key={pageNum} href={`/protected?page=${pageNum}`}>
                      <Button 
                        variant={isCurrentPage ? "default" : "outline"} 
                        size="sm"
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    </Link>
                  );
                })}
              </div>
              
              {/* next button */}
              {currentPage < totalPages && (
                <Link href={`/protected?page=${currentPage + 1}`}>
                  <Button variant="outline" size="sm">
                    successiva
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
