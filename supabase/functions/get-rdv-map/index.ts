/**
 * GET-RDV-MAP - Endpoint sécurisé pour la carte des RDV
 * 
 * v3: Optimized with geocode_cache + postal code aggregation for heatmap/profitability/zones
 * Geocoding reduced from ~5000 individual calls to ~100 cached postal code lookups
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.81.1';
import { handleCorsPreflightOrReject, withCors, getCorsHeaders, isOriginAllowed } from '../_shared/cors.ts';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { captureEdgeException } from '../_shared/sentry.ts';

interface MapRdvUser { id: number; name: string; color: string; }
interface MapRdv {
  rdvId: number; projectId: number; projectRef: string; clientName: string;
  lat: number; lng: number; startAt: string; endAt: string; durationMin: number;
  univers: string; address: string; users: MapRdvUser[];
}
interface RequestBody {
  date?: string; from?: string; to?: string;
  mode?: 'normal' | 'heatmap' | 'profitability' | 'zones' | 'apporteurs';
  techIds?: number[]; agencySlug?: string;
}

// In-memory cache for geocoding within a single request
const geoCache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Geocode via BAN API with postal code filter
 */
async function geocodeAddress(address: string, postalCode: string, city: string): Promise<{ lat: number; lng: number } | null> {
  const cacheKey = `${address}|${postalCode}|${city}`.toLowerCase();
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey) ?? null;
  
  try {
    const textQuery = `${address} ${city}`.trim();
    const params = [`q=${encodeURIComponent(textQuery)}`, 'limit=1'];
    if (postalCode?.length >= 2) params.push(`postcode=${encodeURIComponent(postalCode)}`);
    
    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.join('&')}`);
    if (!response.ok) {
      console.warn(`[GET-RDV-MAP] BAN API error: ${response.status} for ${textQuery}`);
      geoCache.set(cacheKey, null);
      return null;
    }
    
    const data = await response.json();
    if (data.features?.length > 0) {
      const [lng, lat] = data.features[0].geometry.coordinates;
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
 * Batch geocode postal codes using DB cache + BAN API for misses
 * Returns Map<postalCode, {lat, lng}>
 */
async function batchGeocodePostalCodes(
  postalCodes: Map<string, string>, // postalCode → city
  supabaseAdmin: any
): Promise<Map<string, { lat: number; lng: number }>> {
  const result = new Map<string, { lat: number; lng: number }>();
  const keys = Array.from(postalCodes.keys());
  if (keys.length === 0) return result;

  // 1. Check DB cache
  const cacheKeys = keys.map(pc => `${pc}|${(postalCodes.get(pc) || '').toLowerCase()}`);
  const { data: cached } = await supabaseAdmin
    .from('geocode_cache')
    .select('cache_key, postal_code, lat, lng')
    .in('cache_key', cacheKeys);

  const cachedSet = new Set<string>();
  if (cached) {
    for (const row of cached) {
      result.set(row.postal_code, { lat: row.lat, lng: row.lng });
      cachedSet.add(row.postal_code);
    }
  }
  
  console.log(`[GET-RDV-MAP] Geocode cache: ${cachedSet.size}/${keys.length} hits`);

  // 2. Geocode misses via BAN (only uncached ones)
  const misses = keys.filter(pc => !cachedSet.has(pc));
  const toInsert: any[] = [];

  // Process in parallel batches of 10
  const BATCH_SIZE = 10;
  for (let i = 0; i < misses.length; i += BATCH_SIZE) {
    const batch = misses.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (pc) => {
      const city = postalCodes.get(pc) || '';
      const coords = await geocodeAddress('', pc, city);
      if (coords) {
        result.set(pc, coords);
        toInsert.push({
          cache_key: `${pc}|${city.toLowerCase()}`,
          postal_code: pc,
          city,
          lat: coords.lat,
          lng: coords.lng,
          source: 'ban',
        });
      }
    });
    await Promise.all(promises);
  }

  // 3. Store new results in DB cache
  if (toInsert.length > 0) {
    await supabaseAdmin
      .from('geocode_cache')
      .upsert(toInsert, { onConflict: 'cache_key', ignoreDuplicates: true })
      .then(() => console.log(`[GET-RDV-MAP] Cached ${toInsert.length} new geocode results`));
  }

  return result;
}

function formatAddress(address: string, postalCode: string, city: string): string {
  const parts: string[] = [];
  if (address) parts.push(address);
  if (postalCode || city) parts.push(`${postalCode} ${city}`.trim());
  return parts.join(' - ') || 'Adresse non renseignée';
}

Deno.serve(async (req) => {
  const corsResult = handleCorsPreflightOrReject(req);
  if (corsResult) return corsResult;

  const origin = req.headers.get('origin') ?? '';
  const corsHeaders = isOriginAllowed(origin) ? getCorsHeaders(origin) : {};

  try {
    // 1. Auth
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

    // Service role client for geocode cache writes
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 2. Profile + access control
    const { data: profile } = await supabase.from('profiles').select('agence, global_role').eq('id', user.id).single();
    const { data: apporteurUser } = await supabase.from('apporteur_users').select('agency_id, apporteur_id, is_active').eq('user_id', user.id).eq('is_active', true).maybeSingle();

    const isApporteurUser = !!apporteurUser?.is_active;
    if (!profile && !isApporteurUser) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Profile not found' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    // Rate limiting
    const rateCheck = await checkRateLimit(`rdv-map:${user.id}`, { limit: 50, windowMs: 60 * 1000 });
    if (!rateCheck.allowed) return rateLimitResponse(rateCheck.retryAfter!, corsHeaders);

    // 3. Parse request
    const body: RequestBody = await req.json();
    const { date, from: fromDate, to: toDate, techIds, agencySlug: requestedAgency, mode = 'normal' } = body;
    const isHeatmap = mode === 'heatmap';
    const isProfitability = mode === 'profitability';
    const isZones = mode === 'zones';
    const isApporteurs = mode === 'apporteurs';
    const isAnalyticsMode = isHeatmap || isProfitability || isZones || isApporteurs;

    const effectiveFrom = isAnalyticsMode ? (fromDate || '2020-01-01') : date;
    const effectiveTo = isAnalyticsMode ? (toDate || new Date().toISOString().slice(0, 10)) : date;

    if (!isAnalyticsMode && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Invalid date format' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    // 4. Determine target agency
    const globalRole = profile?.global_role || '';
    const isFranchiseurRole = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(globalRole);
    let targetAgency = profile?.agence || null;

    if (isApporteurUser && apporteurUser?.agency_id) {
      const { data: apAgency } = await supabase.from('apogee_agencies').select('slug').eq('id', apporteurUser.agency_id).eq('is_active', true).maybeSingle();
      if (apAgency?.slug) targetAgency = apAgency.slug;
    }

    const isN0DemoUser = !profile?.agence && profile?.global_role === 'base_user';
    const DEMO_AGENCY_SLUG = 'dax';

    if (requestedAgency && requestedAgency !== targetAgency) {
      if (isApporteurUser) {
        if (targetAgency && requestedAgency !== targetAgency) {
          return withCors(req, new Response(JSON.stringify({ success: false, error: 'Access denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
        }
      } else if (isN0DemoUser && requestedAgency === DEMO_AGENCY_SLUG) {
        targetAgency = DEMO_AGENCY_SLUG;
      } else if (!isFranchiseurRole) {
        return withCors(req, new Response(JSON.stringify({ success: false, error: 'Access denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } }));
      } else {
        const { data: agency } = await supabase.from('apogee_agencies').select('slug').eq('slug', requestedAgency).eq('is_active', true).maybeSingle();
        if (!agency) return withCors(req, new Response(JSON.stringify({ success: false, error: 'Agency not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }));
        targetAgency = requestedAgency;
      }
    }

    if (!targetAgency && isN0DemoUser) targetAgency = DEMO_AGENCY_SLUG;
    if (!targetAgency) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'No agency configured' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }

    // 5. API key
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    if (!apiKey) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Server configuration error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }

    const baseUrl = `https://${targetAgency}.hc-apogee.fr/api`;
    const apiFetch = (endpoint: string, body: any = { API_KEY: apiKey }) =>
      fetch(`${baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

    // 6. Fetch data from Apogée
    const t0 = Date.now();

    if (isAnalyticsMode) {
      // ── ANALYTICS MODES (heatmap, profitability, zones) ──
      // Strategy: aggregate by postal code, batch geocode ~100 postal codes instead of ~5000 addresses
      
      // Fetch interventions + projects + clients in parallel
      const fetchPromises: Promise<any>[] = [
        apiFetch('apiGetInterventions', { API_KEY: apiKey, from: effectiveFrom, to: effectiveTo }),
        apiFetch('apiGetProjects'),
        apiFetch('apiGetClients'),
      ];
      
      // For profitability/zones/apporteurs, also fetch factures
      if (isProfitability || isZones || isApporteurs) {
        fetchPromises.push(apiFetch('apiGetFactures'));
      }
      // For zones/apporteurs, also fetch devis
      if (isZones || isApporteurs) {
        fetchPromises.push(apiFetch('apiGetDevis'));
      }

      const responses = await Promise.all(fetchPromises);
      const [intResp, projResp, clientResp] = responses;
      
      const interventions = intResp.ok ? await intResp.json() : [];
      const projects = projResp.ok ? await projResp.json() : [];
      const clients = clientResp.ok ? await clientResp.json() : [];
      const factures = (isProfitability || isZones || isApporteurs) && responses[3]?.ok ? await responses[3].json() : [];
      const devis = (isZones || isApporteurs) && responses[4]?.ok ? await responses[4].json() : [];

      console.log(`[GET-RDV-MAP] Fetched ${Array.isArray(interventions) ? interventions.length : 0} interventions, ${projects.length} projects, ${clients.length} clients in ${Date.now() - t0}ms`);

      // Build lookup maps
      const clientsById = new Map<number, { name: string; address: string; postalCode: string; city: string }>();
      for (const c of clients) {
        const data = c.data || {};
        clientsById.set(c.id, {
          name: c.name || c.nom || data.nom || `Client #${c.id}`,
          address: data.adresse || c.adresse || c.address || '',
          postalCode: data.codePostal || c.codePostal || c.postalCode || '',
          city: data.ville || c.ville || c.city || '',
        });
      }

      const projectsById = new Map<number, { univers: string; clientId?: number | null; ref: string }>();
      for (const p of projects) {
        const data = p.data || {};
        projectsById.set(p.id, {
          univers: Array.isArray(data.universes) ? data.universes[0] : (data.univers || 'Non classé'),
          clientId: typeof p.clientId === 'number' ? p.clientId : null,
          ref: p.ref || `#${p.id}`,
        });
      }

      // Build postalCode → projects mapping
      const projectsByPostalCode = new Map<string, Set<number>>();
      const projectToPostalCode = new Map<number, string>();
      const postalCodeCities = new Map<string, string>(); // postalCode → best city name

      for (const [pid, proj] of projectsById.entries()) {
        const cid = proj.clientId;
        if (typeof cid !== 'number') continue;
        const client = clientsById.get(cid);
        if (!client?.postalCode || client.postalCode.length < 2) continue;
        
        const pc = client.postalCode;
        projectToPostalCode.set(pid, pc);
        
        if (!projectsByPostalCode.has(pc)) projectsByPostalCode.set(pc, new Set());
        projectsByPostalCode.get(pc)!.add(pid);
        
        if (!postalCodeCities.has(pc) && client.city) {
          postalCodeCities.set(pc, client.city);
        }
      }

      // ── BATCH GEOCODE all postal codes at once ──
      const coordsByPostalCode = await batchGeocodePostalCodes(postalCodeCities, supabaseAdmin);
      console.log(`[GET-RDV-MAP] Geocoded ${coordsByPostalCode.size}/${postalCodeCities.size} postal codes in ${Date.now() - t0}ms`);

      // ── HEATMAP MODE ──
      if (isHeatmap) {
        const heatPoints: { lat: number; lng: number }[] = [];
        const interventionArray = Array.isArray(interventions) ? interventions : [];
        
        for (const intervention of interventionArray) {
          const project = projectsById.get(intervention.projectId);
          if (!project) continue;
          const pc = projectToPostalCode.get(intervention.projectId);
          if (!pc) continue;
          const coords = coordsByPostalCode.get(pc);
          if (!coords) continue;
          
          // Add slight random jitter so points don't stack on exact same spot
          heatPoints.push({
            lat: coords.lat + (Math.random() - 0.5) * 0.008,
            lng: coords.lng + (Math.random() - 0.5) * 0.008,
          });
        }

        console.log(`[GET-RDV-MAP] Heatmap: ${heatPoints.length} points in ${Date.now() - t0}ms total`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: heatPoints,
          meta: { mode: 'heatmap', from: effectiveFrom, to: effectiveTo, agencySlug: targetAgency, totalPoints: heatPoints.length, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      // ── PROFITABILITY MODE ──
      if (isProfitability) {
        const caByProject = new Map<number, number>();
        for (const f of factures) {
          const pid = f.projectId;
          if (typeof pid !== 'number') continue;
          const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
          const montant = parseFloat(f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? 0) || 0;
          caByProject.set(pid, (caByProject.get(pid) || 0) + (isAvoir ? -Math.abs(montant) : montant));
        }

        const hoursByProject = new Map<number, number>();
        const interventionArray = Array.isArray(interventions) ? interventions : [];
        for (const intervention of interventionArray) {
          const pid = intervention.projectId;
          if (typeof pid !== 'number') continue;
          const visites = Array.isArray(intervention?.data?.visites) ? intervention.data.visites : [];
          let totalMin = 0;
          for (const v of visites) totalMin += typeof v?.duree === 'number' ? v.duree : 60;
          if (totalMin === 0) totalMin = typeof intervention?.duree === 'number' ? intervention.duree : 60;
          hoursByProject.set(pid, (hoursByProject.get(pid) || 0) + totalMin / 60);
        }

        const HOURLY_COST = 35;
        const projectPoints: any[] = [];
        const processedProjects = new Set<number>();

        for (const intervention of interventionArray) {
          const pid = intervention.projectId;
          if (processedProjects.has(pid)) continue;
          processedProjects.add(pid);

          const pc = projectToPostalCode.get(pid);
          if (!pc) continue;
          const coords = coordsByPostalCode.get(pc);
          if (!coords) continue;

          const ca = caByProject.get(pid) || 0;
          const hours = hoursByProject.get(pid) || 0;
          if (ca === 0 && hours === 0) continue;

          projectPoints.push({
            lat: coords.lat + (Math.random() - 0.5) * 0.005,
            lng: coords.lng + (Math.random() - 0.5) * 0.005,
            ca, hours, margin: ca - hours * HOURLY_COST, projectId: pid,
          });
        }

        console.log(`[GET-RDV-MAP] Profitability: ${projectPoints.length} projects in ${Date.now() - t0}ms total`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: projectPoints,
          meta: { mode: 'profitability', agencySlug: targetAgency, totalPoints: projectPoints.length, estimatedHourlyCost: HOURLY_COST, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      // ── ZONES BLANCHES MODE ──
      if (isZones) {
        // Agency coords for proximity
        const { data: agencyData } = await supabase.from('apogee_agencies').select('adresse, code_postal, ville').eq('slug', targetAgency).maybeSingle();
        let agencyCoords: { lat: number; lng: number } | null = null;
        if (agencyData?.code_postal) {
          agencyCoords = coordsByPostalCode.get(agencyData.code_postal) || await geocodeAddress(agencyData.adresse || '', agencyData.code_postal, agencyData.ville || '');
        }

        // Build CA per project
        const caByProject = new Map<number, number>();
        for (const f of factures) {
          const pid = f.projectId;
          if (typeof pid !== 'number') continue;
          const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
          const montant = parseFloat(f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? 0) || 0;
          caByProject.set(pid, (caByProject.get(pid) || 0) + (isAvoir ? -Math.abs(montant) : montant));
        }

        // Build devis per project
        const devisByProject = new Map<number, { total: number; signed: number }>();
        for (const d of devis) {
          const pid = d.projectId;
          if (typeof pid !== 'number') continue;
          const entry = devisByProject.get(pid) || { total: 0, signed: 0 };
          entry.total++;
          if (['accepted', 'validated', 'order', 'signed'].includes((d.state || '').toLowerCase())) entry.signed++;
          devisByProject.set(pid, entry);
        }

        // Count interventions per postal code
        const interventionsByPC = new Map<string, number>();
        const interventionArray = Array.isArray(interventions) ? interventions : [];
        for (const it of interventionArray) {
          const pc = projectToPostalCode.get(it.projectId);
          if (pc) interventionsByPC.set(pc, (interventionsByPC.get(pc) || 0) + 1);
        }

        // Aggregate per postal code
        const allUnivers = new Set<string>();
        const zoneAggregates = new Map<string, {
          projects: Set<number>; clients: Set<number>; apporteurs: Set<number>;
          univers: Set<string>; ca: number; devisTotal: number; devisSigned: number;
        }>();

        for (const [pc, pids] of projectsByPostalCode.entries()) {
          const zone = { projects: new Set<number>(), clients: new Set<number>(), apporteurs: new Set<number>(), univers: new Set<string>(), ca: 0, devisTotal: 0, devisSigned: 0 };
          
          for (const pid of pids) {
            zone.projects.add(pid);
            const proj = projectsById.get(pid);
            if (proj?.clientId) zone.clients.add(proj.clientId);
            if (proj?.univers && proj.univers !== 'Non classé') { zone.univers.add(proj.univers); allUnivers.add(proj.univers); }
            zone.ca += caByProject.get(pid) || 0;
            const dv = devisByProject.get(pid);
            if (dv) { zone.devisTotal += dv.total; zone.devisSigned += dv.signed; }
          }
          zoneAggregates.set(pc, zone);
        }

        const maxProjects = Math.max(...Array.from(zoneAggregates.values()).map(z => z.projects.size), 1);
        const totalUniversCount = allUnivers.size || 1;

        const zoneResults: any[] = [];
        for (const [pc, zone] of zoneAggregates.entries()) {
          const coords = coordsByPostalCode.get(pc);
          if (!coords) continue;

          const nbProjects = zone.projects.size;
          const nbClients = zone.clients.size;
          const nbApporteurs = zone.apporteurs.size;
          const nbUnivers = zone.univers.size;
          const panierMoyen = nbProjects > 0 ? zone.ca / nbProjects : 0;
          const interventionCount = interventionsByPC.get(pc) || 0;

          // Opportunity Score
          let proximityScore = 50;
          if (agencyCoords) {
            const R = 6371;
            const dLat = (coords.lat - agencyCoords.lat) * Math.PI / 180;
            const dLon = (coords.lng - agencyCoords.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(agencyCoords.lat*Math.PI/180)*Math.cos(coords.lat*Math.PI/180)*Math.sin(dLon/2)**2;
            const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            proximityScore = distKm <= 10 ? 100 : distKm <= 30 ? Math.round(100-(distKm-10)*3) : distKm <= 60 ? Math.round(40-(distKm-30)) : 0;
            proximityScore = Math.max(0, Math.min(100, proximityScore));
          }

          const lowActivityScore = Math.round((1 - nbProjects / maxProjects) * 100);
          const historicalScore = nbProjects > 0 ? Math.min(100, nbProjects * 15) : 0;
          const universGap = Math.round(((totalUniversCount - nbUnivers) / totalUniversCount) * 100);
          const apporteurScore = nbApporteurs === 0 ? 100 : nbApporteurs === 1 ? 80 : nbApporteurs <= 3 ? 40 : 0;

          const opportunityScore = Math.min(100, Math.max(0, Math.round(
            0.30*proximityScore + 0.20*lowActivityScore + 0.20*historicalScore + 0.15*universGap + 0.15*apporteurScore
          )));

          const activityLevel = nbProjects === 0 ? 'none' : nbProjects <= 3 ? 'low' : nbProjects <= 10 ? 'medium' : 'high';

          const insights: string[] = [];
          if (proximityScore >= 70 && nbProjects <= 2) insights.push('Zone sous-exploitée proche de l\'agence');
          if (nbApporteurs === 1) insights.push('Dépendance à 1 seul apporteur');
          if (nbApporteurs === 0 && nbProjects > 0) insights.push('Aucun apporteur actif identifié');
          if (nbUnivers <= 1 && nbProjects >= 3) {
            const missing = Array.from(allUnivers).filter(u => !zone.univers.has(u));
            if (missing.length > 0) insights.push(`Métiers absents : ${missing.slice(0, 3).join(', ')}`);
          }
          if (nbProjects > 0 && nbProjects <= 3) insights.push('Présence faible — potentiel d\'ancrage');

          zoneResults.push({
            postalCode: pc, city: postalCodeCities.get(pc) || '', lat: coords.lat, lng: coords.lng,
            nbProjects, nbClients, nbApporteurs, nbUnivers, univers: Array.from(zone.univers),
            ca: Math.round(zone.ca), panierMoyen: Math.round(panierMoyen),
            devisTotal: zone.devisTotal, devisSigned: zone.devisSigned, interventionCount,
            activityLevel, opportunityScore, insights,
          });
        }

        zoneResults.sort((a, b) => b.opportunityScore - a.opportunityScore);

        console.log(`[GET-RDV-MAP] Zones: ${zoneResults.length} postal codes in ${Date.now() - t0}ms total`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: zoneResults,
          meta: { mode: 'zones', agencySlug: targetAgency, totalZones: zoneResults.length, agencyCoords, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
    }

    // ── NORMAL MODE (RDV pins for a specific date) ──
    const interventionsResponse = await apiFetch('apiGetInterventions', { API_KEY: apiKey, from: effectiveFrom, to: effectiveTo });
    if (!interventionsResponse.ok) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Apogee API error' }), { status: 502, headers: { 'Content-Type': 'application/json' } }));
    }
    const interventionsAll = await interventionsResponse.json();
    const interventions = Array.isArray(interventionsAll) ? interventionsAll.filter((it: any) => {
      const rawDate = typeof it?.date === 'string' ? it.date : '';
      if (rawDate.startsWith(date!)) return true;
      const visites = it?.data?.visites;
      if (Array.isArray(visites)) return visites.some((v: any) => typeof v?.date === 'string' && v.date.startsWith(date!));
      return false;
    }) : [];

    // Fetch users + projects + clients in parallel
    const [usersResp, projResp, clientResp] = await Promise.all([
      apiFetch('apiGetUsers'),
      apiFetch('apiGetProjects'),
      apiFetch('apiGetClients'),
    ]);

    const users = usersResp.ok ? await usersResp.json() : [];
    const projects = projResp.ok ? await projResp.json() : [];
    const clients = clientResp.ok ? await clientResp.json() : [];

    const usersById = new Map<number, { name: string; color: string }>();
    for (const u of users) {
      const dataObj = u.data || {};
      const color = dataObj.bgcolor?.hex || dataObj.bgColor?.hex || dataObj.color?.hex || u.bgcolor?.hex || u.bgColor?.hex || u.color?.hex || (typeof u.bgcolor === 'string' ? u.bgcolor : null) || (typeof u.color === 'string' ? u.color : null) || '#6366f1';
      usersById.set(u.id, { name: `${u.firstname || ''} ${u.lastname || u.name || ''}`.trim() || `User ${u.id}`, color });
    }

    const projectsById = new Map<number, { univers: string; clientId?: number | null; ref: string }>();
    for (const p of projects) {
      const data = p.data || {};
      projectsById.set(p.id, { univers: Array.isArray(data.universes) ? data.universes[0] : (data.univers || 'Non classé'), clientId: typeof p.clientId === 'number' ? p.clientId : null, ref: p.ref || `#${p.id}` });
    }

    const clientsById = new Map<number, { name: string; address: string; postalCode: string; city: string }>();
    for (const c of clients) {
      const data = c.data || {};
      const rawName = c.name || c.nom || data.nom || data.name;
      const composedName = [c.prenom || c.firstname || data.prenom, c.nom_famille || c.lastname || data.nom_famille].filter(Boolean).join(' ').trim();
      clientsById.set(c.id, {
        name: rawName || composedName || `Client #${c.id}`,
        address: data.adresse || c.adresse || c.address || '',
        postalCode: data.codePostal || c.codePostal || c.postalCode || '',
        city: data.ville || c.ville || c.city || '',
      });
    }

    const mapRdvs: MapRdv[] = [];
    let skippedNoProject = 0, skippedNoClientAddress = 0, skippedNoGeocode = 0, skippedNoTech = 0;

    for (const intervention of interventions as any[]) {
      const data = intervention?.data || {};
      const visites = Array.isArray(data.visites) ? data.visites : [];
      const visitesDuJour = visites.filter((v: any) => typeof v?.date === 'string' && v.date.startsWith(date!));
      if (visitesDuJour.length === 0) continue;

      const technicianIds: number[] = [];
      for (const v of visitesDuJour) {
        if (Array.isArray(v?.usersIds)) technicianIds.push(...v.usersIds);
      }
      const uniqueTechIds = [...new Set(technicianIds)].filter((x): x is number => typeof x === 'number');
      if (uniqueTechIds.length === 0) { skippedNoTech++; continue; }

      if (techIds?.length && !uniqueTechIds.some(id => techIds.includes(id))) continue;

      const project = projectsById.get(intervention.projectId);
      if (!project) { skippedNoProject++; continue; }

      const rawClientId = intervention.client_id ?? project.clientId;
      const clientId = typeof rawClientId === 'number' ? rawClientId : null;
      const client = clientId ? clientsById.get(clientId) : undefined;
      if (!client?.address) { skippedNoClientAddress++; continue; }

      const coords = await geocodeAddress(client.address, client.postalCode, client.city);
      if (!coords) { skippedNoGeocode++; continue; }

      const visiteRef = visitesDuJour[0];
      const startAt = typeof visiteRef?.date === 'string' ? visiteRef.date : date;
      const durationMin = typeof visiteRef?.duree === 'number' ? visiteRef.duree : (typeof intervention?.duree === 'number' ? intervention.duree : 60);

      const rdvUsers: MapRdvUser[] = uniqueTechIds.slice(0, 10).map(id => {
        const userData = usersById.get(id);
        return { id, name: userData?.name || `Tech ${id}`, color: userData?.color || '#6366f1' };
      });

      const startDate = new Date(startAt);
      const endAt = new Date(startDate.getTime() + durationMin * 60 * 1000).toISOString();

      mapRdvs.push({
        rdvId: intervention.id, projectId: intervention.projectId, projectRef: project.ref,
        clientName: client.name, lat: coords.lat, lng: coords.lng, startAt, endAt, durationMin,
        univers: project.univers, address: formatAddress(client.address, client.postalCode, client.city), users: rdvUsers,
      });
    }

    console.log(`[GET-RDV-MAP] Normal mode: ${mapRdvs.length} RDVs in ${Date.now() - t0}ms`);

    return withCors(req, new Response(JSON.stringify({
      success: true,
      data: mapRdvs,
      meta: { date, agencySlug: targetAgency, totalRdvs: mapRdvs.length, durationMs: Date.now() - t0 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  } catch (error) {
    console.error('[GET-RDV-MAP] Exception:', error);
    captureEdgeException(error, { function: 'get-rdv-map' });
    return withCors(req, new Response(JSON.stringify({ success: false, error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
  }
});