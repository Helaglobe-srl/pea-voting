import { EnvVarWarning } from "@/components/env-var-warning";
import { AuthButton } from "@/components/auth-button";
import { Hero } from "@/components/hero";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NavLinks } from "@/components/nav-links";
import { hasEnvVars } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  // check authentication status
  const supabase = await createClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  const isAuthenticated = !sessionError && sessionData.session;
  let isAdmin = false;
  
  if (isAuthenticated) {
    const userEmail = sessionData.session.user.email;
    const adminEmail = process.env.ADMIN_EMAIL;
    isAdmin = adminEmail === userEmail;
  }
  
  // show home page with two cards: iscrizioni (public) and votazione (authenticated users)
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col gap-20 items-center">
        <nav className="w-full flex justify-center border-b border-b-border h-16 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
            <Link href={"/"} className="hover:opacity-80 transition-opacity">
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
              {!hasEnvVars ? <EnvVarWarning /> : <AuthButton />}
            </div>
          </div>
        </nav>
        
        <div className="flex-1 flex flex-col gap-12 max-w-5xl p-5 w-full">
          {/* hero section */}
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              <Image 
                src="/pea-logo.png" 
                alt="Patient Engagement Award" 
                width={400} 
                height={150} 
                className="w-auto h-32 md:h-40"
                priority
              />
            </div>
            <h2 className="text-3xl text-muted-foreground">4th Edition</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Benvenuto nel portale del Patient Engagement Award.<br />Scegli una delle opzioni qui sotto per procedere.
            </p>
          </div>

          {/* two cards section */}
          <div className="grid md:grid-cols-2 gap-8 mt-8">
            {/* iscrizioni card - always visible */}
            <Link href="/iscrizioni" className="block group">
              <div className="h-full border-2 rounded-2xl p-8 hover:border-blue-600 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold">Iscrizione</h3>
                  <p className="text-muted-foreground">
                    Candida il tuo progetto al Patient Engagement Award 2026. Compila il form di iscrizione con i dettagli del tuo progetto.
                  </p>
                  <div className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-full font-semibold group-hover:bg-blue-700 transition-colors">
                    Inizia Iscrizione →
                  </div>
                </div>
              </div>
            </Link>

            {/* votazione card - requires authentication */}
            {isAuthenticated && !isAdmin ? (
              <Link href="/protected" className="block group">
                <div className="h-full border-2 rounded-2xl p-8 hover:border-green-600 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold">Votazione Giuria</h3>
                    <p className="text-muted-foreground">
                      Accedi all'area riservata per votare i progetti candidati. Solo per membri della giuria.
                    </p>
                    <div className="mt-4 px-6 py-2 bg-green-600 text-white rounded-full font-semibold group-hover:bg-green-700 transition-colors">
                      Vai alla Votazione →
                    </div>
                  </div>
                </div>
              </Link>
            ) : isAdmin ? (
              <Link href="/protected/admin" className="block group">
                <div className="h-full border-2 rounded-2xl p-8 hover:border-purple-600 hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold">Dashboard Admin</h3>
                    <p className="text-muted-foreground">
                      Accedi alla dashboard amministrativa per gestire progetti, giuria e risultati.
                    </p>
                    <div className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-full font-semibold group-hover:bg-purple-700 transition-colors">
                      Vai alla Dashboard →
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="h-full border-2 rounded-2xl p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 opacity-75">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-400 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold">Votazione Giuria</h3>
                  <p className="text-muted-foreground">
                    Accedi all'area riservata per votare i progetti candidati. Solo per membri della giuria.
                  </p>
                  <Link href="/auth/login" className="mt-4 px-6 py-2 bg-gray-600 text-white rounded-full font-semibold hover:bg-gray-700 transition-colors">
                    Accedi per Votare
                  </Link>
                </div>
              </div>
            )}
          </div>
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
