/**
 * GET-ZONES-DEPLACEMENT - Calcul mensuel des zones BTP par technicien
 * 
 * Pour chaque jour du mois, pour chaque technicien :
 * - Trouve le RDV le plus éloigné du dépôt (agence) à vol d'oiseau
 * - Classifie la distance max en zone BTP (1A/1B/2/3/4/5)
 * - Agrège les compteurs mensuels
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type ZoneLabel = '1A' | '1B' | '2' | '3' | '4' | '5';

function classifyZone(km: number): ZoneLabel | null {
  if (km <= 5) return '1A';
  if (km <= 10) return '1B';
  if (km <= 20) return '2';
  if (km <= 30) return '3';
  if (km <= 40) return '4';
  if (km <= 50) return '5';
  return null; // > 50 km = grand déplacement, hors scope
}

async function geocodeAddress(address: string, postalCode: string, city: string): Promise<{ lat: number; lng: number } | null> {
  // Try multiple strategies in order of precision
  const queries = [
    `${address} ${city}`.trim(),
    `${address} ${postalCode} ${city}`.trim(),
    city ? `${postalCode} ${city}`.trim() : '',
    postalCode || '',
  ].filter(q => q.length > 2);

  for (const textQuery of queries) {
    try {
      const params = [`q=${encodeURIComponent(textQuery)}`, 'limit=1'];
      if (postalCode?.length >= 2) params.push(`postcode=${encodeURIComponent(postalCode)}`);
      
      const url = `https://api-adresse.data.gouv.fr/search/?${params.join('&')}`;
      const response = await fetch(url);
      if (!response.ok) continue;
      
      const data = await response.json();
      if (data.features?.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        return { lat, lng };
      }
    } catch {
      continue;
    }
  }
  return null;
}

function getDaysInMonth(monthStr: string): string[] {
  const [year, month] = monthStr.split('-').map(Number);
  const days: string[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) {
    days.push(`${year}-${String(month).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return days;
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Authorization required' }),
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

    // Rate limit
    const rateCheck = await checkRateLimit(`zones-dep:${user.id}`, { limit: 10, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.retryAfter!, 
        isOriginAllowed(req.headers.get('origin')) ? getCorsHeaders(req.headers.get('origin')!) : {}
      );
    }

    // Parse body
    const { month, agencySlug } = await req.json();
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Invalid month format (YYYY-MM)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // Get user profile for agency access
    const { data: profile } = await supabase
      .from('profiles')
      .select('agence, global_role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Profile not found' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const globalRole = profile.global_role || '';
    const isFranchiseur = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(globalRole);
    let targetAgency = agencySlug || profile.agence;

    if (agencySlug && agencySlug !== profile.agence && !isFranchiseur) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Access denied' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    if (!targetAgency) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'No agency' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 1. Get agency address and geocode depot
    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('adresse, code_postal, ville')
      .eq('slug', targetAgency)
      .eq('is_active', true)
      .maybeSingle();

    if (!agency?.adresse) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Adresse agence non renseignée' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const depot = await geocodeAddress(agency.adresse, agency.code_postal || '', agency.ville || '');
    if (!depot) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Impossible de géocoder l\'adresse de l\'agence' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    console.log(`[ZONES] Depot: ${agency.adresse} → ${depot.lat}, ${depot.lng}`);

    // 2. Get API key
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Server config error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 3. Fetch users for names/colors
    const usersUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetUsers`;
    const usersResp = await fetch(usersUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });
    const allUsers = usersResp.ok ? await usersResp.json() : [];
    const usersById = new Map<number, string>();
    for (const u of allUsers) {
      // Only include technicians (is_on and type check)
      const data = u.data || {};
      const isTech = u.is_on && (data.type === 'Technicien' || data.isTechnicien === true || u.type === 'Technicien');
      if (isTech) {
        usersById.set(u.id, `${u.firstname || ''} ${u.lastname || u.name || ''}`.trim() || `Tech ${u.id}`);
      }
    }

    // 4. Fetch clients for addresses
    const clientsUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetClients`;
    const clientsResp = await fetch(clientsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });
    const allClients = clientsResp.ok ? await clientsResp.json() : [];
    const clientsById = new Map<number, { address: string; postalCode: string; city: string }>();
    for (const c of allClients) {
      const d = c.data || {};
      clientsById.set(c.id, {
        address: d.adresse || c.adresse || c.address || '',
        postalCode: d.codePostal || c.codePostal || c.postalCode || '',
        city: d.ville || c.ville || c.city || '',
      });
    }

    // 5. Fetch projects for client mapping
    const projectsUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetProjects`;
    const projectsResp = await fetch(projectsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });
    const allProjects = projectsResp.ok ? await projectsResp.json() : [];
    const projectClientMap = new Map<number, number>();
    for (const p of allProjects) {
      if (typeof p.clientId === 'number') {
        projectClientMap.set(p.id, p.clientId);
      }
    }

    // 6. Fetch interventions for the whole month
    const days = getDaysInMonth(month);
    const fromDate = days[0];
    const toDate = days[days.length - 1];

    const interventionsUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetInterventions`;
    const intResp = await fetch(interventionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey, from: fromDate, to: toDate }),
    });

    if (!intResp.ok) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Apogee API error' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    const allInterventions = await intResp.json();
    const interventions = Array.isArray(allInterventions) ? allInterventions : [];

    console.log(`[ZONES] ${interventions.length} interventions for ${month}, ${usersById.size} techs`);

    // 7. Geocode cache for client addresses
    const geoCache = new Map<string, { lat: number; lng: number } | null>();

    async function getClientCoords(clientId: number): Promise<{ lat: number; lng: number } | null> {
      const client = clientsById.get(clientId);
      if (!client?.address) return null;
      
      const cacheKey = `${client.address}|${client.postalCode}|${client.city}`;
      if (geoCache.has(cacheKey)) return geoCache.get(cacheKey) ?? null;
      
      const result = await geocodeAddress(client.address, client.postalCode, client.city);
      geoCache.set(cacheKey, result);
      return result;
    }

    // 8. Process: for each day, for each tech → find max distance to depot
    // Map: techId → Map<date, maxDistKm>
    const techDayMax = new Map<number, Map<string, number>>();

    for (const intervention of interventions) {
      const data = intervention?.data || {};
      const visites = Array.isArray(data.visites) ? data.visites : [];
      const projectId = intervention?.projectId ?? intervention?.project_id;
      const clientId = projectId ? projectClientMap.get(projectId) : null;

      for (const visite of visites) {
        const vDate = typeof visite?.date === 'string' ? visite.date.substring(0, 10) : null;
        if (!vDate || !days.includes(vDate)) continue;

        const techIds: number[] = Array.isArray(visite?.usersIds) ? visite.usersIds : [];
        
        // Only process techs we know about
        const relevantTechs = techIds.filter(id => usersById.has(id));
        if (relevantTechs.length === 0) continue;

        // Get coordinates for this intervention's client
        let coords: { lat: number; lng: number } | null = null;
        if (clientId) {
          coords = await getClientCoords(clientId);
        }
        if (!coords) continue;

        const distKm = haversineKm(depot.lat, depot.lng, coords.lat, coords.lng);

        for (const techId of relevantTechs) {
          if (!techDayMax.has(techId)) techDayMax.set(techId, new Map());
          const dayMap = techDayMax.get(techId)!;
          const current = dayMap.get(vDate) ?? 0;
          if (distKm > current) dayMap.set(vDate, distKm);
        }
      }
    }

    // 9. Aggregate into zone counts per tech
    const ZONE_LABELS: ZoneLabel[] = ['1A', '1B', '2', '3', '4', '5'];
    const results: Array<{
      techId: number;
      techName: string;
      zones: Record<ZoneLabel, number>;
      total: number;
    }> = [];

    for (const [techId, dayMap] of techDayMax.entries()) {
      const zones: Record<ZoneLabel, number> = { '1A': 0, '1B': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      let total = 0;

      for (const [, maxKm] of dayMap) {
        const zone = classifyZone(maxKm);
        if (zone) {
          zones[zone]++;
          total++;
        }
      }

      results.push({
        techId,
        techName: usersById.get(techId) || `Tech ${techId}`,
        zones,
        total,
      });
    }

    // Sort by name
    results.sort((a, b) => a.techName.localeCompare(b.techName));

    console.log(`[ZONES] Result: ${results.length} techs, ${geoCache.size} geocoded addresses`);

    return withCors(req, new Response(
      JSON.stringify({ success: true, data: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    ));

  } catch (error) {
    console.error('[ZONES] Error:', error);
    return withCors(req, new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    ));
  }
});
