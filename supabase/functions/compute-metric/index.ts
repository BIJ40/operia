import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APOGEE_API_KEY = Deno.env.get('APOGEE_API_KEY');

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
 * Filtre les données par plage de dates
 */
function filterByDateRange(data: any[], dateFrom?: string, dateTo?: string): any[] {
  if (!dateFrom && !dateTo) return data;
  
  const from = dateFrom ? new Date(dateFrom) : null;
  const to = dateTo ? new Date(dateTo) : null;
  
  return data.filter(item => {
    const dateStr = item.date || item.dateReelle || item.dateEmission || item.created_at;
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { metric_id, metric_definition, params } = await req.json();
    
    if (!metric_id && !metric_definition) {
      return new Response(
        JSON.stringify({ error: 'metric_id ou metric_definition requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        return new Response(
          JSON.stringify({ code: 'NOT_FOUND', message: `Métrique ${metric_id} non trouvée` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
      return new Response(
        JSON.stringify({ code: 'VALIDATION_ERROR', message: 'agency_slug requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[COMPUTE] Starting metric ${definition.id} for agency ${agencySlug}`);

    // Identifier les sources nécessaires
    const sources = new Set<string>();
    if (definition.input_sources?.primary) {
      sources.add(definition.input_sources.primary);
    }
    if (definition.input_sources?.secondary) {
      definition.input_sources.secondary.forEach((s: any) => sources.add(s.source || s));
    }
    // Legacy support
    if (Array.isArray(definition.input_sources)) {
      definition.input_sources.forEach((s: any) => sources.add(s.source));
    }

    // Charger les données
    const datasets = await loadSourceData(agencySlug, Array.from(sources));
    
    // Récupérer le dataset principal
    const primarySource = definition.input_sources?.primary || definition.input_sources?.[0]?.source;
    let data = datasets.get(primarySource) || [];
    
    console.log(`[COMPUTE] Primary source ${primarySource}: ${data.length} records`);

    // Appliquer le filtre de période
    if (params.date_from || params.date_to) {
      data = filterByDateRange(data, params.date_from, params.date_to);
      console.log(`[COMPUTE] After date filter: ${data.length} records`);
    }

    // Appliquer les filtres de la définition
    if (definition.filters) {
      for (const filter of definition.filters) {
        data = data.filter(item =>
          evaluateCondition(getNestedValue(item, filter.field), filter.operator, filter.value)
        );
      }
      console.log(`[COMPUTE] After filters: ${data.length} records`);
    }

    // Exécuter les jointures si nécessaire
    if (definition.input_sources?.joins) {
      for (const join of definition.input_sources.joins) {
        const targetData = datasets.get(join.to);
        if (targetData) {
          data = executeJoin(data, targetData, join.on.local, join.on.foreign);
        }
      }
    }

    // Calculer l'agrégation
    const formula = definition.formula;
    const { value, stats } = calculateAggregation(
      data,
      formula.type,
      formula.field,
      formula.numerator,
      formula.denominator
    );

    // Calculer le breakdown si groupBy
    let breakdown: Record<string, number> | undefined;
    const dimensions = definition.dimensions || formula.groupBy;
    
    if (dimensions && dimensions.length > 0) {
      breakdown = {};
      const groups = new Map<string, any[]>();
      
      for (const item of data) {
        const groupKey = dimensions
          .map((dim: string) => {
            const val = getNestedValue(item, dim);
            return Array.isArray(val) ? val.join(',') : String(val ?? 'Non défini');
          })
          .join('|');
        
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

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[COMPUTE] Error:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ 
        success: false,
        code: 'COMPUTE_ERROR', 
        message,
        debug: {
          durationMs: Date.now() - startTime,
        }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
