/**
 * STATiA-BY-BIJ - Moteur d'exécution de métriques V2
 * 
 * Moteur générique, robuste et performant capable d'exécuter n'importe quelle
 * définition JSON produite par STATiA (multi-endpoints, multi-dimensions, ratios).
 * 
 * Intègre les règles métier centralisées depuis /statia/rules/
 */

import { 
  format, 
  parseISO, 
  startOfWeek, 
  startOfMonth, 
  startOfYear,
  isWithinInterval,
  parse
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { APOGEE_SCHEMA, buildAgencyBaseUrl } from '../schema/apogeeSchemaV2';
import { apogeeProxy } from '@/services/apogeeProxy';
import type { ApogeeSourceName, FilterCondition, FormulaDefinition } from '../types';
import { 
  STATIA_RULES_JSON,
  resolveInterventionType,
  isProductiveIntervention,
  isSAVIntervention,
  getDateField,
  getGroupByConfig,
  normalizeSynonym
} from '../rules/rules';
import { calculateNetAmount } from './normalizers';

// ============================================
// TYPES DU MOTEUR
// ============================================

export interface MetricExecutionParams {
  agency_slug: string;
  date_from?: Date | string;
  date_to?: Date | string;
  [key: string]: any;
}

export interface MetricDefinitionJSON {
  id: string;
  label: string;
  input_sources: {
    primary: string;
    secondary?: Array<{
      source: string;
      joinOn?: { local: string; foreign: string };
    }>;
    joins?: Array<{
      from: string;
      to: string;
      on: { local: string; foreign: string };
    }>;
  };
  formula: {
    type: string;
    field?: string;
    numerator?: { type: string; field?: string; filters?: any[] };
    denominator?: { type: string; field?: string; filters?: any[] };
    groupBy?: string[];
  };
  filters?: FilterCondition[];
  dimensions?: string[];
  output_format?: {
    type: 'single' | 'table' | 'series';
    recommendedChart?: string;
    labels?: { x?: string; y?: string };
  };
}

export interface ExecutionDebug {
  executionId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  endpoints: Array<{
    source: string;
    url: string;
    params: Record<string, any>;
    rawCount: number;
    filteredCount: number;
  }>;
  joins: Array<{
    from: string;
    to: string;
    keys: { local: string; foreign: string };
    matchedCount: number;
  }>;
  filters: Array<{
    field: string;
    operator: string;
    value: any;
    filteredOutCount: number;
  }>;
  aggregation: {
    type: string;
    field?: string;
    groupBy?: string[];
    stats: {
      count: number;
      min?: number;
      max?: number;
      avg?: number;
      sum?: number;
      numeratorCount?: number;
      denominatorCount?: number;
    };
  };
}

export interface VisualizationData {
  type: 'single' | 'table' | 'series' | 'multi-dimension';
  recommendedChart: 'number' | 'bar' | 'line' | 'pie' | 'heatmap' | 'table';
  value?: number;
  labels?: string[];
  series?: Array<{
    name: string;
    data: number[];
  }>;
  categories?: string[];
  rows?: Array<Record<string, any>>;
  columns?: Array<{ key: string; label: string }>;
  unit?: string;
}

export interface MetricExecutionResult {
  success: boolean;
  value: number | null;
  breakdown?: Record<string, number>;
  multiBreakdown?: Record<string, Record<string, number>>;
  visualization: VisualizationData;
  debug: ExecutionDebug;
  error?: { code: string; message: string };
}

// ============================================
// GRAPHE DE RELATIONS ENTRE ENDPOINTS
// ============================================

interface RelationEdge {
  from: ApogeeSourceName;
  to: ApogeeSourceName;
  localField: string;
  foreignField: string;
  cardinality: 'one-to-one' | 'one-to-many' | 'many-to-one' | 'many-to-many';
}

/**
 * Construit le graphe de relations à partir du schéma
 */
function buildRelationsGraph(): Map<string, RelationEdge[]> {
  const graph = new Map<string, RelationEdge[]>();
  
  for (const [sourceName, endpoint] of Object.entries(APOGEE_SCHEMA)) {
    const edges: RelationEdge[] = [];
    
    for (const join of endpoint.joins || []) {
      edges.push({
        from: sourceName as ApogeeSourceName,
        to: join.target as ApogeeSourceName,
        localField: join.localField,
        foreignField: join.remoteField,
        cardinality: join.cardinality as RelationEdge['cardinality'],
      });
    }
    
    graph.set(sourceName, edges);
  }
  
  return graph;
}

const RELATIONS_GRAPH = buildRelationsGraph();

/**
 * Trouve le chemin de jointure entre deux sources via BFS
 */
function findJoinPath(
  from: ApogeeSourceName, 
  to: ApogeeSourceName
): RelationEdge[] | null {
  if (from === to) return [];
  
  const visited = new Set<string>();
  const queue: Array<{ node: string; path: RelationEdge[] }> = [
    { node: from, path: [] }
  ];
  
  while (queue.length > 0) {
    const { node, path } = queue.shift()!;
    
    if (visited.has(node)) continue;
    visited.add(node);
    
    const edges = RELATIONS_GRAPH.get(node) || [];
    
    for (const edge of edges) {
      if (edge.to === to) {
        return [...path, edge];
      }
      
      if (!visited.has(edge.to)) {
        queue.push({ node: edge.to, path: [...path, edge] });
      }
    }
    
    // Chercher aussi les relations inverses
    for (const [otherSource, otherEdges] of RELATIONS_GRAPH) {
      for (const edge of otherEdges) {
        if (edge.to === node && !visited.has(otherSource)) {
          const reverseEdge: RelationEdge = {
            from: node as ApogeeSourceName,
            to: otherSource as ApogeeSourceName,
            localField: edge.foreignField,
            foreignField: edge.localField,
            cardinality: reverseCardinality(edge.cardinality),
          };
          
          if (otherSource === to) {
            return [...path, reverseEdge];
          }
          
          queue.push({ node: otherSource, path: [...path, reverseEdge] });
        }
      }
    }
  }
  
  return null;
}

function reverseCardinality(c: RelationEdge['cardinality']): RelationEdge['cardinality'] {
  switch (c) {
    case 'one-to-many': return 'many-to-one';
    case 'many-to-one': return 'one-to-many';
    default: return c;
  }
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

interface LoadedDataset {
  source: string;
  data: any[];
  rawCount: number;
  filteredCount: number;
}

async function loadSourceData(
  sources: string[],
  params: MetricExecutionParams
): Promise<{ datasets: Map<string, LoadedDataset>; debug: ExecutionDebug['endpoints'] }> {
  const apiUrl = buildAgencyBaseUrl(params.agency_slug);
  
  // Charger toutes les données nécessaires via le proxy sécurisé
  const [interventions, projects, factures, devis, users, clients] = await Promise.all([
    apogeeProxy.getInterventions({ agencySlug: params.agency_slug }),
    apogeeProxy.getProjects({ agencySlug: params.agency_slug }),
    apogeeProxy.getFactures({ agencySlug: params.agency_slug }),
    apogeeProxy.getDevis({ agencySlug: params.agency_slug }),
    apogeeProxy.getUsers({ agencySlug: params.agency_slug }),
    apogeeProxy.getClients({ agencySlug: params.agency_slug }),
  ]);
  
  const allData = {
    interventions: interventions || [],
    projects: projects || [],
    factures: factures || [],
    devis: devis || [],
    users: users || [],
    clients: clients || [],
  };
  
  const sourceMapping: Record<string, keyof typeof allData> = {
    interventions: 'interventions',
    projects: 'projects',
    factures: 'factures',
    devis: 'devis',
    users: 'users',
    clients: 'clients',
  };
  
  const datasets = new Map<string, LoadedDataset>();
  const debugEndpoints: ExecutionDebug['endpoints'] = [];
  
  for (const source of sources) {
    const dataKey = sourceMapping[source];
    const rawData = allData[dataKey] || [];
    
    datasets.set(source, {
      source,
      data: rawData,
      rawCount: rawData.length,
      filteredCount: rawData.length,
    });
    
    debugEndpoints.push({
      source,
      url: `${apiUrl}apiGet${source.charAt(0).toUpperCase() + source.slice(1)}`,
      params: {},
      rawCount: rawData.length,
      filteredCount: rawData.length,
    });
  }
  
  return { datasets, debug: debugEndpoints };
}

// ============================================
// APPLICATION DES FILTRES
// ============================================

function applyFilters(
  data: any[], 
  filters: FilterCondition[]
): { filtered: any[]; removedCount: number } {
  let removedCount = 0;
  
  const filtered = data.filter(item => {
    const passes = filters.every(filter => {
      const value = getNestedValue(item, filter.field);
      return evaluateCondition(value, filter.operator, filter.value);
    });
    
    if (!passes) removedCount++;
    return passes;
  });
  
  return { filtered, removedCount };
}

function applyDateRangeFilter(
  data: any[],
  dateFrom?: Date | string,
  dateTo?: Date | string,
  source?: string
): any[] {
  if (!dateFrom && !dateTo) return data;
  
  const from = dateFrom ? (typeof dateFrom === 'string' ? parseISO(dateFrom) : dateFrom) : null;
  const to = dateTo ? (typeof dateTo === 'string' ? parseISO(dateTo) : dateTo) : null;
  
  // Utiliser le champ date approprié selon les règles métier
  const dateField = source ? getDateField(source) : 'date';
  
  return data.filter(item => {
    // Chercher dans plusieurs champs possibles selon les règles
    const dateStr = item[dateField] || item.dateReelle || item.date || item.dateEmission || item.created_at;
    const itemDate = parseDateSafe(dateStr);
    if (!itemDate) return true;
    
    if (from && to) {
      return isWithinInterval(itemDate, { start: from, end: to });
    }
    if (from) return itemDate >= from;
    if (to) return itemDate <= to;
    return true;
  });
}

/**
 * Applique les règles métier STATiA aux données
 */
function applyBusinessRules(data: any[], source: string): any[] {
  return data.map(item => {
    const enriched = { ...item };
    
    // Pour les interventions: résoudre le type réel si "A DEFINIR"
    if (source === 'interventions') {
      enriched._resolvedType = resolveInterventionType(item);
      enriched._isProductive = isProductiveIntervention(item);
      enriched._isSAV = isSAVIntervention(item);
    }
    
    // Pour les factures: calculer le montant net (gestion des avoirs)
    if (source === 'factures') {
      enriched._netAmount = calculateNetAmount(item);
    }
    
    return enriched;
  });
}

function parseDateSafe(value: string): Date | null {
  if (!value) return null;
  try {
    const d = parseISO(value);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  try {
    const d = parse(value, 'dd/MM/yyyy', new Date());
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return null;
}

function getNestedValue(obj: any, path: string): any {
  // Gestion des chemins avec fallbacks pour les montants
  const monetaryFallbacks: Record<string, string[]> = {
    'data.totalHT': ['data.totalHT', 'totalHT', 'data.montantHT', 'montantHT'],
    'data.totalTTC': ['data.totalTTC', 'totalTTC', 'data.montantTTC', 'montantTTC'],
    'totalHT': ['totalHT', 'data.totalHT', 'montantHT', 'data.montantHT'],
  };
  
  const fallbacks = monetaryFallbacks[path];
  if (fallbacks) {
    for (const fallbackPath of fallbacks) {
      const value = fallbackPath.split('.').reduce((current, key) => current?.[key], obj);
      if (value !== null && value !== undefined) {
        return value;
      }
    }
    return undefined;
  }
  
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function evaluateCondition(value: any, operator: FilterCondition['operator'], target: any): boolean {
  switch (operator) {
    case 'eq': return value === target;
    case 'neq': return value !== target;
    case 'gt': return value > target;
    case 'gte': return value >= target;
    case 'lt': return value < target;
    case 'lte': return value <= target;
    case 'in': return Array.isArray(target) && target.includes(value);
    case 'not_in': return Array.isArray(target) && !target.includes(value);
    case 'contains': return String(value).toLowerCase().includes(String(target).toLowerCase());
    case 'exists': return value !== null && value !== undefined;
    default: return true;
  }
}

// ============================================
// JOINTURES INTELLIGENTES
// ============================================

function executeJoins(
  datasets: Map<string, LoadedDataset>,
  joins: MetricDefinitionJSON['input_sources']['joins']
): { joinedData: any[]; debugJoins: ExecutionDebug['joins'] } {
  const debugJoins: ExecutionDebug['joins'] = [];
  
  if (!joins || joins.length === 0) {
    // Retourner les données du premier dataset
    const firstDataset = datasets.values().next().value;
    return { 
      joinedData: firstDataset?.data || [], 
      debugJoins 
    };
  }
  
  // Commencer avec le dataset source de la première jointure
  let result = datasets.get(joins[0].from)?.data || [];
  
  for (const join of joins) {
    const targetDataset = datasets.get(join.to);
    if (!targetDataset) {
      throw new Error(`Relation introuvable: source "${join.to}" non chargée`);
    }
    
    // Support both formats: { on: { local, foreign } } and { localField, remoteField }
    const localKey = join.on?.local || (join as any).localField;
    const foreignKey = join.on?.foreign || (join as any).remoteField;
    
    if (!localKey || !foreignKey) {
      console.warn(`Join missing keys:`, join);
      continue;
    }
    
    // Créer un index pour la jointure
    const targetIndex = new Map<any, any>();
    for (const item of targetDataset.data) {
      const key = getNestedValue(item, foreignKey);
      if (key !== undefined) {
        targetIndex.set(key, item);
      }
    }
    
    // Exécuter la jointure
    let matchedCount = 0;
    result = result.map(item => {
      const joinKeyValue = getNestedValue(item, localKey);
      const joined = targetIndex.get(joinKeyValue);
      if (joined) {
        matchedCount++;
        return { 
          ...item, 
          [`_${join.to}`]: joined,
          // Aplatir les champs utiles du dataset joint
          ...flattenJoinedFields(joined, join.to)
        };
      }
      return item;
    });
    
    debugJoins.push({
      from: join.from,
      to: join.to,
      keys: { local: localKey, foreign: foreignKey },
      matchedCount,
    });
  }
  
  return { joinedData: result, debugJoins };
}

function flattenJoinedFields(joined: any, prefix: string): Record<string, any> {
  const flat: Record<string, any> = {};
  
  // Extraire les champs couramment utilisés en jointure
  const importantFields = ['id', 'name', 'label', 'ref', 'type', 'state', 'universes', 'commanditaireId'];
  
  for (const field of importantFields) {
    const value = getNestedValue(joined, field);
    if (value !== undefined) {
      flat[`${prefix}_${field}`] = value;
    }
  }
  
  // Extraire les champs data.*
  if (joined.data) {
    for (const [key, value] of Object.entries(joined.data)) {
      flat[`${prefix}_data_${key}`] = value;
    }
  }
  
  return flat;
}

/**
 * Déduit et exécute les jointures automatiquement depuis le schéma
 */
function autoResolveJoins(
  primarySource: string,
  secondarySources: string[],
  datasets: Map<string, LoadedDataset>
): { joinedData: any[]; debugJoins: ExecutionDebug['joins'] } {
  const debugJoins: ExecutionDebug['joins'] = [];
  let result = datasets.get(primarySource)?.data || [];
  
  for (const secondary of secondarySources) {
    const path = findJoinPath(primarySource as ApogeeSourceName, secondary as ApogeeSourceName);
    
    if (!path || path.length === 0) {
      throw new Error(`Relation introuvable entre "${primarySource}" et "${secondary}"`);
    }
    
    // Exécuter chaque étape du chemin de jointure
    for (const edge of path) {
      const targetDataset = datasets.get(edge.to);
      if (!targetDataset) continue;
      
      const targetIndex = new Map<any, any>();
      for (const item of targetDataset.data) {
        const key = getNestedValue(item, edge.foreignField);
        if (key !== undefined) {
          targetIndex.set(key, item);
        }
      }
      
      let matchedCount = 0;
      result = result.map(item => {
        const joinKey = getNestedValue(item, edge.localField);
        const joined = targetIndex.get(joinKey);
        if (joined) {
          matchedCount++;
          return { 
            ...item, 
            [`_${edge.to}`]: joined,
            ...flattenJoinedFields(joined, edge.to)
          };
        }
        return item;
      });
      
      debugJoins.push({
        from: edge.from,
        to: edge.to,
        keys: { local: edge.localField, foreign: edge.foreignField },
        matchedCount,
      });
    }
  }
  
  return { joinedData: result, debugJoins };
}

// ============================================
// AGRÉGATIONS MULTI-DIMENSIONS
// ============================================

interface AggregationResult {
  value: number;
  breakdown?: Record<string, number>;
  multiBreakdown?: Record<string, Record<string, number>>;
  stats: {
    count: number;
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    numeratorCount?: number;
    denominatorCount?: number;
  };
}

/**
 * Résout un champ dimension pour le groupBy en utilisant les règles STATiA
 */
function resolveDimensionField(dimension: string, item: any): string {
  // Normaliser la dimension via les synonymes NLP
  const normalizedDimension = normalizeSynonym(dimension).toLowerCase();
  
  // Mapping des dimensions métier vers les champs réels (enrichi avec STATIA_RULES)
  const dimensionMapping: Record<string, string[]> = {
    'apporteur': ['projects_data_commanditaireId', '_projects.data.commanditaireId', 'commanditaireId', 'data.commanditaireId'],
    'commanditaire': ['projects_data_commanditaireId', '_projects.data.commanditaireId', 'commanditaireId', 'data.commanditaireId'],
    'prescripteur': ['projects_data_commanditaireId', '_projects.data.commanditaireId', 'commanditaireId', 'data.commanditaireId'],
    'commanditaireid': ['projects_data_commanditaireId', '_projects.data.commanditaireId', 'commanditaireId', 'data.commanditaireId'],
    'univers': ['projects_data_universes', '_projects.data.universes', 'universes', 'data.universes'],
    'metier': ['projects_data_universes', '_projects.data.universes', 'universes', 'data.universes'],
    'domaine': ['projects_data_universes', '_projects.data.universes', 'universes', 'data.universes'],
    'universes': ['projects_data_universes', '_projects.data.universes', 'universes', 'data.universes'],
    'technicien': ['userId', 'tech_id', 'data.technicians', '_resolvedTechnicianId'],
    'intervenant': ['userId', 'tech_id', 'data.technicians'],
    'ouvrier': ['userId', 'tech_id', 'data.technicians'],
    'userid': ['userId', 'tech_id', 'data.technicians'],
    'client': ['clientId', 'client.id', 'projects_clientId'],
    'clientid': ['clientId', 'client.id', 'projects_clientId'],
    'type': ['type', '_resolvedType', 'typeFacture', 'invoiceType'],
    'type_intervention': ['type', '_resolvedType'],
    'state': ['state', 'paymentStatus', 'kanban_status'],
  };
  
  const paths = dimensionMapping[normalizedDimension] || [dimension];
  
  for (const path of paths) {
    const value = getNestedValue(item, path);
    if (value !== undefined && value !== null) {
      // Gérer les tableaux (ex: universes)
      if (Array.isArray(value)) {
        return value.join(', ') || 'Non défini';
      }
      return String(value);
    }
  }
  
  // Chercher aussi dans les données jointes
  const joinedPrefixes = ['_projects', '_clients', '_factures', '_devis', '_interventions', '_users'];
  for (const prefix of joinedPrefixes) {
    const joinedData = item[prefix];
    if (joinedData) {
      const value = getNestedValue(joinedData, dimension) || getNestedValue(joinedData, `data.${dimension}`);
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          return value.join(', ') || 'Non défini';
        }
        return String(value);
      }
    }
  }
  
  return 'Non défini';
}

/**
 * Résout une dimension de période
 */
function resolvePeriodDimension(item: any, period: 'day' | 'week' | 'month' | 'year'): string {
  const dateStr = item.date || item.dateReelle || item.dateEmission || item.created_at;
  const date = parseDateSafe(dateStr);
  
  if (!date) return 'Date inconnue';
  
  switch (period) {
    case 'day':
      return format(date, 'yyyy-MM-dd');
    case 'week':
      return format(startOfWeek(date, { locale: fr }), "'S'w yyyy");
    case 'month':
      return format(startOfMonth(date), 'MMM yyyy', { locale: fr });
    case 'year':
      return format(startOfYear(date), 'yyyy');
    default:
      return format(date, 'yyyy-MM-dd');
  }
}

/**
 * Exécute l'agrégation avec support multi-dimensions
 */
function executeAggregation(
  data: any[],
  formula: MetricDefinitionJSON['formula'],
  dimensions?: string[]
): AggregationResult {
  const stats: AggregationResult['stats'] = { count: data.length };
  
  // Calculer les stats de base si champ de mesure
  if (formula.field && ['sum', 'avg', 'min', 'max'].includes(formula.type)) {
    const values = data
      .map(item => parseFloat(getNestedValue(item, formula.field!)) || 0)
      .filter(v => !isNaN(v));
    
    if (values.length > 0) {
      stats.min = Math.min(...values);
      stats.max = Math.max(...values);
      stats.sum = values.reduce((a, b) => a + b, 0);
      stats.avg = stats.sum / values.length;
    }
  }
  
  // Pas de dimensions = valeur unique
  if (!dimensions || dimensions.length === 0) {
    const value = calculateSingleValue(data, formula, stats);
    return { value, stats };
  }
  
  // Une dimension = breakdown simple
  if (dimensions.length === 1) {
    const breakdown = aggregateByDimension(data, formula, dimensions[0]);
    const totalValue = Object.values(breakdown).reduce((a, b) => a + b, 0);
    return { value: totalValue, breakdown, stats };
  }
  
  // Multi-dimensions = multiBreakdown
  const multiBreakdown = aggregateMultiDimensions(data, formula, dimensions);
  const totalValue = Object.values(multiBreakdown)
    .flatMap(inner => Object.values(inner))
    .reduce((a, b) => a + b, 0);
  
  return { value: totalValue, breakdown: undefined, multiBreakdown, stats };
}

function calculateSingleValue(
  data: any[],
  formula: MetricDefinitionJSON['formula'],
  stats: AggregationResult['stats']
): number {
  switch (formula.type) {
    case 'count':
      return data.length;
    
    case 'distinct_count':
      if (!formula.field) return 0;
      return new Set(data.map(item => getNestedValue(item, formula.field!))).size;
    
    case 'sum':
      return stats.sum ?? 0;
    
    case 'avg':
      return stats.avg ?? 0;
    
    case 'min':
      return stats.min ?? 0;
    
    case 'max':
      return stats.max ?? 0;
    
    case 'ratio':
      if (!formula.numerator || !formula.denominator) return 0;
      
      // Appliquer les filtres du numérateur/dénominateur
      let numData = data;
      let denData = data;
      
      if (formula.numerator.filters) {
        numData = applyFilters(data, formula.numerator.filters as FilterCondition[]).filtered;
      }
      if (formula.denominator.filters) {
        denData = applyFilters(data, formula.denominator.filters as FilterCondition[]).filtered;
      }
      
      const numValue = formula.numerator.type === 'count' 
        ? numData.length
        : formula.numerator.type === 'sum' && formula.numerator.field
          ? numData.reduce((s, item) => s + (parseFloat(getNestedValue(item, formula.numerator!.field!)) || 0), 0)
          : numData.length;
      
      const denValue = formula.denominator.type === 'count'
        ? denData.length
        : formula.denominator.type === 'sum' && formula.denominator.field
          ? denData.reduce((s, item) => s + (parseFloat(getNestedValue(item, formula.denominator!.field!)) || 0), 0)
          : denData.length;
      
      stats.numeratorCount = numValue;
      stats.denominatorCount = denValue;
      
      return denValue > 0 ? (numValue / denValue) * 100 : 0;
    
    default:
      return data.length;
  }
}

function aggregateByDimension(
  data: any[],
  formula: MetricDefinitionJSON['formula'],
  dimension: string
): Record<string, number> {
  const groups = new Map<string, any[]>();
  
  // Détecter si c'est une dimension de période
  const periodMatch = dimension.match(/^periode_(day|week|month|year)$/i);
  
  for (const item of data) {
    let groupKey: string;
    
    if (periodMatch) {
      groupKey = resolvePeriodDimension(item, periodMatch[1] as any);
    } else {
      groupKey = resolveDimensionField(dimension, item);
    }
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(item);
  }
  
  const result: Record<string, number> = {};
  for (const [key, groupData] of groups) {
    result[key] = calculateSingleValue(groupData, formula, { count: groupData.length });
  }
  
  return result;
}

function aggregateMultiDimensions(
  data: any[],
  formula: MetricDefinitionJSON['formula'],
  dimensions: string[]
): Record<string, Record<string, number>> {
  const [dim1, dim2] = dimensions;
  const result: Record<string, Record<string, number>> = {};
  
  // Détecter si ce sont des dimensions de période
  const period1Match = dim1.match(/^periode_(day|week|month|year)$/i);
  const period2Match = dim2.match(/^periode_(day|week|month|year)$/i);
  
  for (const item of data) {
    const key1 = period1Match 
      ? resolvePeriodDimension(item, period1Match[1] as any)
      : resolveDimensionField(dim1, item);
    const key2 = period2Match
      ? resolvePeriodDimension(item, period2Match[1] as any)
      : resolveDimensionField(dim2, item);
    
    if (!result[key1]) {
      result[key1] = {};
    }
    if (!result[key1][key2]) {
      result[key1][key2] = 0;
    }
    
    // Incrémenter selon le type de formule
    if (formula.type === 'count') {
      result[key1][key2]++;
    } else if (formula.type === 'sum' && formula.field) {
      result[key1][key2] += parseFloat(getNestedValue(item, formula.field)) || 0;
    } else {
      result[key1][key2]++;
    }
  }
  
  return result;
}

// ============================================
// GÉNÉRATION DE LA VISUALISATION
// ============================================

function generateVisualization(
  aggregation: AggregationResult,
  outputFormat?: MetricDefinitionJSON['output_format'],
  dimensions?: string[],
  unit?: string
): VisualizationData {
  const hasDimensions = dimensions && dimensions.length > 0;
  const hasPeriod = dimensions?.some(d => d.toLowerCase().includes('periode'));
  const hasMultipleDimensions = dimensions && dimensions.length > 1;
  
  // Valeur simple
  if (!hasDimensions && aggregation.breakdown === undefined) {
    return {
      type: 'single',
      recommendedChart: 'number',
      value: aggregation.value,
      unit,
    };
  }
  
  // Multi-dimensions
  if (hasMultipleDimensions && aggregation.multiBreakdown) {
    const categories = Object.keys(aggregation.multiBreakdown);
    const subCategories = new Set<string>();
    
    for (const inner of Object.values(aggregation.multiBreakdown)) {
      Object.keys(inner).forEach(k => subCategories.add(k));
    }
    
    const series = Array.from(subCategories).map(subCat => ({
      name: subCat,
      data: categories.map(cat => aggregation.multiBreakdown![cat][subCat] || 0),
    }));
    
    return {
      type: 'multi-dimension',
      recommendedChart: hasPeriod ? 'line' : 'bar',
      labels: categories,
      series,
      categories,
      unit,
    };
  }
  
  // Une dimension
  if (aggregation.breakdown) {
    const labels = Object.keys(aggregation.breakdown);
    const data = Object.values(aggregation.breakdown);
    
    // Choisir le graphique recommandé
    let recommendedChart: VisualizationData['recommendedChart'] = 'bar';
    if (hasPeriod) {
      recommendedChart = 'line';
    } else if (labels.length <= 5) {
      recommendedChart = 'pie';
    }
    
    // Utiliser le format suggéré si disponible
    if (outputFormat?.recommendedChart) {
      recommendedChart = outputFormat.recommendedChart as VisualizationData['recommendedChart'];
    }
    
    return {
      type: 'series',
      recommendedChart,
      labels,
      series: [{ name: 'Valeur', data }],
      categories: labels,
      value: aggregation.value,
      unit,
    };
  }
  
  return {
    type: 'single',
    recommendedChart: 'number',
    value: aggregation.value,
    unit,
  };
}

// ============================================
// POINT D'ENTRÉE PRINCIPAL
// ============================================

/**
 * Exécute une métrique à partir de sa définition JSON
 */
export async function runMetric(
  definition: MetricDefinitionJSON,
  params: MetricExecutionParams
): Promise<MetricExecutionResult> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();
  
  const debug: ExecutionDebug = {
    executionId,
    startedAt: new Date().toISOString(),
    completedAt: '',
    durationMs: 0,
    endpoints: [],
    joins: [],
    filters: [],
    aggregation: {
      type: definition.formula.type,
      field: definition.formula.field,
      groupBy: definition.formula.groupBy || definition.dimensions,
      stats: { count: 0 },
    },
  };
  
  try {
    // 1. Identifier toutes les sources nécessaires
    const allSources = new Set<string>();
    allSources.add(definition.input_sources.primary);
    
    if (definition.input_sources.secondary) {
      definition.input_sources.secondary.forEach(s => allSources.add(s.source));
    }
    if (definition.input_sources.joins) {
      definition.input_sources.joins.forEach(j => {
        allSources.add(j.from);
        allSources.add(j.to);
      });
    }
    
    // 2. Charger les données
    const { datasets, debug: endpointsDebug } = await loadSourceData(
      Array.from(allSources),
      params
    );
    debug.endpoints = endpointsDebug;
    
    // 3. Exécuter les jointures
    let joinedData: any[];
    
    if (definition.input_sources.joins && definition.input_sources.joins.length > 0) {
      // Jointures explicites
      const joinResult = executeJoins(datasets, definition.input_sources.joins);
      joinedData = joinResult.joinedData;
      debug.joins = joinResult.debugJoins;
    } else if (definition.input_sources.secondary && definition.input_sources.secondary.length > 0) {
      // Auto-résolution des jointures
      const secondarySources = definition.input_sources.secondary.map(s => s.source);
      const joinResult = autoResolveJoins(
        definition.input_sources.primary,
        secondarySources,
        datasets
      );
      joinedData = joinResult.joinedData;
      debug.joins = joinResult.debugJoins;
    } else {
      // Pas de jointure
      joinedData = datasets.get(definition.input_sources.primary)?.data || [];
    }
    
    // 4. Appliquer les filtres
    if (definition.filters && definition.filters.length > 0) {
      for (const filter of definition.filters) {
        const beforeCount = joinedData.length;
        const { filtered, removedCount } = applyFilters(joinedData, [filter]);
        joinedData = filtered;
        
        debug.filters.push({
          field: filter.field,
          operator: filter.operator,
          value: filter.value,
          filteredOutCount: removedCount,
        });
      }
    }
    
    // 5. Appliquer le filtre de période
    if (params.date_from || params.date_to) {
      joinedData = applyDateRangeFilter(joinedData, params.date_from, params.date_to);
    }
    
    // 6. Exécuter l'agrégation
    const dimensions = definition.dimensions || definition.formula.groupBy;
    const aggregation = executeAggregation(joinedData, definition.formula, dimensions);
    
    debug.aggregation.stats = aggregation.stats;
    
    // 7. Générer la visualisation
    const visualization = generateVisualization(
      aggregation,
      definition.output_format,
      dimensions,
      definition.formula.type === 'ratio' ? '%' : undefined
    );
    
    // Finaliser le debug
    debug.completedAt = new Date().toISOString();
    debug.durationMs = Date.now() - startTime;
    
    return {
      success: true,
      value: aggregation.value,
      breakdown: aggregation.breakdown,
      multiBreakdown: aggregation.multiBreakdown,
      visualization,
      debug,
    };
    
  } catch (error) {
    debug.completedAt = new Date().toISOString();
    debug.durationMs = Date.now() - startTime;
    
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    
    return {
      success: false,
      value: null,
      visualization: {
        type: 'single',
        recommendedChart: 'number',
        value: 0,
      },
      debug,
      error: {
        code: 'EXECUTION_ERROR',
        message,
      },
    };
  }
}

/**
 * Hook-compatible function pour exécuter une métrique par son ID
 */
export async function runMetricById(
  metricId: string,
  params: MetricExecutionParams,
  metricDefinition: MetricDefinitionJSON
): Promise<MetricExecutionResult> {
  return runMetric(metricDefinition, params);
}
