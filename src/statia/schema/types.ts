/**
 * STATiA-BY-BIJ - Types du schéma Apogée enrichi V2
 * 
 * Ce fichier définit les types pour le référentiel analytique complet.
 * Source de vérité pour STATiA, le viewer de schéma et le futur builder IA.
 */

// ============================================
// TYPES DE CHAMPS
// ============================================

export type FieldType = 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object' | 'enum';

export type FieldRole = 
  | 'id'           // Clé primaire
  | 'foreignId'    // Clé étrangère
  | 'amount'       // Montant (HT, TTC)
  | 'date'         // Date métier
  | 'datetime'     // Date et heure
  | 'label'        // Texte descriptif
  | 'flag'         // Booléen métier
  | 'state'        // État/statut
  | 'category'     // Catégorie/type
  | 'reference'    // Référence métier
  | 'computed'     // Champ calculé
  | 'metadata';    // Données annexes

/**
 * Rôle sémantique BI - pour analyses et IA
 */
export type SemanticRole = 'dimension' | 'measure' | 'attribute';

export interface ApogeeFieldDefinition {
  name: string;
  type: FieldType;
  path?: string;                    // Chemin JSON si nested (ex: 'data.totalHT')
  nullable?: boolean;
  description: string;
  role: FieldRole;
  semanticRole?: SemanticRole;      // Rôle BI : dimension (groupBy), measure (agrégation), attribute (info)
  example?: string | number | boolean;
  enumValues?: string[];            // Valeurs possibles pour type enum
  keywords?: string[];              // Mots-clés pour recherche IA (ex: ['ca', 'chiffre_affaires', 'revenue'])
  aggregable?: boolean;             // Peut être utilisé dans sum/avg/min/max
  groupable?: boolean;              // Peut être utilisé dans groupBy
  filterable?: boolean;             // Peut être filtré
  dateField?: string;               // Pour les filtres date_from/date_to
}

// ============================================
// TYPES DE JOINTURES
// ============================================

export type JoinCardinality = 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';

export interface ApogeeJoinDefinition {
  target: string;                   // Endpoint cible
  localField: string;               // Champ local
  remoteField: string;              // Champ distant
  cardinality: JoinCardinality;
  description: string;
  isOptional?: boolean;             // La jointure peut ne pas matcher
}

// ============================================
// TYPES DE FILTRES
// ============================================

export type FilterType = 'date' | 'string' | 'number' | 'enum' | 'boolean';

export interface ApogeeFilterDefinition {
  name: string;                     // Nom du filtre (ex: 'date_range')
  field: string;                    // Champ à filtrer
  type: FilterType;
  description: string;
  enumValues?: string[];            // Valeurs pour filtre enum
}

// ============================================
// TYPES DE PARAMÈTRES D'ENTRÉE API
// ============================================

export interface ApogeeInputParam {
  name: string;                     // Nom du paramètre (date_from, date_to, state...)
  type: 'string' | 'number' | 'date' | 'enum' | 'boolean' | 'array';
  required: boolean;
  description: string;
  example?: string | number;
  enumValues?: string[];            // Valeurs possibles pour enum
}

// ============================================
// TYPES D'ENDPOINT
// ============================================

export interface ApogeeEndpointDefinition {
  id: string;                       // Nom technique (apiGetInterventions)
  name: string;                     // Nom logique (interventions)
  label: string;                    // Libellé (Interventions)
  description: string;              // Description métier
  httpMethod: 'POST' | 'GET';
  primaryKey: string;
  fields: ApogeeFieldDefinition[];
  joins: ApogeeJoinDefinition[];
  filters: ApogeeFilterDefinition[];
  inputParams?: ApogeeInputParam[]; // Paramètres d'entrée documentés
  datePrimaryField?: string;        // Champ date principal pour filtrage période
  tags?: string[];                  // Tags pour la recherche (ex: 'finance', 'planning')
  pagination?: {                    // Infos pagination si supportée
    supported: boolean;
    defaultLimit?: number;
    maxLimit?: number;
  };
}

// ============================================
// AGENCY ROUTING - Gestion multi-agences par URL
// ============================================

export interface AgencyRouting {
  /** Nom du paramètre dans les appels (agency_slug) */
  paramName: string;
  /** Template d'URL avec placeholder */
  baseUrlTemplate: string;
  /** Description du mécanisme */
  description: string;
  /** Clé API unique pour toutes les agences */
  apiKeyShared: boolean;
}

// ============================================
// TYPES DE RECHERCHE
// ============================================

export interface SchemaSearchResult {
  type: 'endpoint' | 'field' | 'join' | 'concept';
  endpointId: string;
  endpointLabel: string;
  fieldName?: string;
  fieldDescription?: string;
  fieldRole?: FieldRole;
  semanticRole?: SemanticRole;
  keywords?: string[];
  joinTarget?: string;
  relevanceScore: number;
}

// ============================================
// CONCEPTS MÉTIER
// ============================================

export interface BusinessConcept {
  id: string;
  label: string;
  description: string;
  keywords?: string[];              // Synonymes pour recherche IA
  locations: {
    endpoint: string;
    field: string;
    path?: string;
    note?: string;
  }[];
}

// ============================================
// DEBUG OUTPUT ENRICHI
// ============================================

export interface MetricDebugSource {
  source: string;
  endpoint: string;
  url: string;
  params: Record<string, unknown>;
  rawCount: number;
  filteredCount: number;
  sampleData?: unknown[];
}

export interface MetricDebugStats {
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  count?: number;
  // Pour les ratios
  numeratorCount?: number;
  denominatorCount?: number;
}

export interface MetricDebugOutput {
  metricId: string;
  executionMs: number;
  sources: MetricDebugSource[];
  aggregationStats?: MetricDebugStats;
  formula: {
    type: string;
    field?: string;
    groupBy?: string;
  };
  result: unknown;
}
