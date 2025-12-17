import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role privileges.
 * 
 * IMPORTANT: This client bypasses Row Level Security (RLS) and should ONLY be used in:
 * - Server-side API routes
 * - Backend operations that require admin privileges
 * 
 * NEVER expose this client or the service role key to the browser/client side.
 * 
 * Use cases:
 * - Inserting data from public API routes (e.g., registration submissions)
 * - Administrative operations that need to bypass RLS
 * - Background jobs and scheduled tasks
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
