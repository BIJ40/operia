export type ActionType = 
  | 'devis_a_faire'
  | 'devis_envoye'
  | 'a_facturer'
  | 'a_commander'
  | 'facture_non_reglee';

export type ActionRow = {
  projectId: number;
  ref: string;
  statut: string;
  actionLabel: string;
  actionType: ActionType;
  deadline: Date;
  dateDepart: Date;
  isLate: boolean;
  clientName: string;
  daysLate?: number;
};

export type ActionsConfig = {
  delai_devis_a_faire: number;
  delai_devis_envoye: number;
  delai_a_facturer: number;
  delai_a_commander: number;
  delai_facture_non_reglee: number;
};

export const DEFAULT_CONFIG: ActionsConfig = {
  delai_devis_a_faire: 2,
  delai_devis_envoye: 10,
  delai_a_facturer: 3,
  delai_a_commander: 10,
  delai_facture_non_reglee: 3,
};

export const ACTION_LABELS: Record<ActionType, string> = {
  devis_a_faire: 'Rédiger le devis',
  devis_envoye: 'Relancer le devis',
  a_facturer: 'Émettre la facture',
  a_commander: 'Passer la commande',
  facture_non_reglee: 'Relancer le règlement',
};
