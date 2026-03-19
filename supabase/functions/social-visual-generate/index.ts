/**
 * social-visual-generate — Génère un visuel IA pour un post social.
 * 
 * V2 : Priorité photos réelles des réalisations, fallback image IA.
 * Layout : image plein cadre + titre court + bandeau HelpConfort.
 * INTERDIT : fond dégradé seul, emoji, visuel sans image.
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
      // Get 'after' media first, fallback to any media
      const { data: media } = await adminSupabase
        .from('realisation_media')
        .select('id, storage_path, media_role')
        .eq('realisation_id', suggestion.realisation_id)
        .order('media_role', { ascending: false }) // 'after' comes first alphabetically reversed... let's filter
        .limit(10);

      if (media && media.length > 0) {
        // Prefer 'after' photo
        const afterMedia = media.find((m: any) => m.media_role === 'after');
        const bestMedia = afterMedia || media[0];

        if (bestMedia?.storage_path) {
          // Get signed URL from realisation-media bucket
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

    if (realPhotoUrl) {
      // ─── MODE 1: Edit real photo with branding overlay ───
      imagePrompt = `Take this real photo and create a premium social media visual (1080x1080 square).

LAYOUT (STRICT):
- The photo fills 75-80% of the canvas (top portion)
- Below the photo: a clean branded bar with "${serviceLabel}" service indicator
- At the very bottom: a solid ${color} branded banner with "Help Confort – Dépannage & Travaux" in white text
- Title overlay on the photo (top or center): "${truncateText(title, 50)}" in bold white text with dark shadow for readability

RULES:
- Keep the original photo as the HERO visual — it must dominate
- Title text: max 2 lines, large, bold, white with dark drop shadow
- Brand bar at bottom: solid ${color} background, white text "Help Confort"
- Clean, modern, professional
- Square 1080x1080
- NO emojis, NO clip art
- French text only`;

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: imagePrompt },
          { type: 'image_url', image_url: { url: realPhotoUrl } },
        ],
      });
    } else {
      // ─── MODE 2: Generate full image from scratch ───
      const sceneDescription = visualPrompt ||
        `Professional French home ${getSceneForUniverse(universe)}, modern interior, realistic natural lighting, clean and well-maintained environment`;

      imagePrompt = `Create a premium social media visual (1080x1080 square) for a French home repair company.

SCENE TO GENERATE:
${sceneDescription}

The image must look like a REAL PHOTOGRAPH — realistic, professional, high quality.

LAYOUT (STRICT):
- Generated photo fills 75-80% of the canvas (top portion) — this is a REAL scene, not an illustration
- Title overlay on the photo: "${truncateText(title, 50)}" in bold white text with dark shadow
- At the bottom: solid ${color} branded banner with "Help Confort – Dépannage & Travaux" in white text

COLOR SCHEME:
- Accent color: ${color} (${serviceLabel})
- Brand bar: solid ${color} background

RULES:
- MUST look like a real photograph, NOT a cartoon or illustration
- Title: max 2 lines, large bold white text with shadow
- Bottom brand bar: ${color} background, "Help Confort" in white
- Square 1080x1080
- Professional quality
- NO emojis, NO clip art, NO gradients as main visual
- NO empty backgrounds — there MUST be a realistic scene
- French text only`;

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
          source: realPhotoUrl ? 'ai_photo_edit_v2' : 'ai_generated_v2',
          mode,
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

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1).trim() + '…';
}

function getSceneForUniverse(universe: string): string {
  const scenes: Record<string, string> = {
    plomberie: 'repair scene showing modern bathroom or kitchen plumbing work, clean pipes, professional tools, blue accent tones',
    electricite: 'electrical work scene with modern electrical panel, clean wiring, professional electrician tools, warm orange lighting',
    serrurerie: 'door security installation, modern lock system, professional locksmith work, residential entrance',
    menuiserie: 'woodwork installation, custom carpentry, beautiful wooden finish, warm natural tones',
    vitrerie: 'window glass replacement or installation, clean transparent glass, modern French windows',
    volets: 'roller shutter installation on French building facade, modern motorized shutters',
    pmr: 'accessible bathroom renovation with walk-in shower, grab bars, accessibility features',
    renovation: 'home renovation in progress, modern French apartment transformation, clean construction site',
    general: 'professional home repair service, French residential interior, clean and organized workspace',
  };
  return scenes[universe] || scenes.general;
}
