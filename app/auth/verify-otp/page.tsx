"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const email = searchParams.get("email");
  const type = searchParams.get("type") as "signup" | "recovery" | null;

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !type) {
      setError("Parametri mancanti");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: type === "signup" ? "signup" : "recovery",
      });

      if (error) throw error;

      // redirect based on type
      if (type === "signup") {
        router.push("/protected");
      } else {
        router.push("/auth/update-password");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Si è verificato un errore");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email || !type) {
      setError("Parametri mancanti");
      return;
    }

    setIsResending(true);
    setError(null);

    try {
      const supabase = createClient();
      
      if (type === "signup") {
        // resend signup otp
        const { error } = await supabase.auth.signUp({
          email,
          password: "temporary", // will be ignored since user exists
          options: {
            emailRedirectTo: `${window.location.origin}/auth/verify-otp?email=${encodeURIComponent(email)}&type=signup`,
          },
        });
        if (error) throw error;
      } else {
        // resend recovery otp
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
          },
        });
        if (error) throw error;
      }

      setCountdown(60); // 60 second cooldown
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Si è verificato un errore");
    } finally {
      setIsResending(false);
    }
  };

  if (!email || !type) {
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Errore</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Parametri mancanti. Torna alla pagina di registrazione.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              {type === "signup" ? "Conferma la registrazione" : "Reimposta password"}
            </CardTitle>
            <CardDescription>
              Inserisci il codice di verifica inviato a {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOTP}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="otp">Codice di verifica</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    pattern="[0-9]{6}"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </div>
                
                {error && <p className="text-sm text-red-500">{error}</p>}
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verifica in corso..." : "Verifica"}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleResendOTP}
                    disabled={isResending || countdown > 0}
                    className="w-full"
                  >
                    {isResending 
                      ? "Invio in corso..." 
                      : countdown > 0 
                        ? `Riprova tra ${countdown}s` 
                        : "Invia di nuovo il codice"
                    }
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground text-center">
                  <p>Non hai ricevuto l&apos;email? Controlla la cartella spam.</p>
                  <p>Il codice scade tra 10 minuti.</p>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}