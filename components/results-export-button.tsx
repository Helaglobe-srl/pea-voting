'use client';

import { Button } from "@/components/ui/button";
import { FileSpreadsheetIcon } from "lucide-react";
import { exportResultsData } from "@/lib/excel-export";
import type { CategoryWinner, SpecialMention } from "@/lib/types";

interface ResultsExportButtonProps {
  categoryWinners: { [category: string]: CategoryWinner[] };
  specialMentions: SpecialMention[];
  uniqueVoterCount: number;
  totalVotes: number;
}

export function ResultsExportButton({ 
  categoryWinners, 
  specialMentions, 
  uniqueVoterCount, 
  totalVotes 
}: ResultsExportButtonProps) {
  const handleExportToExcel = () => {
    exportResultsData(categoryWinners, specialMentions, uniqueVoterCount, totalVotes);
  };

  return (
    <Button onClick={handleExportToExcel} variant="outline" className="flex items-center gap-2">
      <FileSpreadsheetIcon size={16} />
      Esporta Excel
    </Button>
  );
}

