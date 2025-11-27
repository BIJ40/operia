export type ActionType = 
  | 'devis_a_faire'
  | 'devis_envoye'
  | 'a_facturer'
  | 'a_commander'
  | 'facture_non_reglee'
  | 'relance_technicien';

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
};

export type ActionsConfig = {
  delai_devis_a_faire: number;
  delai_devis_envoye: number;
  delai_a_facturer: number;
  delai_a_commander: number;
  delai_facture_non_reglee: number;
  delai_relance_technicien: number;
};

export const DEFAULT_CONFIG: ActionsConfig = {
  delai_devis_a_faire: 2,
  delai_devis_envoye: 10,
  delai_a_facturer: 3,
  delai_a_commander: 10,
  delai_facture_non_reglee: 3,
  delai_relance_technicien: 3,
};

export const ACTION_LABELS: Record<ActionType, string> = {
  devis_a_faire: 'Rédiger le devis',
  devis_envoye: 'Relancer le devis',
  a_facturer: 'Émettre la facture',
  a_commander: 'Passer la commande',
  facture_non_reglee: 'Relancer le règlement',
  relance_technicien: 'Relancer le technicien',
};
