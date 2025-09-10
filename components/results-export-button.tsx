'use client';

import { Button } from "@/components/ui/button";
import { FileSpreadsheetIcon } from "lucide-react";
import { exportResultsData } from "@/lib/excel-export";

interface Project {
  id: number;
  name: string;
  jury_info?: string;
  objectives_results?: string;
  organization_name?: string;
  project_title?: string;
  project_category?: string;
  organization_type?: string;
  therapeutic_area?: string;
  presentation_link?: string;
  created_at?: string;
  updated_at?: string;
}

interface CategoryWinner {
  position: number;
  project: Project;
  averageScore: number;
}

interface SpecialMention {
  type: 'Giuria Tecnica' | 'Insieme Per' | 'Impatto Sociale';
  project: Project;
  score: number;
  description: string;
}

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
