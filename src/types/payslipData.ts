/**
 * Types pour les données extraites des bulletins de paie
 */

export interface PayslipMetadata {
  periode_mois: string | null;
  periode_annee: number | null;
  periode_date_debut: string | null;
  periode_date_fin: string | null;
  numero_bulletin: string | null;
  convention_collective: string | null;
}

export interface PayslipEmployeur {
  raison_sociale: string | null;
  adresse: string | null;
  siret: string | null;
  ape_naf: string | null;
}

export interface PayslipSalarie {
  nom_complet: string | null;
  adresse: string | null;
  numero_securite_sociale: string | null;
  matricule: string | null;
  date_entree: string | null;
  date_anciennete: string | null;
}

export interface PayslipClassification {
  emploi_intitule: string | null;
  statut: string | null;
  niveau: string | number | null;
  echelon: string | number | null;
  coefficient: string | number | null;
  duree_contractuelle_heures: number | null;
}

export interface PayslipBaseSalaire {
  heures_base: number | null;
  taux_horaire_brut: number | null;
  montant_brut_base: number | null;
}

export type CategorieInterne =
  | 'heures_normales'
  | 'heures_supp_125'
  | 'heures_supp_150'
  | 'heures_nuit'
  | 'dimanche_ferie'
  | 'astreinte'
  | 'deplacement'
  | 'prime_exceptionnelle'
  | 'prime_panier_repas'
  | 'prime_outillage'
  | 'prime_transport'
  | 'prime_salissure'
  | 'prime_performance'
  | 'prime_anciennete'
  | 'prime_vacances'
  | 'indemnite_trajet_zone'
  | 'indemnite_repas_soumise'
  | 'indemnite_repas_non_soumise'
  | 'indemnite_autre'
  | 'autre';

export interface LigneRemunerationVariable {
  code: string | null;
  libelle: string;
  categorie_interne: CategorieInterne;
  nombre: number | null;
  unite: string | null;
  taux: number | null;
  montant: number | null;
  soumis_cotisations: boolean | null;
  soumis_impot: boolean | null;
}

export interface PayslipTotaux {
  total_brut: number | null;
  total_soumis: number | null;
  total_non_soumis: number | null;
  assiette_csg: number | null;
  assiette_cotisations: number | null;
  assiette_plafonnee: number | null;
  plafond_ss_mensuel: number | null;
  montant_net_social: number | null;
}

export interface CotisationDetail {
  part_salariale: number | null;
  part_patronale: number | null;
}

export interface CotisationCSG {
  assiette: number | null;
  montant: number | null;
}

export interface PayslipCotisations {
  maladie_maternite: CotisationDetail | null;
  accident_travail: CotisationDetail | null;
  vieillesse_deplafonnee: CotisationDetail | null;
  vieillesse_plafonnee: CotisationDetail | null;
  allocations_familiales: CotisationDetail | null;
  complementaire_sante: CotisationDetail | null;
  prevoyance_incapacite_deces: CotisationDetail | null;
  retraite_complementaire_tranche1: CotisationDetail | null;
  assurance_chomage: CotisationDetail | null;
  csg_deductible: CotisationCSG | null;
  csg_crds_non_deductible: CotisationCSG | null;
  autres_contributions_patronales: number | null;
  exonerations_allegements: number | null;
}

export interface PayslipNet {
  net_imposable: number | null;
  net_a_payer_avant_impot: number | null;
  net_a_payer: number | null;
  taux_prelevement_source: number | null;
  montant_prelevement_source: number | null;
  montant_pas: number | null;
}

export interface PayslipCumulsAnnuels {
  heures_cumulees: number | null;
  brut_cumule: number | null;
  net_imposable_cumule: number | null;
  net_a_payer_cumule: number | null;
  charges_salariales_cumulees: number | null;
  charges_patronales_cumulees: number | null;
  assiette_cumulee: number | null;
  montant_pas_cumule: number | null;
}

export interface PayslipCongesRTT {
  cp_n1_acquis: number | null;
  cp_n1_pris: number | null;
  cp_n1_solde: number | null;
  cp_n_acquis: number | null;
  cp_n_pris: number | null;
  cp_n_solde: number | null;
  rtt_acquis: number | null;
  rtt_pris: number | null;
  rtt_solde: number | null;
}

export interface PayslipCoutEmployeur {
  total_charges_salariales: number | null;
  total_charges_patronales: number | null;
  cout_global_employeur: number | null;
}

export interface PayslipPaiement {
  mode_paiement: string | null;
  date_paiement: string | null;
  iban_masque: string | null;
}

export interface PayslipExtractedData {
  metadata: PayslipMetadata;
  employeur: PayslipEmployeur;
  salarie: PayslipSalarie;
  classification: PayslipClassification;
  base_salaire: PayslipBaseSalaire;
  lignes_remuneration_variables: LigneRemunerationVariable[];
  totaux: PayslipTotaux;
  cotisations: PayslipCotisations;
  net: PayslipNet;
  cumuls_annuels: PayslipCumulsAnnuels;
  conges_rtt: PayslipCongesRTT;
  cout_employeur: PayslipCoutEmployeur;
  paiement: PayslipPaiement;
  warnings: string[];
}

export type ExtractionStatus = 'pending' | 'processing' | 'success' | 'error';

export interface PayslipData {
  id: string;
  document_id: string;
  collaborator_id: string;
  agency_id: string;
  
  periode_mois: number | null;
  periode_annee: number | null;
  periode_date_debut: string | null;
  periode_date_fin: string | null;
  
  raw_data: PayslipExtractedData;
  
  taux_horaire_brut: number | null;
  heures_base: number | null;
  montant_brut_base: number | null;
  total_brut: number | null;
  net_imposable: number | null;
  net_a_payer: number | null;
  montant_net_social: number | null;
  total_charges_salariales: number | null;
  total_charges_patronales: number | null;
  cout_global_employeur: number | null;
  
  brut_cumule: number | null;
  net_imposable_cumule: number | null;
  heures_cumulees: number | null;
  
  extraction_status: ExtractionStatus;
  extraction_warnings: string[] | null;
  extraction_error: string | null;
  extracted_at: string | null;
  
  created_at: string;
  updated_at: string;
}
