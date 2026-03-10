import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * dispatch-realisation-webhook — Notifies external content tool that a new realisation is ready
 * 
 * Called from the frontend after creating a realisation.
 * Sends a POST to the configured CONTENT_WEBHOOK_URL with signed payload.
 * 
 * Auth: JWT (authenticated user)
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

    // Use service role to update sync status
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

    // Send webhook
    const webhookUrl = Deno.env.get('CONTENT_WEBHOOK_URL')
    const apiKey = Deno.env.get('CONTENT_API_KEY')

    if (!webhookUrl) {
      return json({ error: 'CONTENT_WEBHOOK_URL not configured' }, 500)
    }

    const contentApiBase = `${Deno.env.get('SUPABASE_URL')}/functions/v1/content-api`
    const payload = {
      event: 'realisation.ready',
      realisation_id: realisation.id,
      agency_id: realisation.agency_id,
      title: realisation.title,
      intervention_date: realisation.intervention_date,
      // Tell external tool where to fetch full data
      fetch_url: `${contentApiBase}/realisations/${realisation.id}`,
      api_key: apiKey, // So external tool can authenticate
      timestamp: new Date().toISOString(),
    }

    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey || '' },
      body: JSON.stringify(payload),
    })

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text()
      // Mark as failed
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
      action_payload: { webhook_url: webhookUrl },
    })

    return json({ success: true, status: 'queued' })
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
