/**
 * StatIA AI Search - Extraction Intent via LLM
 * Appel Lovable AI pour compréhension NL
 */

import type { LLMDraftIntent } from './types';
import { supabase } from '@/integrations/supabase/client';

// ═══════════════════════════════════════════════════════════════
// PROMPT SYSTÈME
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT = `Tu es un analyseur de requêtes métier pour une application de gestion d'entreprise (Help Confort - réseau de franchises BTP).

Ton rôle est d'extraire les informations structurées d'une requête utilisateur en français.

CONTEXTE MÉTIER:
- CA = Chiffre d'Affaires
- SAV = Service Après-Vente
- Technicien = intervenant terrain
- Apporteur = commanditaire/prescripteur (assurance, bailleur, etc.)
- Univers = métier (plomberie, électricité, vitrerie, serrurerie, peinture, etc.)
- Dossier = projet/sinistre
- Recouvrement = encours clients, impayés

MÉTRIQUES VALIDES:
- ca_global_ht, ca_par_technicien, ca_par_univers, ca_par_apporteur
- ca_moyen_par_jour, ca_moyen_par_tech, top_techniciens_ca
- reste_a_encaisser, taux_recouvrement
- taux_sav_global, nb_sav, sav_par_technicien
- taux_transformation_devis, nb_devis
- nb_dossiers_crees, nb_dossiers_par_apporteur
- nb_interventions
- delai_premier_devis, delai_facturation

DIMENSIONS VALIDES:
- global, technicien, apporteur, univers, agence

INTENTS VALIDES:
- valeur (montant brut), top (classement), moyenne, volume (comptage), taux (pourcentage), delay (délai), compare (N-1)

UNIVERS VALIDES:
- PLOMBERIE, ELECTRICITE, VITRERIE, SERRURERIE, PEINTURE, PLAQUISTE, MENUISERIE, COUVERTURE, RECHERCHE FUITE

RÈGLES:
1. Ne jamais inventer de métrique - utilise uniquement celles listées
2. Si tu n'es pas sûr, mets null et confidence < 0.5
3. Les périodes doivent être au format ISO (YYYY-MM-DD)
4. Retourne UNIQUEMENT du JSON valide, rien d'autre`;

const USER_PROMPT_TEMPLATE = `Analyse cette requête utilisateur et retourne un JSON structuré:

REQUÊTE: "{query}"

Retourne UNIQUEMENT ce JSON (pas de texte avant/après):
{
  "intent": "stats" | "doc" | "action" | null,
  "metric": "<id_métrique>" | null,
  "dimension": "<dimension>" | null,
  "intentType": "<intent_type>" | null,
  "limit": <number> | null,
  "period": {
    "from": "YYYY-MM-DD" | null,
    "to": "YYYY-MM-DD" | null,
    "label": "<label>" | null
  } | null,
  "filters": {
    "univers": "<UNIVERS>" | null,
    "technicien": "<nom>" | null,
    "apporteur": "<nom>" | null
  },
  "confidence": <0.0-1.0>
}`;

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
 * Extrait un intent structuré via Lovable AI (Gemini)
 */
export async function extractIntentWithLLM(query: string): Promise<ExtractResult> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('ai-search-extract', {
      body: {
        query,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt: USER_PROMPT_TEMPLATE.replace('{query}', query),
      },
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
    
    // Parser la réponse JSON
    const draft = parseLLMResponse(data?.content || data);
    
    return {
      success: draft !== null,
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
 * Parse la réponse LLM en LLMDraftIntent
 */
function parseLLMResponse(response: unknown): LLMDraftIntent | null {
  try {
    let content: string;
    
    if (typeof response === 'string') {
      content = response;
    } else if (typeof response === 'object' && response !== null) {
      // Si déjà un objet, vérifier la structure
      if ('intent' in response || 'metric' in response) {
        return validateDraftStructure(response);
      }
      content = JSON.stringify(response);
    } else {
      return null;
    }
    
    // Extraire le JSON de la réponse (le LLM peut ajouter du texte)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[parseLLMResponse] No JSON found in response');
      return null;
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    return validateDraftStructure(parsed);
  } catch (err) {
    console.error('[parseLLMResponse] Parse error:', err);
    return null;
  }
}

/**
 * Valide la structure du draft
 */
function validateDraftStructure(obj: unknown): LLMDraftIntent | null {
  if (typeof obj !== 'object' || obj === null) return null;
  
  const draft = obj as Record<string, unknown>;
  
  // Mapper vers notre type avec valeurs par défaut
  const result: LLMDraftIntent = {
    intent: mapQueryType(draft.intent),
    metric: typeof draft.metric === 'string' ? draft.metric : null,
    dimension: mapDimension(draft.dimension),
    intentType: mapIntentType(draft.intentType),
    limit: typeof draft.limit === 'number' ? draft.limit : null,
    period: mapPeriod(draft.period),
    filters: typeof draft.filters === 'object' && draft.filters !== null 
      ? draft.filters as Record<string, unknown>
      : {},
    confidence: typeof draft.confidence === 'number' 
      ? Math.max(0, Math.min(1, draft.confidence))
      : 0.5,
  };
  
  return result;
}

function mapQueryType(value: unknown): LLMDraftIntent['intent'] {
  if (value === 'stats' || value === 'stats_query') return 'stats_query';
  if (value === 'doc' || value === 'documentary_query') return 'documentary_query';
  if (value === 'action' || value === 'action_query') return 'action_query';
  if (value === 'pedagogic' || value === 'pedagogic_query') return 'pedagogic_query';
  return null;
}

function mapDimension(value: unknown): LLMDraftIntent['dimension'] {
  const validDims = ['global', 'technicien', 'apporteur', 'univers', 'agence', 'site', 'client_type'];
  if (typeof value === 'string' && validDims.includes(value)) {
    return value as LLMDraftIntent['dimension'];
  }
  return null;
}

function mapIntentType(value: unknown): LLMDraftIntent['intentType'] {
  const validIntents = ['top', 'moyenne', 'volume', 'taux', 'delay', 'compare', 'valeur'];
  if (typeof value === 'string' && validIntents.includes(value)) {
    return value as LLMDraftIntent['intentType'];
  }
  return null;
}

function mapPeriod(value: unknown): LLMDraftIntent['period'] {
  if (typeof value !== 'object' || value === null) return null;
  
  const period = value as Record<string, unknown>;
  return {
    from: typeof period.from === 'string' ? period.from : null,
    to: typeof period.to === 'string' ? period.to : null,
    label: typeof period.label === 'string' ? period.label : null,
  };
}
