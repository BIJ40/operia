/**
 * social-visual-generate — Génère un visuel IA pour un post social.
 * 
 * V3 : Génération d'images optimisées comme FOND DE CRÉA PUBLICITAIRE.
 * L'image est pensée pour recevoir un overlay texte (hook + CTA) côté client.
 * 
 * Composition : sujet centré/haut, zone sombre naturelle en bas pour texte.
 * INTERDIT : texte, logo, emoji, illustration, 3D, cartoon.
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
    const cta = aiPayload.cta || '';
    const visualPrompt = aiPayload.visual_prompt || '';
    const topicType = suggestion.topic_type || 'seasonal_tip';

    // ─── PRIORITY 1: Try to get real photo from realisation ───
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
          const bucket = 'realisation-media';
          const { data: signedData } = await adminSupabase.storage
            .from(bucket)
            .createSignedUrl(bestMedia.storage_path, 600);
          
          if (signedData?.signedUrl) {
            realPhotoUrl = signedData.signedUrl;
            console.log('[social-visual-generate] Using real photo from realisation:', bestMedia.storage_path);
          }
        }
      }
    }

    // ─── Build AI image prompt ───
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), { status: 500, headers: jsonHeaders });
    }

    let imagePrompt: string;
    const messages: any[] = [];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PROMPT V3 : IMAGE = FOND DE CRÉA PUBLICITAIRE
    // Le texte sera superposé côté client par le canvas engine.
    // L'image doit être COMPOSÉE pour recevoir du texte en bas.
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
   Close-up on the issue. Make it relatable to French homeowners.

6. FORMAT: Square 1080x1080. Fill the entire frame edge to edge.

7. STYLE: Realistic professional photograph. NOT illustration, NOT 3D, NOT cartoon.
   Think "stock photo for a premium ad campaign" but more authentic.

8. FORBIDDEN: emoji, clip art, gradients, banners, overlays, borders, logos, ANY text.
`;

    if (realPhotoUrl) {
      // ─── MODE 1: Edit real photo for ad background ───
      imagePrompt = `Transform this real photo into a premium social media ad background (1080x1080 square).

${AD_COMPOSITION_RULES}

SPECIFIC FOR THIS REAL PHOTO:
- Keep the authentic feel of the real work/repair shown
- Apply a cinematic color grade (slightly desaturated, high contrast)
- Ensure the bottom portion naturally darkens (vignette effect)
- Make the main subject POP with enhanced contrast
- The result must look like a professional "before/after" hero shot
- Full bleed, edge to edge, no borders`;

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: imagePrompt },
          { type: 'image_url', image_url: { url: realPhotoUrl } },
        ],
      });
    } else {
      // ─── MODE 2: Generate image from scratch as ad background ───
      const sceneDescription = visualPrompt ||
        `Professional French home ${getSceneForUniverse(universe)}, realistic close-up showing a real problem or urgent situation`;

      imagePrompt = `Generate a REALISTIC PHOTOGRAPH designed as a SOCIAL MEDIA AD BACKGROUND (1080x1080 square).

SCENE TO PHOTOGRAPH:
${sceneDescription}

${AD_COMPOSITION_RULES}

ADDITIONAL REQUIREMENTS:
- This must look like a REAL PHOTOGRAPH taken on-site by a professional photographer
- Close-up framing on the problem (NOT the whole building/house)
- Dramatic natural lighting with a cinematic feel
- The bottom third should naturally be darker (floor, shadow, dark surface)
- Color palette should feel warm and urgent for home repair context
- The viewer must immediately think "I need to fix this at home"
- High resolution feel, sharp details on the main subject`;

      messages.push({ role: 'user', content: imagePrompt });
    }

    console.log('[social-visual-generate] Mode:', realPhotoUrl ? 'REAL_PHOTO_EDIT' : 'AI_GENERATED');
    console.log('[social-visual-generate] Prompt preview:', imagePrompt.substring(0, 200) + '...');

    // Call AI image generation
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages,
        modalities: ['image', 'text'],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('[social-visual-generate] AI error:', aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Trop de requêtes IA, réessayez dans quelques minutes.' }), { status: 429, headers: jsonHeaders });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'Crédits IA insuffisants.' }), { status: 402, headers: jsonHeaders });
      }
      return new Response(JSON.stringify({ error: 'Erreur du service IA image' }), { status: 502, headers: jsonHeaders });
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl || !imageUrl.startsWith('data:image')) {
      console.error('[social-visual-generate] No image in AI response');
      return new Response(JSON.stringify({ error: "Aucune image générée par l'IA" }), { status: 502, headers: jsonHeaders });
    }

    // Convert base64 to Uint8Array
    const base64Data = imageUrl.split(',')[1];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Build storage path
    const now = new Date();
    const year = now.getFullYear();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Math.floor(now.getTime() / 1000);
    const mode = realPhotoUrl ? 'photo' : 'generated';
    const filename = `${mode}-${timestamp}.png`;
    const storagePath = `${agencyId}/${year}/${monthStr}/${suggestionId}/${filename}`;

    // Upload
    const { error: uploadError } = await adminSupabase.storage
      .from('social-visuals')
      .upload(storagePath, bytes, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      console.error('[social-visual-generate] Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Erreur upload: ' + uploadError.message }), { status: 500, headers: jsonHeaders });
    }

    // Persist asset
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
          source: realPhotoUrl ? 'ai_photo_edit_v3' : 'ai_generated_v3',
          mode,
          prompt_version: 'v3_ad_ready',
          prompt_used: imagePrompt.substring(0, 500),
        },
      })
      .select('id, storage_path, created_at')
      .single();

    if (insertError) {
      console.error('[social-visual-generate] Insert error:', insertError);
      return new Response(JSON.stringify({ error: 'Erreur persistance asset' }), { status: 500, headers: jsonHeaders });
    }

    // Generate signed URL for immediate display
    const { data: signedData } = await adminSupabase.storage
      .from('social-visuals')
      .createSignedUrl(storagePath, 3600);

    console.log('[social-visual-generate] Success:', asset.id, 'mode:', mode);

    return new Response(JSON.stringify({
      success: true,
      asset_id: asset.id,
      storage_path: storagePath,
      signed_url: signedData?.signedUrl || null,
      mode,
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    console.error('[social-visual-generate] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), { status: 500, headers: jsonHeaders });
  }
});

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
