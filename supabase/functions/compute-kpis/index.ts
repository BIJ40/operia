// supabase/functions/compute-kpis/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface KpiRequest {
  agency_id?: string;
  agency_ids?: string[];
  scope: 'agency' | 'network';
}

interface AgencyKpis {
  agency_id: string;
  agency_label: string;
  collaborator_count: number;
  active_collaborators: number;
  document_requests_pending: number;
  document_requests_total: number;
  ticket_count: number;
  open_tickets: number;
  vehicle_count: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token invalide' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: KpiRequest = await req.json()
    const { scope } = body

    if (scope === 'agency') {
      const agencyId = body.agency_id
      if (!agencyId) {
        return new Response(JSON.stringify({ error: 'agency_id requis' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const kpis = await computeAgencyKpis(supabase, agencyId)
      return new Response(JSON.stringify({ success: true, data: kpis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (scope === 'network') {
      const agencyIds = body.agency_ids
      
      // If no agency_ids, get all active agencies
      let targetIds = agencyIds
      if (!targetIds || targetIds.length === 0) {
        const { data: agencies } = await supabase
          .from('apogee_agencies')
          .select('id')
          .eq('is_active', true)
        targetIds = agencies?.map(a => a.id) ?? []
      }

      const results: AgencyKpis[] = []
      // Process in batches of 5
      for (let i = 0; i < targetIds.length; i += 5) {
        const batch = targetIds.slice(i, i + 5)
        const batchResults = await Promise.all(
          batch.map(id => computeAgencyKpis(supabase, id))
        )
        results.push(...batchResults.filter(Boolean) as AgencyKpis[])
      }

      // Compute network totals
      const totals = {
        total_agencies: results.length,
        total_collaborators: results.reduce((s, r) => s + r.collaborator_count, 0),
        total_active_collaborators: results.reduce((s, r) => s + r.active_collaborators, 0),
        total_pending_requests: results.reduce((s, r) => s + r.document_requests_pending, 0),
        total_tickets: results.reduce((s, r) => s + r.ticket_count, 0),
        total_open_tickets: results.reduce((s, r) => s + r.open_tickets, 0),
        total_vehicles: results.reduce((s, r) => s + r.vehicle_count, 0),
      }

      return new Response(JSON.stringify({ 
        success: true, 
        data: { agencies: results, totals } 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'scope invalide (agency | network)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('compute-kpis error:', err)
    return new Response(JSON.stringify({ error: 'Erreur serveur', details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function computeAgencyKpis(supabase: any, agencyId: string): Promise<AgencyKpis | null> {
  const [
    agencyRes,
    collabRes,
    docReqRes,
    vehicleRes,
  ] = await Promise.all([
    supabase.from('apogee_agencies').select('id, label').eq('id', agencyId).single(),
    supabase.from('collaborators').select('id, leaving_date', { count: 'exact' }).eq('agency_id', agencyId),
    supabase.from('document_requests').select('id, status', { count: 'exact' }).eq('agency_id', agencyId),
    supabase.from('fleet_vehicles').select('id', { count: 'exact' }).eq('agency_id', agencyId),
  ])

  if (agencyRes.error || !agencyRes.data) return null

  const collaborators = collabRes.data ?? []
  const activeCollabs = collaborators.filter((c: any) => !c.leaving_date)
  const docRequests = docReqRes.data ?? []
  const pendingRequests = docRequests.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_PROGRESS')

  return {
    agency_id: agencyId,
    agency_label: agencyRes.data.label,
    collaborator_count: collaborators.length,
    active_collaborators: activeCollabs.length,
    document_requests_pending: pendingRequests.length,
    document_requests_total: docRequests.length,
    ticket_count: 0, // Support tickets are in a different table
    open_tickets: 0,
    vehicle_count: vehicleRes.count ?? 0,
  }
}
