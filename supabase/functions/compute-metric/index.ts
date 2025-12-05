import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightOrReject, withCors } from "../_shared/cors.ts";

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

// =============================================================
// STATIA_RULES - Règles métier centralisées
// =============================================================
const STATIA_RULES = {
  CA: {
    source: "apiGetFactures.data.totalHT",
    includeStates: ["sent", "paid", "partial"],
    avoir: "subtract",
  },
  technicians: {
    productiveTypes: ["depannage", "repair", "travaux", "work"],
    nonProductiveTypes: ["RT", "rdv", "rdvtech", "sav", "diagnostic"],
    RT_generates_NO_CA: true,
  },
  interventions: {
    validStates: ["validated", "done", "finished"],
    excludeStates: ["draft", "canceled", "refused"],
  },
  dates: {
    factures: "dateReelle",
    interventions: "dateReelle",
    projects: "date",
  },
  synonyms: {
    apporteur: ["commanditaire", "prescripteur"],
    univers: ["metier", "domaine"],
    technicien: ["intervenant", "ouvrier"],
  },
};

/**
 * Mapping des champs anglais vers les champs réels de l'API Apogée
 */
const FIELD_MAPPING: Record<string, string> = {
  'duration': 'duree',
  'amount': 'totalHT',
  'amountHT': 'totalHT', 
  'amountTTC': 'totalTTC',
};

function mapFieldName(field: string | undefined): string | undefined {
  if (!field) return undefined;
  return FIELD_MAPPING[field] || field;
}

/**
 * Normalise une définition de métrique (v1 array ou v2 object)
 */
function normalizeDefinition(definition: any): {
  primary: string;
  filters: any[];
  formula: any;
  joins: any[];
  dimensions: string[];
} {
  let primary = 'projects';
  let filters: any[] = [];
  let joins: any[] = [];
  
  const inputSources = definition.input_sources;
  
  if (Array.isArray(inputSources)) {
    // V1 format: array
    if (inputSources.length > 0) {
      primary = inputSources[0]?.source || 'projects';
      // Extract filters from v1 format
      if (Array.isArray(inputSources[0]?.filters)) {
        filters = inputSources[0].filters;
      }
    }
  } else if (inputSources && typeof inputSources === 'object') {
    // V2 format: object
    primary = inputSources.primary || 'projects';
    joins = Array.isArray(inputSources.joins) ? inputSources.joins : [];
  }
  
  // Also check definition.filters (may be set by frontend)
  if (Array.isArray(definition.filters) && definition.filters.length > 0) {
    filters = definition.filters;
  }
  
  // Map field name
  const formula = { ...definition.formula };
  if (formula.field) {
    formula.field = mapFieldName(formula.field);
  }
  
  const dimensions = definition.dimensions || formula.groupBy || [];
  
  return { primary, filters, formula, joins, dimensions };
}

/**
 * Construit l'URL de base pour une agence
 */
function buildAgencyBaseUrl(agencySlug: string): string {
  return `https://${agencySlug}.hc-apogee.fr/api/`;
}

/**
 * Appelle l'API Apogée
 */
async function callApogeeApi(agencySlug: string, endpoint: string, params?: Record<string, any>): Promise<any> {
  const url = `${buildAgencyBaseUrl(agencySlug)}${endpoint}`;
  
  console.log(`[APOGEE] Calling ${url}`);
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      API_KEY: APOGEE_API_KEY,
      ...params,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Apogée API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Charge les données depuis plusieurs sources
 */
async function loadSourceData(
  agencySlug: string,
  sources: string[]
): Promise<Map<string, any[]>> {
  const results = new Map<string, any[]>();
  
  const endpointMapping: Record<string, string> = {
    interventions: 'apiGetInterventions',
    projects: 'apiGetProjects',
    factures: 'apiGetFactures',
    devis: 'apiGetDevis',
    users: 'apiGetUsers',
    clients: 'apiGetClients',
  };
  
  for (const source of sources) {
    const endpoint = endpointMapping[source];
    if (endpoint) {
      try {
        const data = await callApogeeApi(agencySlug, endpoint);
        results.set(source, Array.isArray(data) ? data : []);
        console.log(`[APOGEE] ${source}: ${results.get(source)?.length || 0} records`);
      } catch (error) {
        console.error(`[APOGEE] Error loading ${source}:`, error);
        results.set(source, []);
      }
    }
  }
  
  return results;
}

/**
 * Accède à une valeur imbriquée
 */
function getNestedValue(obj: any, path: string): any {
  const monetaryFallbacks: Record<string, string[]> = {
    'data.totalHT': ['data.totalHT', 'totalHT', 'data.montantHT', 'montantHT'],
    'totalHT': ['totalHT', 'data.totalHT', 'montantHT', 'data.montantHT'],
  };
  
  const fallbacks = monetaryFallbacks[path];
  if (fallbacks) {
    for (const fallbackPath of fallbacks) {
      const value = fallbackPath.split('.').reduce((curr: any, key: string) => curr?.[key], obj);
      if (value !== null && value !== undefined) return value;
    }
    return undefined;
  }
  
  return path.split('.').reduce((curr: any, key: string) => curr?.[key], obj);
}

/**
 * Applique un filtre
 */
function evaluateCondition(value: any, operator: string, target: any): boolean {
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

/**
 * Retourne le champ date approprié selon les règles STATiA
 */
function getDateFieldForSource(source: string): string {
  const mapping: Record<string, string> = STATIA_RULES.dates;
  return mapping[source] || 'date';
}

/**
 * Normalise un synonyme vers le terme canonique (règles NLP)
 */
function normalizeSynonym(term: string): string {
  const termLower = term.toLowerCase().trim();
  for (const [canonical, synonyms] of Object.entries(STATIA_RULES.synonyms)) {
    if (termLower === canonical) return canonical;
    if (synonyms.some((s: string) => termLower.includes(s.toLowerCase()))) {
      return canonical;
    }
  }
  return term;
}

/**
 * Calcule le montant net d'une facture (gestion des avoirs)
 */
function calculateNetAmount(facture: any): number {
  const montant = parseFloat(facture.data?.totalHT || facture.totalHT || 0);
  const typeFacture = (facture.typeFacture || facture.type || '').toLowerCase();
  
  if (STATIA_RULES.CA.avoir === 'subtract' && typeFacture === 'avoir') {
    return -Math.abs(montant);
  }
  return montant;
}

/**
 * Vérifie si une intervention est productive
 */
function isProductiveIntervention(intervention: any): boolean {
  const type = (intervention.type || intervention.type2 || '').toLowerCase();
  return STATIA_RULES.technicians.productiveTypes.some(
    t => type.includes(t.toLowerCase())
  );
}

/**
 * Filtre les données par plage de dates (utilise les règles STATiA)
 */
function filterByDateRange(data: any[], dateFrom?: string, dateTo?: string, source?: string): any[] {
  if (!dateFrom && !dateTo) return data;
  
  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;
  
  // Utiliser le champ date approprié selon les règles métier
  const dateField = source ? getDateFieldForSource(source) : 'date';
  
  return data.filter(item => {
    const dateStr = item[dateField] || item.dateReelle || item.date || item.dateEmission || item.created_at;
    if (!dateStr) return true;
    
    const itemDate = new Date(dateStr);
    if (isNaN(itemDate.getTime())) return true;
    
    if (from && to) {
      return itemDate >= from && itemDate <= to;
    }
    if (from) return itemDate >= from;
    if (to) return itemDate <= to;
    return true;
  });
}

/**
 * Exécute une jointure
 */
function executeJoin(
  primary: any[],
  secondary: any[],
  localKey: string,
  foreignKey: string
): any[] {
  const index = new Map<any, any>();
  for (const item of secondary) {
    const key = getNestedValue(item, foreignKey);
    if (key !== undefined) index.set(key, item);
  }
  
  return primary.map(item => {
    const joinKey = getNestedValue(item, localKey);
    const joined = index.get(joinKey);
    if (joined) {
      return { ...item, _joined: joined };
    }
    return item;
  });
}

/**
 * Calcule une agrégation simple
 */
function calculateAggregation(
  data: any[],
  type: string,
  field?: string,
  numerator?: any,
  denominator?: any
): { value: number; stats: any } {
  const stats: any = { count: data.length };
  
  if (field && ['sum', 'avg', 'min', 'max'].includes(type)) {
    const values = data
      .map(item => parseFloat(getNestedValue(item, field)) || 0)
      .filter(v => !isNaN(v));
    
    if (values.length > 0) {
      stats.min = Math.min(...values);
      stats.max = Math.max(...values);
      stats.sum = values.reduce((a, b) => a + b, 0);
      stats.avg = stats.sum / values.length;
    }
  }
  
  let value = 0;
  
  switch (type) {
    case 'count':
      value = data.length;
      break;
    case 'sum':
      value = stats.sum ?? 0;
      break;
    case 'avg':
      value = stats.avg ?? 0;
      break;
    case 'min':
      value = stats.min ?? 0;
      break;
    case 'max':
      value = stats.max ?? 0;
      break;
    case 'ratio':
      if (numerator && denominator) {
        let numData = data;
        let denData = data;
        
        if (numerator.filters) {
          numData = data.filter(item =>
            numerator.filters.every((f: any) =>
              evaluateCondition(getNestedValue(item, f.field), f.operator, f.value)
            )
          );
        }
        if (denominator.filters) {
          denData = data.filter(item =>
            denominator.filters.every((f: any) =>
              evaluateCondition(getNestedValue(item, f.field), f.operator, f.value)
            )
          );
        }
        
        const numValue = numerator.type === 'count'
          ? numData.length
          : numData.reduce((s, item) => s + (parseFloat(getNestedValue(item, numerator.field || '')) || 0), 0);
        
        const denValue = denominator.type === 'count'
          ? denData.length
          : denData.reduce((s, item) => s + (parseFloat(getNestedValue(item, denominator.field || '')) || 0), 0);
        
        stats.numeratorCount = numValue;
        stats.denominatorCount = denValue;
        
        value = denValue > 0 ? (numValue / denValue) * 100 : 0;
      }
      break;
  }
  
  return { value, stats };
}

serve(async (req) => {
  // Handle CORS preflight or reject unauthorized origins
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const startTime = Date.now();

  try {
    const { metric_id, metric_definition, params } = await req.json();
    
    if (!metric_id && !metric_definition) {
      return withCors(req, new Response(
        JSON.stringify({ error: 'metric_id ou metric_definition requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Charger la définition si nécessaire
    let definition = metric_definition;
    if (!definition && metric_id) {
      const { data: metric, error: metricError } = await supabase
        .from('metrics_definitions')
        .select('*')
        .eq('id', metric_id)
        .single();

      if (metricError || !metric) {
        return withCors(req, new Response(
          JSON.stringify({ code: 'NOT_FOUND', message: `Métrique ${metric_id} non trouvée` }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      
      definition = {
        id: metric.id,
        label: metric.label,
        input_sources: metric.input_sources,
        formula: metric.formula,
      };
    }

    const agencySlug = params?.agency_slug;
    if (!agencySlug) {
      return withCors(req, new Response(
        JSON.stringify({ code: 'VALIDATION_ERROR', message: 'agency_slug requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    console.log(`[COMPUTE] Starting metric ${definition.id} for agency ${agencySlug}`);

    // Normaliser la définition (v1/v2 support)
    const normalized = normalizeDefinition(definition);
    const { primary, filters, formula, joins, dimensions } = normalized;
    
    console.log(`[COMPUTE] Normalized: primary=${primary}, filters=${filters.length}, joins=${joins.length}`);

    // Identifier les sources nécessaires
    const sources = new Set<string>();
    sources.add(primary);
    
    if (definition.input_sources?.secondary) {
      definition.input_sources.secondary.forEach((s: any) => sources.add(s.source || s));
    }
    // Legacy support v1
    if (Array.isArray(definition.input_sources)) {
      definition.input_sources.forEach((s: any) => sources.add(s.source));
    }
    // Add join targets
    for (const join of joins) {
      sources.add(join.from);
      sources.add(join.to);
    }

    // Charger les données
    const datasets = await loadSourceData(agencySlug, Array.from(sources));
    
    // Récupérer le dataset principal
    let data = datasets.get(primary) || [];
    
    console.log(`[COMPUTE] Primary source ${primary}: ${data.length} records`);

    // Appliquer le filtre de période
    if (params.date_from || params.date_to) {
      data = filterByDateRange(data, params.date_from, params.date_to);
      console.log(`[COMPUTE] After date filter: ${data.length} records`);
    }

    // Appliquer les filtres (from normalized definition)
    if (filters.length > 0) {
      for (const filter of filters) {
        data = data.filter(item =>
          evaluateCondition(getNestedValue(item, filter.field), filter.operator, filter.value)
        );
      }
      console.log(`[COMPUTE] After filters: ${data.length} records`);
    }

    // Exécuter les jointures si nécessaire
    if (joins.length > 0) {
      for (const join of joins) {
        const targetData = datasets.get(join.to);
        if (targetData) {
          // Support both formats: { on: { local, foreign } } and { localField, remoteField }
          const localKey = join.on?.local || join.localField;
          const foreignKey = join.on?.foreign || join.remoteField;
          data = executeJoin(data, targetData, localKey, foreignKey);
        }
      }
    }

    // Calculer l'agrégation (using normalized formula with mapped field)
    const { value, stats } = calculateAggregation(
      data,
      formula.type,
      formula.field,
      formula.numerator,
      formula.denominator
    );

    // Calculer le breakdown si groupBy
    let breakdown: Record<string, number> | undefined;
    
    if (dimensions && dimensions.length > 0) {
      breakdown = {};
      const groups = new Map<string, any[]>();
      
      // Mapping des dimensions métier
      const dimensionMapping: Record<string, string[]> = {
        'apporteur': ['projects_data_commanditaireId', '_joined.data.commanditaireId', 'commanditaireId', 'data.commanditaireId'],
        'commanditaireid': ['projects_data_commanditaireId', '_joined.data.commanditaireId', 'commanditaireId', 'data.commanditaireId'],
        'univers': ['projects_data_universes', '_joined.data.universes', 'universes', 'data.universes'],
        'universes': ['projects_data_universes', '_joined.data.universes', 'universes', 'data.universes'],
        'technicien': ['userId', 'tech_id', 'data.technicians'],
        'userid': ['userId', 'tech_id'],
        'client': ['clientId', 'client.id'],
        'clientid': ['clientId', 'client.id'],
        'type': ['type', 'typeFacture', 'invoiceType'],
        'state': ['state', 'paymentStatus'],
      };
      
      const resolveDimensionValue = (item: any, dim: string): string => {
        const normalizedDim = dim.toLowerCase();
        const paths = dimensionMapping[normalizedDim] || [dim];
        
        for (const path of paths) {
          const val = getNestedValue(item, path);
          if (val !== undefined && val !== null) {
            return Array.isArray(val) ? val.join(', ') : String(val);
          }
        }
        
        // Chercher dans _joined
        if (item._joined) {
          const joinedVal = getNestedValue(item._joined, dim) || getNestedValue(item._joined, `data.${dim}`);
          if (joinedVal !== undefined && joinedVal !== null) {
            return Array.isArray(joinedVal) ? joinedVal.join(', ') : String(joinedVal);
          }
        }
        
        return 'Non défini';
      };
      
      for (const item of data) {
        const groupKey = dimensions
          .map((dim: string) => resolveDimensionValue(item, dim))
          .join(' | ');
        
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(item);
      }
      
      for (const [key, groupData] of groups) {
        const { value: groupValue } = calculateAggregation(
          groupData,
          formula.type,
          formula.field,
          formula.numerator,
          formula.denominator
        );
        breakdown[key] = groupValue;
      }
      
      console.log(`[COMPUTE] Breakdown: ${Object.keys(breakdown).length} groups`);
    }

    const result = {
      success: true,
      value,
      breakdown,
      metadata: {
        computed_at: new Date().toISOString(),
        cache_hit: false,
        compute_time_ms: Date.now() - startTime,
        data_points: data.length,
      },
      debug: {
        executionId: `edge_${Date.now()}`,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
        endpoints: Array.from(sources).map(s => ({
          source: s,
          url: buildAgencyBaseUrl(agencySlug) + 'apiGet' + s.charAt(0).toUpperCase() + s.slice(1),
          rawCount: datasets.get(s)?.length || 0,
          filteredCount: data.length,
        })),
        aggregation: {
          type: formula.type,
          field: formula.field,
          groupBy: dimensions,
          stats,
        },
      },
    };

    console.log(`[COMPUTE] Completed in ${Date.now() - startTime}ms, value: ${value}`);

    return withCors(req, new Response(
      JSON.stringify(result),
      { headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[COMPUTE] Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return withCors(req, new Response(
      JSON.stringify({ 
        success: false,
        code: 'COMPUTE_ERROR', 
        message,
        debug: {
          durationMs: Date.now() - startTime,
        }
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
