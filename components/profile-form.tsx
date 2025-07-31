"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// import { toast } from "react-hot-toast";

interface ProfileFormProps {
  initialData: {
    nome?: string;
    cognome?: string;
  };
  userId: string;
}

export function ProfileForm({ initialData, userId }: ProfileFormProps) {
  const [nome, setNome] = useState(initialData.nome || "");
  const [cognome, setCognome] = useState(initialData.cognome || "");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const supabase = createClient();

      // check if profile exists
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (existingProfile) {
        // update existing profile
        const { error } = await supabase
          .from("user_profiles")
          .update({ nome, cognome })
          .eq("id", userId);

        if (error) throw error;
      } else {
        // create new profile
        const { error } = await supabase
          .from("user_profiles")
          .insert({ id: userId, nome, cognome });

        if (error) throw error;
      }

      setMessage("profilo aggiornato con successo!");
    } catch (error) {
      console.error("error updating profile:", error);
      setMessage("errore durante l'aggiornamento del profilo");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div className={`p-3 rounded-md text-sm mb-4 ${
          message.includes("successo") 
            ? "bg-green-100 text-green-800 border border-green-200" 
            : "bg-red-100 text-red-800 border border-red-200"
        }`}>
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col gap-1">
          <label htmlFor="nome" className="text-sm text-muted-foreground">
            nome
          </label>
          <Input
            id="nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="inserisci il tuo nome"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="cognome" className="text-sm text-muted-foreground">
            cognome
          </label>
          <Input
            id="cognome"
            type="text"
            value={cognome}
            onChange={(e) => setCognome(e.target.value)}
            placeholder="inserisci il tuo cognome"
          />
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "aggiornamento..." : "aggiorna profilo"}
        </Button>
      </form>
    </div>
  );
}