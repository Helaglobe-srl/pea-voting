import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { HomeButton } from "@/components/home-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NavLinks } from "@/components/nav-links";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // check if user is admin to determine logo link destination
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let logoHref = "/protected"; // default to regular user dashboard
  if (user) {
    const userEmail = user.email;
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin = adminEmail && userEmail === adminEmail;
    if (isAdmin) {
      logoHref = "/protected/admin";
    }
  }
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-border h-16 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <Link href={logoHref} className="hover:opacity-80 transition-opacity">
              <Image
                src="/pea-logo.png"
                alt="Patient Engagement Award"
                width={180}
                height={60}
                className="h-10 w-auto"
                priority
              />
            </Link>
            <div className="flex items-center gap-4">
              <NavLinks />
              <HomeButton />
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            Tutti i diritti riservati ©{" "}
            <a
              href="https://helaglobe.com/"
              target="_blank"
              className="font-bold hover:underline"
              rel="noreferrer"
            >
              Helaglobe
            </a>
          </p>
          <ThemeSwitcher />
        </footer>
      </div>
    </main>
  );
}
