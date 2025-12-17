import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/utils";

export async function HomeButton() {
  const supabase = await createClient();

  // check authentication status
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  // if not authenticated, don't show home button
  if (sessionError || !sessionData.session) {
    return null;
  }

  // check if user is admin
  const userEmail = sessionData.session.user.email;
  const isAdmin = isAdminEmail(userEmail);

  return (
    <Button asChild size="sm" variant="outline">
      <Link href={isAdmin ? "/protected/admin" : "/"}>
        Home
      </Link>
    </Button>
  );
}
