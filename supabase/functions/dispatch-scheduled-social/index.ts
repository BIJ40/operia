import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * dispatch-scheduled-social — Cron job quotidien.
 * Trouve les suggestions approuvées dont suggestion_date <= aujourd'hui
 * et webhook_sent_at IS NULL, puis dispatche le webhook pour chacune.
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const today = new Date().toISOString().slice(0, 10)

    // Find approved suggestions with date <= today that haven't been sent
    const { data: pending, error: fetchErr } = await adminClient
      .from('social_content_suggestions')
      .select('id, agency_id, suggestion_date')
      .eq('status', 'approved')
      .is('webhook_sent_at', null)
      .lte('suggestion_date', today)
      .limit(50)

    if (fetchErr) {
      console.error('[dispatch-scheduled-social] Fetch error:', fetchErr)
      return json({ error: fetchErr.message }, 500)
    }

    if (!pending || pending.length === 0) {
      console.log('[dispatch-scheduled-social] No pending dispatches')
      return json({ success: true, dispatched: 0 })
    }

    console.log(`[dispatch-scheduled-social] Found ${pending.length} pending posts`)

    const webhookUrl = Deno.env.get('CONTENT_WEBHOOK_URL')
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')

    if (!webhookUrl || !webhookSecret) {
      return json({ error: 'CONTENT_WEBHOOK_URL or WEBHOOK_SECRET not configured' }, 500)
    }

    let dispatched = 0
    let failed = 0

    for (const suggestion of pending) {
      try {
        // Fetch full suggestion
        const { data: fullSuggestion } = await adminClient
          .from('social_content_suggestions')
          .select('*')
          .eq('id', suggestion.id)
          .single()

        if (!fullSuggestion) continue

        // Fetch variants
        const { data: variants } = await adminClient
          .from('social_post_variants')
          .select('*')
          .eq('suggestion_id', suggestion.id)
          .neq('status', 'archived')

        // Fetch latest visual
        const { data: assets } = await adminClient
          .from('social_visual_assets')
          .select('*')
          .eq('suggestion_id', suggestion.id)
          .eq('agency_id', suggestion.agency_id)
          .order('created_at', { ascending: false })
          .limit(1)

        let visualUrl: string | null = null
        if (assets && assets.length > 0) {
          const { data: signedData } = await adminClient.storage
            .from('social-visuals')
            .createSignedUrl(assets[0].storage_path, 3600)
          visualUrl = signedData?.signedUrl || null
        }

        const aiPayload = (fullSuggestion.ai_payload as Record<string, any>) || {}

        const payload = {
          secret: webhookSecret,
          label: 'PUBLI',
          type: 'social_post',
          suggestion_id: suggestion.id,
          agency_id: suggestion.agency_id,
          scheduled: true,
          post: {
            title: fullSuggestion.title,
            caption: fullSuggestion.caption_base_fr,
            hashtags: fullSuggestion.hashtags || [],
            hook: aiPayload.hook || fullSuggestion.title,
            cta: aiPayload.cta || '',
            content_angle: fullSuggestion.content_angle || '',
            universe: fullSuggestion.universe,
            topic_type: fullSuggestion.topic_type,
            topic_key: fullSuggestion.topic_key || '',
            source_type: fullSuggestion.source_type,
            suggestion_date: fullSuggestion.suggestion_date,
            month_key: fullSuggestion.month_key,
            visual_type: fullSuggestion.visual_type,
            relevance_score: fullSuggestion.relevance_score,
            platform_targets: fullSuggestion.platform_targets,
            ai_generated_text: aiPayload,
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
            status: v.status,
          })),
          visual: visualUrl ? {
            url: visualUrl,
            storage_path: assets?.[0]?.storage_path,
            visual_type: assets?.[0]?.visual_type,
            width: assets?.[0]?.width,
            height: assets?.[0]?.height,
          } : null,
          photos: visualUrl ? [{
            url: visualUrl,
            label: 'PUBLI',
            chantier: fullSuggestion.title,
          }] : [],
        }

        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (resp.ok) {
          await adminClient
            .from('social_content_suggestions')
            .update({ webhook_sent_at: new Date().toISOString() })
            .eq('id', suggestion.id)
          dispatched++
          console.log(`[dispatch-scheduled-social] Sent: ${suggestion.id}`)
        } else {
          const errText = await resp.text()
          console.error(`[dispatch-scheduled-social] Failed ${suggestion.id}: ${resp.status} ${errText.slice(0, 200)}`)
          failed++
        }
      } catch (err) {
        console.error(`[dispatch-scheduled-social] Error for ${suggestion.id}:`, err)
        failed++
      }
    }

    return json({ success: true, dispatched, failed, total: pending.length })
  } catch (err) {
    console.error('[dispatch-scheduled-social] Fatal error:', err)
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
