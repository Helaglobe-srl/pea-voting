import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ProfilePage() {
  const supabase = await createClient();

  // get user session and profile data
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      <h1 className="text-3xl font-bold">Il Tuo Profilo</h1>
      
      <Card className="p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">user id</p>
            <p className="font-medium">{user.id}</p>
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
      </Card>
      
      <div className="flex gap-4">
        <Button asChild>
          <Link href="/protected">Torna al Dashboard</Link>
        </Button>
      </div>
    </div>
  );
} 