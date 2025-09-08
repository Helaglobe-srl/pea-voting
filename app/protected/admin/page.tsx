import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { BarChart3Icon, UploadIcon } from "lucide-react";
import { Suspense } from "react";
import { AdminStatsCards } from "@/components/admin-stats-cards";
import { AdminCriteriaAndLegend } from "@/components/admin-criteria-legend";
import { AdminVotingMatrix } from "@/components/admin-voting-matrix";
import { 
  StatsCardsLoading, 
  CriteriaAndLegendLoading, 
  VotingMatrixLoading 
} from "@/components/admin-loading-skeleton";

export default async function AdminDashboard() {
  const supabase = await createClient();

  // check if user is authenticated
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    redirect("/auth/login");
  }

  // check if user is admin
  const userEmail = sessionData.session.user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || userEmail !== adminEmail) {
    redirect("/protected?error=unauthorized");
  }

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
              <span className="hidden xs:inline">Carica excel</span>
              <span className="xs:hidden">carica</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Link href="/protected/results" className="flex items-center justify-center gap-2">
              <BarChart3Icon size={16} />
              <span className="hidden xs:inline">Risultati</span>
              <span className="xs:hidden">risultati</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* summary cards with suspense */}
      <Suspense fallback={<StatsCardsLoading />}>
        <AdminStatsCards />
      </Suspense>

      {/* criteria and legend with suspense */}
      <Suspense fallback={<CriteriaAndLegendLoading />}>
        <AdminCriteriaAndLegend />
      </Suspense>

      {/* voting matrix tables with suspense */}
      <Suspense fallback={<VotingMatrixLoading />}>
        <AdminVotingMatrix />
      </Suspense>
    </div>
  );
} 