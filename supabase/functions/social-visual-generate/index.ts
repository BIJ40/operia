/**
 * social-visual-generate — Génère un visuel IA pour un post social via Nano Banana.
 * 
 * Flux : auth → load suggestion + ai_payload → build prompt → call AI image → upload storage → persist asset → return URL.
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

    // Auth
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

    // Extract V5 visual data from ai_payload
    const aiPayload = (suggestion.ai_payload as Record<string, any>) || {};
    const visualPrompt = aiPayload.visual_prompt || '';
    const visualStrategy = aiPayload.visual_strategy || 'illustration_generee';
    const brandingGuidelines = aiPayload.branding_guidelines || '';
    const visualComposition = aiPayload.visual_composition || '';
    const hook = aiPayload.hook || suggestion.title;
    const cta = aiPayload.cta || '';

    const universe = suggestion.universe || 'general';
    const color = SERVICE_COLORS[universe] || SERVICE_COLORS.general;
    const serviceLabel = SERVICE_LABELS[universe] || SERVICE_LABELS.general;

    // Build the image generation prompt
    const imagePrompt = buildImagePrompt({
      title: suggestion.title,
      hook,
      cta,
      universe,
      color,
      serviceLabel,
      visualPrompt,
      visualStrategy,
      visualComposition,
      brandingGuidelines,
      topicType: suggestion.topic_type,
    });

    console.log('[social-visual-generate] Generating image for suggestion:', suggestionId);
    console.log('[social-visual-generate] Prompt:', imagePrompt.substring(0, 200) + '...');

    // Call AI image generation
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Service IA non configuré' }), { status: 500, headers: jsonHeaders });
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [{ role: 'user', content: imagePrompt }],
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
      return new Response(JSON.stringify({ error: 'Aucune image générée par l\'IA' }), { status: 502, headers: jsonHeaders });
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
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Math.floor(now.getTime() / 1000);
    const filename = `ai-visual-${timestamp}.png`;
    const storagePath = `${agencyId}/${year}/${month}/${suggestionId}/${filename}`;

    // Upload
    const { error: uploadError } = await adminSupabase.storage
      .from('social-visuals')
      .upload(storagePath, bytes, { contentType: 'image/png', upsert: false });

    if (uploadError) {
      console.error('[social-visual-generate] Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Erreur upload: ' + uploadError.message }), { status: 500, headers: jsonHeaders });
    }

    // Persist asset
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
          source: 'ai_nanobana_v1',
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

    console.log('[social-visual-generate] Success:', asset.id);

    return new Response(JSON.stringify({
      success: true,
      asset_id: asset.id,
      storage_path: storagePath,
      signed_url: signedData?.signedUrl || null,
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    console.error('[social-visual-generate] Unhandled error:', err);
    return new Response(JSON.stringify({ error: 'Erreur interne' }), { status: 500, headers: jsonHeaders });
  }
});

// ─── Prompt builder ─────────────────────────────────────────
function buildImagePrompt(params: {
  title: string;
  hook: string;
  cta: string;
  universe: string;
  color: string;
  serviceLabel: string;
  visualPrompt: string;
  visualStrategy: string;
  visualComposition: string;
  brandingGuidelines: string;
  topicType: string;
}): string {
  const {
    title, hook, cta, universe, color, serviceLabel,
    visualPrompt, visualComposition, brandingGuidelines, topicType,
  } = params;

  // Base visual description from AI payload or fallback
  const sceneDescription = visualPrompt ||
    `Professional French home repair scene related to ${serviceLabel.toLowerCase()}, modern interior, realistic lighting, clean environment`;

  // Topic-specific style guidance
  let styleGuidance = '';
  switch (topicType) {
    case 'realisation':
      styleGuidance = 'Style: before/after home repair showcase, professional result, clean finish, satisfaction visible';
      break;
    case 'seasonal_tip':
      styleGuidance = 'Style: educational infographic feel, clear visual hierarchy, helpful and approachable';
      break;
    case 'awareness_day':
      styleGuidance = 'Style: prevention/awareness poster, impactful, editorial feel, serious but accessible';
      break;
    case 'local_branding':
      styleGuidance = 'Style: brand confidence, local proximity, professional team, trustworthy';
      break;
    default:
      styleGuidance = 'Style: professional, modern, trustworthy';
  }

  return `Create a premium social media visual (1080x1080 pixels, square format) for a French home repair company called "Help Confort".

SCENE: ${sceneDescription}

TITLE TEXT ON IMAGE: "${title}"
${cta ? `CTA TEXT: "${cta}"` : ''}

BRAND REQUIREMENTS:
- Primary color: ${color} (${serviceLabel})
- Include "Help Confort" branding text at the bottom
- Clean, modern, mobile-readable design
- Professional typography hierarchy
- ${brandingGuidelines || `Use ${color} as accent color throughout`}

${visualComposition ? `COMPOSITION: ${visualComposition}` : 'COMPOSITION: Main visual centered, title at top or center with high contrast, branding bar at bottom'}

${styleGuidance}

CRITICAL RULES:
- Square 1080x1080 format
- Text must be legible on mobile
- Professional quality, NOT clip art or cartoon
- Realistic or editorial photography style
- French language for all text
- NO emojis in the visual
- Color scheme must use ${color} prominently
- Clean white or dark background sections for text readability`;
}
