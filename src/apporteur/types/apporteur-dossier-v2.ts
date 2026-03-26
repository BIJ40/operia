/**
 * Contrat API V2 — get-apporteur-dossiers
 * Champs V1 au root (rétro-compat) + objet `v2` enrichi.
 */

// ── Enums stricts ────────────────────────────────────────
export type DossierStatus =
  | 'en_cours'
  | 'programme'
  | 'devis_en_cours'
  | 'devis_envoye'
  | 'devis_valide'
  | 'rdv_travaux'
  | 'facture'
  | 'attente_paiement'
  | 'clos'
  | 'annule';

export type DevisStatus =
  | 'aucun'
  | 'en_cours'
  | 'envoye'
  | 'valide'
  | 'refuse'
  | 'annule';

export type FactureStatus =
  | 'non_facture'
  | 'emise'
  | 'partiellement_reglee'
  | 'reglee';

/** 6 étapes — pas de "travaux_done" (non fiable Apogée) */
export type StepperStep =
  | 'created'
  | 'rdv_planned'
  | 'devis_sent'
  | 'devis_validated'
  | 'invoice_sent'
  | 'invoice_paid';

export const STEPPER_STEPS_ORDERED: StepperStep[] = [
  'created',
  'rdv_planned',
  'devis_sent',
  'devis_validated',
  'invoice_sent',
  'invoice_paid',
];

export const STEPPER_LABELS: Record<StepperStep, string> = {
  created: 'Dossier créé',
  rdv_planned: 'RDV planifié',
  devis_sent: 'Devis envoyé',
  devis_validated: 'Devis validé',
  invoice_sent: 'Facture émise',
  invoice_paid: 'Facture réglée',
};

// ── V2 enrichment object ─────────────────────────────────
export interface DossierV2Data {
  universes: string[];
  status: {
    dossier: DossierStatus;
    devis: DevisStatus;
    facture: FactureStatus;
  };
  amounts: {
    devis_ht: number;
    facture_ht: number;
    reste_du: number;
  };
  dates: {
    created_at: string | null;
    first_rdv_at: string | null;
    devis_sent_at: string | null;
    devis_validated_at: string | null;
    invoice_sent_at: string | null;
    invoice_paid_at: string | null;
    last_activity_at: string | null;
  };
  stepper: {
    status: StepperStep;
    completed: StepperStep[];
  };
}

// ── Full row (V1 root + V2 nested) ──────────────────────
export interface DossierRowV2 {
  // V1 fields (rétro-compat)
  id: number;
  ref: string;
  clientName: string;
  address: string;
  city: string;
  status: string;
  statusLabel: string;
  rawState: string;
  dateCreation: string | null;
  datePremierRdv: string | null;
  dateDevisEnvoye: string | null;
  dateDevisValide: string | null;
  dateRdvTravaux: string | null;
  dateFacture: string | null;
  dateReglement: string | null;
  lastModified: string | null;
  devisHT: number;
  factureHT: number;
  restedu: number;
  devisId: number | null;
  factureId: number | null;
  // V2 enrichment
  v2?: DossierV2Data;
}
