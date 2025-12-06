import {
  MetricSubject,
  MetricOperation,
  MetricDimension,
  ParsedQuery,
} from './statiaIntent';

export type MetricId =
  | 'CA_GLOBAL_MENSUEL'
  | 'CA_GLOBAL_ANNUEL'
  | 'CA_PAR_APPORT_MENSUEL'
  | 'CA_PAR_APPORT_ANNUEL'
  | 'CA_PAR_TECH_MENSUEL'
  | 'CA_PAR_TECH_ANNUEL'
  | 'CA_PAR_UNIVERS_MENSUEL'
  | 'CA_PAR_UNIVERS_ANNUEL'
  | 'NOMBRE_SAV_MENSUEL'
  | 'TAUX_SAV_ANNUEL'
  | 'TAUX_SAV_PAR_APPORT_ANNUEL'
  | 'NB_INTER_MENSUEL'
  | 'NB_DOSSIERS_ANNUEL'
  | 'NB_DOSSIERS_PAR_APPORT_MENSUEL'
  | 'DELAI_MOYEN_DEVIS_TRAVAUX'
  | 'DELAI_MOYEN_DOSSIER_FACTURE'
  | 'PANIER_MOYEN_MENSUEL'
  | 'TAUX_MARGE_ANNUEL'
  | 'CA_PAR_AGENCE_MENSUEL'
  | 'NOMBRE_SAV_PAR_AGENCE_ANNUEL'
  | 'TOP_APPORT_CA_ANNUEL'
  | 'TOP_TECH_CA_GLOBAL'
  | 'TOP_UNIVERS_SAV_GLOBAL'
  | 'CA_PAR_UNIVERS_APPORT_MENSUEL'
  | 'TAUX_SAV_PAR_UNIVERS_APPORT_ANNUEL'
  | 'NB_DOSSIERS_STATUT_ATTENTE_DEVIS'
  | 'NB_DOSSIERS_SAV'
  | 'NB_DOSSIERS_MULTI_VISITE'
  | 'TAUX_MULTI_VISITE'
  | 'CA_SAV_MENSUEL'
  | 'CA_SAV_PAR_APPORT_ANNUEL';

export type MetricUnit = 'euro' | 'count' | 'ratio' | 'days';

export interface MetricDefinition {
  id: MetricId;
  subject: MetricSubject;
  operation: MetricOperation;
  dimension: MetricDimension;
  unit: MetricUnit;
  label: string;
  // clé interne utilisée par StatIA Engine
  engineKey: string;
}

export const METRICS: MetricDefinition[] = [
  {
    id: 'CA_GLOBAL_MENSUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'global',
    unit: 'euro',
    label: 'CA global mensuel',
    engineKey: 'ca_global_ht',
  },
  {
    id: 'CA_GLOBAL_ANNUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'global',
    unit: 'euro',
    label: 'CA global annuel',
    engineKey: 'ca_global_annuel',
  },
  {
    id: 'CA_PAR_APPORT_MENSUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'apporteur',
    unit: 'euro',
    label: 'CA par apporteur mensuel',
    engineKey: 'ca_par_apporteur',
  },
  {
    id: 'CA_PAR_APPORT_ANNUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'apporteur',
    unit: 'euro',
    label: 'CA par apporteur annuel',
    engineKey: 'ca_par_apporteur',
  },
  {
    id: 'CA_PAR_TECH_MENSUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'technicien',
    unit: 'euro',
    label: 'CA par technicien mensuel',
    engineKey: 'ca_par_technicien',
  },
  {
    id: 'CA_PAR_TECH_ANNUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'technicien',
    unit: 'euro',
    label: 'CA par technicien annuel',
    engineKey: 'ca_par_technicien',
  },
  {
    id: 'CA_PAR_UNIVERS_MENSUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'univers',
    unit: 'euro',
    label: 'CA par univers mensuel',
    engineKey: 'ca_par_univers',
  },
  {
    id: 'CA_PAR_UNIVERS_ANNUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'univers',
    unit: 'euro',
    label: 'CA par univers annuel',
    engineKey: 'ca_par_univers',
  },
  {
    id: 'NOMBRE_SAV_MENSUEL',
    subject: 'sav',
    operation: 'count',
    dimension: 'global',
    unit: 'count',
    label: 'Nombre de SAV mensuel',
    engineKey: 'nb_sav_global',
  },
  {
    id: 'TAUX_SAV_ANNUEL',
    subject: 'taux_sav',
    operation: 'ratio',
    dimension: 'global',
    unit: 'ratio',
    label: 'Taux de SAV annuel',
    engineKey: 'taux_sav_global',
  },
  {
    id: 'TAUX_SAV_PAR_APPORT_ANNUEL',
    subject: 'taux_sav',
    operation: 'ratio',
    dimension: 'apporteur',
    unit: 'ratio',
    label: 'Taux de SAV par apporteur annuel',
    engineKey: 'taux_sav_par_apporteur',
  },
  {
    id: 'NB_INTER_MENSUEL',
    subject: 'interventions',
    operation: 'count',
    dimension: 'global',
    unit: 'count',
    label: "Nombre d'interventions mensuel",
    engineKey: 'nb_interventions',
  },
  {
    id: 'NB_DOSSIERS_ANNUEL',
    subject: 'dossiers',
    operation: 'count',
    dimension: 'global',
    unit: 'count',
    label: 'Nombre de dossiers annuel',
    engineKey: 'nb_dossiers_crees',
  },
  {
    id: 'NB_DOSSIERS_PAR_APPORT_MENSUEL',
    subject: 'dossiers',
    operation: 'count',
    dimension: 'apporteur',
    unit: 'count',
    label: 'Nombre de dossiers par apporteur mensuel',
    engineKey: 'nb_dossiers_par_apporteur',
  },
  {
    id: 'DELAI_MOYEN_DEVIS_TRAVAUX',
    subject: 'delai',
    operation: 'delay',
    dimension: 'global',
    unit: 'days',
    label: 'Délai moyen devis → travaux',
    engineKey: 'delai_premier_devis',
  },
  {
    id: 'DELAI_MOYEN_DOSSIER_FACTURE',
    subject: 'delai',
    operation: 'delay',
    dimension: 'global',
    unit: 'days',
    label: 'Délai moyen dossier → facture',
    engineKey: 'delai_dossier_facture',
  },
  {
    id: 'PANIER_MOYEN_MENSUEL',
    subject: 'panier_moyen',
    operation: 'amount',
    dimension: 'global',
    unit: 'euro',
    label: 'Panier moyen mensuel',
    engineKey: 'panier_moyen',
  },
  {
    id: 'TAUX_MARGE_ANNUEL',
    subject: 'taux_marge',
    operation: 'ratio',
    dimension: 'global',
    unit: 'ratio',
    label: 'Taux de marge annuel',
    engineKey: 'taux_marge',
  },
  {
    id: 'CA_PAR_AGENCE_MENSUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'agence',
    unit: 'euro',
    label: 'CA par agence mensuel',
    engineKey: 'ca_par_agence',
  },
  {
    id: 'NOMBRE_SAV_PAR_AGENCE_ANNUEL',
    subject: 'sav',
    operation: 'count',
    dimension: 'agence',
    unit: 'count',
    label: 'Nombre de SAV par agence annuel',
    engineKey: 'nb_sav_par_agence',
  },
  {
    id: 'TOP_APPORT_CA_ANNUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'apporteur',
    unit: 'euro',
    label: 'Top apporteurs par CA annuel',
    engineKey: 'top_apporteurs_ca',
  },
  {
    id: 'TOP_TECH_CA_GLOBAL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'technicien',
    unit: 'euro',
    label: 'Top techniciens par CA',
    engineKey: 'top_techniciens_ca',
  },
  {
    id: 'TOP_UNIVERS_SAV_GLOBAL',
    subject: 'sav',
    operation: 'count',
    dimension: 'univers',
    unit: 'count',
    label: 'Top univers par SAV',
    engineKey: 'top_univers_sav',
  },
  {
    id: 'CA_PAR_UNIVERS_APPORT_MENSUEL',
    subject: 'ca',
    operation: 'amount',
    dimension: 'univers',
    unit: 'euro',
    label: 'CA univers × apporteur mensuel',
    engineKey: 'ca_univers_apporteur',
  },
  {
    id: 'TAUX_SAV_PAR_UNIVERS_APPORT_ANNUEL',
    subject: 'taux_sav',
    operation: 'ratio',
    dimension: 'univers',
    unit: 'ratio',
    label: 'Taux SAV univers × apporteur annuel',
    engineKey: 'taux_sav_univers_apporteur',
  },
  {
    id: 'NB_DOSSIERS_STATUT_ATTENTE_DEVIS',
    subject: 'dossiers',
    operation: 'count',
    dimension: 'global',
    unit: 'count',
    label: 'Dossiers en attente de devis',
    engineKey: 'nb_dossiers_attente_devis',
  },
  {
    id: 'NB_DOSSIERS_SAV',
    subject: 'dossiers',
    operation: 'count',
    dimension: 'global',
    unit: 'count',
    label: 'Dossiers SAV',
    engineKey: 'nb_dossiers_sav',
  },
  {
    id: 'NB_DOSSIERS_MULTI_VISITE',
    subject: 'dossiers',
    operation: 'count',
    dimension: 'global',
    unit: 'count',
    label: 'Dossiers multi-visite',
    engineKey: 'nb_dossiers_multi_visite',
  },
  {
    id: 'TAUX_MULTI_VISITE',
    subject: 'dossiers',
    operation: 'ratio',
    dimension: 'global',
    unit: 'ratio',
    label: 'Taux de multi-visite',
    engineKey: 'taux_multi_visite',
  },
  {
    id: 'CA_SAV_MENSUEL',
    subject: 'sav',
    operation: 'amount',
    dimension: 'global',
    unit: 'euro',
    label: 'CA SAV mensuel',
    engineKey: 'ca_sav',
  },
  {
    id: 'CA_SAV_PAR_APPORT_ANNUEL',
    subject: 'sav',
    operation: 'amount',
    dimension: 'apporteur',
    unit: 'euro',
    label: 'CA SAV par apporteur annuel',
    engineKey: 'ca_sav_par_apporteur',
  },
];

// Sélection robuste en fonction du ParsedQuery

export function selectMetric(parsed: ParsedQuery): MetricDefinition | null {
  let best: { metric: MetricDefinition; score: number } | null = null;

  for (const metric of METRICS) {
    let score = 0;

    if (metric.subject === parsed.subject) score += 3;
    if (metric.operation === parsed.operation) score += 2;
    if (metric.dimension === parsed.dimension) score += 2;

    // Bonus selon filtres
    if (parsed.filters.apporteur && metric.dimension === 'apporteur') score += 1;
    if (parsed.filters.technicien && metric.dimension === 'technicien') score += 1;
    if (parsed.filters.univers && metric.dimension === 'univers') score += 1;
    if (parsed.filters.agence && metric.dimension === 'agence') score += 1;

    if (!best || score > best.score) {
      best = { metric, score };
    }
  }

  return best?.metric ?? null;
}

// Format value based on unit
export function formatMetricValue(value: number | null | undefined, unit: MetricUnit): string {
  if (value === null || value === undefined) return '–';
  
  switch (unit) {
    case 'euro':
      return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    case 'count':
      return value.toLocaleString('fr-FR');
    case 'ratio':
      return `${(value * 100).toFixed(1)} %`;
    case 'days':
      return `${value.toFixed(1)} j`;
  }
}
