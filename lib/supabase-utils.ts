import { SupabaseClient } from "@supabase/supabase-js";

/**
 * utility function to fetch all results from an rpc function that might be limited
 * @param supabase - the supabase client
 * @param rpcName - name of the rpc function to call
 * @param params - parameters for the rpc function
 * @returns all results from the rpc function
 */
export async function fetchAllRpcResults<T>(
  supabase: SupabaseClient,
  rpcName: string,
  params?: Record<string, any>
): Promise<{ data: T[] | null; error: any }> {
  let allResults: T[] = [];
  let offset = 0;
  const batchSize = 1000;
  
  while (true) {
    const query = params 
      ? supabase.rpc(rpcName, params)
      : supabase.rpc(rpcName);
      
    const { data: batchResults, error } = await query.range(offset, offset + batchSize - 1);
    
    if (error) {
      return { data: null, error };
    }
    
    if (!batchResults || batchResults.length === 0) {
      break; // no more results
    }
    
    allResults = allResults.concat(batchResults);
    
    if (batchResults.length < batchSize) {
      break; // this was the last batch
    }
    
    offset += batchSize;
  }
  
  return { data: allResults, error: null };
}
