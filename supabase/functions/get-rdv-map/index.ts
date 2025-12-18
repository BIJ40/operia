/**
 * GET-RDV-MAP - Endpoint sécurisé pour la carte des RDV
 * 
 * Retourne les interventions d'une journée avec leurs coordonnées GPS
 * pour affichage sur Mapbox. Aucune donnée sensible exposée.
 * 
 * Sécurité:
 * - JWT obligatoire
 * - Isolation par agence (N2 = son agence, N3+ = multi-agences)
 * - Coordonnées GPS uniquement (pas d'adresses complètes)
 * - Rate limiting
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureEdgeException } from '../_shared/sentry.ts';

// Types pour la réponse
interface MapRdvUser {
  id: number;
  name: string;
  color: string;
}

interface MapRdv {
  rdvId: number;
  projectId: number;
  lat: number;
  lng: number;
  startAt: string;
  durationMin: number;
  univers: string;
  address: string; // Masqué partiellement côté serveur
  users: MapRdvUser[];
}

interface RequestBody {
  date: string; // YYYY-MM-DD
  techIds?: number[];
  agencySlug?: string; // Pour franchiseur multi-agences
}

// Cache simple pour géocodage (évite appels répétés BAN)
const geoCache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Géocode une adresse via api-adresse.data.gouv.fr (BAN)
 */
async function geocodeAddress(address: string, postalCode: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const fullAddress = `${address} ${postalCode} ${city}`.trim();
  
  // Check cache
  if (geoCache.has(fullAddress)) {
    return geoCache.get(fullAddress) ?? null;
  }
  
  try {
    const query = encodeURIComponent(fullAddress);
    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${query}&limit=1`);
    
    if (!response.ok) {
      console.warn(`[GET-RDV-MAP] BAN API error: ${response.status}`);
      geoCache.set(fullAddress, null);
      return null;
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      const result = { lat, lng };
      geoCache.set(fullAddress, result);
      return result;
    }
    
    geoCache.set(fullAddress, null);
    return null;
  } catch (error) {
    console.error('[GET-RDV-MAP] Geocoding error:', error);
    geoCache.set(fullAddress, null);
    return null;
  }
}

/**
 * Masque partiellement une adresse pour affichage
 */
function maskAddress(address: string, postalCode: string, city: string): string {
  // Format: "12 Rue *** - 40*** Dax"
  const maskedStreet = address ? address.split(' ').slice(0, 2).join(' ') + ' ***' : '';
  const maskedPostal = postalCode ? postalCode.substring(0, 2) + '***' : '';
  return `${maskedStreet} - ${maskedPostal} ${city}`.trim();
}

Deno.serve(async (req) => {
  // CORS preflight
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    // 1. Authentification JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Authorization header required' }),
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
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 2. Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('agence, global_role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 3. Rate limiting (50 req/min - carte = requêtes fréquentes)
    const rateCheck = await checkRateLimit(`rdv-map:${user.id}`, { limit: 50, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);
    }

    // 4. Parser la requête
    const body: RequestBody = await req.json();
    const { date, techIds, agencySlug: requestedAgency } = body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Invalid date format (expected YYYY-MM-DD)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 5. Déterminer l'agence cible avec contrôle d'accès
    const isFranchiseurRole = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(profile.global_role || '');
    let targetAgency = profile.agence;

    if (requestedAgency && requestedAgency !== profile.agence) {
      if (!isFranchiseurRole) {
        return withCors(req, new Response(
          JSON.stringify({ success: false, error: 'Access denied to this agency' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      
      // Vérifier que l'agence existe
      const { data: agency } = await supabase
        .from('apogee_agencies')
        .select('slug')
        .eq('slug', requestedAgency)
        .eq('is_active', true)
        .maybeSingle();
      
      if (!agency) {
        return withCors(req, new Response(
          JSON.stringify({ success: false, error: 'Agency not found' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      
      targetAgency = requestedAgency;
    }

    if (!targetAgency) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'No agency configured' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 6. Appeler l'API Apogée pour les interventions
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Fetch interventions
    const interventionsUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetInterventions`;
    const interventionsResponse = await fetch(interventionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        API_KEY: apiKey,
        from: date,
        to: date,
      }),
    });

    if (!interventionsResponse.ok) {
      console.error(`[GET-RDV-MAP] Apogee API error: ${interventionsResponse.status}`);
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Apogee API error' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const interventions = await interventionsResponse.json();

    // 7. Fetch users pour les couleurs
    const usersUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetUsers`;
    const usersResponse = await fetch(usersUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });

    const users = usersResponse.ok ? await usersResponse.json() : [];
    const usersById = new Map<number, { name: string; color: string }>();
    
    for (const u of users) {
      usersById.set(u.id, {
        name: `${u.firstname || ''} ${u.lastname || ''}`.trim() || u.name || `User ${u.id}`,
        color: u.bgcolor || u.color || '#6366f1', // Default indigo
      });
    }

    // 8. Fetch projects pour les adresses et univers
    const projectsUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetProjects`;
    const projectsResponse = await fetch(projectsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });

    const projects = projectsResponse.ok ? await projectsResponse.json() : [];
    const projectsById = new Map<number, { address: string; postalCode: string; city: string; univers: string }>();
    
    for (const p of projects) {
      const data = p.data || {};
      projectsById.set(p.id, {
        address: data.adresse || p.adresse || '',
        postalCode: data.codePostal || p.codePostal || '',
        city: data.ville || p.ville || '',
        univers: Array.isArray(data.universes) ? data.universes[0] : (data.univers || 'Non classé'),
      });
    }

    // 9. Transformer les interventions en MapRdv
    const mapRdvs: MapRdv[] = [];
    
    for (const intervention of interventions) {
      // Filtrer par technicien si demandé
      const technicianIds: number[] = [];
      
      // Technicien principal
      if (intervention.userId) {
        technicianIds.push(intervention.userId);
      }
      
      // Techniciens des visites
      if (Array.isArray(intervention.visites)) {
        for (const visite of intervention.visites) {
          if (Array.isArray(visite.usersIds)) {
            technicianIds.push(...visite.usersIds);
          }
        }
      }
      
      const uniqueTechIds = [...new Set(technicianIds)];
      
      // Appliquer le filtre technicien
      if (techIds && techIds.length > 0) {
        const hasMatchingTech = uniqueTechIds.some(id => techIds.includes(id));
        if (!hasMatchingTech) continue;
      }
      
      // Récupérer les infos du projet
      const project = projectsById.get(intervention.projectId);
      if (!project || !project.address) continue;
      
      // Géocoder l'adresse
      const coords = await geocodeAddress(project.address, project.postalCode, project.city);
      if (!coords) continue;
      
      // Construire la liste des techniciens avec leurs couleurs
      const rdvUsers: MapRdvUser[] = uniqueTechIds.slice(0, 10).map(id => {
        const userData = usersById.get(id);
        return {
          id,
          name: userData?.name || `Tech ${id}`,
          color: userData?.color || '#6366f1',
        };
      });
      
      // Calculer la durée (en minutes)
      let durationMin = 60; // Default 1h
      if (intervention.dateStart && intervention.dateEnd) {
        const start = new Date(intervention.dateStart).getTime();
        const end = new Date(intervention.dateEnd).getTime();
        durationMin = Math.round((end - start) / 60000);
      }
      
      mapRdvs.push({
        rdvId: intervention.id,
        projectId: intervention.projectId,
        lat: coords.lat,
        lng: coords.lng,
        startAt: intervention.dateStart || intervention.date || date,
        durationMin,
        univers: project.univers,
        address: maskAddress(project.address, project.postalCode, project.city),
        users: rdvUsers,
      });
    }

    console.log(`[GET-RDV-MAP] Returned ${mapRdvs.length} RDVs for ${targetAgency} on ${date}`);

    return withCors(req, new Response(
      JSON.stringify({
        success: true,
        data: mapRdvs,
        meta: {
          date,
          agencySlug: targetAgency,
          totalRdvs: mapRdvs.length,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[GET-RDV-MAP] Exception:', error);
    captureEdgeException(error, { function: 'get-rdv-map' });
    
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
