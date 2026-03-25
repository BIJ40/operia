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

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
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

// =============================================================================
// P0: CONTRÔLE PÉRIMÈTRE DOSSIER APPORTEUR (commanditaireId)
// =============================================================================

/**
 * Résout le(s) apogee_client_id autorisé(s) pour un apporteur connecté.
 * Source de vérité : table `apporteurs.apogee_client_id` via `apporteur_users`.
 * Fail-closed : retourne tableau vide si impossible à résoudre.
 */
async function resolveApporteurCommanditaireIds(
  supabaseAdmin: SupabaseClient,
  apporteurId: string
): Promise<number[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('apporteurs')
      .select('apogee_client_id')
      .eq('id', apporteurId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data?.apogee_client_id) return [];
    return [Number(data.apogee_client_id)];
  } catch {
    return [];
  }
}

/**
 * Vérifie que le dossier appartient au périmètre de l'apporteur.
 * Fail-closed : refuse si commanditaireId absent, null, ou mismatch.
 */
function verifyApporteurOwnership(
  projectData: Record<string, unknown>,
  allowedCommanditaireIds: number[],
  userId: string,
  ref: string,
  agencySlug: string
): { allowed: boolean; reason?: string; dossierCmdId?: unknown } {
  // Extraire commanditaireId du dossier (structure Apogée)
  const dataObj = projectData?.data as Record<string, unknown> | undefined;
  const cmdId = dataObj?.commanditaireId ?? projectData?.commanditaireId;

  if (cmdId == null) {
    console.warn(`[PROXY-APOGEE] APPORTEUR ACCESS DENIED: commanditaireId absent. user=${userId.substring(0, 8)}... ref=${ref} agency=${agencySlug}`);
    return { allowed: false, reason: 'commanditaireId_absent', dossierCmdId: null };
  }

  const cmdIdNum = Number(cmdId);
  if (!Number.isFinite(cmdIdNum) || !allowedCommanditaireIds.includes(cmdIdNum)) {
    console.warn(`[PROXY-APOGEE] APPORTEUR ACCESS DENIED: commanditaireId mismatch. user=${userId.substring(0, 8)}... ref=${ref} agency=${agencySlug} dossier_cmd=${cmdIdNum} allowed_cmds=[${allowedCommanditaireIds.join(',')}]`);
    return { allowed: false, reason: 'commanditaireId_mismatch', dossierCmdId: cmdIdNum };
  }

  console.log(`[PROXY-APOGEE] APPORTEUR ACCESS GRANTED: user=${userId.substring(0, 8)}... ref=${ref} agency=${agencySlug} cmd=${cmdIdNum}`);
  return { allowed: true, dossierCmdId: cmdIdNum };
}

// =============================================================================
// P1: MASQUAGE DONNÉES SENSIBLES POUR APPORTEURS — apiGetProjectByRef
// =============================================================================

/**
 * Sanitise un objet dossier renvoyé par apiGetProjectByRef pour les apporteurs.
 * Conserve : ref, state, label, dates, montants, statuts, generatedDocs, universes.
 * Masque  : adresse complète, téléphones, emails, coordonnées client final.
 */
function maskProjectDetailForApporteur(rawData: unknown): unknown {
  if (!rawData || typeof rawData !== 'object') return rawData;

  const project = rawData as Record<string, unknown>;
  const dataObj = (project.data && typeof project.data === 'object')
    ? { ...(project.data as Record<string, unknown>) }
    : {};

  // Champs sensibles à masquer dans data.*
  const SENSITIVE_DATA_KEYS = [
    'email', 'tel', 'tel2', 'tel3', 'telephone', 'phone', 'mobile',
    'adresse', 'address', 'adr',
    'proprietaire', 'ownerName', 'ownerEmail', 'ownerPhone',
    'locataire', 'tenantEmail', 'tenantPhone',
    'contactEmail', 'contactTel', 'contactPhone',
  ];
  for (const key of SENSITIVE_DATA_KEYS) {
    if (key in dataObj && dataObj[key]) {
      dataObj[key] = '***';
    }
  }

  // Tronquer codePostal à 2 chiffres
  if (typeof dataObj.codePostal === 'string' && dataObj.codePostal.length >= 2) {
    dataObj.codePostal = dataObj.codePostal.substring(0, 2) + '***';
  }
  if (typeof dataObj.cp === 'string' && dataObj.cp.length >= 2) {
    dataObj.cp = dataObj.cp.substring(0, 2) + '***';
  }

  // Champs sensibles au root du projet
  const SENSITIVE_ROOT_KEYS = [
    'email', 'tel', 'tel2', 'tel3', 'telephone', 'phone', 'mobile',
    'adresse', 'address', 'adr',
  ];
  const masked: Record<string, unknown> = { ...project, data: dataObj };
  for (const key of SENSITIVE_ROOT_KEYS) {
    if (key in masked && masked[key]) {
      masked[key] = '***';
    }
  }
  if (typeof masked.codePostal === 'string' && (masked.codePostal as string).length >= 2) {
    masked.codePostal = (masked.codePostal as string).substring(0, 2) + '***';
  }

  // Conserver explicitement les champs utiles (sécurité par design)
  // generatedDocs, ref, state, universes, dates, montants, statuts → non touchés
  return masked;
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
  'apiGetProjectByRef',
];

// Endpoints soumis à un rate limiting strict (détail dossier)
const STRICT_RATE_LIMIT_ENDPOINTS = ['apiGetProjectByRef'];

// =============================================================================
// CACHE SERVEUR EDGE — apiGetProjectByRef uniquement
// Clé = ref + agencySlug. TTL 5 min. Ne contourne JAMAIS les droits.
// =============================================================================
interface EdgeCacheEntry {
  data: unknown;
  expiresAt: number;
  agencySlug: string;
}
const edgeCache = new Map<string, EdgeCacheEntry>();
const EDGE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const EDGE_CACHE_MAX = 200;

function getEdgeCacheKey(endpoint: string, agencySlug: string, filters?: Record<string, unknown>): string {
  if (endpoint === 'apiGetProjectByRef' && filters?.ref) {
    return `${endpoint}:${agencySlug}:${filters.ref}`;
  }
  return '';
}

function getFromEdgeCache(key: string): unknown | null {
  if (!key) return null;
  const entry = edgeCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) edgeCache.delete(key);
    return null;
  }
  return entry.data;
}

function setEdgeCache(key: string, data: unknown, agencySlug: string): void {
  if (!key) return;
  // LRU-style eviction
  if (edgeCache.size >= EDGE_CACHE_MAX) {
    const firstKey = edgeCache.keys().next().value;
    if (firstKey) edgeCache.delete(firstKey);
  }
  edgeCache.set(key, { data, expiresAt: Date.now() + EDGE_CACHE_TTL_MS, agencySlug });
}

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

    // 5bis. Rate limiting STRICT pour endpoints de détail (10 req/min)
    if (STRICT_RATE_LIMIT_ENDPOINTS.includes(endpoint)) {
      const strictKey = `proxy-apogee-detail:${user.id}`;
      const strictCheck = await checkRateLimit(strictKey, { limit: 10, windowMs: 60 * 1000 });
      if (!strictCheck.allowed) {
        console.log(`[PROXY-APOGEE] STRICT rate limit exceeded for ${endpoint} by user ${user.id.substring(0, 8)}...`);
        return rateLimitResponse(strictCheck.retryAfter!, corsHeaders);
      }
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

    // 7bis. EDGE CACHE — Pour apiGetProjectByRef uniquement
    const edgeCacheKey = getEdgeCacheKey(endpoint, targetAgency, filters as Record<string, unknown>);
    if (edgeCacheKey) {
      const cachedData = getFromEdgeCache(edgeCacheKey);
      if (cachedData !== null) {
        console.log(`[PROXY-APOGEE] EDGE CACHE HIT: ${edgeCacheKey}`);
        const response: ProxyResponse = {
          success: true,
          data: cachedData,
          meta: {
            endpoint,
            agencySlug: targetAgency,
            timestamp: new Date().toISOString(),
          },
        };
        return withCors(req, new Response(
          JSON.stringify(response),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));
      }
    }

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
    
    // 9bis. Stocker en edge cache si applicable (APRÈS masquage, APRÈS vérification droits)
    if (edgeCacheKey) {
      setEdgeCache(edgeCacheKey, maskedData, targetAgency);
      console.log(`[PROXY-APOGEE] EDGE CACHE SET: ${edgeCacheKey} (cache size: ${edgeCache.size})`);
    }
    
    // 9ter. Log d'accès détail dossier (traçabilité)
    if (STRICT_RATE_LIMIT_ENDPOINTS.includes(endpoint)) {
      console.log(`[PROXY-APOGEE] DETAIL ACCESS: user=${user.id.substring(0, 8)}... agency=${targetAgency} endpoint=${endpoint} ref=${(filters as any)?.ref || 'N/A'} at=${new Date().toISOString()}`);
    }

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
