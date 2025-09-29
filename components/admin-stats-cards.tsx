import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { UsersIcon, BarChart3Icon, VoteIcon } from "lucide-react";
import Link from "next/link";
import { fetchAllRpcResults } from "@/lib/supabase-utils";

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

export async function AdminStatsCards() {
  const supabase = await createClient();
  
  // get admin email for filtering
  const adminEmail = process.env.ADMIN_EMAIL;

  // parallel data fetching
  const [votesResult, usersCountResult, projectsResult] = await Promise.all([
    fetchAllRpcResults<VoteWithEmailAndWeight>(supabase, 'get_votes_with_emails_and_weights_admin'),
    supabase.rpc('get_total_users_count', { admin_email_param: adminEmail }),
    supabase.from("projects").select("*").order("id")
  ]);

  if (votesResult.error) {
    console.error("Error fetching admin votes:", votesResult.error);
  }

  const regularUserVotes = votesResult.data || [];
  const totalJurors = (usersCountResult.data as number) || 0;
  const projects = projectsResult.data || [];

  // calculate stats
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
  const totalVotes = regularUserVotes.length;
  const votesPerProject = Math.round(totalVotes / 3); // divide by 3 since each project has 3 criteria votes

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* first row: progetti totali, giurati totali, voti totali */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-[#04516f] rounded flex items-center justify-center text-white text-sm font-bold">
            P
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Progetti totali</p>
            <p className="text-2xl font-bold">{projects.length}</p>
          </div>
        </div>
      </Card>
      <Link href="/protected/admin/jurors">
        <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <UsersIcon className="h-8 w-8 text-[#04516f]" />
            <div>
              <p className="text-sm text-muted-foreground">Giurati totali</p>
              <p className="text-2xl font-bold">{totalJurors}</p>
            </div>
          </div>
        </Card>
      </Link>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <VoteIcon className="h-8 w-8 text-purple-600" />
          <div>
            <p className="text-sm text-muted-foreground">Voti totali</p>
            <p className="text-2xl font-bold">{votesPerProject}</p>
          </div>
        </div>
      </Card>
      
      {/* second row: remaining cards */}
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
    </div>
  );
}
