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
    <Button onClick={handleExportToExcel} variant="outline" className="flex items-center justify-center gap-2 flex-1 xs:flex-none">
      <FileSpreadsheetIcon size={16} />
      <span className="hidden xs:inline">esporta excel</span>
      <span className="xs:hidden">esporta</span>
    </Button>
  );
}

