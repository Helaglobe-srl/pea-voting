import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NavLinks } from "@/components/nav-links";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <div className="flex gap-5 items-center font-semibold">
              <Link href={"/"} className="text-sm sm:text-base truncate">
                <span className="hidden sm:inline">Piattaforma di Votazione - Patient Engagement Award</span>
                <span className="sm:hidden">PEA Voting</span>
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <NavLinks />
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          </div>
        </nav>
        <div className="flex-1 flex flex-col gap-20 max-w-5xl p-5">
          {children}
        </div>

        <footer className="w-full flex items-center justify-center border-t mx-auto text-center text-xs gap-8 py-16">
          <p>
            All rights reserved ©{" "}
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
