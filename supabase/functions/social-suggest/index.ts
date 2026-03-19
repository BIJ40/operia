/**
 * social-suggest — Edge Function pour générer des suggestions de posts social media.
 * 
 * Flux : auth → load context → call AI → persist suggestions + variants → return IDs.
 * 
 * Conventions figées :
 * - Storage path : {agency_id}/{year}/{month}/{suggestion_id}/{filename}
 * - Univers normalisés : plomberie, electricite, serrurerie, vitrerie, menuiserie, renovation, volets, pmr, general
 * - Statuts : suggestion = validation éditoriale, variant = statut plateforme, calendar = exécution planning
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, getCorsHeaders } from '../_shared/cors.ts';
import { getUserContext, assertAgencyAccess } from '../_shared/auth.ts';
import { validateUUID } from '../_shared/validation.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// ─── Awareness days dataset (embedded subset for edge function) ───
const AWARENESS_DAYS = [
  { month: 1, day: 15, label: "Prévention gel canalisations", tags: ["eau","urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "urgence_gel" },
  { month: 2, day: 10, label: "Économies d'énergie", tags: ["energie","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "audit_energetique" },
  { month: 3, day: 22, label: "Journée mondiale de l'eau", tags: ["eau","plomberie"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "diagnostic_fuite" },
  { month: 4, day: 22, label: "Jour de la Terre", tags: ["energie","renovation"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation"], ctaHint: "renovation_ecologique" },
  { month: 5, day: 10, label: "Entretien climatisation", tags: ["entretien","confort"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "entretien_clim" },
  { month: 6, day: 15, label: "Canicule — Fraîcheur", tags: ["confort","urgence"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "installation_clim" },
  { month: 6, day: 21, label: "Sécuriser avant vacances", tags: ["securite","serrurerie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_vacances" },
  { month: 7, day: 20, label: "Stores & volets roulants", tags: ["confort","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["volets"], ctaHint: "installation_volets" },
  { month: 8, day: 1, label: "Urgences estivales", tags: ["urgence","plomberie","serrurerie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","serrurerie"], ctaHint: "numero_urgence" },
  { month: 9, day: 1, label: "Remise en route chauffage", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "revision_chauffage" },
  { month: 10, day: 1, label: "Anticiper l'hiver", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "preparation_hiver" },
  { month: 10, day: 13, label: "Prévention catastrophes", tags: ["securite","urgence"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "prevention_degats_eaux" },
  { month: 11, day: 1, label: "Purge radiateurs", tags: ["entretien","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "purge_radiateurs" },
  { month: 12, day: 1, label: "Risques gel canalisations", tags: ["urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "prevention_gel" },
  { month: 12, day: 10, label: "Sécurité électrique fêtes", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique_noel" },
];

const NORMALIZED_UNIVERSES = ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] as const;

// ─── Universe keyword inference (duplicated from frontend for server-side use) ───
const UNIVERSE_KEYWORDS: Record<string, string[]> = {
  plomberie: ['plomberie', 'fuite', 'canalisation', 'robinet', 'chauffe-eau', 'ballon', 'wc', 'sanitaire', 'radiateur', 'chauffage'],
  electricite: ['électricité', 'electrique', 'prise', 'tableau', 'disjoncteur', 'éclairage', 'interrupteur'],
  serrurerie: ['serrurerie', 'serrure', 'porte', 'blindage', 'verrou', 'cylindre'],
  vitrerie: ['vitrerie', 'vitre', 'vitrage', 'fenêtre', 'double vitrage'],
  menuiserie: ['menuiserie', 'bois', 'parquet', 'placard'],
  renovation: ['rénovation', 'renovation', 'travaux', 'salle de bain', 'cuisine', 'carrelage', 'peinture'],
  volets: ['volet', 'store', 'volet roulant', 'motorisation'],
  pmr: ['pmr', 'accessibilité', 'handicap', 'douche italienne'],
};

function inferUniverse(title: string): string | null {
  const norm = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let best: string | null = null;
  let bestScore = 0;
  for (const [uni, kws] of Object.entries(UNIVERSE_KEYWORDS)) {
    let score = 0;
    for (const kw of kws) {
      if (norm.includes(kw.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))) score++;
    }
    if (score > bestScore) { bestScore = score; best = uni; }
  }
  return best;
}

Deno.serve(async (req) => {
  // CORS
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = getCorsHeaders(origin);

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Auth
    const authResult = await getUserContext(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { context, supabase: userSupabase } = authResult;

    // Rate limit: 5 generations per hour per user
    const rlResult = await checkRateLimit(`social-suggest:${context.userId}`, { limit: 5, windowMs: 3600_000 });
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult.retryAfter!, corsHeaders);
    }

    // Parse body
    const body = await req.json();
    const month = Number(body.month);
    const year = Number(body.year);
    const agencyId = body.agency_id ? validateUUID(body.agency_id, 'agency_id') : context.agencyId;
    const regenerateSingle = body.regenerate_single === true;
    const singleSuggestionId = body.suggestion_id || null;

    if (!agencyId) {
      return new Response(JSON.stringify({ error: 'agency_id requis' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (month < 1 || month > 12 || year < 2020 || year > 2030) {
      return new Response(JSON.stringify({ error: 'month/year invalides' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Agency access
    const accessCheck = assertAgencyAccess(context, agencyId);
    if (!accessCheck.allowed) {
      return new Response(JSON.stringify({ error: accessCheck.error }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    // Admin supabase for writes
    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // ─── Load context data ───────────────────────────
    // 1. Awareness days for this month
    const monthAwareness = AWARENESS_DAYS.filter(d => d.month === month);

    // 2. Realisations with media (last 6 months, exploitable)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const { data: realisations } = await adminSupabase
      .from('realisations')
      .select('id, title, intervention_date')
      .eq('agency_id', agencyId)
      .gte('intervention_date', sixMonthsAgo.toISOString().split('T')[0])
      .order('intervention_date', { ascending: false })
      .limit(20);

    const realisationIds = (realisations || []).map(r => r.id);
    let realisationMedia: Record<string, { before: boolean; after: boolean; count: number }> = {};

    if (realisationIds.length > 0) {
      const { data: media } = await adminSupabase
        .from('realisation_media')
        .select('realisation_id, media_role')
        .in('realisation_id', realisationIds);

      for (const m of media || []) {
        const entry = realisationMedia[m.realisation_id] || { before: false, after: false, count: 0 };
        entry.count++;
        if (m.media_role === 'before') entry.before = true;
        if (m.media_role === 'after') entry.after = true;
        realisationMedia[m.realisation_id] = entry;
      }
    }

    // Filter to exploitable realisations (have before+after or at least 1 media)
    const exploitableReals = (realisations || [])
      .filter(r => {
        const mp = realisationMedia[r.id];
        return mp && mp.count > 0;
      })
      .map(r => ({
        id: r.id,
        title: r.title,
        intervention_date: r.intervention_date,
        universe: inferUniverse(r.title),
        hasBeforeAfter: realisationMedia[r.id]?.before && realisationMedia[r.id]?.after,
      }));

    // 3. Existing suggestions for anti-duplication
    const { data: existingSuggestions } = await adminSupabase
      .from('social_content_suggestions')
      .select('id, topic_key, topic_type, status, realisation_id')
      .eq('agency_id', agencyId)
      .eq('month_key', monthKey);

    // ─── Regeneration logic ──────────────────────────
    if (regenerateSingle && singleSuggestionId) {
      // Archive only the single draft suggestion
      await adminSupabase
        .from('social_content_suggestions')
        .update({ status: 'archived' })
        .eq('id', singleSuggestionId)
        .eq('agency_id', agencyId)
        .in('status', ['draft', 'rejected']);

      // Archive its variants
      await adminSupabase
        .from('social_post_variants')
        .update({ status: 'archived' })
        .eq('suggestion_id', singleSuggestionId)
        .eq('agency_id', agencyId);
    } else {
      // Full month regeneration: archive draft/rejected only
      const toArchiveIds = (existingSuggestions || [])
        .filter(s => s.status === 'draft' || s.status === 'rejected')
        .map(s => s.id);

      if (toArchiveIds.length > 0) {
        await adminSupabase
          .from('social_content_suggestions')
          .update({ status: 'archived' })
          .in('id', toArchiveIds)
          .eq('agency_id', agencyId);

        await adminSupabase
          .from('social_post_variants')
          .update({ status: 'archived' })
          .in('suggestion_id', toArchiveIds)
          .eq('agency_id', agencyId);
      }
    }

    // Count approved suggestions that remain (to plan around them)
    const approvedCount = (existingSuggestions || []).filter(s => s.status === 'approved').length;
    const targetPostCount = Math.max(4, 12 - approvedCount); // Generate enough to fill ~12 posts/month

    // ─── AI Generation ───────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es un expert en communication locale pour une agence de dépannage et rénovation à domicile (réseau HelpConfort). Tu génères des idées de posts pour les réseaux sociaux.

RÈGLES STRICTES :
- Ton professionnel, local, concret, en français
- Pas de blabla marketing générique
- Pas de doublon thématique dans le mois
- Pas 2 posts consécutifs sur le même univers métier
- Chaque post doit avoir une valeur concrète pour le lecteur
- Format JSON strict demandé

UNIVERS MÉTIER AUTORISÉS : ${NORMALIZED_UNIVERSES.join(', ')}

TYPES DE CONTENU :
- awareness_day : lié à une journée thématique
- seasonal_tip : conseil saisonnier habitat
- realisation : valorisation d'une intervention réelle
- local_branding : confiance, proximité, équipe`;

    const userPrompt = `Génère ${targetPostCount} suggestions de posts social media pour le mois ${month}/${year}.

JOURNÉES THÉMATIQUES DU MOIS :
${monthAwareness.map(a => `- ${a.day}/${month}: ${a.label} (tags: ${a.tags.join(', ')})`).join('\n')}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (${r.intervention_date}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune réalisation exploitable ce mois-ci)'}

RÉPARTITION CIBLE par semaine : 1 réalisation + 1 conseil saisonnier + 1 opportunité calendrier/prévention.

Réponds UNIQUEMENT avec un JSON array. Chaque élément :
{
  "suggestion_date": "YYYY-MM-DD",
  "title": "Titre court et accrocheur",
  "content_angle": "L'angle éditorial en 1 phrase",
  "caption_base_fr": "Le texte du post principal (2-4 phrases max)",
  "hashtags": ["hashtag1", "hashtag2"],
  "topic_type": "awareness_day|seasonal_tip|realisation|local_branding",
  "topic_key": "identifiant unique du sujet",
  "visual_type": "photo|illustration|before_after|quote",
  "universe": "plomberie|electricite|...|general",
  "realisation_id": "UUID ou null",
  "platform_variants": {
    "facebook": { "caption": "...", "cta": "..." },
    "instagram": { "caption": "...", "cta": "..." },
    "google_business": { "caption": "...", "cta": "..." },
    "linkedin": { "caption": "...", "cta": "..." }
  }
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        stream: false,
        max_tokens: 8000,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[social-suggest] AI error:', aiResponse.status, errText);
      return new Response(JSON.stringify({ error: 'Erreur du service IA', details: aiResponse.status }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const rawContent = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response (handle markdown code blocks)
    let suggestions: any[];
    try {
      const jsonStr = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      suggestions = JSON.parse(jsonStr);
      if (!Array.isArray(suggestions)) throw new Error('Not an array');
    } catch (parseErr) {
      console.error('[social-suggest] JSON parse error:', parseErr, 'Raw:', rawContent.substring(0, 500));
      return new Response(JSON.stringify({ error: 'Réponse IA invalide, réessayez' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Persist to DB ───────────────────────────────
    const batchId = crypto.randomUUID();
    const persistedSuggestions: any[] = [];

    for (const s of suggestions) {
      // Validate and normalize
      const suggestionDate = s.suggestion_date || `${year}-${String(month).padStart(2, '0')}-15`;
      const universe = NORMALIZED_UNIVERSES.includes(s.universe) ? s.universe : 'general';
      const topicType = ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding'].includes(s.topic_type)
        ? s.topic_type : 'seasonal_tip';

      // Determine source_type
      let sourceType = 'ai_seasonal';
      if (topicType === 'awareness_day') sourceType = 'ai_awareness';
      else if (topicType === 'realisation') sourceType = 'ai_realisation';

      // Match realisation_id if topic_type is realisation
      let realisationId: string | null = null;
      if (topicType === 'realisation' && s.realisation_id) {
        const validReal = exploitableReals.find(r => r.id === s.realisation_id);
        if (validReal) realisationId = validReal.id;
      }

      // Insert suggestion
      const { data: inserted, error: insertErr } = await adminSupabase
        .from('social_content_suggestions')
        .insert({
          agency_id: agencyId,
          month_key: monthKey,
          suggestion_date: suggestionDate,
          title: String(s.title || 'Sans titre').substring(0, 200),
          content_angle: s.content_angle || null,
          caption_base_fr: String(s.caption_base_fr || '').substring(0, 2000),
          hashtags: Array.isArray(s.hashtags) ? s.hashtags.slice(0, 10) : [],
          platform_targets: s.platform_variants ? Object.keys(s.platform_variants) : ['facebook', 'instagram'],
          visual_type: s.visual_type || 'photo',
          topic_type: topicType,
          topic_key: s.topic_key || null,
          realisation_id: realisationId,
          universe,
          relevance_score: null, // Scored client-side
          ai_payload: { raw: s },
          status: 'draft',
          generation_batch_id: batchId,
          source_type: sourceType,
        })
        .select('id, title, suggestion_date, topic_type, universe, status')
        .single();

      if (insertErr) {
        console.error('[social-suggest] Insert error:', insertErr);
        continue;
      }

      // Insert platform variants
      const variants = s.platform_variants || {};
      const variantRows: any[] = [];
      for (const platform of ['facebook', 'instagram', 'google_business', 'linkedin']) {
        const v = variants[platform];
        if (!v) continue;
        variantRows.push({
          suggestion_id: inserted.id,
          agency_id: agencyId,
          platform,
          caption_fr: String(v.caption || s.caption_base_fr || '').substring(0, 2000),
          cta: v.cta || null,
          hashtags: Array.isArray(s.hashtags) ? s.hashtags : [],
          format: '1080x1080',
          recommended_dimensions: '1080x1080',
          status: 'draft',
        });
      }

      if (variantRows.length > 0) {
        const { error: varErr } = await adminSupabase
          .from('social_post_variants')
          .insert(variantRows);
        if (varErr) console.error('[social-suggest] Variant insert error:', varErr);
      }

      persistedSuggestions.push(inserted);
    }

    return new Response(JSON.stringify({
      success: true,
      batch_id: batchId,
      month_key: monthKey,
      generated_count: persistedSuggestions.length,
      suggestions: persistedSuggestions,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[social-suggest] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
