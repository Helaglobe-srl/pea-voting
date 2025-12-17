import { createClient } from "@/lib/supabase/server";
import { AdminVotingMatrixClient } from "./admin-voting-matrix-client";
import { fetchAllRpcResults } from "@/lib/supabase-utils";
import type { VoteWithEmailAndWeight, Juror } from "@/lib/types";

export async function AdminVotingMatrix() {
  const supabase = await createClient();

  // parallel data fetching
  const [votesResult, jurorsResult, projectsResult, criteriaResult] = await Promise.all([
    fetchAllRpcResults<VoteWithEmailAndWeight>(supabase, 'get_votes_with_emails_and_weights_admin'),
    supabase.rpc('get_all_jurors_admin'),
    supabase.from("finalist_projects").select("*").order("id"),
    supabase.from("voting_criteria").select("*").order("id")
  ]);

  if (votesResult.error) {
    console.error("Error fetching votes for matrix:", votesResult.error);
  }

  const votes = votesResult.data || [];
  const jurors = (jurorsResult.data as Juror[]) || [];
  const projects = projectsResult.data || [];
  const criteria = criteriaResult.data || [];


  return (
    <AdminVotingMatrixClient 
      initialData={{
        votes,
        jurors,
        projects,
        criteria
      }}
    />
  );
}
