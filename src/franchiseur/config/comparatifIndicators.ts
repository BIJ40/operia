/**
 * Configuration des indicateurs pour le tableau comparatif agences
 */

export type ComparatifIndicatorId =
  | 'ca_periode'
  | 'ca_annee'
  | 'nb_dossiers_periode'
  | 'nb_interventions_periode'
  | 'ca_moyen_par_dossier'
  | 'ca_moyen_par_intervention'
  | 'taux_sav'
  | 'cout_sav'
  | 'taux_one_shot'
  | 'taux_multi_visites'
  | 'delai_premier_devis'
  | 'delai_traitement_dossier'
  | 'delai_ouverture_dossier'
  | 'ca_par_technicien_actif'
  | 'nb_techniciens_actifs';

export type IndicatorFormat = 'currency' | 'percent' | 'number' | 'days';
export type IndicatorGroup = 'CA' | 'Qualité' | 'Délais' | 'Productivité';

export interface ComparatifIndicatorConfig {
  id: ComparatifIndicatorId;
  label: string;
  group: IndicatorGroup;
  format: IndicatorFormat;
  defaultVisible: boolean;
}

export const COMPARATIF_INDICATORS: ComparatifIndicatorConfig[] = [
  // CA & Volume
  { id: 'ca_periode', label: 'CA période', group: 'CA', format: 'currency', defaultVisible: true },
  { id: 'ca_annee', label: 'CA année', group: 'CA', format: 'currency', defaultVisible: false },
  { id: 'nb_dossiers_periode', label: 'Dossiers période', group: 'CA', format: 'number', defaultVisible: true },
  { id: 'nb_interventions_periode', label: 'Interventions période', group: 'CA', format: 'number', defaultVisible: true },
  { id: 'ca_moyen_par_dossier', label: 'CA moyen / dossier', group: 'CA', format: 'currency', defaultVisible: true },
  { id: 'ca_moyen_par_intervention', label: 'CA moyen / intervention', group: 'CA', format: 'currency', defaultVisible: false },

  // Qualité
  { id: 'taux_sav', label: 'Taux SAV', group: 'Qualité', format: 'percent', defaultVisible: true },
  { id: 'cout_sav', label: 'Coût SAV', group: 'Qualité', format: 'currency', defaultVisible: false },
  { id: 'taux_one_shot', label: 'Taux One-shot', group: 'Qualité', format: 'percent', defaultVisible: true },
  { id: 'taux_multi_visites', label: 'Taux multi-visites', group: 'Qualité', format: 'percent', defaultVisible: false },

  // Délais
  { id: 'delai_premier_devis', label: 'Délai 1er devis', group: 'Délais', format: 'days', defaultVisible: true },
  { id: 'delai_traitement_dossier', label: 'Délai traitement', group: 'Délais', format: 'days', defaultVisible: true },
  { id: 'delai_ouverture_dossier', label: 'Délai ouverture', group: 'Délais', format: 'days', defaultVisible: false },

  // Productivité
  { id: 'ca_par_technicien_actif', label: 'CA / tech actif', group: 'Productivité', format: 'currency', defaultVisible: true },
  { id: 'nb_techniciens_actifs', label: 'Tech actifs', group: 'Productivité', format: 'number', defaultVisible: true },
];

export const INDICATOR_GROUPS: IndicatorGroup[] = ['CA', 'Qualité', 'Délais', 'Productivité'];

export function getDefaultVisibleIndicators(): ComparatifIndicatorId[] {
  return COMPARATIF_INDICATORS.filter(i => i.defaultVisible).map(i => i.id);
}

export function getIndicatorsByGroup(group: IndicatorGroup): ComparatifIndicatorConfig[] {
  return COMPARATIF_INDICATORS.filter(i => i.group === group);
}
