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
  const code = searchParams.get("code");

  const supabase = await createClient();

  // handle pkce code exchange flow (modern supabase)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    } else {
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // handle traditional token-based verification
  const finalToken = token_hash || token;
  if (finalToken && type) {
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
      redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
    }
  }

  // if no tokens provided, check if user is already authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (user && !userError) {
    // user is already authenticated, redirect to next page
    redirect(next);
  }

  // redirect the user to an error page with some instructions
  redirect(`/auth/error?error=${encodeURIComponent("no authentication token provided")}`);
}
