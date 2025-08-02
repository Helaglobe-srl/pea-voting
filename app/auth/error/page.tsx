import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params?.error || "An unspecified error occurred.";

  // check if this is a common authentication issue
  const isAuthIssue = errorMessage.includes("token") || 
    errorMessage.includes("session") || 
    errorMessage.includes("No authentication token provided");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Oops! Qualcosa è andato storto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <p className="mb-3">{errorMessage}</p>
                
                {isAuthIssue && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      💡 Possibile soluzione:
                    </h4>
                    <p className="text-blue-800 text-sm mb-3">
                      Se hai problemi con l&apos;autenticazione, prova a:
                    </p>
                    <ol className="list-decimal list-inside text-blue-800 text-sm space-y-1">
                      <li>Richiedere una nuova email di conferma</li>
                      <li>Controllare che l&apos;email sia corretta</li>
                    </ol>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col space-y-3">
                <Link href="/auth/login">
                  <Button className="w-full" variant="default">
                    Prova ad accedere
                  </Button>
                </Link>
                

                
                <Link href="/auth/sign-up">
                  <Button className="w-full" variant="ghost">
                    Registrati di nuovo
                  </Button>
                </Link>
                
                <Link href="/">
                  <Button className="w-full" variant="ghost">
                    Torna alla home
                  </Button>
                </Link>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-4 text-xs">
                  <summary className="cursor-pointer text-gray-500">
                    Debug Info (solo in sviluppo)
                  </summary>
                  <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                    {JSON.stringify({ error: params?.error }, null, 2)}
                  </pre>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
