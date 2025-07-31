import { SignUpForm } from "@/components/sign-up-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <Link href="/">
            <Button variant="outline" className="w-full">
              ← Torna alla home
            </Button>
          </Link>
        </div>
        <SignUpForm />
      </div>
    </div>
  );
}
