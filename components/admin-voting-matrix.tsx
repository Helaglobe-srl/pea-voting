import { createClient } from "@/lib/supabase/server";
import { AdminVotingMatrixClient } from "./admin-voting-matrix-client";
import type { VoteWithEmailAndWeight, Juror } from "@/lib/types";

export async function AdminVotingMatrix() {
  const supabase = await createClient();

  // parallel data fetching - fetch votes, all jurors, projects, and criteria
  const [votesResult, jurorsResult, projectsResult, criteriaResult] = await Promise.all([
    supabase.rpc('get_votes_with_emails_and_weights'),
    supabase.rpc('get_all_jurors'),
    supabase.from("projects").select("*").order("id"),
    supabase.from("voting_criteria").select("*").order("id")
  ]);

  const votes = (votesResult.data as VoteWithEmailAndWeight[]) || [];
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
