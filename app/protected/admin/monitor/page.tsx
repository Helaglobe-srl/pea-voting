import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { AdminStatsCards } from "@/components/admin-stats-cards";
import { AdminCriteriaAndLegend } from "@/components/admin-criteria-legend";
import { AdminVotingMatrix } from "@/components/admin-voting-matrix";
import { 
  StatsCardsLoading, 
  CriteriaAndLegendLoading, 
  VotingMatrixLoading 
} from "@/components/admin-loading-skeleton";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export default async function AdminMonitorPage() {
  const supabase = await createClient();

  // check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/auth/login");
  }

  // check if user is admin
  const userEmail = user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || userEmail !== adminEmail) {
    redirect("/protected?error=unauthorized");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">👥 Monitora votazioni giurati</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Visualizza lo stato in tempo reale delle votazioni dei finalisti
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/protected/admin" className="flex items-center gap-2">
            <ArrowLeftIcon size={16} />
            Dashboard
          </Link>
        </Button>
      </div>

      {/* Summary cards with suspense */}
      <Suspense fallback={<StatsCardsLoading />}>
        <AdminStatsCards />
      </Suspense>

      {/* Criteria and legend with suspense */}
      <Suspense fallback={<CriteriaAndLegendLoading />}>
        <AdminCriteriaAndLegend />
      </Suspense>

      {/* Voting matrix tables with suspense */}
      <Suspense fallback={<VotingMatrixLoading />}>
        <AdminVotingMatrix />
      </Suspense>
    </div>
  );
}
