/**
 * Edge Function: ai-search-extract
 * LLM-based intent extraction for hybrid AI search
 * Produces structured JSON for validation by deterministic engine
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// ============= TYPES =============
interface LLMIntentResponse {
  queryType: 'stats' | 'doc' | 'action' | 'pedagogic' | 'unknown';
  metric: string | null;
  dimension: string | null;
  intentType: string | null;
  limit: number | null;
  period: {
    type: 'explicit' | 'relative' | 'default';
    start: string | null;
    end: string | null;
    label: string | null;
  } | null;
  filters: {
    univers: string | null;
    apporteur: string | null;
    technicien: string | null;
    agence: string | null;
  };
  confidence: number;
  reasoning: string;
}

// ============= SYSTEM PROMPT =============
const SYSTEM_PROMPT = `Tu es un analyseur d'intent pour une application métier de gestion d'entreprise du bâtiment (plomberie, électricité, vitrerie, serrurerie, etc.).

MÉTRIQUES DISPONIBLES (LISTE EXHAUSTIVE - N'invente JAMAIS de nouvelle métrique):
- ca_global_ht: Chiffre d'affaires global HT
- ca_par_technicien: CA réparti par technicien
- ca_par_apporteur: CA réparti par apporteur/commanditaire
- ca_par_univers: CA réparti par univers métier
- ca_mensuel: CA évolution mensuelle
- ca_moyen_par_jour: CA moyen par jour
- ca_moyen_par_tech: CA moyen par technicien
- nb_dossiers_crees: Nombre de dossiers créés
- nb_dossiers_par_univers: Dossiers répartis par univers
- dossiers_par_apporteur: Dossiers répartis par apporteur
- panier_moyen: Panier moyen (montant moyen par dossier)
- taux_sav_global: Taux de SAV global
- sav_par_univers: SAV réparti par univers
- sav_par_apporteur: SAV réparti par apporteur
- taux_transformation_devis: Taux de transformation des devis
- delai_premier_devis: Délai moyen du premier devis
- delai_moyen_facture: Délai moyen de facturation
- taux_recouvrement: Taux de recouvrement
- reste_a_encaisser: Montant restant à encaisser

UNIVERS MÉTIERS DISPONIBLES (LISTE EXHAUSTIVE):
- ELECTRICITE, PLOMBERIE, SERRURERIE, VITRERIE, VOLET, MENUISERIE, PEINTURE, CARRELAGE, MACONNERIE, DEPANNAGE

DIMENSIONS DISPONIBLES:
- global: pas de répartition
- technicien: par technicien
- apporteur: par apporteur/commanditaire
- univers: par univers métier
- agence: par agence

TYPES D'INTENT:
- top: classement (top 5, meilleurs, etc.)
- moyenne: valeur moyenne
- volume: comptage
- taux: pourcentage
- delay: délai
- valeur: montant simple

RÈGLES STRICTES:
1. N'invente JAMAIS de métrique qui n'est pas dans la liste
2. N'invente JAMAIS d'univers qui n'est pas dans la liste
3. Si tu ne comprends pas, mets confidence < 0.5
4. Pour les périodes: utilise format ISO (YYYY-MM-DD) ou null
5. Pour "recouvrement" sans précision → reste_a_encaisser (montant)
6. Pour "taux recouvrement" explicite → taux_recouvrement

TYPES DE REQUÊTES:
- stats: demande de statistique/KPI
- doc: recherche documentaire
- pedagogic: question sur le fonctionnement/définition
- action: navigation (ouvrir planning, voir devis, etc.)
- unknown: incompréhensible

Réponds UNIQUEMENT avec un JSON valide, sans markdown ni explication.`;

const USER_PROMPT_TEMPLATE = `Analyse cette requête utilisateur et extrais l'intent structuré:

REQUÊTE: "{query}"

Réponds avec ce JSON exact (aucun champ supplémentaire):
{
  "queryType": "stats|doc|action|pedagogic|unknown",
  "metric": "id_métrique_ou_null",
  "dimension": "global|technicien|apporteur|univers|agence|null",
  "intentType": "top|moyenne|volume|taux|delay|valeur|null",
  "limit": null_ou_nombre,
  "period": {
    "type": "explicit|relative|default",
    "start": "YYYY-MM-DD_ou_null",
    "end": "YYYY-MM-DD_ou_null",
    "label": "description_période"
  },
  "filters": {
    "univers": "CODE_UNIVERS_ou_null",
    "apporteur": "nom_ou_null",
    "technicien": "nom_ou_null",
    "agence": "slug_ou_null"
  },
  "confidence": 0.0_à_1.0,
  "reasoning": "explication_courte"
}`;

// ============= MAIN HANDLER =============
serve(async (req) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return withCors(req, new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const origin = req.headers.get('origin') ?? '';
    const corsHeaders = getCorsHeaders(origin);
    const rateLimitResult = await checkRateLimit(`ai-search-extract:${user.id}`, { limit: 20, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.retryAfter || 60, corsHeaders);
    }

    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return withCors(req, new Response(JSON.stringify({ error: 'Query required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      }));
    }

    console.log(`[ai-search-extract] Processing query: "${query}"`);

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[ai-search-extract] LOVABLE_API_KEY not configured');
      // Fallback: return unknown intent
      return withCors(req, new Response(JSON.stringify({
        queryType: 'unknown',
        metric: null,
        dimension: null,
        intentType: null,
        limit: null,
        period: null,
        filters: { univers: null, apporteur: null, technicien: null, agence: null },
        confidence: 0,
        reasoning: 'LLM not available',
        llmAvailable: false,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const userPrompt = USER_PROMPT_TEMPLATE.replace('{query}', query);

    const llmResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.1, // Low temperature for deterministic output
        max_tokens: 500,
      }),
    });

    if (!llmResponse.ok) {
      const errorText = await llmResponse.text();
      console.error(`[ai-search-extract] LLM error: ${llmResponse.status} - ${errorText}`);
      
      if (llmResponse.status === 429) {
        return withCors(req, new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429, headers: { 'Content-Type': 'application/json' },
        }));
      }
      if (llmResponse.status === 402) {
        return withCors(req, new Response(JSON.stringify({ error: 'Payment required' }), {
          status: 402, headers: { 'Content-Type': 'application/json' },
        }));
      }
      
      // Fallback on LLM error
      return withCors(req, new Response(JSON.stringify({
        queryType: 'unknown',
        metric: null,
        dimension: null,
        intentType: null,
        limit: null,
        period: null,
        filters: { univers: null, apporteur: null, technicien: null, agence: null },
        confidence: 0,
        reasoning: 'LLM call failed',
        llmAvailable: false,
      }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }));
    }

    const llmData = await llmResponse.json();
    const content = llmData.choices?.[0]?.message?.content || '';
    
    console.log(`[ai-search-extract] LLM raw response: ${content.substring(0, 200)}`);

    // Parse JSON from LLM response
    let parsedIntent: LLMIntentResponse;
    try {
      // Clean potential markdown code blocks
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      }
      if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();
      
      parsedIntent = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error(`[ai-search-extract] JSON parse error:`, parseError);
      parsedIntent = {
        queryType: 'unknown',
        metric: null,
        dimension: null,
        intentType: null,
        limit: null,
        period: null,
        filters: { univers: null, apporteur: null, technicien: null, agence: null },
        confidence: 0.2,
        reasoning: 'Failed to parse LLM response',
      };
    }

    console.log(`[ai-search-extract] Parsed intent: type=${parsedIntent.queryType}, metric=${parsedIntent.metric}, conf=${parsedIntent.confidence}`);

    return withCors(req, new Response(JSON.stringify({
      ...parsedIntent,
      llmAvailable: true,
      rawQuery: query,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }));

  } catch (error) {
    console.error('[ai-search-extract] Error:', error);
    return withCors(req, new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Internal error' 
    }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    }));
  }
});
