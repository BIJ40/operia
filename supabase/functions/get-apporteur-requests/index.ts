/**
 * Edge Function: get-apporteur-requests
 * Returns intervention requests for the authenticated apporteur.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { authenticateApporteur } from '../_shared/apporteurAuth.ts';
import { withCors, handleCorsPreflightOrReject } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightOrReject(req) ?? new Response(null, { status: 204 });
  if (req.method !== 'POST') {
    return withCors(req, new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 }));
  }

  try {
    const auth = await authenticateApporteur(req);
    if (!auth) {
      return withCors(req, new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabaseAdmin
      .from('apporteur_intervention_requests')
      .select('id, request_type, urgency, tenant_name, tenant_phone, tenant_email, owner_name, address, postal_code, city, description, availability, comments, status, reference, apogee_project_id, created_at, updated_at')
      .eq('apporteur_id', auth.apporteurId)
      .eq('agency_id', auth.agencyId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('[get-apporteur-requests] Query error:', error);
      return withCors(req, new Response(JSON.stringify({ error: 'Erreur de chargement' }), { status: 500 }));
    }

    return withCors(req, new Response(JSON.stringify({ success: true, data: data ?? [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (error) {
    console.error('[get-apporteur-requests] Error:', error);
    return withCors(req, new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 }));
  }
});
