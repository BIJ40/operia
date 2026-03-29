/**
 * GET-CLIENT-CONTACT - Accès sécurisé aux données sensibles client
 * 
 * Cette Edge Function fournit un accès CONTRÔLÉ et AUDITÉ aux coordonnées
 * complètes d'un client. Les données sensibles ne transitent que sur demande
 * explicite et chaque accès est loggé dans sensitive_data_access_logs.
 * 
 * Sécurité:
 * - JWT obligatoire
 * - Vérification d'appartenance à l'agence
 * - Rate limiting strict (10 req/min)
 * - Audit trail complet
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureEdgeException } from '../_shared/sentry.ts';

interface ContactRequest {
  clientId: number | string;
  projectId: number | string;
  agencySlug: string;
}

interface ContactResponse {
  success: boolean;
  data?: {
    email: string | null;
    tel: string | null;
    tel2: string | null;
    tel3: string | null;
    adresse: string | null;
    codePostal: string | null;
    ville: string | null;
  };
  error?: string;
}

Deno.serve(async (req) => {
  // CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    // 1. Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Non autorisé' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 2. Rate limiting strict (10 req/min pour données sensibles)
    const rateLimitKey = `get-client-contact:${user.id}`;
    const rateCheck = await checkRateLimit(rateLimitKey, { limit: 10, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      console.log(`[GET-CLIENT-CONTACT] Rate limit exceeded for user ${user.id}`);
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    // 3. Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agency_id, global_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Profil utilisateur non trouvé' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 4. Parser la requête
    const body: ContactRequest = await req.json();
    const { clientId, projectId, agencySlug } = body;

    if (!clientId || !projectId || !agencySlug) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Paramètres manquants (clientId, projectId, agencySlug)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 5. Résoudre l'agence cible par slug → UUID pour contrôle d'accès
    //    DOCTRINE: agency_id (UUID) = source unique de vérité d'autorisation
    //    Le slug est conservé uniquement pour construire l'URL Apogée
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: targetAgency, error: agencyError } = await supabaseAdmin
      .from('apogee_agencies')
      .select('id')
      .eq('slug', agencySlug)
      .maybeSingle();

    if (agencyError || !targetAgency) {
      console.warn(`[GET-CLIENT-CONTACT] Agence non trouvée pour slug: ${agencySlug}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Agence non trouvée' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 5b. Contrôle d'accès basé sur agency_id (UUID), pas sur le slug
    const isFranchiseurRole = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(profile.global_role || '');
    const hasAgencyAccess = isFranchiseurRole || profile.agency_id === targetAgency.id;

    if (!hasAgencyAccess) {
      console.warn(`[GET-CLIENT-CONTACT] Accès refusé: user ${user.id} agency_id ${profile.agency_id} !== ${targetAgency.id}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Accès non autorisé à cette agence' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 6. Appeler l'API Apogée pour récupérer le client complet (slug utilisé ici pour l'URL uniquement)
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      console.error('[GET-CLIENT-CONTACT] APOGEE_API_KEY non configurée');
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const apiUrl = `https://${agencySlug}.hc-apogee.fr/api/apiGetClients`;
    
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        API_KEY: apiKey,
        id: clientId,
      }),
    });

    if (!apiResponse.ok) {
      console.error(`[GET-CLIENT-CONTACT] API error: ${apiResponse.status}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Erreur API Apogée' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const clients = await apiResponse.json();
    const client = Array.isArray(clients) 
      ? clients.find((c: Record<string, unknown>) => String(c.id) === String(clientId))
      : null;

    if (!client) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Client non trouvé' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 7. AUDIT - Logger l'accès aux données sensibles
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || 'unknown';

    await supabase.from('sensitive_data_access_logs').insert({
      user_id: user.id,
      client_id: String(clientId),
      project_id: String(projectId),
      agency_slug: agencySlug,
      access_type: 'client_contact',
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    console.log(`[GET-CLIENT-CONTACT] Access logged: user ${user.id.substring(0, 8)}... client ${clientId}`);

    // 8. Retourner les données sensibles
    const response: ContactResponse = {
      success: true,
      data: {
        email: client.email || null,
        tel: client.tel || null,
        tel2: client.tel2 || null,
        tel3: client.tel3 || null,
        adresse: client.adresse || null,
        codePostal: client.codePostal || null,
        ville: client.ville || null,
      },
    };

    return withCors(req, new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[GET-CLIENT-CONTACT] Exception:', error instanceof Error ? error.message : error);
    captureEdgeException(error, { function: 'get-client-contact' });
    
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Erreur interne du serveur' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
