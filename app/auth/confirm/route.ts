import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const token = searchParams.get("token");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/protected";

  // handle both old token_hash format and new token format
  const finalToken = token_hash || token;

  if (finalToken && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: finalToken,
    });
    if (!error) {
      // for password recovery, ensure user goes to update password page
      if (type === "recovery") {
        redirect("/auth/update-password");
      } else {
        // redirect user to specified redirect url or root of app
        redirect(next);
      }
    } else {
      // redirect the user to an error page with some instructions
      redirect(`/auth/error?error=${error?.message}`);
    }
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=no token or token_hash provided`);
}
