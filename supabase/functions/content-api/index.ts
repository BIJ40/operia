import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

/**
 * content-api — Secure read-only API for external content tool
 * 
 * Endpoints:
 *   GET /content-api/realisations           → list all realisations
 *   GET /content-api/realisations/:id       → single realisation + media with signed URLs
 *   POST /content-api/realisations/:id/publish-result → update sync status from external tool
 * 
 * Auth: X-API-KEY header must match CONTENT_API_KEY secret
 */

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Auth via API key
  const apiKey = req.headers.get('x-api-key')
  const expectedKey = Deno.env.get('CONTENT_API_KEY')
  if (!expectedKey || apiKey !== expectedKey) {
    return json({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const url = new URL(req.url)
  const pathParts = url.pathname.split('/').filter(Boolean)
  // pathParts: ["content-api", "realisations", ":id?", "publish-result?"]
  const resource = pathParts[1] // "realisations"
  const id = pathParts[2]
  const action = pathParts[3]

  try {
    // POST /realisations/:id/publish-result
    if (req.method === 'POST' && id && action === 'publish-result') {
      const body = await req.json()
      const updates: Record<string, unknown> = {}

      if (body.external_sync_status) updates.external_sync_status = body.external_sync_status
      if (body.published_article_id) updates.published_article_id = body.published_article_id
      if (body.published_article_url) updates.published_article_url = body.published_article_url
      if (body.external_sync_error) updates.external_sync_error = body.external_sync_error
      updates.external_sync_last_at = new Date().toISOString()

      const { error } = await supabase
        .from('realisations')
        .update(updates)
        .eq('id', id)

      if (error) return json({ error: error.message }, 400)

      // Log activity
      const { data: real } = await supabase.from('realisations').select('agency_id').eq('id', id).single()
      if (real) {
        await supabase.from('realisation_activity_log').insert({
          agency_id: real.agency_id,
          realisation_id: id,
          actor_type: 'external',
          action_type: body.external_sync_status === 'published' ? 'content_published' : 'sync_status_updated',
          action_payload: body,
        })
      }

      return json({ success: true })
    }

    // GET /realisations/:id — single realisation with media + signed URLs
    if (req.method === 'GET' && id) {
      const { data: realisation, error } = await supabase
        .from('realisations')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !realisation) return json({ error: 'Not found' }, 404)

      const { data: media } = await supabase
        .from('realisation_media')
        .select('*')
        .eq('realisation_id', id)
        .order('media_role')
        .order('sequence_order')

      // Generate signed URLs for each media
      const mediaWithUrls = await Promise.all(
        (media || []).map(async (m: any) => {
          const { data: urlData } = await supabase.storage
            .from('realisations-private')
            .createSignedUrl(m.storage_path, 3600) // 1h
          return {
            id: m.id,
            media_role: m.media_role,
            mime_type: m.mime_type,
            original_file_name: m.original_file_name,
            file_size_bytes: m.file_size_bytes,
            width: m.width,
            height: m.height,
            alt_text: m.alt_text,
            caption: m.caption,
            signed_url: urlData?.signedUrl || null,
          }
        })
      )

      return json({
        realisation: {
          id: realisation.id,
          agency_id: realisation.agency_id,
          title: realisation.title,
          intervention_date: realisation.intervention_date,
          external_sync_status: realisation.external_sync_status,
          created_at: realisation.created_at,
        },
        media: mediaWithUrls,
      })
    }

    // GET /realisations — list all (with optional filters)
    if (req.method === 'GET' && resource === 'realisations') {
      const agencyId = url.searchParams.get('agency_id')
      const status = url.searchParams.get('sync_status')
      const limit = parseInt(url.searchParams.get('limit') || '50')

      let query = supabase
        .from('realisations')
        .select('id, agency_id, title, intervention_date, external_sync_status, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (agencyId) query = query.eq('agency_id', agencyId)
      if (status) query = query.eq('external_sync_status', status)

      const { data, error } = await query
      if (error) return json({ error: error.message }, 400)

      return json({ realisations: data || [] })
    }

    return json({ error: 'Not found' }, 404)
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
