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

    const aiPayload = (suggestion.ai_payload as Record<string, any>) || {};
    const universe = suggestion.universe || 'general';
    const color = SERVICE_COLORS[universe] || SERVICE_COLORS.general;
    const serviceLabel = SERVICE_LABELS[universe] || SERVICE_LABELS.general;
    const title = suggestion.title || '';
    const hook = aiPayload.hook || title;
    const cta = aiPayload.cta || 'Demandez un devis gratuit';
    const visualPrompt = aiPayload.visual_prompt || '';
    const topicType = suggestion.topic_type || 'seasonal_tip';
    const caption = suggestion.caption_base_fr || '';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), { status: 500, headers: jsonHeaders });
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

    const bgResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: bgMessages,
        modalities: ['image', 'text'],
      }),
    });

    if (!bgResponse.ok) {
      const errText = await bgResponse.text();
      console.error('[social-visual-generate] BG generation error:', bgResponse.status, errText);
      if (bgResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes IA, réessayez dans quelques minutes.' }), { status: 429, headers: jsonHeaders });
      }
      if (bgResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA insuffisants.' }), { status: 402, headers: jsonHeaders });
      }
      return new Response(JSON.stringify({ error: 'Erreur du service IA image' }), { status: 502, headers: jsonHeaders });
    }

    const bgData = await bgResponse.json();
    const bgImageUrl = bgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!bgImageUrl || !bgImageUrl.startsWith('data:image')) {
      console.error('[social-visual-generate] No background image generated');
      return new Response(JSON.stringify({ error: "Aucune image de fond générée" }), { status: 502, headers: jsonHeaders });
    }

    console.log('[social-visual-generate] Background image generated. Starting composition pass...');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 3 : COMPOSITION FINALE — SUPERPOSER TEXTE + BRANDING
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2e passe IA : on envoie l'image de fond + instructions de composition
    // pour que l'IA intègre le texte marketing directement dans l'image.

    const hookText = (hook || title || 'HelpConfort').toUpperCase().slice(0, 60);
    const subText = caption ? caption.slice(0, 90) : '';
    const ctaText = (cta || 'Demandez un devis gratuit').toUpperCase();

    const compositionPrompt = `You are a professional social media graphic designer. Take this background image and create a FINAL SOCIAL MEDIA AD CREATIVE (1080x1080) by adding the following text overlay elements.

MANDATORY TEXT ELEMENTS TO ADD ON THE IMAGE:

1. HOOK TEXT (MAIN MESSAGE — BIG, BOLD, HIGH CONTRAST):
   "${hookText}"
   - Position: Lower-center area of the image (bottom 40%)
   - Style: VERY LARGE white bold text, ALL CAPS
   - Must have a dark semi-transparent backdrop/shadow for readability
   - Maximum 2-3 lines
   - This is the MOST IMPORTANT element — must be instantly readable

2. SUB-TEXT (Secondary message — smaller):
   "${subText}"
   - Position: Just below the hook text
   - Style: Smaller white text, regular weight
   - 1-2 lines maximum
   - Semi-transparent white or light gray

3. CTA BUTTON:
   "${ctaText}"
   - Position: Bottom area, above the footer
   - Style: Rounded button shape, bright orange (#FFB705) background, dark text
   - Bold, compact, eye-catching

4. FOOTER BAR:
   - Position: Very bottom of the image (last 80-90px)
   - Style: Solid blue bar (#0092DD) full width
   - Text: "Help Confort — Dépannage & Travaux" in white, left-aligned
   - Right side: "${serviceLabel}" in smaller white text
   - Thin orange (#FFB705) line at the top of the blue bar

5. UNIVERSE BADGE (top-right corner):
   - Small rounded pill/badge
   - Background color: ${color}
   - Text: "${serviceLabel}" in white, small font

6. BRANDING (top-left):
   - Small white rounded rectangle with subtle shadow
   - Text "HC" or "Help Confort" logo placeholder in blue (#0092DD)
   - Keep it discreet, don't dominate

DESIGN RULES:
- The background image must remain FULLY VISIBLE behind all overlays
- Use semi-transparent dark gradients behind text areas for readability
- Text must be PERFECTLY LEGIBLE at phone screen size
- Color palette: White text, Blue #0092DD, Orange #FFB705, Dark gray #2F2F2F
- The result must look like a PROFESSIONAL social media advertisement
- NO extra decorative elements beyond what's specified
- Keep the square 1080x1080 format
- The final result must be IMMEDIATELY PUBLISHABLE on Facebook/Instagram

CRITICAL: The text must be correctly spelled and perfectly readable. This is a professional ad.`;

    const compResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: compositionPrompt },
            { type: 'image_url', image_url: { url: bgImageUrl } },
          ],
        }],
        modalities: ['image', 'text'],
      }),
    });

    if (!compResponse.ok) {
      const errText = await compResponse.text();
      console.error('[social-visual-generate] Composition error:', compResponse.status, errText);
      // Fallback: save the background image without composition
      console.warn('[social-visual-generate] Falling back to background-only image');
      return await saveAndReturn(adminSupabase, bgImageUrl, agencyId, suggestionId, universe, realPhotoUrl, 'bg_only', jsonHeaders);
    }

    const compData = await compResponse.json();
    const finalImageUrl = compData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!finalImageUrl || !finalImageUrl.startsWith('data:image')) {
      console.warn('[social-visual-generate] Composition pass returned no image, using background');
      return await saveAndReturn(adminSupabase, bgImageUrl, agencyId, suggestionId, universe, realPhotoUrl, 'bg_only', jsonHeaders);
    }

    console.log('[social-visual-generate] Composition complete! Saving final creative...');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 4 : SAUVEGARDER LE VISUEL FINAL COMPOSÉ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    return await saveAndReturn(adminSupabase, finalImageUrl, agencyId, suggestionId, universe, realPhotoUrl, 'composed', jsonHeaders);

  } catch (err) {
    console.error('[social-visual-generate] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), { status: 500, headers: jsonHeaders });
  }
});

// ─── Save image to storage and return response ─────────────
async function saveAndReturn(
  adminSupabase: any,
  imageDataUrl: string,
  agencyId: string,
  suggestionId: string,
  universe: string,
  realPhotoUrl: string | null,
  compositionMode: 'composed' | 'bg_only',
  headers: Record<string, string>,
) {
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
    return new Response(JSON.stringify({ error: 'Erreur upload: ' + uploadError.message }), { status: 500, headers });
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
        prompt_version: 'v4_composed',
      },
    })
    .select('id, storage_path, created_at')
    .single();

  if (insertError) {
    console.error('[social-visual-generate] Insert error:', insertError);
    return new Response(JSON.stringify({ error: 'Erreur persistance asset' }), { status: 500, headers });
  }

  const { data: signedData } = await adminSupabase.storage
    .from('social-visuals')
    .createSignedUrl(storagePath, 3600);

  console.log('[social-visual-generate] Success:', asset.id, 'mode:', mode, 'composition:', compositionMode);

  return new Response(JSON.stringify({
    success: true,
    asset_id: asset.id,
    storage_path: storagePath,
    signed_url: signedData?.signedUrl || null,
    mode,
    composition_mode: compositionMode,
  }), { status: 200, headers });
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
