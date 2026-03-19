import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * dispatch-social-webhook — Envoie un post social approuvé vers le webhook externe.
 *
 * Label : PUBLI
 * Payload : visuel (URL signée) + caption + hashtags + hook + CTA + variantes + métadonnées.
 * Utilise le même CONTENT_WEBHOOK_URL / WEBHOOK_SECRET que dispatch-realisation-webhook.
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return json({ error: 'Unauthorized' }, 401)
  }

  try {
    const { suggestion_id, agency_id } = await req.json()
    if (!suggestion_id || !agency_id) {
      return json({ error: 'suggestion_id et agency_id requis' }, 400)
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ─── 1. Fetch suggestion ───
    const { data: suggestion, error: sugErr } = await adminClient
      .from('social_content_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .eq('agency_id', agency_id)
      .single()

    if (sugErr || !suggestion) {
      return json({ error: 'Suggestion non trouvée' }, 404)
    }

    // ─── 2. Fetch variants ───
    const { data: variants } = await adminClient
      .from('social_post_variants')
      .select('*')
      .eq('suggestion_id', suggestion_id)
      .neq('status', 'archived')

    // ─── 3. Fetch latest visual asset ───
    const { data: assets } = await adminClient
      .from('social_visual_assets')
      .select('*')
      .eq('suggestion_id', suggestion_id)
      .eq('agency_id', agency_id)
      .order('created_at', { ascending: false })
      .limit(1)

    let visualUrl: string | null = null
    if (assets && assets.length > 0) {
      const { data: signedData } = await adminClient.storage
        .from('social-visuals')
        .createSignedUrl(assets[0].storage_path, 3600)
      visualUrl = signedData?.signedUrl || null
    }

    // ─── 4. Build payload ───
    const webhookUrl = Deno.env.get('CONTENT_WEBHOOK_URL')
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')

    if (!webhookUrl) return json({ error: 'CONTENT_WEBHOOK_URL not configured' }, 500)
    if (!webhookSecret) return json({ error: 'WEBHOOK_SECRET not configured' }, 500)

    const aiPayload = (suggestion.ai_payload as Record<string, any>) || {}

    const payload = {
      secret: webhookSecret,
      label: 'PUBLI',
      type: 'social_post',
      suggestion_id: suggestion.id,
      agency_id,
      post: {
        title: suggestion.title,
        caption: suggestion.caption_base_fr,
        hashtags: suggestion.hashtags || [],
        hook: aiPayload.hook || suggestion.title,
        cta: aiPayload.cta || '',
        universe: suggestion.universe,
        topic_type: suggestion.topic_type,
        suggestion_date: suggestion.suggestion_date,
        month_key: suggestion.month_key,
        visual_type: suggestion.visual_type,
        relevance_score: suggestion.relevance_score,
        platform_targets: suggestion.platform_targets,
      },
      variants: (variants || []).map((v: any) => ({
        id: v.id,
        platform: v.platform,
        caption: v.caption_fr,
        cta: v.cta,
        hashtags: v.hashtags || [],
        format: v.format,
        dimensions: v.recommended_dimensions,
        notes: v.platform_notes,
      })),
      visual: visualUrl ? {
        url: visualUrl,
        storage_path: assets?.[0]?.storage_path,
        visual_type: assets?.[0]?.visual_type,
        width: assets?.[0]?.width,
        height: assets?.[0]?.height,
      } : null,
      // Legacy compat: also send as photos array for receive-photos endpoint
      photos: visualUrl ? [{
        url: visualUrl,
        label: 'PUBLI',
        chantier: suggestion.title,
      }] : [],
    }

    // ─── 5. Send webhook ───
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      console.error('[dispatch-social-webhook] Webhook failed:', webhookResponse.status, errorText)
      return json({ error: 'Webhook failed', details: errorText.slice(0, 200) }, 502)
    }

    await webhookResponse.text() // consume body

    console.log('[dispatch-social-webhook] Success for suggestion:', suggestion_id)

    return json({
      success: true,
      status: 'sent',
      label: 'PUBLI',
      suggestion_id,
      has_visual: !!visualUrl,
      variants_count: variants?.length || 0,
    })

  } catch (err) {
    console.error('[dispatch-social-webhook] Error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
