import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

/**
 * dispatch-realisation-webhook — Sends photos to external receive-photos endpoint
 * 
 * Payload format expected by receive-photos:
 * { secret: "whsec_...", photos: [{ url, label, chantier }] }
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Validate JWT
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(
    authHeader.replace('Bearer ', '')
  )
  if (claimsError || !claimsData?.claims) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const userId = claimsData.claims.sub as string

  try {
    const { realisation_id } = await req.json()
    if (!realisation_id) return json({ error: 'realisation_id required' }, 400)

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch realisation
    const { data: realisation, error: fetchError } = await adminClient
      .from('realisations')
      .select('id, agency_id, title, intervention_date, external_sync_status')
      .eq('id', realisation_id)
      .single()

    if (fetchError || !realisation) {
      return json({ error: 'Realisation not found' }, 404)
    }

    // Guard: don't send if already queued/processing
    if (['queued', 'processing'].includes(realisation.external_sync_status)) {
      return json({ error: 'Already queued or processing', status: realisation.external_sync_status }, 409)
    }

    // Fetch media for this realisation
    const { data: mediaItems, error: mediaError } = await adminClient
      .from('realisation_media')
      .select('id, storage_path, media_role, original_file_name')
      .eq('realisation_id', realisation_id)
      .order('sequence_order')

    if (mediaError) {
      return json({ error: 'Failed to fetch media' }, 500)
    }

    if (!mediaItems || mediaItems.length === 0) {
      return json({ error: 'No media found for this realisation' }, 400)
    }

    // Generate signed URLs for each media (1h validity)
    const photos = []
    for (const media of mediaItems) {
      const { data: urlData, error: urlError } = await adminClient.storage
        .from('realisations-private')
        .createSignedUrl(media.storage_path, 3600) // 1 hour

      if (urlError || !urlData?.signedUrl) {
        console.error(`Failed to sign URL for ${media.storage_path}:`, urlError)
        continue
      }

      photos.push({
        url: urlData.signedUrl,
        label: media.media_role || 'other',
        chantier: realisation.title,
      })
    }

    if (photos.length === 0) {
      return json({ error: 'Could not generate signed URLs for any media' }, 500)
    }

    // Build payload in the format expected by receive-photos
    const webhookUrl = Deno.env.get('CONTENT_WEBHOOK_URL')
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET')

    if (!webhookUrl) {
      return json({ error: 'CONTENT_WEBHOOK_URL not configured' }, 500)
    }
    if (!webhookSecret) {
      return json({ error: 'WEBHOOK_SECRET not configured' }, 500)
    }

    const payload = {
      secret: webhookSecret,
      photos,
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      await adminClient.from('realisations').update({
        external_sync_status: 'failed',
        external_sync_error: `Webhook ${webhookResponse.status}: ${errorText.slice(0, 500)}`,
        external_sync_last_at: new Date().toISOString(),
      }).eq('id', realisation_id)

      await adminClient.from('realisation_activity_log').insert({
        agency_id: realisation.agency_id,
        realisation_id,
        actor_type: 'system',
        action_type: 'webhook_failed',
        action_payload: { status: webhookResponse.status, error: errorText.slice(0, 500) },
      })

      return json({ error: 'Webhook failed', details: errorText.slice(0, 200) }, 502)
    }

    await webhookResponse.text() // consume body

    // Mark as queued
    await adminClient.from('realisations').update({
      external_sync_status: 'queued',
      external_sync_error: null,
      external_sync_last_at: new Date().toISOString(),
    }).eq('id', realisation_id)

    await adminClient.from('realisation_activity_log').insert({
      agency_id: realisation.agency_id,
      realisation_id,
      actor_type: 'user',
      actor_user_id: userId,
      action_type: 'webhook_dispatched',
      action_payload: { webhook_url: webhookUrl, photos_count: photos.length },
    })

    return json({ success: true, status: 'queued', photos_sent: photos.length })
  } catch (err) {
    return json({ error: (err as Error).message }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
