import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { UsersIcon, BarChart3Icon } from "lucide-react";

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
  const { data: sessionData } = await supabase.auth.getSession();
  const adminEmail = process.env.ADMIN_EMAIL;

  // parallel data fetching
  const [votesResult, usersCountResult, projectsResult] = await Promise.all([
    supabase.rpc('get_votes_with_emails_and_weights'),
    supabase.rpc('get_total_users_count', { admin_email_param: adminEmail }),
    supabase.from("projects").select("*").order("id")
  ]);

  const regularUserVotes = (votesResult.data as VoteWithEmailAndWeight[]) || [];
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

  return (
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
            <p className="text-2xl font-bold">{projects.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
