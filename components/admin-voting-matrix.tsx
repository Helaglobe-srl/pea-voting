import { createClient } from "@/lib/supabase/server";
import { AdminVotingMatrixClient } from "./admin-voting-matrix-client";

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

export async function AdminVotingMatrix() {
  const supabase = await createClient();

  // parallel data fetching - only fetch raw data, let client handle processing
  const [votesResult, projectsResult, criteriaResult] = await Promise.all([
    supabase.rpc('get_votes_with_emails_and_weights'),
    supabase.from("projects").select("*").order("id"),
    supabase.from("voting_criteria").select("*").order("id")
  ]);

  const votes = (votesResult.data as VoteWithEmailAndWeight[]) || [];
  const projects = projectsResult.data || [];
  const criteria = criteriaResult.data || [];

  return (
    <AdminVotingMatrixClient 
      initialData={{
        votes,
        projects,
        criteria
      }}
    />
  );
}
