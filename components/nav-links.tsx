import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/utils";

export async function NavLinks() {
  const supabase = await createClient();

  // check authentication status
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  // if not authenticated, don't show any nav links
  if (sessionError || !sessionData.session) {
    return null;
  }

  // check if user is admin
  const userEmail = sessionData.session.user.email;
  const isAdmin = isAdminEmail(userEmail);

  return (
    <div className="flex items-center gap-4">
      {/* home link - always visible */}
      <Link href="/" className="hover:underline">
        Home
      </Link>
      
      {/* show profilo link only for normal users (not admin) */}
      {!isAdmin && (
        <Link href="/protected/profile" className="hover:underline">
          Profilo
        </Link>
      )}
      
      {/* show vote link only for normal users (not admin) */}
      {!isAdmin && (
        <Link href="/protected" className="hover:underline">
          Votazione
        </Link>
      )}
    </div>
  );
} 