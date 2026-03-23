export type ActionType = 
  | 'devis_a_faire'
  | 'a_facturer'
  | 'relance_technicien'
  | 'a_planifier_tvx'
  | 'a_commander';

export type ActionRow = {
  projectId: number;
  ref: string; // Format AAAAMMXXX
  label: string; // Libellé du dossier
  statut: string;
  actionLabel: string;
  actionType: ActionType;
  deadline: Date;
  dateDepart: Date;
  isLate: boolean;
  isDueSoon?: boolean; // Va passer en retard dans les 24h
  clientName: string;
  daysLate?: number;
  technicienName?: string; // Nom du technicien (pour relance_technicien)
  technicienId?: number; // ID du technicien pour récupération depuis GetUsers
};

export type ActionsConfig = {
  delai_devis_a_faire: number;
  delai_a_facturer: number;
  delai_relance_technicien: number;
};

export const DEFAULT_CONFIG: ActionsConfig = {
  delai_devis_a_faire: 2,
  delai_a_facturer: 3,
  delai_relance_technicien: 3,
};

export const ACTION_LABELS: Record<ActionType, string> = {
  devis_a_faire: 'Rédiger le devis',
  a_facturer: 'Émettre la facture',
  relance_technicien: 'Relancer le technicien',
};
