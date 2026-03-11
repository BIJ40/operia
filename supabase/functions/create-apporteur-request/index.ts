/**
 * Edge Function: create-apporteur-request
 * Creates an intervention request on behalf of an authenticated apporteur.
 * Uses authenticateApporteur() to support both OTP and JWT auth.
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

    const body = await req.json();
    const { request_type, urgency, tenant_name, tenant_phone, tenant_email, owner_name, address, postal_code, city, description, availability, comments } = body;

    // Validation
    if (!request_type || !tenant_name || !address || !description) {
      return withCors(req, new Response(JSON.stringify({ error: 'Champs obligatoires manquants' }), { status: 400 }));
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Resolve apporteur_user or manager for the request
    let apporteurUserId: string | null = null;
    let apporteurManagerId: string | null = null;

    // Try to find existing apporteur_users entry
    const { data: existingUser } = await supabaseAdmin
      .from('apporteur_users')
      .select('id')
      .eq('apporteur_id', auth.apporteurId)
      .eq('agency_id', auth.agencyId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      apporteurUserId = existingUser.id;
    } else {
      // OTP auth: find the manager instead
      const { data: manager } = await supabaseAdmin
        .from('apporteur_managers')
        .select('id')
        .eq('apporteur_id', auth.apporteurId)
        .eq('agency_id', auth.agencyId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (manager) {
        apporteurManagerId = manager.id;
      }
    }

    if (!apporteurUserId && !apporteurManagerId) {
      return withCors(req, new Response(JSON.stringify({ error: 'Impossible de résoudre l\'utilisateur apporteur' }), { status: 500 }));
    }

    // Insert the request using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('apporteur_intervention_requests')
      .insert({
        agency_id: auth.agencyId,
        apporteur_id: auth.apporteurId,
        apporteur_user_id: apporteurUserId,
        request_type,
        urgency: urgency || 'normal',
        tenant_name,
        tenant_phone: tenant_phone || null,
        tenant_email: tenant_email || null,
        owner_name: owner_name || null,
        address,
        postal_code: postal_code || null,
        city: city || null,
        description,
        availability: availability || null,
        comments: comments || null,
        status: 'pending',
      })
      .select('id, reference')
      .single();

    if (error) {
      console.error('[create-apporteur-request] Insert error:', error);
      return withCors(req, new Response(JSON.stringify({ error: 'Erreur lors de la création' }), { status: 500 }));
    }

    // Trigger notification (fire & forget)
    try {
      const notifyUrl = `${supabaseUrl}/functions/v1/notify-apporteur-request`;
      fetch(notifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ request_id: data.id }),
      }).catch(err => console.warn('[create-apporteur-request] Notification failed:', err));
    } catch {}

    return withCors(req, new Response(JSON.stringify({ success: true, id: data.id, reference: data.reference }), { status: 201 }));
  } catch (error) {
    console.error('[create-apporteur-request] Error:', error);
    return withCors(req, new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500 }));
  }
});
