/**
 * StatIA AI Search - Extraction Intent via LLM
 * Appel edge function ai-search-extract pour compréhension NL
 */

import type { LLMDraftIntent, QueryType, DimensionType, IntentType } from './types';
import { supabase } from '@/integrations/supabase/client';
import { logWarn } from '@/lib/logger';

// ═══════════════════════════════════════════════════════════════
// EXTRACTION LLM
// ═══════════════════════════════════════════════════════════════

interface ExtractResult {
  success: boolean;
  draft: LLMDraftIntent | null;
  error?: string;
  latencyMs: number;
}

/**
 * Extrait un intent structuré via Lovable AI (edge function)
 */
export async function extractIntentWithLLM(query: string): Promise<ExtractResult> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-search-extract', {
      body: { query },
    });
    
    const latencyMs = Date.now() - startTime;
    
    if (error) {
      console.error('[extractIntentLLM] Edge function error:', error);
      return {
        success: false,
        draft: null,
        error: error.message,
        latencyMs,
      };
    }
    
    // Parser la réponse
    const draft = parseLLMResponse(data);
    
    return {
      success: draft !== null && draft.confidence > 0,
      draft,
      latencyMs,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    console.error('[extractIntentLLM] Error:', err);
    return {
      success: false,
      draft: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      latencyMs,
    };
  }
}

/**
 * Parse la réponse de l'edge function en LLMDraftIntent
 */
function parseLLMResponse(response: unknown): LLMDraftIntent | null {
  if (!response || typeof response !== 'object') {
    return null;
  }
  
  const data = response as Record<string, unknown>;
  
  // Si llmAvailable est false, le LLM n'est pas disponible
  if (data.llmAvailable === false) {
    logWarn('AI_SEARCH', 'LLM not available');
    return {
      intent: null,
      metric: null,
      dimension: null,
      intentType: null,
      limit: null,
      period: null,
      filters: {},
      confidence: 0,
    };
  }
  
  return {
    intent: mapQueryType(data.queryType),
    metric: typeof data.metric === 'string' ? data.metric : null,
    dimension: mapDimension(data.dimension),
    intentType: mapIntentType(data.intentType),
    limit: typeof data.limit === 'number' ? data.limit : null,
    period: mapPeriod(data.period),
    filters: typeof data.filters === 'object' && data.filters !== null 
      ? data.filters as Record<string, unknown>
      : {},
    confidence: typeof data.confidence === 'number' 
      ? Math.max(0, Math.min(1, data.confidence))
      : 0.5,
    rawResponse: typeof data.reasoning === 'string' ? data.reasoning : undefined,
  };
}

function mapQueryType(value: unknown): QueryType | null {
  if (value === 'stats') return 'stats_query';
  if (value === 'doc') return 'documentary_query';
  if (value === 'action') return 'action_query';
  if (value === 'pedagogic') return 'pedagogic_query';
  if (value === 'unknown') return 'unknown';
  return null;
}

function mapDimension(value: unknown): DimensionType | null {
  const validDims: DimensionType[] = ['global', 'technicien', 'apporteur', 'univers', 'agence', 'site', 'client_type'];
  if (typeof value === 'string' && validDims.includes(value as DimensionType)) {
    return value as DimensionType;
  }
  return null;
}

function mapIntentType(value: unknown): IntentType | null {
  const validIntents: IntentType[] = ['top', 'moyenne', 'volume', 'taux', 'delay', 'compare', 'valeur'];
  if (typeof value === 'string' && validIntents.includes(value as IntentType)) {
    return value as IntentType;
  }
  return null;
}

function mapPeriod(value: unknown): LLMDraftIntent['period'] {
  if (typeof value !== 'object' || value === null) return null;
  
  const period = value as Record<string, unknown>;
  return {
    from: typeof period.start === 'string' ? period.start : 
          typeof period.from === 'string' ? period.from : null,
    to: typeof period.end === 'string' ? period.end : 
        typeof period.to === 'string' ? period.to : null,
    label: typeof period.label === 'string' ? period.label : null,
  };
}
