"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface OtpVerificationFormProps extends React.ComponentPropsWithoutRef<"div"> {
  email: string;
  type?: 'signup' | 'recovery';
}

export function OtpVerificationForm({
  className,
  email,
  type = 'signup',
  ...props
}: OtpVerificationFormProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  // countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    // validate otp format
    if (!/^\d{6}$/.test(otp)) {
      setError("inserisci un codice di 6 cifre valido");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      // successful verification
      if (type === 'recovery') {
        router.push('/auth/update-password');
      } else {
        router.push('/protected');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          setError("il codice è scaduto. richiedi un nuovo codice.");
        } else if (error.message.includes('invalid')) {
          setError("codice non valido. controlla e riprova.");
        } else {
          setError(error.message);
        }
      } else {
        setError("si è verificato un errore");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    const supabase = createClient();
    setIsResending(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });

      if (error) throw error;

      // reset timer
      setTimeLeft(300);
      setCanResend(false);
      alert("Nuovo codice inviato!");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "errore nell'invio del codice");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Verifica il tuo account</CardTitle>
          <CardDescription>
            Inserisci il codice di 6 cifre inviato a <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOtp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="otp">Codice di verifica</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    // only allow numbers
                    const value = e.target.value.replace(/\D/g, '');
                    setOtp(value);
                  }}
                  className="text-center text-lg tracking-widest"
                  autoComplete="one-time-code"
                />
                <div className="text-xs text-muted-foreground">
                  Inserisci le 6 cifre ricevute via email
                </div>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading || otp.length !== 6}>
                {isLoading ? "Verifica in corso..." : "Verifica account"}
              </Button>

              <div className="text-center space-y-2">
                <div className="text-sm text-muted-foreground">
                  {timeLeft > 0 ? (
                    <>Il codice scade tra {formatTime(timeLeft)}</>
                  ) : (
                    <span className="text-red-600">Codice scaduto</span>
                  )}
                </div>
                
                {canResend ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-sm"
                  >
                    {isResending ? "Invio..." : "Invia nuovo codice"}
                  </Button>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Potrai richiedere un nuovo codice quando questo scadrà
                  </div>
                )}
              </div>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Email sbagliata? </span>
                <Link href="/auth/sign-up" className="text-primary hover:underline">
                  Registrati di nuovo
                </Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}