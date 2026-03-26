/**
 * Edge Function: get-apporteur-exchanges
 * Returns exchanges for a specific dossier ref
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { authenticateApporteur } from '../_shared/apporteurAuth.ts';

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    const auth = await authenticateApporteur(req);
    if (!auth) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const { dossierRef } = await req.json();
    if (!dossierRef) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'dossierRef requis' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin
      .from('dossier_exchanges')
      .select('id, sender_type, sender_name, action_type, message, created_at')
      .eq('agency_id', auth.agencyId)
      .eq('dossier_ref', dossierRef)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[get-apporteur-exchanges] DB error:', error);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    return withCors(req, new Response(
      JSON.stringify({ success: true, data: data || [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[get-apporteur-exchanges] Error:', message);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
