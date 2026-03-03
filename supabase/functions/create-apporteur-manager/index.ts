/**
 * create-apporteur-manager - Création d'un gestionnaire apporteur (système OTP)
 * 
 * Crée un enregistrement dans apporteur_managers (pas dans auth.users).
 * L'utilisateur se connectera via OTP email (apporteur-auth-send-code).
 * 
 * Accessible aux N2+ pour leur propre agence, N4+ pour toutes les agences.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { getUserContext, assertRoleAtLeast } from '../_shared/auth.ts';

interface CreateManagerRequest {
  apporteur_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'reader' | 'manager';
}

Deno.serve(async (req) => {
  // CORS
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: jsonHeaders });
  }

  try {
    // Auth context
    const authResult = await getUserContext(req);
    if (!authResult.success) {
      return new Response(JSON.stringify({ error: authResult.error }), { status: authResult.status, headers: jsonHeaders });
    }
    const { context } = authResult;

    // N2+ required
    const roleCheck = assertRoleAtLeast(context, 'franchisee_admin');
    if (!roleCheck.allowed) {
      return new Response(JSON.stringify({ error: roleCheck.error }), { status: 403, headers: jsonHeaders });
    }

    // Parse body
    const body: CreateManagerRequest = await req.json();
    const { apporteur_id, email, first_name, last_name, role } = body;

    if (!apporteur_id || !email || !first_name || !last_name || !role) {
      return new Response(JSON.stringify({ error: 'Champs requis manquants' }), { status: 400, headers: jsonHeaders });
    }

    if (!['reader', 'manager'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Rôle invalide' }), { status: 400, headers: jsonHeaders });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Format email invalide' }), { status: 400, headers: jsonHeaders });
    }

    // Service client for admin operations
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify apporteur exists and belongs to caller's agency
    const { data: apporteur, error: appError } = await serviceClient
      .from('apporteurs')
      .select('id, agency_id, is_active')
      .eq('id', apporteur_id)
      .single();

    if (appError || !apporteur) {
      return new Response(JSON.stringify({ error: 'Apporteur non trouvé' }), { status: 404, headers: jsonHeaders });
    }

    // N2-N3: only own agency. N4+: any agency
    if (context.globalRoleLevel < 4 && apporteur.agency_id !== context.agencyId) {
      return new Response(JSON.stringify({ error: 'Cet apporteur n\'appartient pas à votre agence' }), { status: 403, headers: jsonHeaders });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if manager already exists for this apporteur
    const { data: existing } = await serviceClient
      .from('apporteur_managers')
      .select('id, is_active')
      .eq('apporteur_id', apporteur_id)
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existing) {
      if (existing.is_active) {
        return new Response(JSON.stringify({ error: 'Un gestionnaire avec cet email existe déjà pour cet apporteur' }), { status: 409, headers: jsonHeaders });
      }
      // Reactivate
      const { error: updateErr } = await serviceClient
        .from('apporteur_managers')
        .update({
          first_name,
          last_name,
          role,
          is_active: true,
          invited_by: context.userId,
        })
        .eq('id', existing.id);

      if (updateErr) {
        return new Response(JSON.stringify({ error: 'Erreur mise à jour: ' + updateErr.message }), { status: 500, headers: jsonHeaders });
      }

      return new Response(JSON.stringify({ success: true, id: existing.id, reactivated: true }), { status: 200, headers: jsonHeaders });
    }

    // Create new manager
    const { data: newManager, error: insertErr } = await serviceClient
      .from('apporteur_managers')
      .insert({
        apporteur_id,
        agency_id: apporteur.agency_id,
        email: normalizedEmail,
        first_name,
        last_name,
        role,
        is_active: true,
        invited_by: context.userId,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('Insert error:', insertErr);
      return new Response(JSON.stringify({ error: 'Erreur création: ' + insertErr.message }), { status: 500, headers: jsonHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, id: newManager.id, reactivated: false }),
      { status: 201, headers: jsonHeaders }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Erreur serveur' }), { status: 500, headers: jsonHeaders });
  }
});
