/**
 * STATiA-BY-BIJ - Types du schéma Apogée enrichi
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

export interface ApogeeFieldDefinition {
  name: string;
  type: FieldType;
  path?: string;                    // Chemin JSON si nested (ex: 'data.totalHT')
  nullable?: boolean;
  description: string;
  role: FieldRole;
  example?: string | number | boolean;
  enumValues?: string[];            // Valeurs possibles pour type enum
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
  datePrimaryField?: string;        // Champ date principal pour filtrage période
  tags?: string[];                  // Tags pour la recherche (ex: 'finance', 'planning')
}

// ============================================
// TYPES DE RECHERCHE
// ============================================

export interface SchemaSearchResult {
  type: 'endpoint' | 'field' | 'join';
  endpointId: string;
  endpointLabel: string;
  fieldName?: string;
  fieldDescription?: string;
  fieldRole?: FieldRole;
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
  locations: {
    endpoint: string;
    field: string;
    path?: string;
    note?: string;
  }[];
}
