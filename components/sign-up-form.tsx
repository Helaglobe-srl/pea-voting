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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { validateEmail, getEmailValidationMessage } from "@/lib/email-validation";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
  const [rappresentaAssociazione, setRappresentaAssociazione] = useState("no");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    // validate email format
    if (newEmail.trim()) {
      const validation = validateEmail(newEmail);
      if (!validation.isValid) {
        setEmailError(getEmailValidationMessage(validation));
      } else {
        // check if emails match when both are filled
        if (confirmEmail && newEmail !== confirmEmail) {
          setEmailError("le email non corrispondono");
        } else {
          setEmailError(null);
        }
      }
    } else {
      setEmailError(null);
    }
  };

  const handleConfirmEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConfirmEmail = e.target.value;
    setConfirmEmail(newConfirmEmail);
    
    // check if emails match
    if (newConfirmEmail && email && newConfirmEmail !== email) {
      setEmailError("le email non corrispondono");
    } else if (email && newConfirmEmail === email) {
      setEmailError(null);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    // validate email before submission
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(getEmailValidationMessage(emailValidation));
      setIsLoading(false);
      return;
    }

    // check if emails match
    if (email !== confirmEmail) {
      setEmailError("le email non corrispondono");
      setIsLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setError("Le password non corrispondono");
      setIsLoading(false);
      return;
    }

    try {
      // create account and send otp in one call
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // this will send an otp code for email verification
          emailRedirectTo: `${window.location.origin}/auth/verify-otp?email=${encodeURIComponent(email)}&type=signup`,
          data: {
            rappresenta_associazione: rappresentaAssociazione === "si"
          }
        },
      });

      if (error) throw error;

      // redirect to otp verification page
      router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}&type=signup`);
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
          <CardTitle className="text-2xl">Registrati</CardTitle>
          <CardDescription>Crea un nuovo account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  className={emailError && !confirmEmail ? "border-red-500 focus:border-red-500" : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confirm-email">Conferma Email</Label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder="Ripeti la tua email"
                  required
                  value={confirmEmail}
                  onChange={handleConfirmEmailChange}
                  className={emailError && confirmEmail ? "border-red-500 focus:border-red-500" : ""}
                />
                {emailError && (
                  <p className="text-sm text-red-500 mt-1">{emailError}</p>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Ripeti Password</Label>
                </div>
                <div className="relative">
                  <Input
                    id="repeat-password"
                    type={showRepeatPassword ? "text" : "password"}
                    required
                    value={repeatPassword}
                    onChange={(e) => setRepeatPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowRepeatPassword(!showRepeatPassword)}
                  >
                    {showRepeatPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label className="text-base font-medium">
                  Rappresento un&apos;Associazione di Insieme Per
                </Label>
                <RadioGroup
                  value={rappresentaAssociazione}
                  onValueChange={setRappresentaAssociazione}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="si" id="si" />
                    <Label htmlFor="si" className="text-sm font-normal">
                      Si
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="no" />
                    <Label htmlFor="no" className="text-sm font-normal">
                      No
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creazione account..." : "Registrati"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Hai già un account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Accedi
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

