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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

// Multiple van reference photos for better AI fidelity
const VAN_REFERENCE_URLS = [
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-reference.png`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref3.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref4.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref5.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref6.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref7.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref8.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref9.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref10.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref11.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref12.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref13.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref14.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/brand-assets/van-ref15.jpg`,
];
// Verify van reference URLs are accessible, return only valid ones (MAX 3 to avoid CPU timeout)
const MAX_VAN_REFS = 3;
async function getVerifiedVanReferenceUrls(): Promise<string[]> {
  const verified: string[] = [];
  for (const url of VAN_REFERENCE_URLS) {
    if (verified.length >= MAX_VAN_REFS) break;
    try {
      const resp = await fetch(url, { method: 'HEAD' });
      if (resp.ok) {
        // Prefer smaller images (< 500KB) to avoid CPU limits
        const size = parseInt(resp.headers.get('content-length') || '0', 10);
        if (size > 0 && size < 500_000) {
          verified.push(url);
        } else if (verified.length < 2) {
          // Accept larger ones only if we don't have enough small ones
          verified.push(url);
        }
      }
    } catch { /* skip unavailable */ }
  }
  console.log(`[social-visual-generate] Van references verified: ${verified.length}/${VAN_REFERENCE_URLS.length} (max ${MAX_VAN_REFS})`);
  return verified;
}

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
  general: 'Information',
};

const GENERAL_TOPIC_LABELS: Record<string, string> = {
  awareness_day: 'Sensibilisation',
  seasonal_tip: 'Conseil',
  realisation: 'Réalisation',
  local_branding: 'Votre agence',
  educational: 'Le saviez-vous ?',
};

// ─── Visual Style Modes (réaliste 80% / optimisé 10% / créatif 10%) ───
type VisualStyle = 'realiste' | 'optimise' | 'creatif';

function resolveVisualStyle(topicType: string): VisualStyle {
  const allowCreatif = topicType === 'contre_exemple' || topicType === 'pedagogique';
  const roll = Math.random() * 100;
  if (allowCreatif && roll >= 90) return 'creatif';
  if (roll >= 80) return 'optimise';
  return 'realiste';
}

const VISUAL_STYLE_DIRECTIVES: Record<VisualStyle, string> = {
  realiste: `STYLE VISUEL : RÉALISTE TERRAIN (mode dominant)
- Photo de chantier, maison, intervention RÉELLE
- Imperfections légères AUTORISÉES (poussière, câbles visibles, mur pas parfait)
- Lumière NATURELLE uniquement (fenêtre, extérieur, lampe de chantier)
- INTERDIT : éclairage studio, rendu glossy, perfection type catalogue IKEA
- INTERDIT : tuyauterie parfaite irréaliste, surfaces trop propres
- INTERDIT : rendu 3D, cinéma, publicité luxe
- Le visuel DOIT pouvoir être confondu avec une VRAIE photo d'intervention`,
  optimise: `STYLE VISUEL : RÉALISTE OPTIMISÉ (légèrement amélioré mais crédible)
- Scène propre et bien cadrée, lisible
- Éclairage naturel légèrement amélioré (pas studio)
- Installation nette, environnement rangé
- TOUJOURS PLAUSIBLE — un professionnel du métier doit trouver ça crédible
- Pas de rendu publicitaire luxe, pas de perfection artificielle`,
  creatif: `STYLE VISUEL : CRÉATIF ASSUMÉ (humour, décalé — volontairement irréel)
- Le côté irréel doit être ÉVIDENT et IMMÉDIAT (pas entre-deux)
- Exemples autorisés : robot plombier, super-héros dépannage, animal mascotte, scène humoristique
- Ton fun, mémorable, original
- RÈGLE CLÉ : si c'est irréel, ça doit être CLAIREMENT voulu et drôle
- JAMAIS de visuel "presque réel mais bizarre" — soit 100% réaliste, soit 100% décalé`,
};

// ─── Image generation via OpenAI DALL-E 3 ─────────────
import { callAiWithFallback, getAiKeys, type AiChatMessage } from '../_shared/aiClient.ts';

async function callImageAIWithFallback(
  _apiKey: string,
  messages: any[],
  preferredModel?: string,
): Promise<{ ok: true; data: any; model: string } | { ok: false; status: number; error: string }> {
  const { openaiKey } = getAiKeys();

  // Extract the text prompt and any input images from messages
  let prompt = '';
  const inputImages: string[] = [];
  
  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      prompt = msg.content;
    } else if (Array.isArray(msg.content)) {
      for (const part of msg.content) {
        if (part.type === 'text') prompt += (prompt ? '\n' : '') + part.text;
        if (part.type === 'image_url' && part.image_url?.url) {
          inputImages.push(part.image_url.url);
        }
      }
    }
  }

  const hasInputImages = inputImages.length > 0;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROUTE A: Input images present → Gemini FIRST (can process images natively)
  // DALL-E 3 CANNOT accept input images, so Gemini is the only option here
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (hasInputImages) {
    console.log(`[callImageAI] Has ${inputImages.length} input image(s) — using Gemini (native image input)`);
    
    const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
    if (geminiKey) {
      try {
        // Build Gemini parts with text + images
        const geminiParts: any[] = [{ text: prompt }];
        
        for (const imgUrl of inputImages) {
          if (imgUrl.startsWith('data:')) {
            // Base64 data URL → extract mime and data
            const match = imgUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              geminiParts.push({
                inlineData: { mimeType: match[1], data: match[2] },
              });
            }
          } else {
            // HTTP URL → fetch and convert to base64
            try {
              const imgResp = await fetch(imgUrl);
              if (imgResp.ok) {
                const imgBuf = await imgResp.arrayBuffer();
                const imgBytes = new Uint8Array(imgBuf);
                let binary = '';
                for (let i = 0; i < imgBytes.length; i++) {
                  binary += String.fromCharCode(imgBytes[i]);
                }
                const b64 = btoa(binary);
                const contentType = imgResp.headers.get('content-type') || 'image/jpeg';
                geminiParts.push({
                  inlineData: { mimeType: contentType, data: b64 },
                });
                console.log(`[callImageAI] Fetched reference image (${contentType}, ${Math.round(imgBuf.byteLength / 1024)}KB)`);
              } else {
                console.warn(`[callImageAI] Failed to fetch reference image: ${imgResp.status}`);
              }
            } catch (fetchErr) {
              console.warn(`[callImageAI] Error fetching reference image:`, fetchErr);
            }
          }
        }

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`;
        const geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: geminiParts }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }),
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          const parts = geminiData.candidates?.[0]?.content?.parts || [];
          const imagePart = parts.find((p: any) => p.inlineData);
          
          if (imagePart?.inlineData) {
            const mimeType = imagePart.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;
            console.log('[callImageAI] Gemini generated image with real photo references successfully');
            return {
              ok: true,
              data: {
                choices: [{
                  message: {
                    role: 'assistant',
                    content: '',
                    images: [{ type: 'image_url', image_url: { url: imageUrl } }],
                  },
                }],
              },
              model: 'gemini-imagen',
            };
          }
          console.warn('[callImageAI] Gemini returned OK but no image part');
        } else {
          const errText = await geminiResponse.text();
          console.error(`[callImageAI] Gemini with images failed (${geminiResponse.status}):`, errText.slice(0, 300));
        }
      } catch (err) {
        console.error('[callImageAI] Gemini with images error:', err);
      }
    } else {
      console.warn('[callImageAI] No GOOGLE_GEMINI_API_KEY — cannot process input images');
    }

    // Fallback for image inputs: use GPT-4o to analyze → DALL-E text-only generation
    console.log('[callImageAI] Gemini failed with images, falling back to GPT-4o analysis → DALL-E...');
    const analysisResult = await callAiWithFallback({
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `Analyze this/these image(s) and create a detailed prompt for DALL-E 3 to generate a social media ad background (1080x1080) inspired by these photos.

CRITICAL RULES:
- If a van/vehicle is shown: describe it as "a white Renault Master van with a blue diagonal wave/swoosh graphic covering the lower half of each side, small colorful circular service icons on the side panel, roof rack with ladders on top"
- Keep the scene REALISTIC and GROUNDED — like a real photo from a French residential street
- NOT futuristic, NOT corporate, NOT conference room, NOT high-tech
- Natural daylight, French residential neighborhood setting
- Make the bottom 40% darker for text overlay
- Reply with ONLY the DALL-E prompt text, nothing else. Max 900 characters.` },
          ...inputImages.map(url => ({ type: 'image_url', image_url: { url } })),
        ] as any,
      }],
      model: 'gpt-4o',
      max_tokens: 500,
    });

    if (analysisResult.ok) {
      const dallePrompt = analysisResult.data.choices?.[0]?.message?.content || prompt;
      prompt = dallePrompt.slice(0, 950);
      console.log(`[callImageAI] GPT-4o generated DALL-E prompt: ${prompt.slice(0, 150)}...`);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ROUTE B: No input images (or Gemini failed above) → DALL-E 3 primary
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  // Truncate prompt for DALL-E 3 (max 4000 chars)
  if (prompt.length > 3900) {
    prompt = prompt.slice(0, 3900);
  }

  console.log(`[callImageAI] Generating image via DALL-E 3 (text-only)...`);
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[callImageAI] DALL-E 3 error (${response.status}):`, errText.slice(0, 300));
    } else {
      const data = await response.json();
      const b64 = data.data?.[0]?.b64_json;
      
      if (b64) {
        const imageUrl = `data:image/png;base64,${b64}`;
        console.log(`[callImageAI] DALL-E 3 image generated successfully`);
        return {
          ok: true,
          data: {
            choices: [{
              message: {
                role: 'assistant',
                content: data.data?.[0]?.revised_prompt || '',
                images: [{ type: 'image_url', image_url: { url: imageUrl } }],
              },
            }],
          },
          model: 'dall-e-3',
        };
      }
      console.error('[callImageAI] DALL-E 3 returned no image data');
    }
  } catch (err) {
    console.error('[callImageAI] DALL-E 3 fetch error:', err);
  }

  // ─── Fallback: Gemini Imagen (text-only) ───
  const geminiKey = Deno.env.get('GOOGLE_GEMINI_API_KEY');
  if (geminiKey) {
    console.log('[callImageAI] DALL-E failed, falling back to Gemini Imagen (text-only)...');
    await new Promise(r => setTimeout(r, 500));
    try {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        }),
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json();
        const parts = geminiData.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find((p: any) => p.inlineData);
        
        if (imagePart?.inlineData) {
          const mimeType = imagePart.inlineData.mimeType || 'image/png';
          const imageUrl = `data:${mimeType};base64,${imagePart.inlineData.data}`;
          console.log('[callImageAI] Gemini text-only image generated successfully');
          return {
            ok: true,
            data: {
              choices: [{
                message: {
                  role: 'assistant',
                  content: '',
                  images: [{ type: 'image_url', image_url: { url: imageUrl } }],
                },
              }],
            },
            model: 'gemini-imagen',
          };
        }
      }
      const errText = await geminiResponse.text();
      console.error(`[callImageAI] Gemini Imagen failed (${geminiResponse.status}):`, errText.slice(0, 300));
    } catch (err) {
      console.error('[callImageAI] Gemini Imagen fetch error:', err);
    }
  }

  return { ok: false, status: 502, error: 'All image providers failed (DALL-E 3, Gemini)' };
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
    const visualCustomization = body.visual_customization as {
      freePrompt?: string;
      keywords?: string;
      includeVan?: boolean;
      universeOverride?: string;
      tone?: string;
      audience?: string;
      imageModel?: string;
    } | undefined;

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

    // Prefer "Landes & Pays Basque" as agency address, fallback to short city name if space is tight
    const agencyAddress = 'Landes & Pays Basque';

    const aiPayload = (suggestion.ai_payload as Record<string, any>) || {};
    const universe = (visualCustomization?.universeOverride && visualCustomization.universeOverride !== '__auto')
      ? visualCustomization.universeOverride
      : (suggestion.universe || 'general');
    const color = SERVICE_COLORS[universe] || SERVICE_COLORS.general;
    const topicType = suggestion.topic_type || 'seasonal_tip';
    const serviceLabel = universe === 'general'
      ? (GENERAL_TOPIC_LABELS[topicType] || SERVICE_LABELS.general)
      : (SERVICE_LABELS[universe] || SERVICE_LABELS.general);
    console.log(`[social-visual-generate] Universe: ${universe} (override: ${visualCustomization?.universeOverride || 'none'})`);
    const title = suggestion.title || '';
    const rawHook = aiPayload.hook || title;
    const rawCta = aiPayload.cta || 'Demandez un devis gratuit';
    const visualPrompt = aiPayload.visual_prompt || '';
    const rawCaption = suggestion.caption_base_fr || '';

    // ── Resolve visual style mode (80% réaliste / 10% optimisé / 10% créatif) ──
    const visualStyle: VisualStyle = resolveVisualStyle(topicType);
    const visualStyleDirective = VISUAL_STYLE_DIRECTIVES[visualStyle];
    console.log(`[social-visual-generate] Visual style: ${visualStyle} (topic: ${topicType})`);

    // Validate AI keys are available
    let AI_KEYS_VALID = true;
    try { getAiKeys(); } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: jsonHeaders });
    }
    const LOVABLE_API_KEY = 'unused'; // kept for callImageAIWithFallback signature compat

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 0 : COPYWRITING IA — Réécriture cohérente du hook/sous-texte
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    let hook = rawHook;
    let caption = rawCaption;
    let cta = rawCta;

    try {
      console.log('[social-visual-generate] Generating coherent marketing copy...');
      const copywritingPrompt = `Tu es un copywriter publicitaire spécialisé pour une entreprise française de dépannage à domicile appelée Help Confort.

Contexte :
- Univers : ${serviceLabel}
- Titre original : "${title}"
- Hook original : "${rawHook}"
- Sous-texte original : "${rawCaption}"
- CTA original : "${rawCta}"
- Type de post : ${topicType}${visualCustomization?.freePrompt ? `\n- DIRECTIVE UTILISATEUR (prioritaire) : "${visualCustomization.freePrompt}"` : ''}${visualCustomization?.keywords ? `\n- Mots-clés imposés : ${visualCustomization.keywords}` : ''}

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
- DOIT être une phrase française grammaticalement PARFAITE et naturelle avec un point final
- Un francophone natif doit pouvoir la lire sans tiquer
- doit compléter le hook de façon logique et claire
- INTERDIT : juxtaposition de mots-clés sans verbe (ex: "Simplifiez votre chauffe-eau remplacement" est INVALIDE)
- INTERDIT : phrases tronquées, boiteuses ou incompréhensibles
- jamais de date, jamais d'événement calendaire inutile
- Exemples VALIDES : "Remplacez votre chauffe-eau en urgence.", "Votre installation mérite un technicien qualifié.", "On intervient même le week-end."
- Exemples INVALIDES : "Simplifiez votre remplacement en urgence", "Chauffe-eau problème résolu vite"

3. CTA :
- 2 à 4 mots maximum
- 22 caractères maximum
- action claire et GÉNÉRIQUE (jamais de nom de ville, jamais de localisation)
- exemples autorisés : "Prendre RDV", "En savoir plus", "Nous contacter", "Demander un devis"
- INTERDIT : "À Dax", "À DAX", "Sur Bayonne", ou toute mention géographique

Réponds UNIQUEMENT en JSON valide avec exactement ces clés :
{"hook":"...","subtext":"...","cta":"..."}`;

      const copyResult = await callAiWithFallback({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: copywritingPrompt }],
        response_format: { type: 'json_object' },
      });

      if (copyResult.ok) {
        const rawContent = copyResult.data.choices?.[0]?.message?.content || '';
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
    // ÉTAPE 1 : TROUVER LES VRAIES PHOTOS (avant/après) SI DISPONIBLE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let realPhotoUrl: string | null = null;
    let beforePhotoUrl: string | null = null;
    let afterPhotoUrl: string | null = null;
    let hasBeforeAfter = false;

    if (suggestion.realisation_id) {
      const { data: media } = await adminSupabase
        .from('realisation_media')
        .select('id, storage_path, media_role')
        .eq('realisation_id', suggestion.realisation_id)
        .order('media_role', { ascending: false })
        .limit(10);

      if (media && media.length > 0) {
        const beforeMedia = media.find((m: any) => m.media_role === 'before');
        const afterMedia = media.find((m: any) => m.media_role === 'after');
        
        // Fetch before photo signed URL
        if (beforeMedia?.storage_path) {
          const { data: signedData } = await adminSupabase.storage
            .from('realisation-media')
            .createSignedUrl(beforeMedia.storage_path, 600);
          if (signedData?.signedUrl) {
            beforePhotoUrl = signedData.signedUrl;
            console.log('[social-visual-generate] Before photo found:', beforeMedia.storage_path);
          }
        }

        // Fetch after photo signed URL
        if (afterMedia?.storage_path) {
          const { data: signedData } = await adminSupabase.storage
            .from('realisation-media')
            .createSignedUrl(afterMedia.storage_path, 600);
          if (signedData?.signedUrl) {
            afterPhotoUrl = signedData.signedUrl;
            console.log('[social-visual-generate] After photo found:', afterMedia.storage_path);
          }
        }

        hasBeforeAfter = !!(beforePhotoUrl && afterPhotoUrl);

        // Use the best available photo as the main real photo
        const bestMedia = afterMedia || media[0];
        if (bestMedia?.storage_path) {
          const { data: signedData } = await adminSupabase.storage
            .from('realisation-media')
            .createSignedUrl(bestMedia.storage_path, 600);
          if (signedData?.signedUrl) {
            realPhotoUrl = signedData.signedUrl;
            console.log('[social-visual-generate] Main real photo:', bestMedia.storage_path);
          }
        }
      }

      // RULE: For preuve/realisation posts, REFUSE to generate without real photos
      if (!realPhotoUrl) {
        console.error('[social-visual-generate] Preuve post with realisation_id but no photos found');
        return new Response(JSON.stringify({ 
          error: 'Aucune photo trouvée pour cette réalisation. Ajoutez des photos dans le module Réalisations avant de générer le visuel.' 
        }), { status: 400, headers: jsonHeaders });
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ÉTAPE 2 : GÉNÉRER L'IMAGE DE FOND (SANS TEXTE)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const HELPCONFORT_VISUAL_IDENTITY = `COMPANY VISUAL IDENTITY (Help Confort — French home maintenance company):
- VEHICLES: White Renault Master van. The van has a DISTINCTIVE blue diagonal wave/swoosh graphic covering the lower half of each side (gradient from sky blue to deep navy). On the side panels there are 6 small colorful circular service icons arranged in a grid. There is a roof rack with ladders on top. The van is CLEAN and WHITE with ONLY the blue wave pattern — no other color or stripe.
- IMPORTANT: When the van appears, it must be CLEARLY a white Renault Master with the blue wave — NOT a generic white van, NOT a Ford Transit. The wave pattern is diagonal, starting from the front wheel area going up toward the rear top. Do NOT invent additional graphics.
- TECHNICIAN UNIFORMS: Blue polo shirt or blue work jacket, dark pants, professional and clean appearance. Technicians may carry toolboxes or equipment.
- COLOR PALETTE: Dominant blue (#0092DD) and white, with touches of orange (#FFB705) on accessories or details.`;

    const AD_COMPOSITION_RULES = `
CRITICAL COMPOSITION RULES — THIS IMAGE IS A BACKGROUND FOR A SOCIAL MEDIA AD:

1. COMPOSITION: The main subject must be positioned in the UPPER 60% of the frame.
   Leave the BOTTOM 40% relatively dark or simple — text will be overlaid there.

2. NATURAL DARK ZONE: Create a natural gradient toward darker tones at the bottom
   (dark floor, shadow area, low-light zone). This is where ad text will appear.

3. NO TEXT OR LOGOS: Absolutely ZERO text, letters, words, logos, watermarks, or numbers anywhere on the image. No brand names. The blue wave graphic on the van is a PATTERN, not text — that is allowed. But no written words at all.

4. CONTRAST: High contrast between the subject and its environment. 
   Dramatic lighting preferred (side light, backlighting, spotlight effect).

5. EMOTIONAL IMPACT: The viewer must FEEL a problem or need within 1 second.

6. FORMAT: Square 1080x1080. Fill the entire frame edge to edge.

7. STYLE: ${visualStyle === 'creatif' ? 'Creative/humorous — intentionally unrealistic, fun, memorable.' : 'Realistic professional photograph. NOT illustration, NOT 3D, NOT cartoon.'}

8. FORBIDDEN: emoji, clip art, gradients as backgrounds, banners, overlays, borders, any written text.

9. ${HELPCONFORT_VISUAL_IDENTITY}

10. ${visualStyleDirective}
`;

    let bgMessages: any[];

    if (hasBeforeAfter && beforePhotoUrl && afterPhotoUrl) {
      // BEFORE/AFTER LAYOUT: Use both real photos side by side
      console.log('[social-visual-generate] Using BEFORE/AFTER layout with real photos');
      bgMessages = [{
        role: 'user',
        content: [
          { type: 'text', text: `Create a professional BEFORE/AFTER comparison for a social media ad (1080x1080 square).

INSTRUCTIONS:
- Place the BEFORE photo on the LEFT half and the AFTER photo on the RIGHT half
- Add a subtle vertical divider between them
- Add "AVANT" label on the left side and "APRÈS" label on the right side (small, discrete, white text with shadow)
- Apply professional color grading to both images for consistency
- The bottom 30% should naturally darken for text overlay
- Keep the authentic feel of both photos — these are REAL intervention photos
- NO other text, NO logos, NO watermarks
- Square format 1080x1080, edge to edge

${HELPCONFORT_VISUAL_IDENTITY}` },
          { type: 'image_url', image_url: { url: beforePhotoUrl } },
          { type: 'image_url', image_url: { url: afterPhotoUrl } },
        ],
      }];
    } else if (realPhotoUrl) {
      bgMessages = [{
        role: 'user',
        content: [
          { type: 'text', text: `Transform this real intervention photo into a premium social media ad background (1080x1080 square).\n\n${AD_COMPOSITION_RULES}\n\nThis is a REAL photo from an actual intervention — keep the authentic feel. Apply cinematic color grade. Ensure bottom 40% naturally darkens. Full bleed, no borders.` },
          { type: 'image_url', image_url: { url: realPhotoUrl } },
        ],
      }];
    } else {
      // USER CUSTOMIZATION OVERRIDES: if the user provided a visual directive, it takes priority
      const userDirective = visualCustomization?.freePrompt || '';
      const userKeywords = visualCustomization?.keywords || '';
      const customOverride = userDirective
        ? `USER DIRECTIVE (HIGHEST PRIORITY — override all defaults): ${userDirective}${userKeywords ? `. Visual keywords: ${userKeywords}` : ''}`
        : '';

      // For prospection posts, use dedicated scene descriptions
      const prospectionSubType = (aiPayload as any)?.prospection_subtype || '';
      const isProspection = topicType === 'prospection';
      
      const baseScene = userDirective
        ? userDirective
        : visualStyle === 'creatif'
          ? `Creative, humorous, intentionally unrealistic scene related to ${getSceneForUniverse(universe)}. Fun, memorable, clearly fictional (e.g. cartoon mascot, superhero technician, robot plumber). Must be OBVIOUSLY fantasy.`
          : isProspection
            ? getSceneForProspection(topicType, prospectionSubType)
            : (visualPrompt || `Professional French home ${getSceneForUniverse(universe)}, realistic close-up showing a real problem or urgent situation`);
      
      const sceneDescription = customOverride
        ? `${baseScene}\n\n${customOverride}`
        : baseScene;

      console.log('[social-visual-generate] Scene description:', sceneDescription.slice(0, 200));

      // Include the real van ONLY when explicitly requested by the user
      const sceneHasVan = visualCustomization?.includeVan === true;

      if (sceneHasVan) {
        // RULE: Never generate a van without verified reference photos
        const refUrls = await getVerifiedVanReferenceUrls();
        
        if (refUrls.length === 0) {
          // No reference photos accessible — generate scene WITHOUT van
          console.warn('[social-visual-generate] No van reference photos accessible — generating without van');
          const noVanScene = sceneDescription
            .replace(/van|transit|renault master|utilitaire/gi, '')
            .replace(/parked|garé/gi, '')
            + '. Do NOT include any vehicle, van, truck or car in this image.';
          bgMessages = [{
            role: 'user',
            content: `Generate a REALISTIC PHOTOGRAPH designed as a SOCIAL MEDIA AD BACKGROUND (1080x1080 square).

SCENE TO PHOTOGRAPH:
${noVanScene}

${AD_COMPOSITION_RULES}

IMPORTANT: Do NOT generate any vehicle, van, truck, or car in this image. Focus only on the technician and the work scene.

ADDITIONAL REQUIREMENTS:
- This must look like a REAL PHOTOGRAPH taken on-site by a professional photographer
- Close-up framing on the problem (NOT the whole building/house)
- Dramatic natural lighting with a cinematic feel
- The bottom third should naturally be darker (floor, shadow, dark surface)
- High resolution feel, sharp details on the main subject`,
          }];
        } else {
          // Use the real van photos — integrate them AS-IS into the scene
          bgMessages = [{
            role: 'user',
            content: [
              { 
                type: 'text', 
                text: `Generate a REALISTIC PHOTOGRAPH designed as a SOCIAL MEDIA AD BACKGROUND (1080x1080 square).

ATTACHED VAN PHOTOS: These are REAL photographs of the company van. You MUST integrate this EXACT van into the generated scene — do NOT redesign, recolor, or reimagine it. The van must appear as a faithful reproduction of these reference photos, as if photographed on location.

KEY VAN DETAILS TO PRESERVE EXACTLY:
- White Renault Master body (NOT Ford Transit)
- Blue diagonal wave/swoosh pattern on the sides
- Small colorful circular service icons on the side panel
- Roof rack with ladders
- The van is WHITE with ONLY the blue wave — no other colors

SCENE TO COMPOSE:
${sceneDescription}

The van should be visible in the background or side of the scene, naturally integrated as if parked nearby during an intervention. The main subject (technician, problem, work scene) stays in the foreground.

${AD_COMPOSITION_RULES}

ADDITIONAL REQUIREMENTS:
- The van must look EXACTLY like the reference photos — same colors, same wave pattern, same proportions
- Natural integration: the van is part of the scene, not pasted on top
- Professional on-location photography feel
- Do NOT add any text, logos, or words to the image`
              },
              ...refUrls.map(url => ({ type: 'image_url' as const, image_url: { url } })),
            ],
          }];
        }
      } else {
        bgMessages = [{
          role: 'user',
          content: `Generate a REALISTIC PHOTOGRAPH designed as a SOCIAL MEDIA AD BACKGROUND (1080x1080 square).

SCENE TO PHOTOGRAPH:
${sceneDescription}

${AD_COMPOSITION_RULES}

IMPORTANT: Do NOT generate any vehicle, van, truck, or car in this image. No vehicles at all.

ADDITIONAL REQUIREMENTS:
- This must look like a REAL PHOTOGRAPH taken on-site by a professional photographer
- Close-up framing on the problem (NOT the whole building/house)
- Dramatic natural lighting with a cinematic feel
- The bottom third should naturally be darker (floor, shadow, dark surface)
- High resolution feel, sharp details on the main subject`,
        }];
      }
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
    let bgImageUrl = bgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Sometimes the model returns OK but no image — retry once with a simpler prompt
    if (!bgImageUrl || !bgImageUrl.startsWith('data:image')) {
      console.warn('[social-visual-generate] Model returned OK but no image. Response keys:', JSON.stringify(Object.keys(bgData?.choices?.[0]?.message || {})));
      console.warn('[social-visual-generate] Retrying with simplified prompt...');
      
      const retryMessages = [{
        role: 'user',
        content: `Generate a realistic photograph for a social media ad (1080x1080 square). Scene: ${getSceneForUniverse(universe)}. Professional photography, cinematic lighting, bottom third darker. No text, no logos, no watermarks.`,
      }];
      
      const retryResult = await callImageAIWithFallback(LOVABLE_API_KEY, retryMessages);
      if (retryResult.ok) {
        bgImageUrl = retryResult.data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      }
    }

    if (!bgImageUrl || !bgImageUrl.startsWith('data:image')) {
      console.error('[social-visual-generate] No background image generated after retry');
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
      undefined,
      hasBeforeAfter,
      visualStyle,
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
   - Position: LOWER area of the image — approximately Y=580 to Y=700
   - Style: VERY LARGE white bold text (minimum 50px equivalent), ALL CAPS
   - Alignment: centered horizontally
   - Must have a dark semi-transparent backdrop/shadow for readability
   - Maximum 2 lines
   - CRITICAL: Write this text EXACTLY as provided, letter by letter

2. SUB-TEXT (Secondary message — CLEARLY READABLE):
   "${subText}"
   - Position: Just below the hook text, approximately Y=710 to Y=770
   - Style: White text, regular weight, MINIMUM 28px equivalent
   - Alignment: centered horizontally under the hook
   - Maximum 2 lines — the COMPLETE text must appear
   - CRITICAL: Write this text EXACTLY as provided. Do NOT truncate

3. CTA BUTTON:
   "${ctaText}"
   - Position: Below sub-text, approximately Y=780 to Y=840, HORIZONTALLY CENTERED
   - Style: Rounded button shape, bright orange (#FFB705) background, dark text
   - Bold, compact, must fit on ONE LINE

4. FOOTER BAR — ABSOLUTELY CRITICAL, NON-NEGOTIABLE:
   - Position: Very bottom of the image (last 120px, Y=960 to Y=1080)
   - Style: Solid opaque blue rectangle (#0092DD) spanning FULL WIDTH, with thin orange (#FFB705) line at the top edge
   - The footer contains EXACTLY 2 lines of WHITE text:
   
   LINE 1 (bold, 22px+, left-aligned at x=30):
   "HelpConfort — DEPAN40 — Landes & Pays Basque"
   Right side: "${serviceLabel}" in smaller white text
   
   LINE 2 (regular, 18px+, left-aligned at x=30):
   "📞 05 58 35 21 38  ·  ✉ dax@helpconfort.com  ·  🌐 www.helpconfort-40.fr"
   
   ⚠️ THIS LINE 2 IS THE MOST IMPORTANT ELEMENT OF THE ENTIRE IMAGE.
   The phone number, email, and website MUST be clearly readable.
   If they are missing or unreadable, the entire image is REJECTED.

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
- ZONES MUST NOT OVERLAP — CTA must be ABOVE the footer bar

MANDATORY QUALITY CHECKLIST (if ANY fails, regenerate):
✅ Hook text is EXACTLY as provided, centered, readable
✅ Sub-text is COMPLETE and readable
✅ CTA button is centered and ABOVE the footer
✅ Footer blue bar is SOLID OPAQUE BLUE, full width, at very bottom
✅ Footer line 1 shows "HelpConfort — DEPAN40 — Landes & Pays Basque"
✅ Footer line 2 shows "05 58 35 21 38" AND "dax@helpconfort.com" AND "www.helpconfort-40.fr"
✅ ALL contact info is CLEARLY READABLE — not tiny, not blurred, not cut off
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
      generatedCopy,
      hasBeforeAfter,
      visualStyle,
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
  generatedCopy?: { hook: string; subtext: string; cta: string },
  hasBeforeAfter: boolean = false,
  visualStyle: string = 'realiste',
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

  const visualStrategy = hasBeforeAfter ? 'avant_apres_reel' : realPhotoUrl ? 'photo_realisation' : 'illustration_generee';
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
        source: realPhotoUrl ? 'ai_photo_edit_v5' : 'ai_generated_v5',
        mode,
        composition_mode: compositionMode,
        prompt_version: compositionMode === 'bg_only' ? 'v5_background' : 'v5_composed',
        generated_copy: generatedCopy ?? null,
        visual_style: visualStyle,
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
    plomberie: 'A technician in a blue polo shirt kneeling under a kitchen sink fixing a water leak, toolbox open nearby, water puddle on tile floor, urgency feeling, blue-tinted lighting, realistic French apartment interior',
    electricite: 'A technician in a blue work jacket inspecting an electrical panel with a flashlight, professional tools visible, warm orange dramatic lighting, French residential electrical closet',
    serrurerie: 'A technician in blue uniform working on a front door lock at night, professional locksmith tools laid out, security urgency, dark moody cinematic lighting, French apartment building entrance',
    menuiserie: 'A technician in blue polo measuring a damaged wooden window frame, professional carpentry tools, visible damage needing repair, French building facade',
    vitrerie: 'cracked window glass in French apartment, broken pane with spider web crack pattern, cold light coming through, a technician in blue uniform assessing the damage',
    volets: 'A technician in blue uniform repairing a stuck roller shutter on a French building facade, tools and ladder visible, natural daylight',
    pmr: 'A technician in blue polo shirt installing grab bars in a bathroom for accessibility, elderly-friendly renovation context, professional and caring atmosphere',
    renovation: 'Two technicians in blue uniforms working in an apartment mid-renovation, professional tools and equipment, bright natural light from windows',
    general: 'A white Renault Master van with a large blue diagonal wave/swoosh design on the sides parked in front of a typical French residential home, roof rack with ladders, professional home service atmosphere, clean and trustworthy, a technician in blue polo shirt walking toward the house carrying a toolbox',
  };
  return scenes[universe] || scenes.general;
}

function getSceneForProspection(topicType: string, subType?: string): string {
  const prospectionScenes: Record<string, string> = {
    'zone_intervention': 'Aerial photograph of a small French town in the Landes region (southwestern France), terracotta rooftops, pine forests in the background, sunny day, warm natural light, a white Renault Master van with blue wave graphics parked on a residential street below',
    'panorama_metiers': 'Wide shot of a French home maintenance workshop with organized tool walls — plumbing wrenches, electrical testers, locksmith picks, carpentry tools — all neatly arranged, professional and diverse, natural warehouse lighting, clean workspace',
    'partenaires': 'Two professionals shaking hands in front of a French real estate agency or insurance office, one in a blue polo shirt (technician), the other in business attire, warm natural light, trust and partnership atmosphere',
    'presentation_equipe': 'Group photo of 4-5 home maintenance technicians in matching blue polo shirts standing together in front of a white Renault Master van, smiling, professional but approachable, French residential street background, natural daylight',
    'engagement_valeurs': 'Close-up of a technician in a blue polo shirt carefully putting on shoe covers before entering a French home, showing respect and cleanliness, warm interior lighting, homeowner smiling in the background',
    'commercial_creatif': 'A technician in blue polo shirt handing over keys to a smiling homeowner at their front door, completed work visible behind (new lock, repaired item), satisfaction moment, warm golden hour lighting',
  };
  return prospectionScenes[subType || ''] || prospectionScenes['presentation_equipe'];
}
