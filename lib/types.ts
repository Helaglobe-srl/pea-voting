// shared types for the application

export interface VoteWithEmailAndWeight {
  id: number;
  user_id: string;
  project_id: number;
  criteria_id: number;
  score: number;
  created_at: string;
  email: string;
  rappresenta_associazione: boolean;
}

export interface Project {
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
  [key: string]: string | number | null | undefined;
}

export interface Criterion {
  id: number;
  name: string;
  description: string;
}

export interface Juror {
  user_id: string;
  email: string;
  rappresenta_associazione: boolean;
  nome: string | null;
  cognome: string | null;
}

export interface CategoryWinner {
  position: number;
  project: Project;
  averageScore: number;
}

export interface SpecialMention {
  type: 'Giuria Tecnica' | 'Insieme Per' | 'Impatto Sociale';
  project: Project;
  score: number;
  description: string;
}
