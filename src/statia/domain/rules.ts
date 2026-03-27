// ==============================================
// STATiA — DOMAIN RULES ENGINE v1.0
// Règles métier officielles HelpConfort / Apogée
// ==============================================

import type { MetricDefinitionJSON } from '@/statia/engine/metricEngine';

// ==============================================
// STATIA_RULES — Configuration déclarative IA
// ==============================================

export const STATIA_RULES = {
  project: {
    statusComptableSource: "apiGetProjects.state",
    interventionNeverDefinesAccounting: true
  },
  CA: {
    source: "apiGetFactures.data.totalHT",
    includeStates: ["sent", "paid", "partial"],
    avoir: "subtract",
    duClientSource: "apiGetFactures.data.calcReglementsReste"
  },
  technicians: {
    productiveTypes: ["depannage", "repair", "travaux", "work"],
    nonProductiveTypes: ["RT", "rdv", "rdvtech", "sav", "diagnostic"],
    timeAllocation: "duration_facturee",
    timeSourceField: "projects.duration | projects.tempsPrevus",
    RT_generates_NO_CA: true
  },
  devis: {
    transformation: {
      ratioNumber: "count(devis_ayant_facture(projectId)) / total_devis_envoyes",
      ratioMontant: "sum(montant_facturé) / sum(montant_devisé)"
    },
    diagnosticResolution: {
      type2_A_DEFINIR: {
        rule: "chooseValidated",
        logic: [
          { path: "biDepan.items.isValidated", type: "depannage" },
          { path: "biTvx.items.isValidated", type: "travaux" },
          { path: "biRt.items.isValidated", type: "rt" }
        ]
      }
    }
  },
  interventions: {
    determineRealType: "diagnosticResolution",
    validStates: ["validated", "done", "finished"],
    excludeStates: ["draft", "canceled", "refused"]
  },
  apporteurs: {
    source: "apiGetProjects.commanditaireId",
    excludeSAV: true,
    CA: "sum(factures.totalHT where commanditaireId = X)"
  },
  univers: {
    source: "apiGetProjects.universes",
    multiUniverseAllocation: "uniform_or_time_weighted",
    // RÈGLE STRICTE: Ces univers N'EXISTENT PAS dans l'API Apogée
    excluded: ["chauffage", "climatisation"],
    excludedReason: "Ces univers ne sont pas présents dans l'API Apogée - ne jamais les utiliser"
  },
  dates: {
    use: "depends_on_metric",
    factures: "dateReelle",
    interventions: "dateReelle",
    projects: "date"
  },
  groupBy: [
    "technicien",
    "apporteur",
    "univers",
    "type_intervention",
    "type_devis",
    "mois",
    "semaine",
    "annee",
    "ville",
    "client",
    "dossier"
  ],
  aggregations: ["sum", "count", "avg", "min", "max", "median", "ratio"],
  errors: {
    interventionWithoutProject: "error_intervention_without_project",
    projectWithoutApporteur: "assign_inconnu",
    factureWithoutHT: "compute_from_TTC"
  },
  synonyms: {
    apporteur: ["commanditaire", "prescripteur"],
    univers: ["metier", "domaine"],
    rt: ["releve technique", "rdv technique"],
    sav: ["service apres vente", "garantie", "retour chantier"],
    travaux: ["tvx", "work", "reparation"],
    technicien: ["intervenant", "ouvrier"]
  },
  nlp: {
    par: "groupBy",
    sur_la_periode: "date between {{date_from}} and {{date_to}}"
  }
} as const;

export type StatiaRules = typeof STATIA_RULES;

// ============================================================================
// TYPES DE DOMAINE MÉTIER
// ============================================================================

export type MetricDomainKind =
  // CA global / agrégé
  | 'REVENUE_TOTAL'
  | 'REVENUE_TOTAL_BY_MONTH'
  | 'REVENUE_TOTAL_BY_UNIVERSE'
  | 'REVENUE_TOTAL_BY_APPORTEUR'
  | 'REVENUE_TOTAL_BY_TECHNICIAN'
  | 'REVENUE_TOTAL_BY_AGENCY'

  // CA "productif" (hors RT / TH / SAV)
  | 'REVENUE_PRODUCTIVE'
  | 'REVENUE_PRODUCTIVE_BY_TECHNICIAN'
  | 'REVENUE_PRODUCTIVE_BY_APPORTEUR'
  | 'REVENUE_PRODUCTIVE_BY_UNIVERSE'

  // CA SAV / Coûts SAV
  | 'REVENUE_SAV'
  | 'COST_SAV'
  | 'COST_SAV_BY_TECHNICIAN'
  | 'SAV_COUNT'

  // RDV / interventions
  | 'RDV_COUNT'
  | 'RDV_COUNT_BY_APPORTEUR'
  | 'RDV_COUNT_BY_TECHNICIAN'
  | 'RDV_COUNT_BY_UNIVERSE'
  | 'RDV_PRODUCTIVE_COUNT'
  | 'RDV_PRODUCTIVE_BY_TECHNICIAN'
  | 'RDV_RT_COUNT'
  | 'RDV_TH_COUNT'
  | 'RDV_SAV_COUNT'
  | 'RDV_RECHERCHE_FUITE_COUNT'

  // Dossiers / devis
  | 'DOSSIERS_OPEN_COUNT'
  | 'DOSSIERS_CREATED_COUNT'
  | 'DOSSIERS_CLOSED_COUNT'
  | 'DEVIS_COUNT'
  | 'DEVIS_SIGNED_COUNT'
  | 'DEVIS_REFUSED_COUNT'
  | 'DEVIS_COUNT_BY_APPORTEUR'
  | 'DEVIS_SIGNED_BY_APPORTEUR'

  // Taux de transformation et ratios
  | 'TRANSFORMATION_RATE_COUNT' // En nombre de devis
  | 'TRANSFORMATION_RATE_AMOUNT' // En montant HT
  | 'TRANSFORMATION_RATE_BY_APPORTEUR_COUNT'
  | 'TRANSFORMATION_RATE_BY_APPORTEUR_AMOUNT'
  | 'SAV_SHARE_ON_INTERVENTIONS'
  | 'SAV_SHARE_ON_REVENUE'

  // Durées / temps
  | 'AVG_DOSSIER_DURATION'
  | 'AVG_INTERVENTION_DURATION'
  | 'AVG_INTERVENTION_DURATION_BY_UNIVERSE'
  | 'TOTAL_TIME_BY_TECHNICIAN'

  // Multi-dim génériques
  | 'REVENUE_MATRIX_APPORTEUR_UNIVERSE'
  | 'REVENUE_MATRIX_MONTH_UNIVERSE'
  | 'RDV_MATRIX_APPORTEUR_MONTH'
  
  // Fallback générique
  | 'CUSTOM_GENERIC';

// ============================================================================
// CONTEXTE D'EXÉCUTION
// ============================================================================

export interface DomainRuleContext {
  agency_slug: string;
  date_from: string; // ISO YYYY-MM-DD
  date_to: string;   // ISO YYYY-MM-DD

  apporteur_id?: string | number;
  technicien_id?: string | number;
  univers_id?: string;
  client_id?: string | number;

  /** Flags métier supplémentaires */
  flags?: Record<string, boolean>;
  /** Données additionnelles libres */
  extra?: Record<string, unknown>;
}

// ============================================================================
// OPÉRATEURS ET FILTRES
// ============================================================================

export type EngineOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'not_in'
  | 'between'
  | 'is_not_null'
  | 'is_null'
  | 'contains';

export interface EngineFilter {
  field: string;
  operator: EngineOperator;
  value?: unknown;
  value_to?: unknown; // pour between
  param?: string;     // nom du param dans ctx
}

// ============================================================================
// DÉFINITION ENRICHIE
// ============================================================================

export type DomainAwareMetricDefinition = MetricDefinitionJSON & {
  domain_kind?: MetricDomainKind;
};

// ============================================================================
// CONSTANTES MÉTIER - TYPES D'INTERVENTION
// ============================================================================

/**
 * Types d'intervention PRODUCTIFS (génèrent du CA facturable)
 * 
 * Règle HelpConfort:
 * - TVX (travaux) = productif
 * - DEP (dépannage) = productif
 * - "recherche de fuite" = productif (cas particulier, productif même sans bi*)
 */
export const PRODUCTIVE_INTERVENTION_TYPES = [
  'Technique',      // Travaux (TVX)
  'Depannage',      // Dépannage (DEP)
  'recherche de fuite', // Cas spécial: toujours productif
  'Recherche de fuite',
];

/**
 * Types d'intervention NON PRODUCTIFS (ne génèrent pas de CA)
 * 
 * Règle HelpConfort:
 * - RT = relevé technique pour chiffrage
 * - TH = relevé taux d'humidité
 * - SAV = reprise sous garantie (CA = 0€)
 */
export const NON_PRODUCTIVE_INTERVENTION_TYPES = [
  'RT',           // Relevé technique pour chiffrage
  'TH',           // Relevé taux d'humidité  
  'SAV',          // Service après-vente (garantie)
  'releve technique',
  'Releve technique',
  'taux humidite',
  "taux d'humidité",
];

/**
 * Type2 spéciaux considérés comme productifs
 * Même sans indicateur bi* (biTvx, biDepan), ces types sont productifs
 */
export const SPECIAL_PRODUCTIVE_TYPE2 = [
  'recherche de fuite',
  'Recherche de fuite',
  'RECHERCHE DE FUITE',
  'recherche fuite',
];

/**
 * Types SAV - RÈGLE MÉTIER STRICTE
 * 
 * La détection SAV utilise UNIQUEMENT:
 * - type2 === "SAV" (égalité EXACTE, pas includes)
 * - OU picto SAV présent
 * 
 * NE PAS utiliser .includes('sav') pour éviter les faux positifs
 * (ex: "savoir" contient "sav" mais n'est pas un SAV)
 */
export const SAV_TYPES = ['SAV'];

// ============================================================================
// CONSTANTES UNIFIÉES POUR CALCUL CA TECHNICIEN
// Ces constantes sont la SOURCE DE VÉRITÉ pour tous les moteurs de calcul
// ============================================================================

/**
 * Types d'utilisateurs EXCLUS du calcul CA technicien
 * Ces profils ne sont JAMAIS considérés comme techniciens, même s'ils apparaissent
 * dans les visites ou les interventions.
 */
export const EXCLUDED_USER_TYPES = [
  'commercial',
  'admin',
  'assistant',
  'assistante',
  'administratif',
  'direction',
  'comptable',
];

/**
 * Types d'intervention NON PRODUCTIFS (ne génèrent pas de CA)
 * Utiliser pour filtrer les interventions AVANT le calcul de temps
 */
export const EXCLUDED_INTERVENTION_TYPES = [
  'RT',
  'rt',
  'TH',
  'th',
  'SAV',
  'sav',
  'diagnostic',
  'Diagnostic',
  'releve technique',
  'Releve technique',
  'relevé technique',
  'Relevé technique',
  'rdv technique',
  'RDV technique',
  "taux d'humidité",
  'taux humidite',
];

/**
 * Types TOUJOURS productifs, même sans indicateur bi*
 * "Recherche de fuite" est le cas particulier principal
 */
export const ALWAYS_PRODUCTIVE_TYPES = [
  'recherche de fuite',
  'Recherche de fuite',
  'RECHERCHE DE FUITE',
  'recherche fuite',
  'Recherche Fuite',
];

/**
 * États de facture à EXCLURE du calcul CA
 */
export const EXCLUDED_FACTURE_STATES = [
  'canceled',
  'annulee',
  'annulée',
  'pro_forma',
  'proforma',
  'draft',
  'brouillon',
];

/**
 * Types RT uniquement (Relevés Techniques)
 */
export const RT_TYPES = [
  'RT', 
  'releve technique', 
  'Releve technique',
  'relevé technique',
  'Relevé technique',
  'rdv technique',
  'RDV technique',
];

/**
 * Types TH uniquement (Taux d'Humidité)
 * Ces interventions ne génèrent JAMAIS de CA
 */
export const TH_TYPES = [
  'TH',
  'taux humidite',
  "taux d'humidité",
  'Taux humidite',
  "Taux d'humidité",
  'TAUX HUMIDITE',
];

// ============================================================================
// CONSTANTES MÉTIER - STATUTS DOSSIER
// ============================================================================

/**
 * Statuts de dossier indiquant que le dossier est TERMINÉ et compte dans le CA
 * 
 * Règle HelpConfort:
 * - Seuls les dossiers avec facture émise comptent dans le CA
 * - Le state du dossier fait foi (pas le state de l'intervention)
 */
export const DOSSIER_COMPLETED_STATES = [
  'invoiced',     // Facturé
  'facture',      // Facturé (variante)
  'done',         // Terminé
  'clos',         // Clos
  'archive',      // Archivé
  'closed',       // Fermé
];

/**
 * Statuts de dossier pour les dossiers EN COURS
 */
export const DOSSIER_IN_PROGRESS_STATES = [
  'in_progress',
  'en_cours',
  'planifie',
  'planned',
];

// ============================================================================
// CONSTANTES MÉTIER - VISITES
// ============================================================================

/**
 * Statuts de visite VALIDÉS (utilisables pour les calculs)
 */
export const VISITE_VALIDATED_STATES = [
  'validated',
  'validee',
  'completed',
  'terminee',
];

/**
 * Types de visite PRODUCTIFS pour la répartition CA technicien
 * 
 * Règle HelpConfort:
 * - Visites validées + productives
 * - "recherche de fuite" inclus
 */
export const VISITE_PRODUCTIVE_TYPES = [
  'Technique',
  'technique',
  'Depannage',
  'depannage',
  'Dépannage',
  'travaux',
  'Travaux',
];

// ============================================================================
// CONSTANTES MÉTIER - FACTURES
// ============================================================================

/**
 * Types de facture à INCLURE dans le CA
 * 
 * Règle HelpConfort:
 * - Toutes les factures émises comptent pour le CA
 * - Pour le dû client: data.calcReglementsReste
 */
export const FACTURE_TYPES_INCLUDED = [
  'originale',
  'facture',
  'standard',
];

/**
 * Types de facture AVOIR (montants négatifs)
 * 
 * Règle HelpConfort:
 * - Les avoirs sont soustraits du CA (montant négatif)
 */
export const FACTURE_TYPES_AVOIR = [
  'avoir',
  'Avoir',
  'AVOIR',
  'credit_note',
];

// ============================================================================
// RÈGLES DE CALCUL - ATTRIBUTION CA TECHNICIEN
// ============================================================================

/**
 * RÈGLE D'ATTRIBUTION DU CA AUX TECHNICIENS
 * 
 * Méthode: PROPORTIONNELLE AU TEMPS PASSÉ
 * 
 * Source du temps: endpoint getInterventionsCreneaux
 * 
 * Algorithme:
 * 1. Pour chaque facture, récupérer le projectId
 * 2. Récupérer toutes les interventions du projet
 * 3. Pour chaque intervention, récupérer les visites validées + productives
 * 4. Calculer le temps total passé par technicien via getInterventionsCreneaux
 * 5. Répartir le montant HT au prorata du temps
 * 
 * Cas particuliers:
 * - "recherche de fuite" est toujours productif
 * - SAV n'impacte pas les stats technicien (CA = 0, temps ignoré)
 * - Si aucun technicien trouvé, le CA reste non attribué
 */
export const CA_ATTRIBUTION_RULE = {
  method: 'proportional_time',
  timeSource: 'getInterventionsCreneaux',
  visiteFilter: {
    stateIn: VISITE_VALIDATED_STATES,
    typeIn: [...VISITE_PRODUCTIVE_TYPES, 'recherche de fuite'],
    typeNotIn: NON_PRODUCTIVE_INTERVENTION_TYPES,
  },
  excludeSAV: true, // SAV n'impacte pas les stats technicien
} as const;

// ============================================================================
// RÈGLES DE CALCUL - SAV
// ============================================================================

/**
 * RÈGLE SAV (SERVICE APRÈS-VENTE)
 * 
 * Définition: Reprise sous garantie
 * 
 * Identification: Un dossier SAV est un dossier lié/enfant d'un dossier parent
 * (via champ de référence au dossier original)
 * 
 * Impact sur le CA:
 * - Le SAV ne génère pas de CA (reprise gratuite)
 * - Le SAV n'impacte PAS les statistiques technicien globales
 * 
 * Calcul du coût SAV:
 * - Temps passé en SAV (via getInterventionsCreneaux)
 * - Nombre de visites SAV
 * - % de la facture de base (dossier parent)
 */
export const SAV_RULE = {
  identification: 'linked_dossier', // Dossier lié/enfant
  caImpact: 0, // CA = 0€
  technicianStatsImpact: false, // N'impacte pas les stats tech
  costCalculation: {
    enabled: true,
    factors: ['temps_passe', 'nb_visites', 'pourcentage_facture_parent'],
  },
} as const;

// ============================================================================
// RÈGLES DE CALCUL - UNIVERS
// ============================================================================

/**
 * RÈGLE MULTI-UNIVERS
 * 
 * Un dossier peut avoir plusieurs univers (plomberie, électricité, etc.)
 * 
 * Méthode de répartition: AU PRORATA des lignes de devis/facture
 * 
 * Algorithme:
 * 1. Identifier les univers du dossier (data.universes)
 * 2. Pour chaque ligne de facture, identifier l'univers
 * 3. Sommer les montants par univers
 * 4. Le CA de chaque univers = somme des lignes de cet univers
 */
export const UNIVERS_RULE = {
  method: 'prorata_lines', // Au prorata des lignes de devis/facture
  sourceField: 'data.universes',
  lineUniverField: 'univers', // Champ univers sur chaque ligne de facture
} as const;

// ============================================================================
// RÈGLES DE CALCUL - TAUX DE TRANSFORMATION
// ============================================================================

/**
 * RÈGLE TAUX DE TRANSFORMATION DEVIS → FACTURE
 * 
 * Deux méthodes de calcul disponibles:
 * 1. EN NOMBRE: Nb devis acceptés / Nb total devis
 * 2. EN MONTANT: Montant HT devis acceptés / Montant HT total devis
 * 
 * Définition "devis accepté": devis ayant généré une facture
 * (via lien devis.id ↔ facture.devisId ou project commun)
 */
export const TRANSFORMATION_RATE_RULE = {
  methods: ['count', 'amount'] as const,
  devisAcceptedCriteria: 'has_linked_facture',
  countFormula: 'devis_acceptes_count / devis_total_count',
  amountFormula: 'devis_acceptes_ht / devis_total_ht',
} as const;

// ============================================================================
// RÈGLES DE CALCUL - AVOIRS
// ============================================================================

/**
 * RÈGLE TRAITEMENT DES AVOIRS
 * 
 * Les avoirs (factures d'annulation) sont des montants NÉGATIFS
 * Ils viennent RÉDUIRE le CA total
 * 
 * Algorithme:
 * 1. Identifier les factures de type "avoir"
 * 2. Convertir le montant en négatif: -Math.abs(montant)
 * 3. Sommer normalement avec les autres factures
 */
export const AVOIR_RULE = {
  treatment: 'negative', // Soustrait du CA
  formula: (montant: number, typeFacture: string): number => {
    const isAvoir = FACTURE_TYPES_AVOIR.includes(typeFacture.toLowerCase());
    return isAvoir ? -Math.abs(montant) : montant;
  },
} as const;

// ============================================================================
// RÈGLES DE CALCUL - DÉTERMINATION TYPE INTERVENTION
// ============================================================================

/**
 * RÈGLE DE DÉTERMINATION DU TYPE D'INTERVENTION
 * 
 * Quand type2 = "A DEFINIR", regarder les blocs bi*:
 * - biTvx.Items.IsValidated = true → Travaux (TVX)
 * - biRt.IsValidated = true → Relevé Technique (RT)
 * - biDepan.IsValidated = true → Dépannage (DEP)
 * 
 * Cas particulier:
 * - type2 = "recherche de fuite" → TOUJOURS productif (même sans bi*)
 */
export function determineInterventionType(intervention: {
  type?: string;
  type2?: string;
  biTvx?: { Items?: { IsValidated?: boolean } };
  biRt?: { IsValidated?: boolean };
  biDepan?: { IsValidated?: boolean };
}): { type: string; isProductive: boolean } {
  const { type, type2, biTvx, biRt, biDepan } = intervention;

  // Cas particulier: "recherche de fuite" = toujours productif
  if (type2 && SPECIAL_PRODUCTIVE_TYPE2.includes(type2)) {
    return { type: 'recherche_fuite', isProductive: true };
  }

  // Si type2 = "A DEFINIR", regarder les blocs bi*
  if (type2 === 'A DEFINIR' || type2 === 'a definir') {
    if (biTvx?.Items?.IsValidated === true) {
      return { type: 'TVX', isProductive: true };
    }
    if (biDepan?.IsValidated === true) {
      return { type: 'DEP', isProductive: true };
    }
    if (biRt?.IsValidated === true) {
      return { type: 'RT', isProductive: false };
    }
    // Aucun bloc validé = type indéterminé
    return { type: 'INDEFINI', isProductive: false };
  }

  // Utiliser le type direct
  const normalizedType = type?.toLowerCase() || '';
  
  if (NON_PRODUCTIVE_INTERVENTION_TYPES.some(t => normalizedType.includes(t.toLowerCase()))) {
    return { type: type || 'INCONNU', isProductive: false };
  }

  if (PRODUCTIVE_INTERVENTION_TYPES.some(t => normalizedType.includes(t.toLowerCase()))) {
    return { type: type || 'PRODUCTIF', isProductive: true };
  }

  // Par défaut, considérer comme non productif si non reconnu
  return { type: type || 'INCONNU', isProductive: false };
}

// ============================================================================
// RÈGLES DE CALCUL - VISITE PRODUCTIVE
// ============================================================================

/**
 * Détermine si une visite est productive et doit compter pour la répartition CA
 * 
 * Une visite est productive si:
 * 1. Son state est validé (in VISITE_VALIDATED_STATES)
 * 2. Son type est productif (Technique, Depannage, recherche de fuite)
 * 3. Son type n'est PAS RT, TH ou SAV
 */
export function isVisiteProductive(visite: {
  state?: string;
  type?: string;
}): boolean {
  const { state, type } = visite;

  // Vérifier le state
  if (!state || !VISITE_VALIDATED_STATES.includes(state.toLowerCase())) {
    return false;
  }

  const normalizedType = type?.toLowerCase() || '';

  // Cas particulier: recherche de fuite = toujours productif
  if (SPECIAL_PRODUCTIVE_TYPE2.some(t => normalizedType.includes(t.toLowerCase()))) {
    return true;
  }

  // Exclure les types non productifs
  if (NON_PRODUCTIVE_INTERVENTION_TYPES.some(t => normalizedType.includes(t.toLowerCase()))) {
    return false;
  }

  // Inclure les types productifs
  if (VISITE_PRODUCTIVE_TYPES.some(t => normalizedType.includes(t.toLowerCase()))) {
    return true;
  }

  // Par défaut, non productif si type non reconnu
  return false;
}

// ============================================================================
// RÈGLES DE CALCUL - MONTANT NET AVEC AVOIRS
// ============================================================================

/**
 * Calcule le montant net d'une facture en tenant compte des avoirs
 * 
 * Règle:
 * - Factures normales: montant positif
 * - Avoirs: montant négatif (-Math.abs(montant))
 */
export function calculateNetAmount(
  montant: number,
  typeFacture: string
): number {
  const normalizedType = typeFacture?.toLowerCase() || '';
  const isAvoir = FACTURE_TYPES_AVOIR.some(t => normalizedType.includes(t.toLowerCase()));
  return isAvoir ? -Math.abs(montant) : montant;
}

// ============================================================================
// RÈGLES DE CALCUL - DOSSIER TERMINÉ
// ============================================================================

/**
 * Détermine si un dossier est terminé et doit compter dans le CA
 * 
 * Règle: Le state du dossier fait foi (pas le state de l'intervention)
 * Un dossier est terminé si state in (facturé, clos, archive, done, etc.)
 */
export function isDossierCompleted(dossier: {
  state?: string;
}): boolean {
  const state = dossier.state?.toLowerCase() || '';
  return DOSSIER_COMPLETED_STATES.some(s => state.includes(s.toLowerCase()));
}

// ============================================================================
// RÈGLES DE CALCUL - IDENTIFICATION APPORTEUR
// ============================================================================

/**
 * Récupère l'ID de l'apporteur (commanditaire) d'un dossier
 * 
 * Source: data.commanditaireId dans le projet
 */
export function getApporteurId(project: {
  data?: {
    commanditaireId?: string | number;
  };
}): string | number | null {
  return project.data?.commanditaireId ?? null;
}

// ============================================================================
// RÈGLES DE CALCUL - CHAMPS FACTURE
// ============================================================================

/**
 * Champs de la facture utilisés pour les calculs
 */
export const FACTURE_FIELDS = {
  /** Montant HT de la facture */
  montantHT: 'data.totalHT',
  
  /** Reste à payer TTC (pour le dû client) */
  resteAPayer: 'data.calcReglementsReste',
  
  /** Type de facture (originale, avoir) */
  typeFacture: 'typeFacture',
  
  /** ID du projet lié */
  projectId: 'projectId',
  
  /** Date de la facture */
  dateFacture: 'date',
} as const;

// ============================================================================
// HELPERS GÉNÉRIQUES - FILTRES
// ============================================================================

export function filterAgency(
  tableAlias: string,
  ctx: DomainRuleContext,
  field: string = 'agency_slug',
): EngineFilter {
  return {
    field: `${tableAlias}.${field}`,
    operator: 'eq',
    value: ctx.agency_slug,
  };
}

export function filterDateRange(
  tableAlias: string,
  ctx: DomainRuleContext,
  field: string = 'date',
): EngineFilter[] {
  return [
    {
      field: `${tableAlias}.${field}`,
      operator: 'gte',
      value: ctx.date_from,
    },
    {
      field: `${tableAlias}.${field}`,
      operator: 'lte',
      value: ctx.date_to,
    },
  ];
}

export function filterIn(
  tableAlias: string,
  field: string,
  values: unknown[],
): EngineFilter {
  return {
    field: `${tableAlias}.${field}`,
    operator: 'in',
    value: values,
  };
}

export function filterNotIn(
  tableAlias: string,
  field: string,
  values: unknown[],
): EngineFilter {
  return {
    field: `${tableAlias}.${field}`,
    operator: 'not_in',
    value: values,
  };
}

// ============================================================================
// GÉNÉRATEURS DE FILTRES MÉTIER
// ============================================================================

/**
 * Filtres de base pour le CA (factures)
 */
export function buildBaseRevenueFilters(ctx: DomainRuleContext): EngineFilter[] {
  const filters: EngineFilter[] = [];

  // Période sur la date de facture
  filters.push(...filterDateRange('factures', ctx, 'date'));

  // Dossiers terminés uniquement (via state du projet)
  filters.push(
    filterIn('projects', 'state', DOSSIER_COMPLETED_STATES)
  );

  return filters;
}

/**
 * Filtres pour le CA productif (exclut SAV)
 */
export function buildProductiveRevenueFilters(ctx: DomainRuleContext): EngineFilter[] {
  const filters = buildBaseRevenueFilters(ctx);

  // Exclure les dossiers SAV (dossiers liés/enfants)
  // Note: à adapter selon le champ exact qui identifie un dossier SAV
  filters.push({
    field: 'projects.parentProjectId',
    operator: 'is_null',
  });

  return filters;
}

/**
 * Filtres pour les RDV/interventions de base
 */
export function buildBaseRdvFilters(ctx: DomainRuleContext): EngineFilter[] {
  return [
    ...filterDateRange('interventions', ctx, 'date'),
  ];
}

/**
 * Filtres pour les RDV productifs
 */
export function buildRdvProductiveFilters(ctx: DomainRuleContext): EngineFilter[] {
  const filters = buildBaseRdvFilters(ctx);

  // Exclure les types non productifs
  filters.push(
    filterNotIn('interventions', 'type', NON_PRODUCTIVE_INTERVENTION_TYPES)
  );

  return filters;
}

/**
 * Filtres pour les RDV SAV
 */
export function buildRdvSAVFilters(ctx: DomainRuleContext): EngineFilter[] {
  const filters = buildBaseRdvFilters(ctx);
  filters.push(filterIn('interventions', 'type', SAV_TYPES));
  return filters;
}

/**
 * Filtres pour les RDV RT
 */
export function buildRdvRTFilters(ctx: DomainRuleContext): EngineFilter[] {
  const filters = buildBaseRdvFilters(ctx);
  filters.push(filterIn('interventions', 'type', RT_TYPES));
  return filters;
}

/**
 * Filtres pour les RDV TH
 */
export function buildRdvTHFilters(ctx: DomainRuleContext): EngineFilter[] {
  const filters = buildBaseRdvFilters(ctx);
  filters.push(filterIn('interventions', 'type', TH_TYPES));
  return filters;
}

// ============================================================================
// APPLICATION DES RÈGLES MÉTIER À UNE MÉTRIQUE
// ============================================================================

/**
 * Point central: applique les règles métier à une définition de métrique
 * selon son domain_kind.
 * 
 * À appeler dans le moteur avant exécution.
 */
export function applyDomainRules(
  metric: DomainAwareMetricDefinition,
  ctx: DomainRuleContext,
): DomainAwareMetricDefinition {
  const baseFilters: EngineFilter[] = [];

  switch (metric.domain_kind) {
    // === CA TOTAL ===
    case 'REVENUE_TOTAL':
    case 'REVENUE_TOTAL_BY_MONTH':
    case 'REVENUE_TOTAL_BY_UNIVERSE':
    case 'REVENUE_TOTAL_BY_APPORTEUR':
    case 'REVENUE_TOTAL_BY_TECHNICIAN':
    case 'REVENUE_TOTAL_BY_AGENCY':
      baseFilters.push(...buildBaseRevenueFilters(ctx));
      break;

    // === CA PRODUCTIF ===
    case 'REVENUE_PRODUCTIVE':
    case 'REVENUE_PRODUCTIVE_BY_TECHNICIAN':
    case 'REVENUE_PRODUCTIVE_BY_APPORTEUR':
    case 'REVENUE_PRODUCTIVE_BY_UNIVERSE':
      baseFilters.push(...buildProductiveRevenueFilters(ctx));
      break;

    // === SAV ===
    case 'REVENUE_SAV':
    case 'COST_SAV':
    case 'COST_SAV_BY_TECHNICIAN':
    case 'SAV_COUNT':
      baseFilters.push(...buildBaseRevenueFilters(ctx));
      // Filtrer uniquement les dossiers SAV (enfants)
      baseFilters.push({
        field: 'projects.parentProjectId',
        operator: 'is_not_null',
      });
      break;

    // === RDV GLOBAL ===
    case 'RDV_COUNT':
    case 'RDV_COUNT_BY_APPORTEUR':
    case 'RDV_COUNT_BY_TECHNICIAN':
    case 'RDV_COUNT_BY_UNIVERSE':
      baseFilters.push(...buildBaseRdvFilters(ctx));
      break;

    // === RDV PRODUCTIFS ===
    case 'RDV_PRODUCTIVE_COUNT':
    case 'RDV_PRODUCTIVE_BY_TECHNICIAN':
      baseFilters.push(...buildRdvProductiveFilters(ctx));
      break;

    // === RDV PAR TYPE ===
    case 'RDV_RT_COUNT':
      baseFilters.push(...buildRdvRTFilters(ctx));
      break;

    case 'RDV_TH_COUNT':
      baseFilters.push(...buildRdvTHFilters(ctx));
      break;

    case 'RDV_SAV_COUNT':
      baseFilters.push(...buildRdvSAVFilters(ctx));
      break;

    case 'RDV_RECHERCHE_FUITE_COUNT':
      baseFilters.push(...buildBaseRdvFilters(ctx));
      baseFilters.push(filterIn('interventions', 'type2', SPECIAL_PRODUCTIVE_TYPE2));
      break;

    // === DOSSIERS ===
    case 'DOSSIERS_CLOSED_COUNT':
      baseFilters.push(...filterDateRange('projects', ctx, 'date'));
      baseFilters.push(filterIn('projects', 'state', DOSSIER_COMPLETED_STATES));
      break;

    case 'DOSSIERS_OPEN_COUNT':
    case 'DOSSIERS_CREATED_COUNT':
      baseFilters.push(...filterDateRange('projects', ctx, 'date'));
      break;

    // === DEVIS ===
    case 'DEVIS_COUNT':
    case 'DEVIS_COUNT_BY_APPORTEUR':
      baseFilters.push(...filterDateRange('devis', ctx, 'dateReelle'));
      break;

    case 'DEVIS_SIGNED_COUNT':
    case 'DEVIS_SIGNED_BY_APPORTEUR':
      baseFilters.push(...filterDateRange('devis', ctx, 'dateReelle'));
      // Devis signés = devis ayant une facture liée
      baseFilters.push({
        field: 'devis.hasLinkedFacture',
        operator: 'eq',
        value: true,
      });
      break;

    // === TAUX TRANSFORMATION ===
    case 'TRANSFORMATION_RATE_COUNT':
    case 'TRANSFORMATION_RATE_AMOUNT':
    case 'TRANSFORMATION_RATE_BY_APPORTEUR_COUNT':
    case 'TRANSFORMATION_RATE_BY_APPORTEUR_AMOUNT':
      baseFilters.push(...filterDateRange('devis', ctx, 'dateReelle'));
      break;

    default:
      // Pas de filtres métier spécifiques
      break;
  }

  // Fusionner les filtres métier avec les filtres existants
  const mergedFilters = [
    ...(baseFilters as any[]),
    ...((metric.filters as any[]) || []),
  ];

  return {
    ...metric,
    filters: mergedFilters,
  };
}

// ============================================================================
// RÈGLES SUPPLÉMENTAIRES - STATUTS FACTURES INCLUS
// ============================================================================

/**
 * TOUS les statuts de factures comptent dans le CA
 * Aucune facture n'est exclue selon le statut
 * 
 * Règle HelpConfort: Toutes les factures émises comptent
 */
export const FACTURE_STATES_INCLUDED = [
  'draft',         // CA prévisionnel
  'sent',          // CA engagé
  'paid',          // CA encaissé
  'partial',       // Paiement partiel (alias)
  'partially_paid', // CA partiellement encaissé
  'overdue',       // CA en retard
] as const;

// ============================================================================
// RÈGLES SUPPLÉMENTAIRES - DATE DE RÉFÉRENCE
// ============================================================================

/**
 * Priorité des dates pour le CA
 * dateReelle si présente, sinon date
 */
export const DATE_PRIORITY = ['dateReelle', 'date'] as const;

/**
 * Récupère la date de référence d'une facture/devis
 */
export function getReferenceDate(item: { dateReelle?: string; date?: string }): string | null {
  return item.dateReelle || item.date || null;
}

// ============================================================================
// RÈGLES SUPPLÉMENTAIRES - DEVIS VALIDÉ
// ============================================================================

/**
 * États considérés comme "devis validé"
 * Un devis avec facture liée est automatiquement validé
 */
export const DEVIS_VALIDATED_STATES = [
  'validated',
  'signed',
  'order',      // Commande passée
  'accepted',   // Accepté
] as const;

/**
 * Vérifie si un devis est validé
 */
export function isDevisValidated(
  devis: { isValidated?: boolean; state?: string },
  hasLinkedFacture: boolean = false
): boolean {
  if (hasLinkedFacture) return true;
  if (devis.isValidated === true) return true;
  
  const state = (devis.state || '').toLowerCase();
  return DEVIS_VALIDATED_STATES.some(vs => state.includes(vs.toLowerCase()));
}

// ============================================================================
// RÈGLES SUPPLÉMENTAIRES - ORDRE DE JOINTURE IA
// ============================================================================

/**
 * Ordre de jointure PRÉFÉRÉ pour l'IA
 * 
 * Toujours joindre dans cet ordre pour cohérence:
 * factures → projects → clients
 * interventions → projects → clients
 * devis → projects → clients
 */
export const JOIN_PREFERRED_ORDER = {
  fromFactures: ['factures', 'projects', 'clients'],
  fromInterventions: ['interventions', 'projects', 'clients'],
  fromDevis: ['devis', 'projects', 'clients'],
} as const;

/**
 * Champs de jointure standards
 */
export const JOIN_FIELDS = {
  factureToProject: 'projectId',
  interventionToProject: 'projectId',
  devisToProject: 'projectId',
  projectToClient: 'clientId',
  projectToApporteur: 'data.commanditaireId',
} as const;

// ============================================================================
// RÈGLES SUPPLÉMENTAIRES - CAS EXTRÊMES
// ============================================================================

/**
 * Valeurs par défaut pour les cas extrêmes
 */
export const EDGE_CASE_DEFAULTS = {
  /** Projet sans univers */
  noUnivers: 'Non classé',
  
  /** Projet sans apporteur */
  noApporteur: 'Direct',
  
  /** Intervention sans visite → technicien = intervention.userId */
  noVisiteFallback: 'userId',
  
  /** Facture sans interventions → CA attribué 100% agence */
  noInterventionAttribution: 'agence',
  
  /** Intervention annulée → ignorée */
  cancelledInterventionBehavior: 'ignore',
  
  /** Projet abandonné → aucun CA */
  abandonedProjectCA: 0,
} as const;

/**
 * Récupère l'univers d'un projet (avec fallback)
 */
export function getProjectUnivers(project: {
  data?: { universes?: string[]; univers?: string };
  universId?: string;
}): string[] {
  const universes = project.data?.universes || 
    (project.data?.univers ? [project.data.univers] : null) ||
    (project.universId ? [project.universId] : null);
  
  if (Array.isArray(universes) && universes.length > 0) {
    return universes;
  }
  return [EDGE_CASE_DEFAULTS.noUnivers];
}

/**
 * Récupère l'apporteur d'un projet (avec fallback)
 */
export function getProjectApporteur(project: {
  data?: { commanditaireId?: string | number };
}): string {
  const apporteur = project.data?.commanditaireId;
  return apporteur?.toString() || EDGE_CASE_DEFAULTS.noApporteur;
}

// ============================================================================
// RÈGLES SUPPLÉMENTAIRES - CALCUL TAUX TRANSFORMATION
// ============================================================================

/**
 * Calcul du taux de transformation devis → facture
 * Deux méthodes: en nombre ET en montant HT
 */
export function calculateTransformationRate(
  devisEmis: number | number[],
  devisFactures: number | number[],
  method: 'count' | 'amount' = 'count'
): number {
  if (method === 'count') {
    const total = Array.isArray(devisEmis) ? devisEmis.length : devisEmis;
    const transformed = Array.isArray(devisFactures) ? devisFactures.length : devisFactures;
    return total === 0 ? 0 : transformed / total;
  } else {
    const totalHT = Array.isArray(devisEmis) 
      ? devisEmis.reduce((sum, d) => sum + d, 0) 
      : devisEmis;
    const transformedHT = Array.isArray(devisFactures)
      ? devisFactures.reduce((sum, d) => sum + d, 0)
      : devisFactures;
    return totalHT === 0 ? 0 : transformedHT / totalHT;
  }
}

// ============================================================================
// EXPORT RÉSUMÉ DES RÈGLES (pour documentation/debug)
// ============================================================================

export const BUSINESS_RULES_SUMMARY = {
  interventions: {
    productifs: PRODUCTIVE_INTERVENTION_TYPES,
    nonProductifs: NON_PRODUCTIVE_INTERVENTION_TYPES,
    casParticulierProductif: SPECIAL_PRODUCTIVE_TYPE2,
  },
  ca: {
    attributionTechnicien: CA_ATTRIBUTION_RULE,
    avoirs: AVOIR_RULE,
    univers: UNIVERS_RULE,
    champsFacture: FACTURE_FIELDS,
    statesInclus: FACTURE_STATES_INCLUDED,
    datePriority: DATE_PRIORITY,
  },
  sav: SAV_RULE,
  transformation: TRANSFORMATION_RATE_RULE,
  dossier: {
    etatsTermines: DOSSIER_COMPLETED_STATES,
    etatsEnCours: DOSSIER_IN_PROGRESS_STATES,
  },
  visites: {
    etatsValides: VISITE_VALIDATED_STATES,
    typesProductifs: VISITE_PRODUCTIVE_TYPES,
  },
  devis: {
    etatsValides: DEVIS_VALIDATED_STATES,
    includeIfFactured: true,
  },
  jointures: JOIN_PREFERRED_ORDER,
  edgeCases: EDGE_CASE_DEFAULTS,
} as const;

// ============================================================================
// CONFIGURATION JSON EXPORTABLE (pour stockage/IA)
// ============================================================================

export const RULES_JSON_CONFIG = {
  version: '1.1.0',
  lastUpdated: '2025-12-02',
  
  ca: {
    amountField: 'data.totalHT',
    includeInvoiceStates: ['draft', 'sent', 'paid', 'partial', 'partially_paid', 'overdue'],
    includeAvoir: true,
    avoirBehavior: 'negative',
    datePriority: ['dateReelle', 'date'],
  },
  
  technicians: {
    nonProductiveTypes: ['rt', 'releve technique', 'th', 'sav_non_facture'],
    productiveTypes: ['travaux', 'depannage', 'recherche de fuite'],
    resolveTypeFromBI: true,
    BIResolutionRules: {
      trigger: 'A DEFINIR',
      fields: {
        biTvx: 'travaux',
        biRt: 'rt',
        biDepan: 'depannage',
      },
      checkPath: 'Items.IsValidated',
    },
    multiTechAttribution: 'timeOrVisitsOrEqual',
    timeSource: 'getInterventionsCreneaux',
    visitStateRequired: 'validated',
  },
  
  devis: {
    validatedStates: ['validated', 'signed', 'order', 'accepted'],
    includeIfFactured: true,
    amountField: 'totalHT',
  },
  
  sav: {
    indicators: ['sav', 'facture_sav'],
    productiveOnlyIfBilled: true,
    excludeFromTechStats: true,
    excludeFromGlobalStats: true,
    detectViaDossierEnfant: true,
    costFactors: ['temps_passe', 'nb_visites', 'pourcentage_facture_parent'],
  },
  
  classification: {
    apporteur: 'project.data.commanditaireId',
    univers: ['project.data.universes', 'project.data.univers', 'project.universId'],
    technicians: ['intervention.userId', 'visites.usersIds'],
    defaults: {
      univers: 'Non classé',
      apporteur: 'Direct',
    },
    multiUniversDistribution: 'prorata_lines',
  },
  
  projectState: {
    terminated: ['facturé', 'clos', 'archive', 'done', 'invoiced'],
    abandoned: ['abandonne', 'annulé', 'cancelled'],
    inProgress: ['in_progress', 'en_cours', 'planifie', 'planned'],
  },
  
  joins: {
    preferredOrder: [
      'factures → projects → clients',
      'interventions → projects → clients',
      'devis → projects → clients',
    ],
    fields: {
      factureToProject: 'projectId',
      interventionToProject: 'projectId',
      devisToProject: 'projectId',
      projectToClient: 'clientId',
      projectToApporteur: 'data.commanditaireId',
    },
  },
  
  edgeCases: {
    noUnivers: 'Non classé',
    noApporteur: 'Direct',
    noVisiteFallback: 'userId',
    noInterventionAttribution: 'agence',
    cancelledInterventionBehavior: 'ignore',
    abandonedProjectCA: 0,
  },
  
  financial: {
    dueAmountField: 'data.calcReglementsReste',
    recoveryRateFormula: 'paidAmount / totalInvoiced',
    avgDurationSource: 'visites.duration',
  },

  // 10. GROUP BY / AGGREGATIONS
  groupBy: [
    'technicien', 'apporteur', 'univers', 'type_intervention',
    'type_devis', 'mois', 'semaine', 'année', 'ville', 'client', 'dossier'
  ],
  aggregations: ['sum', 'count', 'avg', 'min', 'max', 'median', 'ratio'],

  // 11. VALIDATIONS & ERRORS
  errors: {
    interventionWithoutProject: 'error_intervention_without_project',
    projectWithoutApporteur: 'assign_inconnu',
    factureWithoutHT: 'compute_from_TTC',
  },

  // 12. SYNONYMES NATUREL (NLP)
  synonyms: {
    apporteur: ['commanditaire', 'prescripteur'],
    univers: ['metier', 'domaine'],
    rt: ['releve technique', 'rdv technique'],
    sav: ['service apres vente', 'garantie', 'retour chantier'],
    travaux: ['tvx', 'work', 'reparation'],
    technicien: ['intervenant', 'ouvrier'],
  },

  // 13. INTERPRÉTATION IA
  nlp: {
    par: 'groupBy',
    sur_la_periode: 'date between {{date_from}} and {{date_to}}',
  },

  // ==========================================================================
  // 14. STRUCTURE DOSSIERS APOGÉE (STRUCT_DOSSIER_BASE)
  // ==========================================================================
  dossierStructure: {
    /** 1 client → N dossiers, 1 dossier → N RDV indépendants */
    hierarchy: 'client → dossiers → interventions',
    /** 1 dossier → N devis, 1 dossier → 1 facture finale */
    invoicing: 'one_final_invoice_per_dossier',
    /** Nouveau dossier si travaux différents (nouveau périmètre) */
    newDossierTrigger: 'different_work_scope',
  },

  // ==========================================================================
  // 15. TYPES DE RDV (STRUCT_RDV_TYPES)
  // ==========================================================================
  rdvTypes: {
    main: ['depannage', 'devis', 'travaux', 'sav'],
    /** Chaque RDV a son contexte propre, pas de dépendance implicite */
    independence: true,
    /** Le type conditionne les écrans / relevés / stats */
    determinesUI: true,
  },

  // ==========================================================================
  // 16. RELEVÉS TECHNIQUES (RT_*)
  // ==========================================================================
  releveTechnique: {
    /** RT_TYPE_CHIFFRAGE: 2 options de relevé */
    types: {
      standard: 'Relevé technique standard (cas simples)',
      prebuilt: 'Modèles pré-construits (cas complexes)',
    },
    /** Modèles pré-construits : champs obligatoires, structure arbre, logique conditionnelle */
    prebuiltFeatures: ['required_fields', 'tree_structure', 'conditional_logic'],
    
    /** RT_COMPLEMENTAIRE_APRES_0606: À partir du 6 juin, RT complémentaire pris en charge */
    complementaryRTDate: '2024-06-06',
    
    /** RT_MODULE_FRANCHISE: Si franchise renseignée, module franchise apparaît */
    franchiseModule: {
      trigger: 'franchise_amount_set',
      actions: ['click_blue_plus', 'click_yellow_button_to_save_check'],
    },
    
    /** RT_DEGAT_EAU_COMPLEXE: Tous les RT dégât des eaux sont complexes */
    degatEauComplexe: {
      alwaysComplex: true,
      requiredFields: ['piece', 'surface', 'surface_totale', 'm2_endommages', 'm2_non_endommages', 'surface_controle'],
      example: 'Cuisine, Plafond, 9 m², 3 m², 6 m²',
      purpose: 'coherence_devis_conformite_assurance',
    },
    
    /** RT_DEVIS_LINK: 1 RT rattaché à 1 projet, devis généré à partir du RT */
    devisLink: {
      rtToProject: 'projectId',
      rtWithoutDevis: 'detect_for_auto_proposal',
      externalDevis: 'ignore_in_learning',
    },
  },

  // ==========================================================================
  // 17. UNIVERS NORMALISATION (UNIVERS_NORMALISATION / UNIVERS_EXCLUS_STATS)
  // ==========================================================================
  universNormalisation: {
    /** Univers normalisés vers set réduit */
    canonical: [
      'plomberie', 'électricité', 'menuiserie', 'vitrerie', 
      'serrurerie', 'volets_roulants', 'peinture', 'autres',
    ],
    /** Univers exclus des stats principales (CA, production) */
    excludedFromStats: ['mobilier', 'travaux_exterieurs'],
    /** Utilisation: stats agence, stats réseau, heatmap */
    usedIn: ['stats_agence', 'stats_reseau', 'heatmap', 'ca_univers', 'ca_techniciens'],
  },

  // ==========================================================================
  // 18. SAV AVANCÉ (SAV_RATTACHEMENT_TECH_ORIGINE / SAV_TYPAGE)
  // ==========================================================================
  savAdvanced: {
    /** SAV_RATTACHEMENT_TECH_ORIGINE: SAV rattaché au technicien d'origine */
    technicienOrigine: {
      rule: 'always_attach_to_origin_tech',
      evenIfDifferentExecutor: true,
      impacts: ['compteur_sav_tech', 'cout_sav_tech'],
    },
    /** SAV_TYPAGE: 2 dimensions possibles */
    typage: {
      interne: 'cost_supported_by_agency',
      facture: 'cost_billed_to_client_or_apporteur',
      distinction: ['cout_qualite_interne', 'cout_refacture', 'stats_qualite_apporteur'],
    },
  },

  // ==========================================================================
  // 19. PERMISSIONS / RÔLES (ROLES_GLOBAL_V2 / SUPPORT_AGENT_ROLE / MODULE_GATING)
  // ==========================================================================
  permissions: {
    /** ROLES_GLOBAL_V2: GlobalRoles N0 à N6 */
    globalRoles: {
      N0: 'utilisateur_standard_collaborateur_technicien',
      N1_N4: 'managers_direction_agence_animateurs_reseau',
      N5_N6: 'franchiseur_super_admin',
    },
    /** Accès modules conditionné par: globalRole, scope agence, user_modules + plan_tier_modules */
    moduleAccess: ['globalRole', 'manageScope', 'viewScope', 'user_modules'],
    
    /** SUPPORT_AGENT_ROLE: Accès gestion tickets (via option agent) */
    supportAgent: {
      condition: 'user_modules.aide.options.agent',
      anyRole: true,
    },
    
    /** MODULE_GATING_PAR_ROLE: voir ≠ piloter ≠ administrer */
    moduleGating: {
      visibility: 'globalRole_minimal',
      options: 'module_options_agence',
      specialRights: ['RH', 'Pilotage', 'Franchiseur', 'Support'],
      principle: 'voir_neq_piloter_neq_administrer',
    },
  },

  // ==========================================================================
  // 20. RH / DOCUMENTS / COFFRE-FORT
  // ==========================================================================
  rhDocuments: {
    /** RH_BULLETIN_EXTRACTION_CHAMPS: Extraction automatique des bulletins */
    bulletinExtraction: {
      automatic: true,
      fields: [
        'periode', 'identite_salarie', 'identite_employeur', 'classification',
        'base', 'heures', 'primes', 'zones', 'totaux', 'nets', 'cumul',
        'conges', 'cout_employeur',
      ],
      purpose: 'statia_rh_couts_charges_heures',
    },
    
    /** RH_COFFRE_FORT_NOTIF: Notification automatique au salarié */
    coffreFortNotif: {
      autoStore: true,
      notifyEmployee: true,
      categoryExplicit: true,
      example: 'Demandes RH / Réponses',
    },
    
    /** RH_DOCUMENT_REQUEST_WORKFLOW: Workflow demande document */
    documentRequestWorkflow: {
      steps: ['request_create', 'company_review', 'stamp_validate_or_reject', 'pdf_generate'],
      pdfContent: ['company_stamp', 'processor_name'],
      archiveTo: 'coffre_fort_salarie',
    },
    
    /** RH_CONTRAT_AUTO_DOCX: Génération contrat automatique */
    contratAutoDocx: {
      templates: ['CDI', 'CDD', 'autres'],
      mapping: 'profile_fields_to_docx_fields',
      export: 'PDF',
      requirement: 'all_contract_fields_on_fiche_salarie',
    },
  },

  // ==========================================================================
  // 21. RÉCEPTION DE TRAVAUX (TRAVAUX_RECEPTION_*)
  // ==========================================================================
  receptionTravaux: {
    /** TRAVAUX_RECEPTION_OBLIGATOIRE: Obligatoire pour travaux décennale */
    obligatoire: {
      scope: 'travaux_decennale',
      purpose: 'point_depart_garanties_legales_assurances',
      noReception: 'pas_de_couverture_juridique',
    },
    
    /** TRAVAUX_RECEPTION_MODALITES */
    modalites: {
      timing: 'apres_achevement_ouvrage',
      byTranches: true,
      initiative: ['client', 'professionnel'],
      presenceObligatoire: ['client', 'professionnel'],
      pvArchive: 'rattache_dossier_travaux',
    },
  },
} as const;

export type RulesJsonConfig = typeof RULES_JSON_CONFIG;
