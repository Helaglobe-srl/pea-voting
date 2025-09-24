import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeftIcon, CheckCircleIcon, XCircleIcon } from "lucide-react";

interface JurorData {
  user_id: string;
  email: string;
  nome?: string;
  cognome?: string;
  rappresenta_associazione: boolean;
  has_voted: boolean;
}

interface JurorWithVotingStatus {
  user_id: string;
  email: string;
  nome?: string;
  cognome?: string;
  rappresenta_associazione: boolean;
  has_voted: boolean;
}

export default async function JurorsPage() {
  const supabase = await createClient();

  // check if user is authenticated
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    redirect("/auth/login");
  }

  // check if user is admin
  const userEmail = sessionData.session.user.email;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || userEmail !== adminEmail) {
    redirect("/protected?error=unauthorized");
  }

  // get all jurors with voting status using single RPC function
  const { data: jurorsWithStatus, error: jurorsError } = await supabase
    .rpc('get_jurors_with_voting_status');

  if (jurorsError) {
    console.error('Error fetching jurors with voting status:', jurorsError);
    return <div>Error loading jurors data</div>;
  }

  // convert to our JurorData format
  const jurors: JurorData[] = (jurorsWithStatus as JurorWithVotingStatus[])?.map(juror => ({
    user_id: juror.user_id,
    email: juror.email,
    nome: juror.nome || '',
    cognome: juror.cognome || '',
    rappresenta_associazione: juror.rappresenta_associazione || false,
    has_voted: juror.has_voted
  })) || [];

  // separate jurors into voted and not voted
  const jurorsWhoVoted = jurors.filter(j => j.has_voted);
  const jurorsWhoDidNotVote = jurors.filter(j => !j.has_voted);


  const getUserType = (rappresentaAssociazione: boolean) => {
    return rappresentaAssociazione ? 'Associazione' : 'Individuale';
  };

  const getUserTypeColor = (rappresentaAssociazione: boolean) => {
    return rappresentaAssociazione ? 'text-green-600' : 'text-blue-600';
  };

  return (
    <div className="flex-1 w-full flex flex-col gap-8">
      {/* header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/protected/admin" className="flex items-center gap-2">
                <ArrowLeftIcon size={16} />
                <span className="hidden xs:inline">torna al pannello</span>
                <span className="xs:hidden">indietro</span>
              </Link>
            </Button>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">👥 Gestione Giurati</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Panoramica completa di tutti i giurati registrati
          </p>
        </div>
      </div>

      {/* summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-[#04516f] rounded flex items-center justify-center text-white text-sm font-bold">
              T
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Giurati totali</p>
              <p className="text-2xl font-bold">{jurors.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-muted-foreground">Hanno votato</p>
              <p className="text-2xl font-bold">{jurorsWhoVoted.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <XCircleIcon className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-sm text-muted-foreground">Non hanno votato</p>
              <p className="text-2xl font-bold">{jurorsWhoDidNotVote.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* jurors who voted */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircleIcon className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold">Giurati che hanno votato ({jurorsWhoVoted.length})</h2>
        </div>
        
        {jurorsWhoVoted.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">nessun giurato ha ancora votato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="hidden sm:table-header-group">
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Email</th>
                  <th className="text-left p-3 font-semibold">Nome</th>
                  <th className="text-left p-3 font-semibold">Cognome</th>
                  <th className="text-left p-3 font-semibold">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {jurorsWhoVoted.map((juror) => (
                  <tr key={juror.user_id} className="border-b hover:bg-muted/50 sm:table-row flex flex-col sm:flex-row">
                    <td className="p-3 sm:border-b-0 border-b">
                      <span className="font-medium sm:hidden">Email: </span>
                      {juror.email}
                    </td>
                    <td className="p-3 sm:border-b-0 border-b">
                      <span className="font-medium sm:hidden">Nome: </span>
                      {juror.nome || '-'}
                    </td>
                    <td className="p-3 sm:border-b-0 border-b">
                      <span className="font-medium sm:hidden">Cognome: </span>
                      {juror.cognome || '-'}
                    </td>
                    <td className={`p-3 font-medium ${getUserTypeColor(juror.rappresenta_associazione)}`}>
                      <span className="font-medium sm:hidden">Tipo: </span>
                      {getUserType(juror.rappresenta_associazione)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* jurors who did not vote */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-6">
          <XCircleIcon className="h-6 w-6 text-red-600" />
          <h2 className="text-xl font-semibold">Giurati che non hanno votato ({jurorsWhoDidNotVote.length})</h2>
        </div>
        
        {jurorsWhoDidNotVote.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">tutti i giurati hanno votato! 🎉</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="hidden sm:table-header-group">
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Email</th>
                  <th className="text-left p-3 font-semibold">Nome</th>
                  <th className="text-left p-3 font-semibold">Cognome</th>
                  <th className="text-left p-3 font-semibold">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {jurorsWhoDidNotVote.map((juror) => (
                  <tr key={juror.user_id} className="border-b hover:bg-muted/50 sm:table-row flex flex-col sm:flex-row">
                    <td className="p-3 sm:border-b-0 border-b">
                      <span className="font-medium sm:hidden">Email: </span>
                      {juror.email}
                    </td>
                    <td className="p-3 sm:border-b-0 border-b">
                      <span className="font-medium sm:hidden">Nome: </span>
                      {juror.nome || '-'}
                    </td>
                    <td className="p-3 sm:border-b-0 border-b">
                      <span className="font-medium sm:hidden">Cognome: </span>
                      {juror.cognome || '-'}
                    </td>
                    <td className={`p-3 font-medium ${getUserTypeColor(juror.rappresenta_associazione)}`}>
                      <span className="font-medium sm:hidden">Tipo: </span>
                      {getUserType(juror.rappresenta_associazione)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
