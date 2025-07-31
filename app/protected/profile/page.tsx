import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();

  // get user session and profile data
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/auth/login");
  }

  // check if user is admin and redirect them away from profile page
  const userEmail = user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = adminEmail && userEmail === adminEmail;

  if (isAdmin) {
    redirect("/protected/admin");
  }

  // get user profile data (nome and cognome)
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("nome, cognome")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Il Tuo Profilo</h1>
      
      <Card className="p-6">
        <div className="flex flex-col gap-6">
          {/* account information */}
          <div>
            <h2 className="text-lg font-semibold mb-4">informazioni account</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              
              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">ultimo accesso</p>
                <p className="font-medium">{new Date(user.last_sign_in_at || "").toLocaleString()}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">account creato</p>
                <p className="font-medium">{new Date(user.created_at).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* divider */}
          <hr className="border-border" />

          {/* personal information form */}
          <div>
            <h2 className="text-lg font-semibold mb-4">informazioni personali</h2>
            <ProfileForm 
              initialData={{
                nome: userProfile?.nome || "",
                cognome: userProfile?.cognome || ""
              }}
              userId={user.id}
            />
          </div>
        </div>
      </Card>
      
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/protected">Torna al Dashboard</Link>
        </Button>
      </div>
    </div>
  );
} 