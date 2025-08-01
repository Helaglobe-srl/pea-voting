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
import { useRouter } from "next/navigation";
import { useState } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // check if passwords match before proceeding
    if (password !== confirmPassword) {
      setError("Le password non corrispondono");
      return;
    }

    // check password length (basic validation)
    if (password.length < 6) {
      setError("La password deve essere di almeno 6 caratteri");
      return;
    }

    const supabase = createClient();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // update this route to redirect to an authenticated route. the user already has an active session.
      router.push("/protected");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Si è verificato un errore");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Reimposta la Password</CardTitle>
          <CardDescription>
            Inserisci la tua nuova password qui sotto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleForgotPassword}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="password">Nuova password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Nuova password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Conferma nuova password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Conferma nuova password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Salvataggio..." : "Salva nuova password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
