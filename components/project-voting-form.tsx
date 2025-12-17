"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter } from "next/navigation";

interface Criteria {
  id: number;
  name: string;
  description: string;
}

interface VotingFormProps {
  projectId: number;
  criteria: Criteria[];
  existingVotes: Record<number, number>;
  userId: string;
  nextProjectId?: number;
}

export default function ProjectVotingForm({ projectId, criteria, existingVotes, userId, nextProjectId }: VotingFormProps) {
  const router = useRouter();
  const [votes, setVotes] = useState<Record<number, number>>(existingVotes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [showNextProjectPopup, setShowNextProjectPopup] = useState(false);

  const handleVoteChange = (criteriaId: number, score: number) => {
    setVotes((prev) => ({
      ...prev,
      [criteriaId]: score,
    }));
  };

  const handleSubmit = async () => {
    // Check if all criteria have been voted on
    const allVoted = criteria.every((c) => votes[c.id] !== undefined);
    if (!allVoted) {
      setMessage("si prega di votare su tutti i criteri prima di inviare");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const supabase = createClient();
      
      // For each criteria, insert or update the vote
      for (const criterion of criteria) {
        const criteriaId = criterion.id;
        const score = votes[criteriaId];
        
        // Check if vote already exists
        const { data: existingVote } = await supabase
          .from("votes")
          .select("*")
          .eq("user_id", userId)
          .eq("project_id", projectId)
          .eq("criteria_id", criteriaId)
          .single();
        
        if (existingVote) {
          // Update existing vote
          await supabase
            .from("votes")
            .update({ score })
            .eq("id", existingVote.id);
        } else {
          // Insert new vote
          await supabase
            .from("votes")
            .insert({
              user_id: userId,
              project_id: projectId,
              criteria_id: criteriaId,
              score,
            });
        }
      }
      
      setMessage("i tuoi voti sono stati inviati con successo!");
      
      // Show popup after a brief delay
      setTimeout(() => {
        setShowNextProjectPopup(true);
      }, 1500);
    } catch (error) {
      console.error("Error submitting votes:", error);
      setMessage("si è verificato un errore durante l&apos;invio dei voti. riprova.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoToNextProject = async () => {
    setShowNextProjectPopup(false);
    
    // If we have a pre-calculated nextProjectId, use it
    if (nextProjectId) {
      router.push(`/protected/vote/${nextProjectId}`);
      return;
    }
    
    // Otherwise, let's find the next unvoted project
    try {
      const supabase = createClient();
      
      // Get all projects
      const { data: allProjects } = await supabase
        .from("finalist_projects")
        .select("id")
        .order("id");
      
      // Get all user's votes to check completion status
      const { data: allUserVotes } = await supabase
        .from("votes")
        .select("project_id, criteria_id")
        .eq("user_id", userId);
      
      // Get total criteria count
      const { data: criteria } = await supabase
        .from("voting_criteria")
        .select("id");
      
      const totalCriteria = criteria?.length || 3;
      
      // Function to check if user has completed voting for a project
      const hasCompletedVoting = (checkProjectId: number) => {
        if (!allUserVotes) return false;
        const projectVotes = allUserVotes.filter(vote => vote.project_id === checkProjectId);
        return projectVotes.length === totalCriteria;
      };
      
      // Find unvoted projects (excluding current project)
      const unvotedProjects = allProjects?.filter(p => 
        p.id !== projectId && !hasCompletedVoting(p.id)
      ) || [];
      
      if (unvotedProjects.length > 0) {
        // Sort by ID and get the first unvoted project
        const sortedUnvotedProjects = unvotedProjects.sort((a, b) => a.id - b.id);
        const calculatedNextProjectId = sortedUnvotedProjects[0].id;
        router.push(`/protected/vote/${calculatedNextProjectId}`);
      } else {
        // No more projects to vote on
        router.push("/protected");
      }
    } catch (error) {
      console.error("Error finding next project:", error);
      // Fallback to projects page
      router.push("/protected");
    }
  };

  const handleGoToProjectsPage = () => {
    setShowNextProjectPopup(false);
    router.push("/protected");
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {criteria.map((criterion) => (
        <Card key={criterion.id} className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <h3 className="font-semibold text-base sm:text-lg">{criterion.name}</h3>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">{criterion.description}</p>
            </div>
            
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 sm:gap-3 mt-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <Button
                  key={score}
                  type="button"
                  variant={votes[criterion.id] === score ? "default" : "outline"}
                  onClick={() => handleVoteChange(criterion.id, score)}
                  className="w-14 h-14 text-lg font-semibold sm:w-12 sm:h-12 sm:text-base"
                >
                  {score}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      ))}

      {message && (
        <div className={`p-3 rounded-md text-sm ${message.includes("successo") ? "bg-[#ffea1d]/20 text-[#04516f] dark:bg-[#ffea1d]/30 dark:text-[#04516f]" : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"}`}>
          {message}
        </div>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="mt-2 w-full sm:w-auto text-base py-3"
        >
          {isSubmitting ? "invio in corso..." : "Inserisci voti"}
        </Button>
      </div>

      {/* Next Project Popup */}
      {showNextProjectPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4 p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-4">
                cosa vuoi fare ora?
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                vuoi continuare a votare il prossimo progetto disponibile o tornare alla lista per scegliere tu?
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleGoToProjectsPage} variant="outline">
                  torna alla lista
                </Button>
                <Button onClick={handleGoToNextProject}>
                  prossimo progetto
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
} 