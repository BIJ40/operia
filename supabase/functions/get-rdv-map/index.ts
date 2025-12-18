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
  address: string; // Adresse complète pour affichage
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
 * Utilise le paramètre postcode pour éviter les homonymes (St Vincent de Paul 40 vs 35)
 */
async function geocodeAddress(address: string, postalCode: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `${address}|${postalCode}|${city}`.toLowerCase();
  
  // Check cache
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey) ?? null;
  }
  
  try {
    // Construire la requête avec le code postal comme filtre obligatoire si disponible
    const queryParts: string[] = [];
    
    // Requête texte: adresse + ville (sans code postal dans le texte, il sera filtré)
    const textQuery = `${address} ${city}`.trim();
    queryParts.push(`q=${encodeURIComponent(textQuery)}`);
    
    // Filtre par code postal (critique pour éviter les homonymes)
    if (postalCode && postalCode.length >= 2) {
      queryParts.push(`postcode=${encodeURIComponent(postalCode)}`);
    }
    
    queryParts.push('limit=1');
    
    const url = `https://api-adresse.data.gouv.fr/search/?${queryParts.join('&')}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn(`[GET-RDV-MAP] BAN API error: ${response.status} for ${textQuery}`);
      geoCache.set(cacheKey, null);
      return null;
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lng, lat] = feature.geometry.coordinates;
      
      // Vérification: le résultat doit être dans le bon département (2 premiers chiffres du CP)
      const resultPostcode = feature.properties?.postcode || '';
      const expectedDept = postalCode?.substring(0, 2);
      const resultDept = resultPostcode.substring(0, 2);
      
      if (expectedDept && resultDept && expectedDept !== resultDept) {
        console.warn(`[GET-RDV-MAP] Geocode mismatch: expected dept ${expectedDept}, got ${resultDept} for "${textQuery}" ${postalCode}`);
        // Fallback: essayer avec le code postal complet dans la requête texte
        const fallbackUrl = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(`${address} ${postalCode} ${city}`)}&limit=1`;
        const fallbackResponse = await fetch(fallbackUrl);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.features?.length > 0) {
            const [fbLng, fbLat] = fallbackData.features[0].geometry.coordinates;
            const result = { lat: fbLat, lng: fbLng };
            geoCache.set(cacheKey, result);
            return result;
          }
        }
        geoCache.set(cacheKey, null);
        return null;
      }
      
      const result = { lat, lng };
      geoCache.set(cacheKey, result);
      return result;
    }
    
    geoCache.set(cacheKey, null);
    return null;
  } catch (error) {
    console.error('[GET-RDV-MAP] Geocoding error:', error);
    geoCache.set(cacheKey, null);
    return null;
  }
}

/**
 * Formate une adresse complète pour affichage
 */
function formatAddress(address: string, postalCode: string, city: string): string {
  const parts: string[] = [];
  if (address) parts.push(address);
  if (postalCode || city) parts.push(`${postalCode} ${city}`.trim());
  return parts.join(' - ') || 'Adresse non renseignée';
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

    const interventionsAll = await interventionsResponse.json();

    const interventions = Array.isArray(interventionsAll)
      ? interventionsAll.filter((it: any) => {
          const rawDate = typeof it?.date === 'string' ? it.date : '';
          if (rawDate.startsWith(date)) return true;

          const visites = it?.data?.visites;
          if (Array.isArray(visites)) {
            return visites.some((v: any) => typeof v?.date === 'string' && v.date.startsWith(date));
          }

          return false;
        })
      : [];

    console.log(
      `[GET-RDV-MAP] Got ${interventions.length}/${Array.isArray(interventionsAll) ? interventionsAll.length : 0} interventions for ${targetAgency} on ${date}`
    );

    // 7. Fetch users pour les couleurs
    const usersUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetUsers`;
    const usersResponse = await fetch(usersUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });

    const users = usersResponse.ok ? await usersResponse.json() : [];
    const usersById = new Map<number, { name: string; color: string }>();
    
    // Log sample user pour debug des champs couleur
    if (users.length > 0) {
      const sample = users[0];
      console.log(`[GET-RDV-MAP] Sample user keys: ${Object.keys(sample).join(', ')}`);
      console.log(`[GET-RDV-MAP] Sample user color fields: bgcolor=${sample.bgcolor}, color=${sample.color}, bgColor=${sample.bgColor}`);
    }
    
    for (const u of users) {
      // L'API Apogée stocke les couleurs dans data.bgcolor.hex ou data.color.hex
      const dataObj = u.data || {};
      const color = dataObj.bgcolor?.hex || dataObj.bgColor?.hex || dataObj.color?.hex 
        || u.bgcolor?.hex || u.bgColor?.hex || u.color?.hex
        || (typeof u.bgcolor === 'string' ? u.bgcolor : null)
        || (typeof u.color === 'string' ? u.color : null)
        || '#6366f1';
      
      usersById.set(u.id, {
        name: `${u.firstname || ''} ${u.lastname || u.name || ''}`.trim() || `User ${u.id}`,
        color,
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
    console.log(`[GET-RDV-MAP] Got ${projects.length} projects from Apogée`);

    const projectsById = new Map<number, { univers: string; clientId?: number | null }>();

    for (const p of projects) {
      const data = p.data || {};
      projectsById.set(p.id, {
        univers: Array.isArray(data.universes) ? data.universes[0] : (data.univers || 'Non classé'),
        clientId: typeof p.clientId === 'number' ? p.clientId : null,
      });
    }

    // 8bis. Fetch clients (pour l'adresse / localisation)
    const clientsUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetClients`;
    const clientsResponse = await fetch(clientsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });

    const clients = clientsResponse.ok ? await clientsResponse.json() : [];
    console.log(`[GET-RDV-MAP] Got ${clients.length} clients from Apogée`);

    const clientsById = new Map<number, { address: string; postalCode: string; city: string }>();

    for (const c of clients) {
      const data = c.data || {};
      const address = data.adresse || c.adresse || c.address || '';
      const postalCode = data.codePostal || c.codePostal || c.postalCode || '';
      const city = data.ville || c.ville || c.city || '';
      clientsById.set(c.id, { address, postalCode, city });
    }

    // 9. Transformer les interventions en MapRdv
    const mapRdvs: MapRdv[] = [];
    let skippedNoProject = 0;
    let skippedNoClientAddress = 0;
    let skippedNoGeocode = 0;
    let skippedNoTech = 0;

    for (const intervention of interventions as any[]) {
      const data = intervention?.data || {};
      const visites = Array.isArray(data.visites) ? data.visites : [];

      // IMPORTANT: Filtrer les visites du jour AVANT d'extraire les techniciens
      const visitesDuJour = visites.filter(
        (v: any) => typeof v?.date === 'string' && v.date.startsWith(date)
      );

      // Si aucune visite ce jour-là, on skip cette intervention
      if (visitesDuJour.length === 0) {
        continue;
      }

      // Techniciens: UNIQUEMENT ceux des visites du jour sélectionné
      const technicianIds: number[] = [];
      for (const v of visitesDuJour) {
        if (Array.isArray(v?.usersIds)) {
          technicianIds.push(...v.usersIds);
        }
      }

      const uniqueTechIds = [...new Set(technicianIds)].filter((x): x is number => typeof x === 'number');
      if (uniqueTechIds.length === 0) {
        skippedNoTech++;
        continue;
      }

      // Appliquer le filtre technicien
      if (techIds && techIds.length > 0) {
        const hasMatchingTech = uniqueTechIds.some((id) => techIds.includes(id));
        if (!hasMatchingTech) continue;
      }

      // Infos projet (univers)
      const project = projectsById.get(intervention.projectId);
      if (!project) {
        skippedNoProject++;
        continue;
      }

      // Localisation: on part du client/site (client_id intervention, sinon clientId projet)
      const rawClientId = intervention.client_id ?? project.clientId;
      const clientId = typeof rawClientId === 'number' ? rawClientId : null;
      const client = clientId ? clientsById.get(clientId) : undefined;

      if (!client?.address) {
        skippedNoClientAddress++;
        continue;
      }

      const coords = await geocodeAddress(client.address, client.postalCode, client.city);
      if (!coords) {
        skippedNoGeocode++;
        continue;
      }

      // StartAt + Durée: on prend la première visite du jour
      const visiteRef = visitesDuJour[0];

      const startAt = typeof visiteRef?.date === 'string' ? visiteRef.date : date;

      const durationMin = typeof visiteRef?.duree === 'number'
        ? visiteRef.duree
        : (typeof intervention?.duree === 'number' ? intervention.duree : 60);

      // Techniciens du jour (nom + couleur)
      const rdvUsers: MapRdvUser[] = uniqueTechIds.slice(0, 10).map((id) => {
        const userData = usersById.get(id);
        return {
          id,
          name: userData?.name || `Tech ${id}`,
          color: userData?.color || '#6366f1',
        };
      });

      mapRdvs.push({
        rdvId: intervention.id,
        projectId: intervention.projectId,
        lat: coords.lat,
        lng: coords.lng,
        startAt,
        durationMin,
        univers: project.univers,
        address: formatAddress(client.address, client.postalCode, client.city),
        users: rdvUsers,
      });
    }

    console.log(`[GET-RDV-MAP] Summary for ${targetAgency} on ${date}: ${mapRdvs.length} RDVs returned, skipped: ${skippedNoProject} no project, ${skippedNoClientAddress} no client address, ${skippedNoTech} no tech, ${skippedNoGeocode} geocode failed`);

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
