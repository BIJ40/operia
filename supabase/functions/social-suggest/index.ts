/**
 * social-suggest — Edge Function pour générer des suggestions de posts social media.
 * V6 : Lead engine, localisation, scoring, urgency levels.
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

// ─── Awareness days dataset (enrichi — toutes les dates clés) ───
const AWARENESS_DAYS = [
  // ── Janvier ──
  { month: 1, day: 1,  label: "Bonne année — résolutions habitat", tags: ["habitat","renovation"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "devis_renovation" },
  { month: 1, day: 15, label: "Prévention gel canalisations", tags: ["eau","urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "urgence_gel" },
  { month: 1, day: 27, label: "Vérification détecteurs de fumée", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_incendie" },
  // ── Février ──
  { month: 2, day: 10, label: "Économies d'énergie", tags: ["energie","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "audit_energetique" },
  { month: 2, day: 14, label: "Saint-Valentin — cocooning maison", tags: ["confort","habitat"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "ambiance_maison" },
  // ── Mars ──
  { month: 3, day: 8,  label: "Printemps — check-up plomberie", tags: ["entretien","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "entretien_printemps" },
  { month: 3, day: 22, label: "Journée mondiale de l'eau", tags: ["eau","plomberie"], contentTypeHint: "pedagogique", preferredUniverses: ["plomberie"], ctaHint: "diagnostic_fuite" },
  { month: 3, day: 30, label: "Changement d'heure — vérifier programmateurs", tags: ["electricite","confort"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","volets"], ctaHint: "programmateur_volets" },
  // ── Avril ──
  { month: 4, day: 1,  label: "1er avril — anecdotes dépannage insolites", tags: ["humour","engagement"], contentTypeHint: "decale", preferredUniverses: ["general"], ctaHint: "engagement_communaute" },
  { month: 4, day: 7,  label: "Grand ménage de printemps — check-up maison", tags: ["entretien","habitat"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite","renovation"], ctaHint: "check_up_maison" },
  { month: 4, day: 15, label: "Préparation terrasse & extérieurs", tags: ["habitat","menuiserie"], contentTypeHint: "pedagogique", preferredUniverses: ["menuiserie","volets","renovation"], ctaHint: "amenagement_exterieur" },
  { month: 4, day: 20, label: "Pâques — votre maison prête pour recevoir", tags: ["confort","habitat","famille"], contentTypeHint: "lifestyle", preferredUniverses: ["renovation","general"], ctaHint: "maison_accueillante" },
  { month: 4, day: 22, label: "Jour de la Terre — rénovation éco-responsable", tags: ["energie","renovation"], contentTypeHint: "pedagogique", preferredUniverses: ["renovation"], ctaHint: "renovation_ecologique" },
  // ── Mai ──
  { month: 5, day: 1,  label: "1er mai — sécuriser sa maison pour le pont", tags: ["securite","serrurerie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_pont" },
  { month: 5, day: 10, label: "Entretien climatisation", tags: ["entretien","confort"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "entretien_clim" },
  { month: 5, day: 25, label: "Journée du bricolage — quand appeler un pro ?", tags: ["pedagogique","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["general"], ctaHint: "appeler_un_pro" },
  // ── Juin ──
  { month: 6, day: 5,  label: "Journée de l'environnement — éco-gestes maison", tags: ["energie","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["electricite","plomberie"], ctaHint: "eco_gestes" },
  { month: 6, day: 15, label: "Canicule — fraîcheur & ventilation", tags: ["confort","urgence"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "installation_clim" },
  { month: 6, day: 21, label: "Sécuriser avant vacances d'été", tags: ["securite","serrurerie"], contentTypeHint: "prevention", preferredUniverses: ["serrurerie"], ctaHint: "securisation_vacances" },
  // ── Juillet ──
  { month: 7, day: 14, label: "14 juillet — sécurité électrique festive", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique" },
  { month: 7, day: 20, label: "Stores & volets roulants contre la chaleur", tags: ["confort","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["volets"], ctaHint: "installation_volets" },
  // ── Août ──
  { month: 8, day: 1,  label: "Urgences estivales — on reste ouvert", tags: ["urgence","plomberie","serrurerie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","serrurerie"], ctaHint: "numero_urgence" },
  { month: 8, day: 20, label: "Rentrée — préparer la maison", tags: ["entretien","habitat"], contentTypeHint: "prevention", preferredUniverses: ["renovation","general"], ctaHint: "preparation_rentree" },
  // ── Septembre ──
  { month: 9, day: 1,  label: "Remise en route chauffage", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "revision_chauffage" },
  { month: 9, day: 15, label: "Rentrée — vérifier tableau électrique", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "diagnostic_electrique" },
  // ── Octobre ──
  { month: 10, day: 1,  label: "Anticiper l'hiver — isolation & chauffage", tags: ["entretien","energie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","renovation"], ctaHint: "preparation_hiver" },
  { month: 10, day: 13, label: "Prévention catastrophes naturelles", tags: ["securite","urgence"], contentTypeHint: "prevention", preferredUniverses: ["plomberie","electricite"], ctaHint: "prevention_degats_eaux" },
  { month: 10, day: 31, label: "Halloween — les pannes qui font peur", tags: ["humour","engagement"], contentTypeHint: "decale", preferredUniverses: ["general","electricite"], ctaHint: "engagement_communaute" },
  // ── Novembre ──
  { month: 11, day: 1,  label: "Purge radiateurs avant le froid", tags: ["entretien","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "purge_radiateurs" },
  { month: 11, day: 15, label: "Journée accessibilité — adaptation PMR", tags: ["pmr","habitat"], contentTypeHint: "pedagogique", preferredUniverses: ["pmr"], ctaHint: "adaptation_logement" },
  // ── Décembre ──
  { month: 12, day: 1,  label: "Risques gel canalisations", tags: ["urgence","plomberie"], contentTypeHint: "prevention", preferredUniverses: ["plomberie"], ctaHint: "prevention_gel" },
  { month: 12, day: 10, label: "Sécurité électrique pour les fêtes", tags: ["securite","electricite"], contentTypeHint: "prevention", preferredUniverses: ["electricite"], ctaHint: "securite_electrique_noel" },
  { month: 12, day: 24, label: "Joyeuses fêtes — Help Confort à vos côtés", tags: ["branding","engagement"], contentTypeHint: "lifestyle", preferredUniverses: ["general"], ctaHint: "branding_fetes" },
  { month: 12, day: 31, label: "Bilan de l'année — vos projets 2026", tags: ["branding","habitat"], contentTypeHint: "lifestyle", preferredUniverses: ["general","renovation"], ctaHint: "projets_nouvelle_annee" },
];

const NORMALIZED_UNIVERSES = ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] as const;
const VALID_PLATFORMS = ['facebook', 'instagram', 'google_business', 'linkedin'] as const;
const VALID_TOPIC_TYPES = ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding'] as const;
const VALID_LEAD_TYPES = ['urgence', 'prevention', 'amelioration', 'preuve_sociale', 'saisonnier'] as const;
const VALID_TARGET_INTENTS = ['besoin_immediat', 'besoin_latent', 'curiosite', 'education'] as const;
const VALID_URGENCY_LEVELS = ['low', 'medium', 'high'] as const;

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
  hook: string;
  content_angle: string | null;
  caption_base_fr: string;
  cta: string;
  hashtags: string[];
  topic_type: string;
  topic_key: string;
  visual_type: string;
  universe: string;
  realisation_id: string | null;
  storytelling_type: string | null;
  emotional_trigger: string | null;
  visual_strategy: string | null;
  visual_prompt: string | null;
  visual_composition: string | null;
  branding_guidelines: string | null;
  lead_score: number;
  lead_type: string | null;
  urgency_level: string;
  target_intent: string | null;
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

    // 1. Validate date
    let date = String(s.suggestion_date || '');
    if (!date.startsWith(monthKey)) {
      const day = Math.min(Math.max(parseInt(date.split('-')[2]) || 15, 1), daysInMonth);
      date = `${monthKey}-${String(day).padStart(2, '0')}`;
    }
    const dayNum = parseInt(date.split('-')[2]);
    if (dayNum < 1 || dayNum > daysInMonth) date = `${monthKey}-15`;

    // 2. topic_type
    const topicType = (VALID_TOPIC_TYPES as readonly string[]).includes(s.topic_type) ? s.topic_type : 'seasonal_tip';

    // 3. topic_key dedup
    const topicKey = String(s.topic_key || `${topicType}_${date}`);
    if (seenTopicKeys.has(topicKey) || existingTopicKeys.has(topicKey)) continue;
    seenTopicKeys.add(topicKey);

    // 4. universe
    const universe = (NORMALIZED_UNIVERSES as readonly string[]).includes(s.universe) ? s.universe : 'general';

    // 5. realisation_id
    let realisationId: string | null = null;
    if (topicType === 'realisation' && s.realisation_id && validRealisationIds.has(s.realisation_id)) {
      realisationId = s.realisation_id;
    }

    // 6. caption
    const captionBase = String(s.caption_base_fr || '').substring(0, 2000);
    if (captionBase.length < 10) continue;

    // 7. title
    const title = String(s.title || '').substring(0, 200);
    if (title.length < 3) continue;

    // 8. hashtags
    const hashtags = Array.isArray(s.hashtags)
      ? s.hashtags.filter((h: any) => typeof h === 'string' && h.length > 0).slice(0, 10)
      : [];

    // 9. platform variants
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

    // 10. V5 fields
    const hook = String(s.hook || '').substring(0, 500) || title;
    const cta = String(s.cta || 'Contactez-nous').substring(0, 200);
    const storytellingType = s.storytelling_type ? String(s.storytelling_type).substring(0, 50) : null;
    const emotionalTrigger = s.emotional_trigger ? String(s.emotional_trigger).substring(0, 50) : null;
    const visualStrategy = s.visual_strategy ? String(s.visual_strategy).substring(0, 50) : null;
    const visualPrompt = s.visual_prompt ? String(s.visual_prompt).substring(0, 1000) : null;
    const visualComposition = s.visual_composition ? String(s.visual_composition).substring(0, 500) : null;
    const brandingGuidelines = s.branding_guidelines ? String(s.branding_guidelines).substring(0, 500) : null;

    // 11. V6 lead engine fields
    const leadScore = Math.min(100, Math.max(0, Number(s.lead_score) || 50));
    const leadType = (VALID_LEAD_TYPES as readonly string[]).includes(s.lead_type) ? s.lead_type : null;
    const urgencyLevel = (VALID_URGENCY_LEVELS as readonly string[]).includes(s.urgency_level) ? s.urgency_level : 'medium';
    const targetIntent = (VALID_TARGET_INTENTS as readonly string[]).includes(s.target_intent) ? s.target_intent : null;

    result.push({
      suggestion_date: date,
      title,
      hook,
      content_angle: s.content_angle ? String(s.content_angle).substring(0, 500) : null,
      caption_base_fr: captionBase,
      cta,
      hashtags,
      topic_type: topicType,
      topic_key: topicKey,
      visual_type: s.visual_type || 'photo',
      universe,
      realisation_id: realisationId,
      storytelling_type: storytellingType,
      emotional_trigger: emotionalTrigger,
      visual_strategy: visualStrategy,
      visual_prompt: visualPrompt,
      visual_composition: visualComposition,
      branding_guidelines: brandingGuidelines,
      lead_score: leadScore,
      lead_type: leadType,
      urgency_level: urgencyLevel,
      target_intent: targetIntent,
      platform_variants: platformVariants,
    });
  }

  // Anti-repetition: no 2 consecutive same universe
  for (let i = 1; i < result.length; i++) {
    if (result[i].universe === result[i - 1].universe && result[i].universe !== 'general') {
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

// ─── AI tool schema ───
const SUGGEST_TOOL = {
  type: 'function' as const,
  function: {
    name: 'generate_social_suggestions',
    description: 'Génère des suggestions de posts social media premium orientés conversion et leads pour le mois cible.',
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
              hook: { type: 'string', description: "Première ligne STOP-SCROLL : choc, curiosité, problème concret. Ex: \"Cette fuite coûtait 300€/mois sans que le client s'en rende compte.\"" },
              content_angle: { type: 'string', description: 'Angle éditorial en 1 phrase' },
              caption_base_fr: { type: 'string', description: 'Texte complet du post : hook + storytelling (situation → problème → intervention → résultat) + CTA. Publiable sans modification.' },
              cta: { type: 'string', description: "CTA business naturel et fluide. Ex: \"Besoin d'un diagnostic ?\", \"Contactez-nous avant que ça empire\"" },
              hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags (max 10)' },
              topic_type: { type: 'string', enum: ['awareness_day', 'seasonal_tip', 'realisation', 'local_branding'] },
              topic_key: { type: 'string', description: 'Identifiant unique du sujet' },
              visual_type: { type: 'string', enum: ['photo', 'illustration', 'before_after', 'quote'] },
              universe: { type: 'string', enum: ['plomberie', 'electricite', 'serrurerie', 'vitrerie', 'menuiserie', 'renovation', 'volets', 'pmr', 'general'] },
              realisation_id: { type: 'string', description: 'UUID de la réalisation liée ou null' },
              storytelling_type: { type: 'string', enum: ['situation_probleme_solution', 'avant_apres', 'temoignage_client', 'conseil_expert', 'prevention_urgence', 'proximite_locale'] },
              emotional_trigger: { type: 'string', enum: ['securite', 'economie', 'confort', 'tranquillite', 'urgence', 'confiance'] },
              visual_strategy: { type: 'string', enum: ['photo_realisation', 'illustration_generee', 'photo_stock_contextualisee', 'visuel_typo_only'] },
              visual_prompt: { type: 'string', description: "Prompt descriptif pour générer le visuel. Réaliste, précis, orienté habitat français. Ex: \"Modern French bathroom with water leak under sink, realistic lighting\"" },
              visual_composition: { type: 'string', description: "Placement : image, titre, branding. Ex: \"Image en fond, titre en haut, bandeau marque en bas\"" },
              branding_guidelines: { type: 'string', description: "Directives branding : couleur univers, style. Ex: \"Bleu plomberie #2D8BC9, bandeau HelpConfort en bas\"" },
              lead_score: { type: 'number', description: 'Score lead 0-100. >80=fort potentiel, 60-80=bon, <60=faible. Basé sur urgence, clarté besoin, force hook, qualité CTA.' },
              lead_type: { type: 'string', enum: ['urgence', 'prevention', 'amelioration', 'preuve_sociale', 'saisonnier'], description: 'Type de lead visé' },
              urgency_level: { type: 'string', enum: ['low', 'medium', 'high'], description: 'high=problème critique, medium=amélioration, low=conseil' },
              target_intent: { type: 'string', enum: ['besoin_immediat', 'besoin_latent', 'curiosite', 'education'], description: "Intention client ciblée" },
              platform_variants: {
                type: 'object',
                properties: {
                  facebook: { type: 'object', properties: { caption: { type: 'string' }, cta: { type: 'string' } }, required: ['caption'] },
                  instagram: { type: 'object', properties: { caption: { type: 'string' }, cta: { type: 'string' } }, required: ['caption'] },
                  google_business: { type: 'object', properties: { caption: { type: 'string' }, cta: { type: 'string' } }, required: ['caption'] },
                  linkedin: { type: 'object', properties: { caption: { type: 'string' }, cta: { type: 'string' } }, required: ['caption'] },
                },
              },
            },
            required: ['suggestion_date', 'title', 'hook', 'caption_base_fr', 'cta', 'topic_type', 'topic_key', 'universe', 'storytelling_type', 'emotional_trigger', 'visual_strategy', 'visual_prompt', 'lead_score', 'lead_type', 'urgency_level', 'target_intent'],
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
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = getCorsHeaders(origin);

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authResult = await getUserContext(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { context, supabase: userSupabase } = authResult;

    const rlResult = await checkRateLimit(`social-suggest:${context.userId}`, { limit: 5, windowMs: 3600_000 });
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult.retryAfter!, corsHeaders);
    }

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

    const accessCheck = assertAgencyAccess(context, agencyId);
    if (!accessCheck.allowed) {
      return new Response(JSON.stringify({ error: accessCheck.error }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const monthKey = `${year}-${String(month).padStart(2, '0')}`;

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // ─── Load context data ───────────────────────────
    const monthAwareness = AWARENESS_DAYS.filter(d => d.month === month);

    // Load agency info for localization
    const { data: agency } = await adminSupabase
      .from('apogee_agencies')
      .select('label, ville, code_postal')
      .eq('id', agencyId)
      .single();

    const agencyName = agency?.label || 'Help Confort';
    const agencyCity = agency?.ville || '';
    const agencyZone = agencyCity ? `${agencyCity} (${agency?.code_postal || ''})` : '';

    // Realisations with media
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

    // Calendar protection
    const protectedSuggestionIds = new Set<string>();
    const { data: calendarEntries } = await adminSupabase
      .from('social_calendar_entries')
      .select('suggestion_id, status')
      .eq('agency_id', agencyId)
      .in('status', ['scheduled', 'published']);

    for (const ce of calendarEntries || []) {
      if (ce.suggestion_id) protectedSuggestionIds.add(ce.suggestion_id);
    }

    const existingTopicKeys = new Set(
      (existingSuggestions || [])
        .filter(s => s.status === 'approved' || protectedSuggestionIds.has(s.id))
        .map(s => s.topic_key)
        .filter(Boolean) as string[]
    );

    // ─── Regeneration logic ──────────────────────────
    let singleContext: any = null;
    if (regenerateSingle && singleSuggestionId) {
      if (protectedSuggestionIds.has(singleSuggestionId)) {
        return new Response(JSON.stringify({ error: 'Cette suggestion est liée à une publication planifiée ou publiée et ne peut pas être régénérée.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const originalSuggestion = (existingSuggestions || []).find(s => s.id === singleSuggestionId);

      await adminSupabase
        .from('social_content_suggestions')
        .update({ status: 'archived' })
        .eq('id', singleSuggestionId)
        .eq('agency_id', agencyId)
        .in('status', ['draft', 'rejected']);

      await adminSupabase
        .from('social_post_variants')
        .update({ status: 'archived' })
        .eq('suggestion_id', singleSuggestionId)
        .eq('agency_id', agencyId);

      singleContext = originalSuggestion ? {
        original_date: originalSuggestion.suggestion_date,
        original_topic_type: originalSuggestion.topic_type,
        original_universe: originalSuggestion.universe,
        original_realisation_id: originalSuggestion.realisation_id,
      } : null;
    } else {
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
    }

    const approvedCount = (existingSuggestions || []).filter(s => s.status === 'approved' || protectedSuggestionIds.has(s.id)).length;
    const targetPostCount = regenerateSingle ? 1 : Math.max(4, 12 - approvedCount);

    // ─── AI Generation ──────────────────────────────
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = `Tu es simultanément directeur éditorial, copywriter expert conversion locale, growth marketer et directeur artistique.
Tu travailles pour HelpConfort (dépannage & rénovation habitat).

Tu produis des posts social media PREMIUM orientés :
→ visibilité locale
→ engagement
→ génération de leads
Chaque post doit pouvoir générer une prise de contact.

EXIGENCE ABSOLUE :
- Chaque post doit être publiable sans modification
- Donner envie de cliquer / appeler
- Être crédible immédiatement
- Être compréhensible en 2-3 secondes

LEAD ENGINE (CRITIQUE) :
Tu dois produire des posts qui captent des INTENTIONS RÉELLES.
- lead_type : urgence (panne/fuite/sécurité), prevention (éviter problème), amelioration (confort/rénovation), preuve_sociale (réalisation), saisonnier
- target_intent : besoin_immediat, besoin_latent, curiosite, education
- lead_score 0-100 : basé sur urgence du problème, clarté du besoin, proximité cas réel, force du hook, qualité du CTA. >80=fort potentiel, 60-80=bon, <60=à améliorer
- urgency_level : high=problème critique (fuite, électricité, serrure), medium=amélioration importante, low=conseil léger

HOOK (STOP SCROLL — OBLIGATOIRE) :
La première ligne doit créer un choc ou une curiosité, être spécifique, parler d'un vrai problème.
Exemples : "Cette fuite coûtait 300€ par mois sans que le client s'en rende compte.", "Ce tableau électrique pouvait déclencher un incendie."

CTA (OBLIGATOIRE — BUSINESS) :
Chaque post contient un CTA naturel et fluide, jamais agressif :
"Besoin d'un diagnostic ?", "Contactez-nous avant que ça empire", "Intervention rapide dans votre secteur"

STORYTELLING OBLIGATOIRE :
1. situation réelle → 2. problème → 3. intervention → 4. résultat / bénéfice

EMOTIONAL TRIGGER :
Chaque post active : securite, economie, confort, tranquillite, urgence ou confiance.

RÉPARTITION BUSINESS :
- 50% RÉALISATIONS (preuve sociale)
- 25% URGENCE / PROBLÈMES
- 15% CONSEILS
- 10% CRÉATIF

LOCALISATION (OBLIGATOIRE) :
${agencyZone ? `Zone d'intervention : ${agencyZone}. Adapter le contenu : mention subtile de la zone, contexte local (climat, habitat), proximité client.` : "Adapter le contenu avec proximité locale."}
${agencyName ? `Nom de l'agence : ${agencyName}.` : ''}
Exemples : "Intervention récente à [ville]", "Dans notre secteur, on voit souvent ce problème…"

VISUEL — EXIGENCE MAX :
- SI réalisation existe → FORCER photo_realisation
- SINON → illustration_generee de qualité
- INTERDIT : emoji comme visuel, visuel vide, fond dégradé seul
- visual_prompt = réaliste, précis, professionnel, orienté habitat français
- UN VISUEL SANS IMAGE EST INTERDIT

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

TU NE CRÉES PAS DU CONTENU. TU CRÉES DES OPPORTUNITÉS CLIENTS.`;

    let userPrompt: string;

    if (regenerateSingle && singleContext) {
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
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune)'}

Propose un angle DIFFÉRENT du post précédent, tout en gardant le même contexte thématique.
IMPORTANT : lead_score doit refléter le potentiel réel de conversion client.`;
    } else {
      userPrompt = `Génère ${targetPostCount} suggestions de posts social media PREMIUM pour le mois ${month}/${year}.

RÉPARTITION BUSINESS OBLIGATOIRE sur ${targetPostCount} posts :
- ~50% RÉALISATIONS (preuve sociale, cas clients réels)
- ~25% URGENCE / PROBLÈMES (leads directs)
- ~15% CONSEILS SAISONNIERS (valeur ajoutée habitat)
- ~10% CRÉATIF / BRANDING LOCAL (visibilité, proximité)

JOURNÉES THÉMATIQUES DU MOIS :
${monthAwareness.map(a => `- ${a.day}/${month}: ${a.label} (tags: ${a.tags.join(', ')})`).join('\n')}

RÉALISATIONS EXPLOITABLES (PRIORITÉ ABSOLUE pour les posts réalisation) :
${exploitableReals.length > 0 
  ? exploitableReals.map(r => `- "${r.title}" (ID: ${r.id}, ${r.intervention_date}, univers: ${r.universe || 'inconnu'}, avant/après: ${r.hasBeforeAfter ? 'oui' : 'non'})`).join('\n')
  : '(aucune réalisation exploitable — remplacer par conseils concrets terrain)'}

SUJETS DÉJÀ EXISTANTS (à ne pas dupliquer) :
${[...existingTopicKeys].join(', ') || '(aucun)'}

RAPPEL CRITIQUE :
- Chaque post DOIT avoir un hook stop-scroll, un CTA business, un visual_prompt exploitable
- lead_score DOIT refléter le potentiel réel de conversion
- Posts urgence (fuite, panne, sécurité) → lead_score > 80, urgency_level = high
- Posts réalisation avec photos → lead_score > 70
- visual_prompt = scène RÉALISTE habitat français, JAMAIS un fond vide`;
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

    let rawSuggestions: any[];
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        rawSuggestions = parsed.suggestions;
      } else {
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
      let sourceType = 'ai_seasonal';
      if (s.topic_type === 'awareness_day') sourceType = 'ai_awareness';
      else if (s.topic_type === 'realisation') sourceType = 'ai_realisation';
      if (regenerateSingle) sourceType = 'regenerated';

      const aiPayload = {
        hook: s.hook,
        cta: s.cta,
        storytelling_type: s.storytelling_type,
        emotional_trigger: s.emotional_trigger,
        visual_strategy: s.visual_strategy,
        visual_prompt: s.visual_prompt,
        visual_composition: s.visual_composition,
        branding_guidelines: s.branding_guidelines,
        lead_score: s.lead_score,
        lead_type: s.lead_type,
        urgency_level: s.urgency_level,
        target_intent: s.target_intent,
        generation_version: 'v6',
      };

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
          relevance_score: s.lead_score,
          status: 'draft',
          generation_batch_id: batchId,
          source_type: sourceType,
          ai_payload: aiPayload,
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
