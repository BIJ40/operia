/**
 * social-suggest — Edge Function pour générer des suggestions de posts social media.
 * 
 * Flux : auth → load context → call AI (tool calling) → validate → persist suggestions + variants → return IDs.
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
const VALID_PLATFORMS = ['facebook', 'instagram', 'google_business', 'linkedin'] as const;
const VALID_TOPIC_TYPES = ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding'] as const;

// ─── Universe keyword inference ───
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

// ─── Post-AI validation ───
interface ValidatedSuggestion {
  suggestion_date: string;
  title: string;
  content_angle: string | null;
  caption_base_fr: string;
  hashtags: string[];
  topic_type: string;
  topic_key: string;
  visual_type: string;
  universe: string;
  realisation_id: string | null;
  platform_variants: Record<string, { caption: string; cta: string | null }>;
}

function validateAndNormalizeSuggestions(
  raw: any[],
  month: number,
  year: number,
  exploitableReals: { id: string }[],
  existingTopicKeys: Set<string>,
): ValidatedSuggestion[] {
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month, 0).getDate();
  const validRealisationIds = new Set(exploitableReals.map(r => r.id));
  const seenTopicKeys = new Set<string>();
  const result: ValidatedSuggestion[] = [];

  for (const s of raw) {
    if (!s || typeof s !== 'object') continue;

    // 1. Validate date is in target month
    let date = String(s.suggestion_date || '');
    if (!date.startsWith(monthKey)) {
      // Force date into target month
      const day = Math.min(Math.max(parseInt(date.split('-')[2]) || 15, 1), daysInMonth);
      date = `${monthKey}-${String(day).padStart(2, '0')}`;
    }
    const dayNum = parseInt(date.split('-')[2]);
    if (dayNum < 1 || dayNum > daysInMonth) {
      date = `${monthKey}-15`;
    }

    // 2. Validate topic_type
    const topicType = (VALID_TOPIC_TYPES as readonly string[]).includes(s.topic_type)
      ? s.topic_type : 'seasonal_tip';

    // 3. Validate topic_key (deduplicate)
    const topicKey = String(s.topic_key || `${topicType}_${date}`);
    if (seenTopicKeys.has(topicKey) || existingTopicKeys.has(topicKey)) continue;
    seenTopicKeys.add(topicKey);

    // 4. Validate universe
    const universe = (NORMALIZED_UNIVERSES as readonly string[]).includes(s.universe)
      ? s.universe : 'general';

    // 5. Validate realisation_id coherence
    let realisationId: string | null = null;
    if (topicType === 'realisation' && s.realisation_id && validRealisationIds.has(s.realisation_id)) {
      realisationId = s.realisation_id;
    }

    // 6. Validate caption length
    const captionBase = String(s.caption_base_fr || '').substring(0, 2000);
    if (captionBase.length < 10) continue; // Too short, skip

    // 7. Validate title
    const title = String(s.title || '').substring(0, 200);
    if (title.length < 3) continue;

    // 8. Validate hashtags
    const hashtags = Array.isArray(s.hashtags)
      ? s.hashtags.filter((h: any) => typeof h === 'string' && h.length > 0).slice(0, 10)
      : [];

    // 9. Validate platform variants (only allowed platforms)
    const platformVariants: Record<string, { caption: string; cta: string | null }> = {};
    const rawVariants = s.platform_variants || {};
    for (const p of VALID_PLATFORMS) {
      const v = rawVariants[p];
      if (v && typeof v === 'object') {
        platformVariants[p] = {
          caption: String(v.caption || captionBase).substring(0, 2000),
          cta: v.cta ? String(v.cta).substring(0, 200) : null,
        };
      }
    }

    result.push({
      suggestion_date: date,
      title,
      content_angle: s.content_angle ? String(s.content_angle).substring(0, 500) : null,
      caption_base_fr: captionBase,
      hashtags,
      topic_type: topicType,
      topic_key: topicKey,
      visual_type: s.visual_type || 'photo',
      universe,
      realisation_id: realisationId,
      platform_variants: platformVariants,
    });
  }

  // 10. Enforce no 2 consecutive posts same universe (reorder if needed)
  // Simple pass: if same universe appears consecutively, swap with next different
  for (let i = 1; i < result.length; i++) {
    if (result[i].universe === result[i - 1].universe && result[i].universe !== 'general') {
      // Find next different
      for (let j = i + 1; j < result.length; j++) {
        if (result[j].universe !== result[i].universe) {
          [result[i], result[j]] = [result[j], result[i]];
          break;
        }
      }
    }
  }

  return result;
}

// ─── AI tool schema for structured output ───
const SUGGEST_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_social_suggestions',
    description: 'Génère des suggestions de posts social media premium orientés conversion pour le mois cible.',
    parameters: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              suggestion_date: { type: 'string', description: 'Date YYYY-MM-DD dans le mois cible' },
              title: { type: 'string', description: 'Titre court et accrocheur (max 200 car.)' },
              hook: { type: 'string', description: 'Première ligne STOP-SCROLL : choc, curiosité, problème concret. Ex: "Cette fuite coûtait 300€/mois sans que le client s\'en rende compte."' },
              content_angle: { type: 'string', description: 'Angle éditorial en 1 phrase' },
              caption_base_fr: { type: 'string', description: 'Texte complet du post : hook + storytelling (situation → problème → intervention → résultat) + CTA. Publiable sans modification.' },
              cta: { type: 'string', description: 'Call-to-action business naturel et fluide. Ex: "Besoin d\'un diagnostic ?", "Contactez-nous avant que ça empire"' },
              hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags (max 10)' },
              topic_type: { type: 'string', enum: ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding'] },
              topic_key: { type: 'string', description: 'Identifiant unique du sujet' },
              visual_type: { type: 'string', enum: ['photo', 'illustration', 'before_after', 'quote'] },
              universe: { type: 'string', enum: ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] },
              realisation_id: { type: 'string', description: 'UUID de la réalisation liée ou null' },
              storytelling_type: { type: 'string', enum: ['situation_probleme_solution', 'avant_apres', 'temoignage_client', 'conseil_expert', 'prevention_urgence', 'proximite_locale'], description: 'Structure narrative du post' },
              emotional_trigger: { type: 'string', enum: ['securite', 'economie', 'confort', 'tranquillite', 'urgence', 'confiance'], description: 'Levier émotionnel principal activé' },
              visual_strategy: { type: 'string', enum: ['photo_realisation', 'illustration_generee', 'photo_stock_contextualisee', 'visuel_typo_only'], description: 'Stratégie visuelle. photo_realisation OBLIGATOIRE si réalisation disponible.' },
              visual_prompt: { type: 'string', description: 'Prompt descriptif pour générer/trouver le visuel. Réaliste, précis, orienté habitat français. Ex: "Modern French bathroom with water leak under sink, realistic lighting, professional repair context, blue tones"' },
              visual_composition: { type: 'string', description: 'Description du placement : image, titre, hiérarchie visuelle, zone branding. Ex: "Image en fond, titre en haut, sous-texte centré, bandeau marque en bas"' },
              branding_guidelines: { type: 'string', description: 'Directives branding spécifiques : couleur univers, placement logo, style. Ex: "Bleu plomberie #2D8BC9, bandeau HelpConfort en bas, design moderne lisible mobile"' },
              platform_variants: {
                type: 'object',
                properties: {
                  facebook: { type: 'object', properties: { caption: { type: 'string', description: 'Storytelling + proximité' }, cta: { type: 'string' } }, required: ['caption'] },
                  instagram: { type: 'object', properties: { caption: { type: 'string', description: 'Impact visuel + caption court' }, cta: { type: 'string' } }, required: ['caption'] },
                  google_business: { type: 'object', properties: { caption: { type: 'string', description: 'Direct + utile + local' }, cta: { type: 'string' } }, required: ['caption'] },
                  linkedin: { type: 'object', properties: { caption: { type: 'string', description: 'Crédibilité + expertise' }, cta: { type: 'string' } }, required: ['caption'] },
                },
              },
            },
            required: ['suggestion_date', 'title', 'hook', 'caption_base_fr', 'cta', 'topic_type', 'topic_key', 'universe', 'storytelling_type', 'emotional_trigger', 'visual_strategy', 'visual_prompt'],
            additionalProperties: false,
          },
        },
      },
      required: ['suggestions'],
      additionalProperties: false,
    },
  },
};

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
      .select('id, topic_key, topic_type, status, realisation_id, suggestion_date, universe')
      .eq('agency_id', agencyId)
      .eq('month_key', monthKey);

    // 4. Calendar entries to protect scheduled/published suggestions
    const protectedSuggestionIds = new Set<string>();
    const { data: calendarEntries } = await adminSupabase
      .from('social_calendar_entries')
      .select('suggestion_id, status')
      .eq('agency_id', agencyId)
      .in('status', ['scheduled', 'published']);

    for (const ce of calendarEntries || []) {
      if (ce.suggestion_id) protectedSuggestionIds.add(ce.suggestion_id);
    }

    // Build existing topic keys set for dedup
    const existingTopicKeys = new Set(
      (existingSuggestions || [])
        .filter(s => s.status === 'approved' || protectedSuggestionIds.has(s.id))
        .map(s => s.topic_key)
        .filter(Boolean) as string[]
    );

    // ─── Regeneration logic ──────────────────────────
    if (regenerateSingle && singleSuggestionId) {
      // Check if protected by calendar
      if (protectedSuggestionIds.has(singleSuggestionId)) {
        return new Response(JSON.stringify({ error: 'Cette suggestion est liée à une publication planifiée ou publiée et ne peut pas être régénérée.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Load original context for targeted regeneration
      const originalSuggestion = (existingSuggestions || []).find(s => s.id === singleSuggestionId);

      // Archive only the single draft/rejected suggestion
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

      // Build regeneration context from original
      var singleContext = originalSuggestion ? {
        original_date: originalSuggestion.suggestion_date,
        original_topic_type: originalSuggestion.topic_type,
        original_universe: originalSuggestion.universe,
        original_realisation_id: originalSuggestion.realisation_id,
      } : null;
    } else {
      // Full month regeneration: archive draft/rejected only, EXCLUDING protected
      const toArchiveIds = (existingSuggestions || [])
        .filter(s => (s.status === 'draft' || s.status === 'rejected') && !protectedSuggestionIds.has(s.id))
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

      var singleContext = null;
    }

    // Count approved/protected suggestions that remain
    const approvedCount = (existingSuggestions || []).filter(s => s.status === 'approved' || protectedSuggestionIds.has(s.id)).length;
    const targetPostCount = regenerateSingle ? 1 : Math.max(4, 12 - approvedCount);

    // ─── AI Generation via tool calling ──────────────
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es simultanément directeur éditorial, copywriter expert conversion, social media strategist local et directeur artistique. Tu travailles pour HelpConfort (réseau dépannage & rénovation habitat).

Tu produis du contenu social media PREMIUM orienté visibilité, engagement et conversion client. Chaque post doit pouvoir générer un appel ou une prise de contact.

EXIGENCE ABSOLUE :
- Chaque post doit être publiable sans modification
- Donner envie de cliquer / appeler
- Être crédible immédiatement
- Être compréhensible en 2-3 secondes

HOOK (STOP SCROLL — OBLIGATOIRE) :
La première ligne doit créer un choc ou une curiosité, être spécifique, parler d'un vrai problème.
Exemples : "Cette fuite coûtait 300€ par mois sans que le client s'en rende compte.", "Ce tableau électrique pouvait déclencher un incendie."

CTA (OBLIGATOIRE — BUSINESS) :
Chaque post contient un CTA naturel et fluide, jamais agressif :
"Besoin d'un diagnostic ?", "Contactez-nous avant que ça empire", "Un doute ? On vérifie pour vous"

STORYTELLING OBLIGATOIRE :
1. situation réelle → 2. problème → 3. intervention → 4. résultat / bénéfice

EMOTIONAL TRIGGER :
Chaque post active : sécurité (incendie, fuite, panne), économie (facture, dégâts), confort ou tranquillité.

RÉPARTITION BUSINESS :
- 50% RÉALISATIONS (preuve sociale)
- 20% CONSEILS (valeur)
- 20% PRÉVENTION (urgence implicite)
- 10% CRÉATIF / VIRAL (visibilité)

VISUEL — EXIGENCE MAX :
- SI réalisation existe → FORCER photo_realisation
- SINON → illustration_generee de qualité
- INTERDIT : emoji comme visuel, visuel vide
- visual_prompt = réaliste, précis, professionnel, orienté habitat français

BRANDING STRICT :
- Couleurs : plomberie=#2D8BC9, electricite=#F8A73C, serrurerie=#E22673, menuiserie=#EF8531, vitrerie=#90C14E, volets=#A23189, pmr=#3C64A2, renovation=#B79D84, general=#37474F
- Présence obligatoire du branding HelpConfort (bandeau/signature en bas)
- Design propre, moderne, lisible mobile
- INTERDIT : couleurs aléatoires, styles incohérents, visuels "cheap"

ANTI-RÉPÉTITION :
- Pas 2 posts identiques, pas même angle, pas même hook, pas même univers consécutif

PLATFORM VARIANTS :
- Facebook → storytelling + proximité
- Instagram → impact visuel + caption court
- Google Business → direct + utile + local
- LinkedIn → crédibilité + expertise

CRÉATIVITÉ CONTRÔLÉE (10% max) : humour léger, détournement, saisonnalité. Toujours professionnel, jamais gadget.

UNIVERS MÉTIER AUTORISÉS : ${NORMALIZED_UNIVERSES.join(', ')}
Toutes les dates doivent être dans le mois cible ${month}/${year}.

TU NE FAIS PAS DU CONTENU. TU CRÉES UN LEVIER D'ACQUISITION CLIENT.`;

    let userPrompt: string;

    if (regenerateSingle && singleContext) {
      // Targeted regeneration: preserve context
      userPrompt = `Génère 1 suggestion de post pour le ${singleContext.original_date || `${year}-${String(month).padStart(2, '0')}-15`}.

CONTRAINTES :
- Date : ${singleContext.original_date || 'au choix dans le mois'}
- Type de contenu préféré : ${singleContext.original_topic_type || 'au choix'}
- Univers préféré : ${singleContext.original_universe || 'au choix'}
${singleContext.original_realisation_id ? `- Réalisation liée : ${singleContext.original_realisation_id}` : ''}

JOURNÉES THÉMATIQUES DU MOIS :
${monthAwareness.map(a => `- ${a.day}/${month}: ${a.label}`).join('\n')}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'})`).join('\n')
  : '(aucune)'}

Propose un angle DIFFÉRENT du post précédent, tout en gardant le même contexte thématique.`;
    } else {
      userPrompt = `Génère ${targetPostCount} suggestions de posts social media pour le mois ${month}/${year}.

JOURNÉES THÉMATIQUES DU MOIS :
${monthAwareness.map(a => `- ${a.day}/${month}: ${a.label} (tags: ${a.tags.join(', ')})`).join('\n')}

RÉALISATIONS EXPLOITABLES :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, ${r.intervention_date}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune réalisation exploitable ce mois-ci)'}

SUJETS DÉJÀ EXISTANTS (à ne pas dupliquer) :
${[...existingTopicKeys].join(', ') || '(aucun)'}

RÉPARTITION CIBLE par semaine : 1 réalisation + 1 conseil saisonnier + 1 opportunité calendrier/prévention.`;
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [SUGGEST_TOOL],
        tool_choice: { type: 'function', function: { name: 'generate_social_suggestions' } },
        stream: false,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[social-suggest] AI error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes, réessayez dans quelques minutes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA insuffisants.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Erreur du service IA', details: aiResponse.status }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();

    // Extract from tool call response
    let rawSuggestions: any[];
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        rawSuggestions = parsed.suggestions;
      } else {
        // Fallback: try content as JSON (some models may not honor tool_choice)
        const rawContent = aiData.choices?.[0]?.message?.content || '';
        const jsonStr = rawContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const parsed = JSON.parse(jsonStr);
        rawSuggestions = Array.isArray(parsed) ? parsed : parsed.suggestions;
      }
      if (!Array.isArray(rawSuggestions)) throw new Error('Not an array');
    } catch (parseErr) {
      console.error('[social-suggest] Parse error:', parseErr);
      return new Response(JSON.stringify({ error: 'Réponse IA invalide, réessayez' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Validate post-AI ────────────────────────────
    const validatedSuggestions = validateAndNormalizeSuggestions(
      rawSuggestions, month, year, exploitableReals, existingTopicKeys
    );

    if (validatedSuggestions.length === 0) {
      return new Response(JSON.stringify({ error: 'Aucune suggestion valide générée, réessayez' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Persist to DB ───────────────────────────────
    const batchId = crypto.randomUUID();
    const persistedSuggestions: any[] = [];

    for (const s of validatedSuggestions) {
      // Determine source_type
      let sourceType = 'ai_seasonal';
      if (s.topic_type === 'awareness_day') sourceType = 'ai_awareness';
      else if (s.topic_type === 'realisation') sourceType = 'ai_realisation';
      if (regenerateSingle) sourceType = 'regenerated';

      // Insert suggestion
      const { data: inserted, error: insertErr } = await adminSupabase
        .from('social_content_suggestions')
        .insert({
          agency_id: agencyId,
          month_key: monthKey,
          suggestion_date: s.suggestion_date,
          title: s.title,
          content_angle: s.content_angle,
          caption_base_fr: s.caption_base_fr,
          hashtags: s.hashtags,
          platform_targets: Object.keys(s.platform_variants).length > 0 ? Object.keys(s.platform_variants) : ['facebook', 'instagram'],
          visual_type: s.visual_type,
          topic_type: s.topic_type,
          topic_key: s.topic_key,
          realisation_id: s.realisation_id,
          universe: s.universe,
          relevance_score: null,
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
      const variantRows: any[] = [];
      for (const platform of VALID_PLATFORMS) {
        const v = s.platform_variants[platform];
        if (!v) continue;
        variantRows.push({
          suggestion_id: inserted.id,
          agency_id: agencyId,
          platform,
          caption_fr: v.caption,
          cta: v.cta,
          hashtags: s.hashtags,
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
