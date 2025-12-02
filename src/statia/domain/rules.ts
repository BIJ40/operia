// src/statia/domain/rules.ts
/**
 * STATiA-BY-BIJ - Règles métier HelpConfort
 * 
 * Ce fichier centralise toutes les règles métier pour le calcul des KPIs.
 * Il sert de source de vérité pour l'interprétation des données Apogée.
 * 
 * Validé le: [DATE]
 * Validé par: [NOM]
 */

import type { MetricDefinitionJSON } from '@/statia/engine/metricEngine';

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
];

/**
 * Type2 spéciaux considérés comme productifs
 * Même sans indicateur bi* (biTvx, biDepan), ces types sont productifs
 */
export const SPECIAL_PRODUCTIVE_TYPE2 = [
  'recherche de fuite',
  'Recherche de fuite',
  'RECHERCHE DE FUITE',
];

/**
 * Types SAV uniquement
 */
export const SAV_TYPES = ['SAV'];

/**
 * Types RT uniquement
 */
export const RT_TYPES = ['RT', 'releve technique', 'Releve technique'];

/**
 * Types TH uniquement (taux d'humidité)
 */
export const TH_TYPES = ['TH'];

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
} as const;
