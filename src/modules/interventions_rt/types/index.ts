// Types for RT Module

export type RtSessionStatus = 'draft' | 'completed' | 'pdf_sent';
export type InterventionMode = 'rt' | 'depannage';
export type RtStatus = 'not_started' | 'in_progress' | 'completed' | 'pdf_sent';

export interface RtSession {
  id: string;
  intervention_id: string;
  tech_id: number;
  univers: string;
  mode: InterventionMode;
  status: RtSessionStatus;
  created_at: string;
  updated_at: string;
}

export interface RtAnswer {
  id: string;
  rt_session_id: string;
  node_id: string;
  value: any;
  created_at: string;
}

export interface RtMedia {
  id: string;
  rt_session_id: string;
  node_id: string | null;
  file_url: string;
  created_at: string;
}

export interface RtQuestionSuggestion {
  id: string;
  tech_id: number;
  univers: string;
  branch_id: string;
  node_id_context: string;
  suggestion_text: string;
  suggested_type: 'text' | 'number' | 'boolean' | 'single_choice' | 'multi_choice';
  position_hint: 'before' | 'after' | 'replace';
  status: 'pending' | 'accepted' | 'rejected';
  reviewed_by?: string;
  created_at: string;
  reviewed_at?: string;
}

// Planning types
export interface TechIntervention {
  id: string;
  projectId: number | string;
  clientName: string;
  clientPhone?: string;
  address: string;
  city: string;
  postalCode: string;
  startTime: string;
  endTime: string;
  univers: string;
  type: string; // dépannage, RT, travaux
  dossierRef: string;
  rtStatus: RtStatus;
  date?: string; // ISO date string
}

// Question Tree types
export type QuestionType = 'boolean' | 'single_choice' | 'multi_choice' | 'text' | 'text_long' | 'number' | 'info';

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionNode {
  id: string;
  branch?: string;
  question: string;
  type: QuestionType;
  options?: QuestionOption[];
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  next: {
    default?: string | null;
    byAnswer?: Record<string, string>;
  };
  isEnd?: boolean;
  isBranchStart?: boolean;
  backTo?: string;
  tags?: string[];
}

export interface QuestionTreeMetadata {
  univers: string;
  version: number;
  label: string;
  author: string;
}

export interface QuestionTreeBlock {
  blockId: string;
  label: string;
  entryNodeId: string;
  nodeIds: string[];
}

export interface QuestionTreeBranch {
  branchId: string;
  label: string;
  entryNodeId: string;
  includeBlocks: string[];
}

export interface QuestionTree {
  univers: string;
  version: string;
  startNode: string;
  nodes: Record<string, QuestionNode>;
  metadata?: QuestionTreeMetadata;
  blocks?: QuestionTreeBlock[];
  branches?: QuestionTreeBranch[];
}

// Runner state
export interface RunnerState {
  currentNodeId: string;
  history: string[];
  answers: Record<string, any>;
  photos: Record<string, string[]>; // nodeId -> file URLs
  progress: {
    current: number;
    total: number;
  };
  breadcrumb: string[];
}
