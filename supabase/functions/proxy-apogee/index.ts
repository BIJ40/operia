/**
 * PROXY APOGÉE SÉCURISÉ
 * 
 * Ce proxy centralise TOUS les appels à l'API Apogée.
 * La clé API n'est JAMAIS exposée côté client.
 * 
 * Fonctionnalités de sécurité:
 * - Authentification JWT obligatoire
 * - Rate limiting par utilisateur
 * - Validation des endpoints autorisés
 * - Isolation par agence (vérifie que l'utilisateur appartient bien à l'agence)
 * - Logs structurés sans données sensibles
 * - CORS hardened
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureEdgeException } from '../_shared/sentry.ts';

// =============================================================================
// MASQUAGE DONNÉES SENSIBLES - SÉCURITÉ NAVIGATEUR
// =============================================================================

/**
 * Masque les données sensibles AVANT envoi au navigateur.
 * Les données originales ne quittent JAMAIS le serveur.
 */
function maskSensitiveData(data: unknown, endpoint: string): unknown {
  if (!Array.isArray(data)) return data;

  if (endpoint === 'apiGetClients' || endpoint === 'getClients') {
    return data.map((client: Record<string, unknown>) => ({
      ...client,
      // Données sensibles masquées
      email: client.email ? '***' : null,
      tel: client.tel ? '***' : null,
      tel2: client.tel2 ? '***' : null,
      tel3: client.tel3 ? '***' : null,
      adresse: client.adresse ? '***' : null,
      codePostal: typeof client.codePostal === 'string' && client.codePostal.length >= 2 
        ? client.codePostal.substring(0, 2) + '***' 
        : client.codePostal ? '***' : null,
      // Données conservées pour les calculs
      id: client.id,
      nom: client.nom,
      prenom: client.prenom,
      raisonSociale: client.raisonSociale,
      type: client.type,
      typeClient: client.typeClient,
      codeCompta: client.codeCompta,
      ville: client.ville, // Conservé pour stats géographiques
    }));
  }

  if (endpoint === 'apiGetUsers' || endpoint === 'getUsers') {
    return data.map((user: Record<string, unknown>) => ({
      ...user,
      // Données sensibles masquées
      email: user.email ? '***' : null,
      tel: user.tel ? '***' : null,
      // Données conservées
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      firstname: user.firstname,
      lastname: user.lastname,
      name: user.name,
      initiales: user.initiales,
      universes: user.universes,
      type: user.type,
      role: user.role,
      bgcolor: user.bgcolor,
      color: user.color,
    }));
  }

  if (endpoint === 'apiGetProjects' || endpoint === 'getProjects') {
    return data.map((project: Record<string, unknown>) => ({
      ...project,
      // Données sensibles masquées
      adresse: project.adresse ? '***' : null,
      codePostal: typeof project.codePostal === 'string' && project.codePostal.length >= 2
        ? project.codePostal.substring(0, 2) + '***'
        : project.codePostal ? '***' : null,
      // Ville conservée pour stats géographiques
    }));
  }

  // Autres endpoints: pas de masquage (interventions, factures, devis = pas de données sensibles directes)
  return data;
}

// Endpoints Apogée autorisés (whitelist)
const ALLOWED_ENDPOINTS = [
  'apiGetUsers',
  'apiGetClients',
  'apiGetProjects',
  'apiGetInterventions',
  'apiGetFactures',
  'apiGetDevis',
  'apiGetPlanningCreneaux',
  'getInterventionsCreneaux',
  'getUsers',
  'getClients',
  'getProjects',
  'getInterventions',
  'getFactures',
  'getDevis',
  'apiGetProjectByHashZipCode',
];

interface ProxyRequest {
  endpoint: string;
  agencySlug?: string; // Optional: override user's agency (for franchiseur)
  filters?: Record<string, unknown>;
}

interface ProxyResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  meta?: {
    endpoint: string;
    agencySlug: string;
    timestamp: string;
    itemCount?: number;
  };
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
        JSON.stringify({ success: false, error: 'En-tête d\'autorisation manquant' }),
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

    // 2. Récupérer le profil utilisateur (déplacé avant rate limit pour adapter la limite)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agence, global_role')
      .eq('id', user.id)
      .single();

    // 2bis. Vérifier si l'utilisateur est un apporteur (système séparé)
    const { data: apporteurUser } = await supabase
      .from('apporteur_users')
      .select('agency_id, apporteur_id, is_active, apporteurs:apporteur_id(is_active)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    // Extraire l'agence de l'apporteur si applicable
    const apporteurAgencyId = apporteurUser?.agency_id ?? null;
    const isApporteurUser = !!apporteurUser && apporteurUser.is_active;

    // Si ni profil ni apporteur trouvé
    if ((profileError || !profile) && !isApporteurUser) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Profil utilisateur non trouvé' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 3. Rate limiting adapté au rôle (1000 req/min pour franchiseur, 100 pour les autres, 50 pour apporteurs)
    const globalRole = profile?.global_role || '';
    const isFranchiseurRole = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(globalRole);
    const rateLimit = isFranchiseurRole ? 1000 : (isApporteurUser ? 50 : 100);
    const rateLimitKey = `proxy-apogee:${user.id}`;
    const rateCheck = await checkRateLimit(rateLimitKey, { limit: rateLimit, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      console.log(`[PROXY-APOGEE] Rate limit exceeded for user ${user.id} (limit: ${rateLimit})`);
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    // 4. Parser la requête
    const body: ProxyRequest = await req.json();
    const { endpoint, agencySlug: requestedAgency, filters } = body;

    // 5. Valider l'endpoint (whitelist)
    if (!endpoint || !ALLOWED_ENDPOINTS.includes(endpoint)) {
      console.warn(`[PROXY-APOGEE] Endpoint non autorisé: ${endpoint}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: `Endpoint non autorisé: ${endpoint}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 6. Déterminer l'agence cible avec contrôle d'accès
    let targetAgency = profile?.agence || null;
    
    // FALLBACK: Si agence slug est null mais agency_id existe dans le profil, résoudre le slug
    if (!targetAgency && profile) {
      const { data: profileWithAgency } = await supabase
        .from('profiles')
        .select('agency_id')
        .eq('id', user.id)
        .single();
      
      if (profileWithAgency?.agency_id) {
        const { data: resolvedAgency } = await supabase
          .from('apogee_agencies')
          .select('slug')
          .eq('id', profileWithAgency.agency_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (resolvedAgency?.slug) {
          console.log(`[PROXY-APOGEE] Resolved agency slug from agency_id: ${resolvedAgency.slug} for user ${user.id.substring(0, 8)}...`);
          targetAgency = resolvedAgency.slug;
        }
      }
    }
    
    // APPORTEUR: Les utilisateurs apporteurs accèdent à leur agence associée
    if (isApporteurUser && apporteurAgencyId) {
      // Récupérer le slug de l'agence à partir de l'ID
      const { data: apporteurAgency } = await supabase
        .from('apogee_agencies')
        .select('slug')
        .eq('id', apporteurAgencyId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (apporteurAgency?.slug) {
        console.log(`[PROXY-APOGEE] Mode apporteur: user ${user.id.substring(0, 8)}... accède à l'agence ${apporteurAgency.slug}`);
        targetAgency = apporteurAgency.slug;
      }
    }
    
    // MODE DÉMO: Les utilisateurs N0 (base_user sans agence) peuvent accéder à DAX en lecture seule
    const isN0DemoUser = !profile?.agence && profile?.global_role === 'base_user';
    const DEMO_AGENCY_SLUG = 'dax';
    
    // Si une agence spécifique est demandée (pour franchiseur ou mode démo)
    if (requestedAgency && requestedAgency !== targetAgency) {
      // Cas spécial: Apporteur ne peut accéder qu'à son agence
      if (isApporteurUser) {
        // L'apporteur doit utiliser son agence, pas une autre
        if (targetAgency && requestedAgency !== targetAgency) {
          console.warn(`[PROXY-APOGEE] Apporteur ${user.id} tente d'accéder à une autre agence: ${requestedAgency}`);
          return withCors(req, new Response(
            JSON.stringify({ success: false, error: 'Accès non autorisé à cette agence' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ));
        }
      }
      // Cas spécial: Mode démo N0 pour l'agence DAX uniquement
      else if (isN0DemoUser && requestedAgency === DEMO_AGENCY_SLUG) {
        console.log(`[PROXY-APOGEE] Mode démo activé pour user ${user.id.substring(0, 8)}... sur agence ${DEMO_AGENCY_SLUG}`);
        targetAgency = DEMO_AGENCY_SLUG;
      }
      // Sinon vérifier que l'utilisateur a le droit d'accéder à cette agence (rôle franchiseur)
      else if (!isFranchiseurRole) {
        console.warn(`[PROXY-APOGEE] Accès refusé: user ${user.id} tente d'accéder à l'agence ${requestedAgency}`);
        return withCors(req, new Response(
          JSON.stringify({ success: false, error: 'Accès non autorisé à cette agence' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      else {
        // Vérifier que l'agence existe et est active
        const { data: agency } = await supabase
          .from('apogee_agencies')
          .select('slug')
          .eq('slug', requestedAgency)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!agency) {
          return withCors(req, new Response(
            JSON.stringify({ success: false, error: 'Agence non trouvée ou inactive' }),
            { status: 404, headers: { 'Content-Type': 'application/json' } }
          ));
        }
        
        targetAgency = requestedAgency;
      }
    }

    // Pour les utilisateurs N0 en mode démo, définir l'agence DAX par défaut
    if (!targetAgency && isN0DemoUser) {
      targetAgency = DEMO_AGENCY_SLUG;
    }

    if (!targetAgency) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Aucune agence configurée pour cet utilisateur' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 7. Construire l'URL de l'API Apogée
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      console.error('[PROXY-APOGEE] APOGEE_API_KEY non configurée');
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Configuration serveur manquante' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const apiUrl = `https://${targetAgency}.hc-apogee.fr/api/${endpoint}`;
    
    // Log structuré (sans données sensibles)
    console.log(`[PROXY-APOGEE] Request: ${endpoint} for agency ${targetAgency} by user ${user.id.substring(0, 8)}...`);

    // 8. Appeler l'API Apogée
    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        API_KEY: apiKey,
        ...filters,
      }),
    });

    if (!apiResponse.ok) {
      console.error(`[PROXY-APOGEE] API error: ${apiResponse.status} for ${endpoint}`);
      return withCors(req, new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erreur API Apogée: ${apiResponse.status}` 
        }),
        { status: apiResponse.status >= 500 ? 502 : apiResponse.status, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const rawData = await apiResponse.json();
    const itemCount = Array.isArray(rawData) ? rawData.length : undefined;
    
    // 9. MASQUAGE SÉCURITÉ - Données sensibles ne quittent JAMAIS le serveur
    const maskedData = maskSensitiveData(rawData, endpoint);
    
    console.log(`[PROXY-APOGEE] Success: ${endpoint} returned ${itemCount ?? 'object'} items (masked)`);

    // 10. Retourner la réponse masquée
    const response: ProxyResponse = {
      success: true,
      data: maskedData,
      meta: {
        endpoint,
        agencySlug: targetAgency,
        timestamp: new Date().toISOString(),
        itemCount,
      },
    };

    return withCors(req, new Response(
      JSON.stringify(response),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[PROXY-APOGEE] Exception:', error instanceof Error ? error.message : error);
    captureEdgeException(error, { function: 'proxy-apogee' });
    
    return withCors(req, new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erreur interne du serveur' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
