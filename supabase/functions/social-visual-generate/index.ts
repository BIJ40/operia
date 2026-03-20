/**
 * social-visual-generate — Génère un visuel IA COMPLET pour un post social.
 * 
 * V4 : Pipeline en 2 passes :
 *   1. Génération structurée (hook, CTA, subtext) → JSON marketing
 *   2. Génération image de fond (photo réaliste sans texte)
 *   3. Composition finale : 2e passe IA pour intégrer texte + branding sur l'image
 * 
 * RÉSULTAT : image 1080x1080 prête à poster avec hook, CTA et branding intégrés.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, getCorsHeaders } from '../_shared/cors.ts';
import { getUserContext, assertAgencyAccess } from '../_shared/auth.ts';

const SERVICE_COLORS: Record<string, string> = {
  plomberie: '#2D8BC9',
  electricite: '#F8A73C',
  serrurerie: '#E22673',
  menuiserie: '#EF8531',
  vitrerie: '#90C14E',
  volets: '#A23189',
  pmr: '#3C64A2',
  renovation: '#B79D84',
  general: '#37474F',
};

const SERVICE_LABELS: Record<string, string> = {
  plomberie: 'Plomberie',
  electricite: 'Électricité',
  serrurerie: 'Serrurerie',
  menuiserie: 'Menuiserie',
  vitrerie: 'Vitrerie',
  volets: 'Volets roulants',
  pmr: 'Adaptation logement',
  renovation: 'Rénovation',
  general: 'Multi-services',
};

// ─── Multi-model fallback for image generation ─────────────
const IMAGE_MODELS = [
  'google/gemini-3.1-flash-image-preview',  // Nano Banana 2 (fast + quality)
  'google/gemini-2.5-flash-image',           // Nano Banana 1 (fallback)
  'google/gemini-3-pro-image-preview',       // Pro (last resort, slower)
];

async function callImageAIWithFallback(
  apiKey: string,
  messages: any[],
): Promise<{ ok: true; data: any; model: string } | { ok: false; status: number; error: string }> {
  let lastStatus = 502;
  let lastError = 'All models failed';

  for (const model of IMAGE_MODELS) {
    console.log(`[social-visual-generate] Trying model: ${model}`);
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, modalities: ['image', 'text'] }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[social-visual-generate] Success with model: ${model}`);
        return { ok: true, data, model };
      }

      const errText = await response.text();
      console.warn(`[social-visual-generate] ${model} returned ${response.status}: ${errText.slice(0, 200)}`);
      lastStatus = response.status;
      lastError = errText;

      // 402 = no credits → same billing, stop
      if (response.status === 402) {
        return { ok: false, status: 402, error: 'Crédits IA insuffisants.' };
      }

      // 429 = rate limited → try next model
      if (response.status === 429) {
        console.log(`[social-visual-generate] ${model} rate limited, trying next...`);
        continue;
      }

      continue;
    } catch (err) {
      console.error(`[social-visual-generate] ${model} fetch error:`, err);
      continue;
    }
  }

  return { ok: false, status: lastStatus, error: lastError };
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = getCorsHeaders(origin);
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
    }

    const authResult = await getUserContext(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), { status: authResult.status, headers: jsonHeaders });
    }
    const { context } = authResult;

    const body = await req.json();
    const suggestionId = body.suggestion_id;
    const agencyId = body.agency_id || context.agencyId;

    if (!suggestionId || !agencyId) {
      return new Response(JSON.stringify({ error: 'suggestion_id et agency_id requis' }), { status: 400, headers: jsonHeaders });
    }

    const accessCheck = assertAgencyAccess(context, agencyId);
    if (!accessCheck.allowed) {
      return new Response(JSON.stringify({ error: accessCheck.error }), { status: 403, headers: jsonHeaders });
    }

    const adminSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    // Load suggestion
    const { data: suggestion, error: sugErr } = await adminSupabase
      .from('social_content_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('agency_id', agencyId)
      .single();

    if (sugErr || !suggestion) {
      return new Response(JSON.stringify({ error: 'Suggestion non trouvée' }), { status: 404, headers: jsonHeaders });
    }

    // Load agency info for signature
    const { data: agency } = await adminSupabase
      .from('apogee_agencies')
      .select('label, adresse, ville, code_postal')
      .eq('id', agencyId)
      .single();

    const agencyAddress = agency?.ville
      ? `${agency.ville}${agency.code_postal ? ' (' + agency.code_postal + ')' : ''}`
      : '';

    const aiPayload = (suggestion.ai_payload as Record<string, any>) || {};
    const universe = suggestion.universe || 'general';
    const color = SERVICE_COLORS[universe] || SERVICE_COLORS.general;
    const serviceLabel = SERVICE_LABELS[universe] || SERVICE_LABELS.general;
    const title = suggestion.title || '';
    const rawHook = aiPayload.hook || title;
    const rawCta = aiPayload.cta || 'Demandez un devis gratuit';
    const visualPrompt = aiPayload.visual_prompt || '';
    const topicType = suggestion.topic_type || 'seasonal_tip';
    const rawCaption = suggestion.caption_base_fr || '';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), { status: 500, headers: jsonHeaders });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 0 : COPYWRITING IA — Réécriture cohérente du hook/sous-texte
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let hook = rawHook;
    let caption = rawCaption;
    let cta = rawCta;

    try {
      console.log('[social-visual-generate] Generating coherent marketing copy...');
      const copywritingPrompt = `Tu es un copywriter publicitaire expert pour une entreprise française de dépannage à domicile appelée Help Confort.

Contexte :
- Univers : ${serviceLabel}
- Titre original : "${title}"
- Hook original : "${rawHook}"
- Sous-texte original : "${rawCaption}"
- CTA original : "${rawCta}"
- Type de post : ${topicType}

MISSION : produire un texte publicitaire court, naturel, crédible et immédiatement compréhensible pour un visuel social media.

RÈGLES STRICTES :
1. HOOK :
- 3 à 5 mots maximum
- 30 caractères maximum
- phrase complète, claire, naturelle
- jamais absurde, jamais poétique bizarre, jamais tronquée
- interdit : formulations comme "Le printemps ne revient pas"
- ton : concret, utile, orienté action

2. SOUS-TEXTE :
- 6 à 10 mots maximum
- 55 caractères maximum
- une phrase complète avec point final
- doit compléter le hook de façon simple et lisible
- jamais de date, jamais d'événement calendaire inutile, jamais de texte décoratif

3. CTA :
- 2 à 4 mots maximum
- 22 caractères maximum
- action claire

Réponds UNIQUEMENT en JSON valide avec exactement ces clés :
{"hook":"...","subtext":"...","cta":"..."}`;

      const copyResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages: [{ role: 'user', content: copywritingPrompt }],
          response_format: { type: 'json_object' },
        }),
      });

      if (copyResponse.ok) {
        const copyData = await copyResponse.json();
        const rawContent = copyData.choices?.[0]?.message?.content || '';
        try {
          const parsed = JSON.parse(rawContent);
          if (parsed.hook && parsed.hook.length <= 32 && parsed.hook.split(/\s+/).length <= 5) {
            hook = parsed.hook;
          }
          if (parsed.subtext && parsed.subtext.length <= 60) {
            caption = parsed.subtext;
          }
          if (parsed.cta && parsed.cta.length <= 25) {
            cta = parsed.cta;
          }
          console.log('[social-visual-generate] AI copywriting result:', { hook, caption, cta });
        } catch (parseErr) {
          console.warn('[social-visual-generate] Failed to parse copywriting JSON, using originals:', rawContent);
        }
      } else {
        console.warn('[social-visual-generate] Copywriting API returned', copyResponse.status, '— using originals');
      }
    } catch (copyErr) {
      console.warn('[social-visual-generate] Copywriting step failed, using originals:', copyErr);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 1 : TROUVER UNE VRAIE PHOTO SI DISPONIBLE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let realPhotoUrl: string | null = null;

    if (suggestion.realisation_id) {
      const { data: media } = await adminSupabase
        .from('realisation_media')
        .select('id, storage_path, media_role')
        .eq('realisation_id', suggestion.realisation_id)
        .order('media_role', { ascending: false })
        .limit(10);

      if (media && media.length > 0) {
        const afterMedia = media.find((m: any) => m.media_role === 'after');
        const bestMedia = afterMedia || media[0];

        if (bestMedia?.storage_path) {
          const { data: signedData } = await adminSupabase.storage
            .from('realisation-media')
            .createSignedUrl(bestMedia.storage_path, 600);
          
          if (signedData?.signedUrl) {
            realPhotoUrl = signedData.signedUrl;
            console.log('[social-visual-generate] Using real photo from realisation:', bestMedia.storage_path);
          }
        }
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 2 : GÉNÉRER L'IMAGE DE FOND (SANS TEXTE)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const AD_COMPOSITION_RULES = `
CRITICAL COMPOSITION RULES — THIS IMAGE IS A BACKGROUND FOR A SOCIAL MEDIA AD:

1. COMPOSITION: The main subject must be positioned in the UPPER 60% of the frame.
   Leave the BOTTOM 40% relatively dark or simple — text will be overlaid there.

2. NATURAL DARK ZONE: Create a natural gradient toward darker tones at the bottom
   (dark floor, shadow area, low-light zone). This is where ad text will appear.

3. NO TEXT: Absolutely ZERO text, letters, words, logos, watermarks, numbers on the image.

4. CONTRAST: High contrast between the subject and its environment. 
   Dramatic lighting preferred (side light, backlighting, spotlight effect).

5. EMOTIONAL IMPACT: The viewer must FEEL a problem or need within 1 second.

6. FORMAT: Square 1080x1080. Fill the entire frame edge to edge.

7. STYLE: Realistic professional photograph. NOT illustration, NOT 3D, NOT cartoon.

8. FORBIDDEN: emoji, clip art, gradients, banners, overlays, borders, logos, ANY text.
`;

    let bgMessages: any[];

    if (realPhotoUrl) {
      bgMessages = [{
        role: 'user',
        content: [
          { type: 'text', text: `Transform this real photo into a premium social media ad background (1080x1080 square).\n\n${AD_COMPOSITION_RULES}\n\nKeep the authentic feel. Apply cinematic color grade. Ensure bottom 40% naturally darkens. Full bleed, no borders.` },
          { type: 'image_url', image_url: { url: realPhotoUrl } },
        ],
      }];
    } else {
      const sceneDescription = visualPrompt ||
        `Professional French home ${getSceneForUniverse(universe)}, realistic close-up showing a real problem or urgent situation`;

      bgMessages = [{
        role: 'user',
        content: `Generate a REALISTIC PHOTOGRAPH designed as a SOCIAL MEDIA AD BACKGROUND (1080x1080 square).

SCENE TO PHOTOGRAPH:
${sceneDescription}

${AD_COMPOSITION_RULES}

ADDITIONAL REQUIREMENTS:
- This must look like a REAL PHOTOGRAPH taken on-site by a professional photographer
- Close-up framing on the problem (NOT the whole building/house)
- Dramatic natural lighting with a cinematic feel
- The bottom third should naturally be darker (floor, shadow, dark surface)
- High resolution feel, sharp details on the main subject`,
      }];
    }

    console.log('[social-visual-generate] Generating background image...');

    const bgResult = await callImageAIWithFallback(LOVABLE_API_KEY, bgMessages);

    if (!bgResult.ok) {
      if (bgResult.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA insuffisants.' }), { status: 402, headers: jsonHeaders });
      }
      return new Response(JSON.stringify({ error: bgResult.error || 'Erreur du service IA image' }), { status: bgResult.status || 502, headers: jsonHeaders });
    }

    const bgData = bgResult.data;
    const bgImageUrl = bgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!bgImageUrl || !bgImageUrl.startsWith('data:image')) {
      console.error('[social-visual-generate] No background image generated');
      return new Response(JSON.stringify({ error: "Aucune image de fond générée" }), { status: 502, headers: jsonHeaders });
    }

    console.log('[social-visual-generate] Background image generated via', bgResult.model, '. Saving raw background...');

    const backgroundSave = await persistAsset(
      adminSupabase,
      bgImageUrl,
      agencyId,
      suggestionId,
      universe,
      realPhotoUrl,
      'bg_only',
      jsonHeaders,
    );

    if ('response' in backgroundSave) {
      return backgroundSave.response;
    }

    console.log('[social-visual-generate] Raw background saved. Starting composition pass...');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 3 : COMPOSITION FINALE — SUPERPOSER TEXTE + BRANDING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ── Sanitizers STRICTS — verrouillés (5 mots/32 chars hook, 10 mots/60 chars sub, 25 chars CTA) ──
    const sanitizeHookForAI = (raw: string): string => {
      let t = raw.trim().replace(/[…\.]+$/, '').trim();
      const words = t.split(/\s+/);
      if (words.length > 5) t = words.slice(0, 5).join(' ');
      if (t.length > 32) {
        const cut = t.slice(0, 32);
        const ls = cut.lastIndexOf(' ');
        t = ls > 10 ? cut.slice(0, ls) : cut;
      }
      return t.replace(/[\s,;:]+$/, '').trim().toUpperCase();
    };

    const sanitizeSubForAI = (raw: string): string => {
      let t = raw.trim().replace(/[…]+$/, '').trim();
      const words = t.split(/\s+/);
      if (words.length > 10) {
        let cutText = words.slice(0, 10).join(' ');
        const sentenceEnd = cutText.match(/^(.+[.!?])\s/);
        if (sentenceEnd) { cutText = sentenceEnd[1]; }
        else { cutText = cutText.replace(/[\s,;:]+$/, '').trim(); if (!/[.!?]$/.test(cutText)) cutText += '.'; }
        t = cutText;
      }
      if (t.length > 60) {
        const cut = t.slice(0, 60);
        const ls = cut.lastIndexOf(' ');
        t = ls > 20 ? cut.slice(0, ls) : cut;
        t = t.replace(/[\s,;:]+$/, '').trim();
        if (!/[.!?]$/.test(t)) t += '.';
      }
      return t;
    };

    const hookText = sanitizeHookForAI(hook || title || 'Anticipez vos travaux');
    const subText = sanitizeSubForAI(caption || 'Un accompagnement simple pour votre habitat.');
    const ctaText = (cta || 'Demander un devis').toUpperCase().slice(0, 25);
    const generatedCopy = { hook: hookText, subtext: subText, cta: ctaText };

    const compositionPrompt = `You are a professional social media graphic designer. Take this background image and create a FINAL SOCIAL MEDIA AD CREATIVE (1080x1080) by adding the following text overlay elements.

MANDATORY TEXT ELEMENTS TO ADD ON THE IMAGE:

1. HOOK TEXT (MAIN MESSAGE — BIG, BOLD, HIGH CONTRAST):
   "${hookText}"
   - Position: LOWER area of the image — approximately Y=660 to Y=780 (bottom 35%)
   - NEVER in the middle of the image — must be LOW, just above the sub-text
   - Style: VERY LARGE white bold text (minimum 50px equivalent), ALL CAPS
   - Alignment: centered horizontally
   - Must have a dark semi-transparent backdrop/shadow for readability
   - Maximum 2 lines
   - CRITICAL: Write this text EXACTLY as provided, letter by letter

2. SUB-TEXT (Secondary message — CLEARLY READABLE):
   "${subText}"
   - Position: Just below the hook text, approximately Y=790 to Y=860
   - Style: White text, regular weight, MINIMUM 28px equivalent — must be EASILY READABLE on a phone screen
   - Alignment: centered horizontally under the hook
   - NOT tiny — this is important information that must be legible
   - Maximum 2 lines — the COMPLETE text must appear
   - CRITICAL: Write this text EXACTLY as provided. Do NOT truncate

3. CTA BUTTON:
   "${ctaText}"
   - Position: Below sub-text, approximately Y=870 to Y=930, HORIZONTALLY CENTERED
   - Style: Rounded button shape, bright orange (#FFB705) background, dark text
   - Bold, compact, must fit on ONE LINE — perfectly centered in the image width

4. FOOTER BAR:
   - Position: Very bottom of the image (last 90px, Y=940 to Y=1080)
   - Style: Solid blue bar (#0092DD) full width
   - Text: "HelpConfort — DEPAN40${agencyAddress ? ' — ' + agencyAddress : ''}" in white, left-aligned
   - Right side: "${serviceLabel}" in smaller white text
   - Thin orange (#FFB705) line at the top of the blue bar

5. UNIVERSE BADGE (top-right corner):
   - Small rounded pill/badge
   - Background color: ${color}
   - Text: "${serviceLabel}" in white, small font

6. LOGO (top-left corner) — STRICT RULE:
   - DO NOT create, draw, or invent any logo
   - Leave the top-left area EMPTY — the real logo is added later

DESIGN RULES:
- The background image must remain FULLY VISIBLE behind all overlays
- Use semi-transparent dark gradient ONLY in the bottom 40% for text readability
- All text must be PERFECTLY LEGIBLE at phone screen size
- NO extra decorative elements, badges, dates, or categories
- Keep the square 1080x1080 format
- ZONES MUST NOT OVERLAP

CRITICAL QUALITY CHECK:
✅ Hook text is EXACTLY as provided and centered
✅ Sub-text is COMPLETE, centered, and readable
✅ CTA button is CENTERED horizontally
✅ NO fake logo in top-left
✅ No elements overlap`;

    const compMessages = [{
      role: 'user',
      content: [
        { type: 'text', text: compositionPrompt },
        { type: 'image_url', image_url: { url: bgImageUrl } },
      ],
    }];

    const compResult = await callImageAIWithFallback(LOVABLE_API_KEY, compMessages);

    if (!compResult.ok) {
      console.warn('[social-visual-generate] Composition failed, returning raw background asset');
      return new Response(JSON.stringify({
        success: true,
        asset_id: backgroundSave.assetId,
        storage_path: backgroundSave.storagePath,
        signed_url: backgroundSave.signedUrl,
        mode: backgroundSave.mode,
        composition_mode: 'bg_only',
      }), { status: 200, headers: jsonHeaders });
    }

    const compData = compResult.data;
    const finalImageUrl = compData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!finalImageUrl || !finalImageUrl.startsWith('data:image')) {
      console.warn('[social-visual-generate] Composition pass returned no image, returning raw background asset');
      return new Response(JSON.stringify({
        success: true,
        asset_id: backgroundSave.assetId,
        storage_path: backgroundSave.storagePath,
        signed_url: backgroundSave.signedUrl,
        mode: backgroundSave.mode,
        composition_mode: 'bg_only',
      }), { status: 200, headers: jsonHeaders });
    }

    console.log('[social-visual-generate] Composition complete! Saving final creative...');

    const composedSave = await persistAsset(
      adminSupabase,
      finalImageUrl,
      agencyId,
      suggestionId,
      universe,
      realPhotoUrl,
      'composed',
      jsonHeaders,
    );

    if ('response' in composedSave) {
      return composedSave.response;
    }

    return new Response(JSON.stringify({
      success: true,
      asset_id: composedSave.assetId,
      storage_path: composedSave.storagePath,
      signed_url: composedSave.signedUrl,
      background_asset_id: backgroundSave.assetId,
      background_storage_path: backgroundSave.storagePath,
      background_signed_url: backgroundSave.signedUrl,
      mode: composedSave.mode,
      composition_mode: 'composed',
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    console.error('[social-visual-generate] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), { status: 500, headers: jsonHeaders });
  }
});

// ─── Save image to storage and return metadata ───────────────
async function persistAsset(
  adminSupabase: any,
  imageDataUrl: string,
  agencyId: string,
  suggestionId: string,
  universe: string,
  realPhotoUrl: string | null,
  compositionMode: 'composed' | 'bg_only',
  headers: Record<string, string>,
): Promise<
  | { assetId: string; storagePath: string; signedUrl: string | null; mode: 'photo' | 'generated' }
  | { response: Response }
> {
  const base64Data = imageDataUrl.split(',')[1];
  const binaryStr = atob(base64Data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const now = new Date();
  const year = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const timestamp = Math.floor(now.getTime() / 1000);
  const mode = realPhotoUrl ? 'photo' : 'generated';
  const filename = `${mode}-${compositionMode}-${timestamp}.png`;
  const storagePath = `${agencyId}/${year}/${monthStr}/${suggestionId}/${filename}`;

  const { error: uploadError } = await adminSupabase.storage
    .from('social-visuals')
    .upload(storagePath, bytes, { contentType: 'image/png', upsert: false });

  if (uploadError) {
    console.error('[social-visual-generate] Upload error:', uploadError);
    return { response: new Response(JSON.stringify({ error: 'Erreur upload: ' + uploadError.message }), { status: 500, headers }) };
  }

  const visualStrategy = realPhotoUrl ? 'photo_realisation' : 'illustration_generee';
  const { data: asset, error: insertError } = await adminSupabase
    .from('social_visual_assets')
    .insert({
      agency_id: agencyId,
      suggestion_id: suggestionId,
      variant_id: null,
      visual_type: visualStrategy,
      storage_path: storagePath,
      mime_type: 'image/png',
      width: 1080,
      height: 1080,
      theme_key: universe,
      generation_meta: {
        template_id: visualStrategy,
        platform: 'base',
        universe,
        generated_at: now.toISOString(),
        source: realPhotoUrl ? 'ai_photo_edit_v4' : 'ai_generated_v4',
        mode,
        composition_mode: compositionMode,
        prompt_version: compositionMode === 'bg_only' ? 'v4_background' : 'v4_composed',
      },
    })
    .select('id, storage_path, created_at')
    .single();

  if (insertError) {
    console.error('[social-visual-generate] Insert error:', insertError);
    return { response: new Response(JSON.stringify({ error: 'Erreur persistance asset' }), { status: 500, headers }) };
  }

  const { data: signedData } = await adminSupabase.storage
    .from('social-visuals')
    .createSignedUrl(storagePath, 3600);

  console.log('[social-visual-generate] Success:', asset.id, 'mode:', mode, 'composition:', compositionMode);

  return {
    assetId: asset.id,
    storagePath,
    signedUrl: signedData?.signedUrl || null,
    mode,
  };
}

// ─── Helpers ────────────────────────────────────────────────

function getSceneForUniverse(universe: string): string {
  const scenes: Record<string, string> = {
    plomberie: 'bathroom with visible water leak under sink, dripping pipes, water puddle on tile floor, urgency feeling, blue-tinted lighting',
    electricite: 'exposed electrical panel with sparking wires or burnt outlet, dangerous situation, warm orange dramatic lighting',
    serrurerie: 'front door with broken lock or someone locked out at night, residential entrance, security urgency, dark moody lighting',
    menuiserie: 'damaged wooden window frame or broken cabinet door, splintered wood, visible damage needing repair',
    vitrerie: 'cracked window glass in French apartment, broken pane with spider web crack pattern, cold light coming through',
    volets: 'stuck roller shutter on French building facade, half-open jammed shutter, visible mechanism problem',
    pmr: 'narrow bathroom with accessibility barriers, elderly person context, need for walk-in shower and grab bars',
    renovation: 'apartment mid-renovation with exposed walls, messy construction site needing professional finish',
    general: 'French home interior showing multiple maintenance issues, general repair needed atmosphere',
  };
  return scenes[universe] || scenes.general;
}
