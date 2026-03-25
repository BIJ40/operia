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
  delai_a_planifier_tvx: number;
  delai_a_commander: number;
};

export const DEFAULT_CONFIG: ActionsConfig = {
  delai_devis_a_faire: 2,
  delai_a_facturer: 3,
  delai_relance_technicien: 3,
  delai_a_planifier_tvx: 7,
  delai_a_commander: 7,
};

export const ACTION_LABELS: Record<ActionType, string> = {
  devis_a_faire: 'Devis à rédiger',
  a_facturer: 'Facture à émettre',
  relance_technicien: 'Technicien à relancer',
  a_planifier_tvx: 'Travaux à planifier',
  a_commander: 'Commande à passer',
};

/** Labels d'étape affichés dans la colonne "Statut" */
export const STATUT_LABELS: Record<ActionType, string> = {
  devis_a_faire: 'Devis à faire',
  a_facturer: 'À facturer',
  relance_technicien: 'En attente technicien',
  a_planifier_tvx: 'Planifié travaux',
  a_commander: 'À commander',
};
