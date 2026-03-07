/**
 * StatIA - Service de gestion des métriques custom
 * CRUD pour statia_custom_metrics
 */

import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface CustomMetricDefinition {
  measure: string;
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'ratio';
  sources: string[];
  dimensions?: string[];
  filters?: Record<string, boolean | string[] | unknown>;
  time?: {
    field: string;
    mode: 'periode' | 'cumul' | 'glissant';
    granularity?: 'jour' | 'semaine' | 'mois' | 'trimestre' | 'annee';
  };
}

export interface CustomMetric {
  id: string;
  label: string;
  description: string | null;
  category: string;
  scope: 'global' | 'agency';
  agency_slug: string | null;
  definition_json: CustomMetricDefinition;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  is_active: boolean;
}

export interface CreateCustomMetricPayload {
  id: string;
  label: string;
  description?: string;
  category?: string;
  scope: 'global' | 'agency';
  agency_slug?: string;
  definition_json: CustomMetricDefinition;
}

export interface UpdateCustomMetricPayload {
  label?: string;
  description?: string;
  category?: string;
  definition_json?: CustomMetricDefinition;
  is_active?: boolean;
}

function parseCustomMetric(row: {
  id: string;
  label: string;
  description: string | null;
  category: string;
  scope: string;
  agency_slug: string | null;
  definition_json: Json;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  is_active: boolean;
}): CustomMetric {
  return {
    ...row,
    scope: row.scope as 'global' | 'agency',
    definition_json: row.definition_json as unknown as CustomMetricDefinition,
  };
}

/**
 * Liste les métriques custom pour un contexte donné
 */
export async function listCustomMetrics(
  scope?: 'global' | 'agency',
  agencySlug?: string
): Promise<CustomMetric[]> {
  let query = supabase
    .from('statia_custom_metrics')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(200);

  if (scope) {
    query = query.eq('scope', scope);
  }

  if (agencySlug && scope === 'agency') {
    query = query.eq('agency_slug', agencySlug);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[StatIA] Error loading custom metrics:', error);
    throw error;
  }

  return (data || []).map(parseCustomMetric);
}

/**
 * Récupère une métrique custom par son ID
 */
export async function getCustomMetric(id: string): Promise<CustomMetric | null> {
  const { data, error } = await supabase
    .from('statia_custom_metrics')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[StatIA] Error loading custom metric:', error);
    throw error;
  }

  return data ? parseCustomMetric(data) : null;
}

/**
 * Crée une nouvelle métrique custom
 */
export async function createCustomMetric(
  payload: CreateCustomMetricPayload,
  userId: string
): Promise<CustomMetric> {
  const { data, error } = await supabase
    .from('statia_custom_metrics')
    .insert({
      id: payload.id,
      label: payload.label,
      description: payload.description || null,
      category: payload.category || 'custom',
      scope: payload.scope,
      agency_slug: payload.agency_slug || null,
      definition_json: payload.definition_json as unknown as Json,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error('[StatIA] Error creating custom metric:', error);
    throw error;
  }

  return parseCustomMetric(data);
}

/**
 * Met à jour une métrique custom
 */
export async function updateCustomMetric(
  id: string,
  payload: UpdateCustomMetricPayload
): Promise<CustomMetric> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (payload.label !== undefined) updateData.label = payload.label;
  if (payload.description !== undefined) updateData.description = payload.description;
  if (payload.category !== undefined) updateData.category = payload.category;
  if (payload.is_active !== undefined) updateData.is_active = payload.is_active;
  if (payload.definition_json !== undefined) {
    updateData.definition_json = payload.definition_json as unknown as Json;
  }

  const { data, error } = await supabase
    .from('statia_custom_metrics')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[StatIA] Error updating custom metric:', error);
    throw error;
  }

  return parseCustomMetric(data);
}

/**
 * Soft-delete une métrique custom
 */
export async function softDeleteCustomMetric(id: string): Promise<void> {
  const { error } = await supabase
    .from('statia_custom_metrics')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[StatIA] Error deleting custom metric:', error);
    throw error;
  }
}

/**
 * Liste toutes les métriques disponibles pour un contexte (core + custom)
 */
export async function listAllAvailableMetrics(
  agencySlug?: string
): Promise<{ core: string[]; custom: CustomMetric[] }> {
  // Import dynamique pour éviter les dépendances circulaires
  const { listStatDefinitions } = await import('../definitions');
  
  const coreDefinitions = listStatDefinitions();
  const coreIds = coreDefinitions.map(d => d.id);

  // Charger les custom metrics (globales + agence si fournie)
  const globalMetrics = await listCustomMetrics('global');
  const agencyMetrics = agencySlug 
    ? await listCustomMetrics('agency', agencySlug)
    : [];

  return {
    core: coreIds,
    custom: [...globalMetrics, ...agencyMetrics],
  };
}
