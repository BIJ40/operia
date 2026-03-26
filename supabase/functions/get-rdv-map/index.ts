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
  mode?: 'normal' | 'heatmap' | 'profitability' | 'zones' | 'apporteurs' | 'disponibilite' | 'saisonnalite';
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
    
    const response = await fetch(`https://api-adresse.data.gouv.fr/search/?${params.join('&')}`, { signal: AbortSignal.timeout(10000) });
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
    const isDispo = mode === 'disponibilite';
    const isSaisonnalite = mode === 'saisonnalite';
    const isAnalyticsMode = isHeatmap || isProfitability || isZones || isApporteurs || isSaisonnalite;

    const effectiveFrom = isAnalyticsMode ? (fromDate || '2020-01-01') : date;
    const effectiveTo = isAnalyticsMode ? (toDate || new Date().toISOString().slice(0, 10)) : date;

    if (!isAnalyticsMode && !isDispo && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Invalid date format' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
    }
    if (isDispo && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      return withCors(req, new Response(JSON.stringify({ success: false, error: 'Date required for disponibilite mode' }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
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
    const apiFetch = async (endpoint: string, body: any = { API_KEY: apiKey }): Promise<any[]> => {
      try {
        const resp = await fetch(`${baseUrl}/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(25000),
        });
        if (!resp.ok) {
          console.warn(`[GET-RDV-MAP] API ${endpoint} returned ${resp.status}`);
          return [];
        }
        return await resp.json();
      } catch (e) {
        console.warn(`[GET-RDV-MAP] API ${endpoint} fetch failed: ${e.message}`);
        return [];
      }
    };

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
      
      // For profitability/zones/apporteurs/saisonnalite, also fetch factures
      if (isProfitability || isZones || isApporteurs || isSaisonnalite) {
        fetchPromises.push(apiFetch('apiGetFactures'));
      }
      // For zones/apporteurs, also fetch devis
      if (isZones || isApporteurs) {
        fetchPromises.push(apiFetch('apiGetDevis'));
      }

      const results = await Promise.all(fetchPromises);
      const interventions = results[0] || [];
      const projects = results[1] || [];
      const clients = results[2] || [];
      const factures = (isProfitability || isZones || isApporteurs || isSaisonnalite) ? (results[3] || []) : [];
      const devis = (isZones || isApporteurs) ? (results[4] || []) : [];

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

      // ── APPORTEURS MODE ──
      // Aggregate by postal code with apporteur/origin breakdown
      if (isApporteurs) {
        // Classify apporteur type from client data
        const ORIGIN_KEYWORDS: Record<string, string[]> = {
          'Assurance': ['assur', 'axa', 'maif', 'macif', 'groupama', 'allianz', 'generali', 'matmut', 'maaf', 'gan', 'mma', 'swisslife', 'zurich'],
          'Agence Immobilière': ['immo', 'agence', 'laforet', 'century', 'orpi', 'foncia', 'guy hoquet', 'stephane plaza', 'nexity', 'l\'adresse', 'era ', 'square habitat'],
          'Syndic': ['syndic', 'copropriété', 'gestionnaire', 'citya', 'nexity syndic', 'lamy'],
          'Bailleur': ['bailleur', 'hlm', 'habitat', 'opac', 'oph', 'logement social', 'sa hlm'],
          'Franchise / Réseau': ['franchise', 'réseau', 'partenaire'],
        };

        function classifyOrigin(clientName: string): string {
          const lower = (clientName || '').toLowerCase();
          for (const [type, keywords] of Object.entries(ORIGIN_KEYWORDS)) {
            if (keywords.some(kw => lower.includes(kw))) return type;
          }
          return 'Autre';
        }

        // Determine if a project has an apporteur (commanditaire ≠ client final)
        // In Apogée, the commanditaire is stored as a separate client reference
        const projectApporteurType = new Map<number, string>();
        const projectApporteurName = new Map<number, string>();
        const projectApporteurId = new Map<number, number>();

        for (const p of projects) {
          const data = p.data || {};
          // commanditaireId is the apporteur; clientId is the end client
          const commanditaireId = data.commanditaireId || data.commanditaire_id;
          if (typeof commanditaireId === 'number' && commanditaireId !== p.clientId) {
            const cmdClient = clientsById.get(commanditaireId);
            if (cmdClient) {
              projectApporteurType.set(p.id, classifyOrigin(cmdClient.name));
              projectApporteurName.set(p.id, cmdClient.name);
              projectApporteurId.set(p.id, commanditaireId);
            }
          } else {
            // No commanditaire or same as client → "Client direct"
            projectApporteurType.set(p.id, 'Client direct');
          }
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

        // Count interventions per project
        const interventionsByProject = new Map<number, number>();
        const interventionArray = Array.isArray(interventions) ? interventions : [];
        for (const it of interventionArray) {
          const pid = it.projectId;
          if (typeof pid === 'number') interventionsByProject.set(pid, (interventionsByProject.get(pid) || 0) + 1);
        }

        // Aggregate per postal code with origin breakdown
        interface ApporteurZone {
          originBreakdown: Record<string, { count: number; ca: number; apporteurNames: Set<string> }>;
          totalProjects: number;
          totalCA: number;
          devisTotal: number;
          devisSigned: number;
          interventionCount: number;
          topApporteurs: Map<string, { name: string; count: number; ca: number }>;
        }

        const apporteurZones = new Map<string, ApporteurZone>();

        for (const [pc, pids] of projectsByPostalCode.entries()) {
          const zone: ApporteurZone = {
            originBreakdown: {},
            totalProjects: 0,
            totalCA: 0,
            devisTotal: 0,
            devisSigned: 0,
            interventionCount: 0,
            topApporteurs: new Map(),
          };

          for (const pid of pids) {
            zone.totalProjects++;
            const ca = caByProject.get(pid) || 0;
            zone.totalCA += ca;
            zone.interventionCount += interventionsByProject.get(pid) || 0;
            const dv = devisByProject.get(pid);
            if (dv) { zone.devisTotal += dv.total; zone.devisSigned += dv.signed; }

            const originType = projectApporteurType.get(pid) || 'Autre';
            if (!zone.originBreakdown[originType]) {
              zone.originBreakdown[originType] = { count: 0, ca: 0, apporteurNames: new Set() };
            }
            zone.originBreakdown[originType].count++;
            zone.originBreakdown[originType].ca += ca;

            const apName = projectApporteurName.get(pid);
            if (apName) {
              zone.originBreakdown[originType].apporteurNames.add(apName);
              const apId = String(projectApporteurId.get(pid) || apName);
              const existing = zone.topApporteurs.get(apId) || { name: apName, count: 0, ca: 0 };
              existing.count++;
              existing.ca += ca;
              zone.topApporteurs.set(apId, existing);
            }
          }

          apporteurZones.set(pc, zone);
        }

        // Build results
        const ORIGIN_COLORS: Record<string, string> = {
          'Assurance': '#3b82f6',
          'Agence Immobilière': '#8b5cf6',
          'Syndic': '#f97316',
          'Bailleur': '#06b6d4',
          'Franchise / Réseau': '#10b981',
          'Client direct': '#6b7280',
          'Autre': '#9ca3af',
        };

        const apporteurResults: any[] = [];

        for (const [pc, zone] of apporteurZones.entries()) {
          const coords = coordsByPostalCode.get(pc);
          if (!coords) continue;

          // Find dominant origin
          let dominantOrigin = 'Autre';
          let dominantCount = 0;
          for (const [origin, data] of Object.entries(zone.originBreakdown)) {
            if (data.count > dominantCount) { dominantOrigin = origin; dominantCount = data.count; }
          }

          // Dependency index: share of top 1 apporteur
          const topApsList = Array.from(zone.topApporteurs.values()).sort((a, b) => b.count - a.count);
          const top1Share = zone.totalProjects > 0 && topApsList.length > 0 ? Math.round((topApsList[0].count / zone.totalProjects) * 100) : 0;
          const top3Share = zone.totalProjects > 0 ? Math.round((topApsList.slice(0, 3).reduce((s, a) => s + a.count, 0) / zone.totalProjects) * 100) : 0;

          // Diversification index (0-100): more diverse = higher
          const originTypes = Object.keys(zone.originBreakdown).length;
          const maxOriginTypes = Object.keys(ORIGIN_COLORS).length;
          const diversificationIndex = Math.round((originTypes / maxOriginTypes) * 100);

          // Transformation rate
          const transformRate = zone.devisTotal > 0 ? Math.round((zone.devisSigned / zone.devisTotal) * 100) : 0;

          // Serialize origin breakdown
          const breakdown = Object.entries(zone.originBreakdown).map(([type, d]) => ({
            type,
            count: d.count,
            ca: Math.round(d.ca),
            color: ORIGIN_COLORS[type] || '#9ca3af',
            share: zone.totalProjects > 0 ? Math.round((d.count / zone.totalProjects) * 100) : 0,
            nbApporteurs: d.apporteurNames.size,
          })).sort((a, b) => b.count - a.count);

          // Insights
          const insights: string[] = [];
          if (top1Share >= 70) insights.push(`Dépendance critique : ${topApsList[0]?.name || 'top apporteur'} = ${top1Share}% des dossiers`);
          else if (top1Share >= 50) insights.push(`Forte concentration : top 1 = ${top1Share}%`);
          if (originTypes <= 2 && zone.totalProjects >= 5) insights.push('Faible diversification commerciale');
          const clientDirectShare = zone.originBreakdown['Client direct']?.count || 0;
          if (clientDirectShare > 0 && zone.totalProjects > 0) {
            const directPct = Math.round((clientDirectShare / zone.totalProjects) * 100);
            if (directPct >= 60) insights.push(`${directPct}% clients directs — potentiel apporteurs`);
          }

          apporteurResults.push({
            postalCode: pc,
            city: postalCodeCities.get(pc) || '',
            lat: coords.lat,
            lng: coords.lng,
            totalProjects: zone.totalProjects,
            totalCA: Math.round(zone.totalCA),
            panierMoyen: zone.totalProjects > 0 ? Math.round(zone.totalCA / zone.totalProjects) : 0,
            devisTotal: zone.devisTotal,
            devisSigned: zone.devisSigned,
            transformRate,
            interventionCount: zone.interventionCount,
            dominantOrigin,
            dominantColor: ORIGIN_COLORS[dominantOrigin] || '#9ca3af',
            breakdown,
            top1Share,
            top3Share,
            diversificationIndex,
            topApporteurs: topApsList.slice(0, 5).map(a => ({ name: a.name, count: a.count, ca: Math.round(a.ca) })),
            insights,
          });
        }

        apporteurResults.sort((a, b) => b.totalCA - a.totalCA);

        console.log(`[GET-RDV-MAP] Apporteurs: ${apporteurResults.length} zones in ${Date.now() - t0}ms total`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: apporteurResults,
          meta: { mode: 'apporteurs', agencySlug: targetAgency, totalZones: apporteurResults.length, originColors: ORIGIN_COLORS, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      // ── SAISONNALITE MODE ──
      if (isSaisonnalite) {
        // Build CA per project
        const caByProject = new Map<number, number>();
        for (const f of factures) {
          const pid = f.projectId;
          if (typeof pid !== 'number') continue;
          const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
          const montant = parseFloat(f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? 0) || 0;
          caByProject.set(pid, (caByProject.get(pid) || 0) + (isAvoir ? -Math.abs(montant) : montant));
        }

        // Map intervention → month
        const interventionArray = Array.isArray(interventions) ? interventions : [];

        // Aggregate: postalCode × YYYY-MM → { nb, ca, univers counts }
        interface MonthCell { nb: number; ca: number; universCounts: Record<string, number>; urgences: number; }
        const grid = new Map<string, Map<string, MonthCell>>(); // pc → month → cell
        const allMonths = new Set<string>();

        for (const it of interventionArray) {
          const pid = it.projectId;
          if (typeof pid !== 'number') continue;
          const pc = projectToPostalCode.get(pid);
          if (!pc) continue;

          // Extract month from intervention date
          const rawDate = typeof it?.date === 'string' ? it.date : '';
          const month = rawDate.slice(0, 7); // YYYY-MM
          if (!month || month.length !== 7) continue;
          allMonths.add(month);

          if (!grid.has(pc)) grid.set(pc, new Map());
          const pcGrid = grid.get(pc)!;
          if (!pcGrid.has(month)) pcGrid.set(month, { nb: 0, ca: 0, universCounts: {}, urgences: 0 });
          const cell = pcGrid.get(month)!;
          cell.nb++;
          cell.ca += caByProject.get(pid) || 0;

          const proj = projectsById.get(pid);
          if (proj?.univers && proj.univers !== 'Non classé') {
            cell.universCounts[proj.univers] = (cell.universCounts[proj.univers] || 0) + 1;
          }

          // Check urgency flag
          const isUrgent = it.data?.isUrgent === true || it.data?.is_urgent === true || (it.data?.priorite || '').toLowerCase().includes('urgent');
          if (isUrgent) cell.urgences++;
        }

        // Sort months
        const sortedMonths = Array.from(allMonths).sort();
        if (sortedMonths.length === 0) {
          return withCors(req, new Response(JSON.stringify({ success: true, data: [], meta: { mode: 'saisonnalite', months: [], totalZones: 0, durationMs: Date.now() - t0 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }

        // Build zone-level results with time series
        const seasonResults: any[] = [];

        for (const [pc, monthMap] of grid.entries()) {
          const coords = coordsByPostalCode.get(pc);
          if (!coords) continue;

          const series: Record<string, { nb: number; ca: number; topUnivers: string; urgences: number }> = {};
          let totalNb = 0;
          let totalCA = 0;
          const monthValues: number[] = [];

          for (const m of sortedMonths) {
            const cell = monthMap.get(m);
            const nb = cell?.nb || 0;
            const ca = cell?.ca || 0;
            totalNb += nb;
            totalCA += ca;
            monthValues.push(nb);

            // Find dominant univers for this month
            let topUnivers = '';
            let topCount = 0;
            if (cell) {
              for (const [u, c] of Object.entries(cell.universCounts)) {
                if (c > topCount) { topUnivers = u; topCount = c; }
              }
            }

            series[m] = { nb, ca: Math.round(ca), topUnivers, urgences: cell?.urgences || 0 };
          }

          // Seasonality index: coefficient of variation of monthly values
          const mean = monthValues.length > 0 ? monthValues.reduce((a, b) => a + b, 0) / monthValues.length : 0;
          const variance = monthValues.length > 0 ? monthValues.reduce((a, v) => a + (v - mean) ** 2, 0) / monthValues.length : 0;
          const stdDev = Math.sqrt(variance);
          const seasonalityIndex = mean > 0 ? Math.round((stdDev / mean) * 100) : 0; // CV as percentage

          // Predictability: correlation between same months across years
          // Simple approach: check if same calendar months have similar values
          const monthOfYearAvg: Record<number, number[]> = {};
          for (const m of sortedMonths) {
            const calMonth = parseInt(m.slice(5, 7));
            if (!monthOfYearAvg[calMonth]) monthOfYearAvg[calMonth] = [];
            monthOfYearAvg[calMonth].push(series[m]?.nb || 0);
          }
          // Predictability = low intra-month variance relative to inter-month variance
          let intraVar = 0;
          let count = 0;
          for (const vals of Object.values(monthOfYearAvg)) {
            if (vals.length >= 2) {
              const m2 = vals.reduce((a, b) => a + b, 0) / vals.length;
              intraVar += vals.reduce((a, v) => a + (v - m2) ** 2, 0) / vals.length;
              count++;
            }
          }
          const predictabilityIndex = count > 0 && variance > 0 ? Math.max(0, Math.min(100, Math.round((1 - (intraVar / count) / (variance || 1)) * 100))) : 50;

          // Find peak month (calendar month with highest average)
          let peakCalMonth = 1;
          let peakAvg = 0;
          for (const [cm, vals] of Object.entries(monthOfYearAvg)) {
            const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
            if (avg > peakAvg) { peakAvg = avg; peakCalMonth = parseInt(cm); }
          }
          const MONTH_NAMES = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

          // Variation vs previous month for each month
          const variations: Record<string, number> = {};
          for (let i = 1; i < sortedMonths.length; i++) {
            const prev = series[sortedMonths[i - 1]]?.nb || 0;
            const curr = series[sortedMonths[i]]?.nb || 0;
            variations[sortedMonths[i]] = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : (curr > 0 ? 100 : 0);
          }

          // Insights
          const insights: string[] = [];
          if (seasonalityIndex > 80) insights.push('Activité très cyclique');
          else if (seasonalityIndex > 50) insights.push('Saisonnalité marquée');
          else if (seasonalityIndex < 20) insights.push('Activité stable toute l\'année');
          insights.push(`Pic habituel : ${MONTH_NAMES[peakCalMonth]}`);
          if (predictabilityIndex > 70) insights.push('Schéma prévisible d\'une année sur l\'autre');

          seasonResults.push({
            postalCode: pc,
            city: postalCodeCities.get(pc) || '',
            lat: coords.lat,
            lng: coords.lng,
            totalNb: totalNb,
            totalCA: Math.round(totalCA),
            panierMoyen: totalNb > 0 ? Math.round(totalCA / totalNb) : 0,
            series,
            variations,
            seasonalityIndex,
            predictabilityIndex,
            peakMonth: MONTH_NAMES[peakCalMonth],
            peakCalMonth,
            insights,
          });
        }

        seasonResults.sort((a, b) => b.totalNb - a.totalNb);

        console.log(`[GET-RDV-MAP] Saisonnalite: ${seasonResults.length} zones, ${sortedMonths.length} months in ${Date.now() - t0}ms`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: seasonResults,
          meta: { mode: 'saisonnalite', agencySlug: targetAgency, totalZones: seasonResults.length, months: sortedMonths, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
    }
    }

    // ── DISPONIBILITE MODE — Real-time tech availability ──
    if (isDispo) {
      const [interventions, users, projects, clients, creneaux] = await Promise.all([
        apiFetch('apiGetInterventions', { API_KEY: apiKey, from: date, to: date }),
        apiFetch('apiGetUsers'),
        apiFetch('apiGetProjects'),
        apiFetch('apiGetClients'),
        apiFetch('apiGetPlanningCreneaux', { API_KEY: apiKey }),
      ]);

      // Identify technicians (same logic as techTools.ts)
      const EXCLUDED_TYPES = ['commercial', 'admin', 'assistant', 'administratif'];
      const techMap = new Map<number, { id: number; name: string; color: string; skills: string[] }>();
      for (const u of users) {
        const isOn = u.is_on === true || u.is_on === 1 || u.is_on === '1';
        if (!isOn) continue;
        const uType = ((u.type || '') + '').toLowerCase().trim();
        if (EXCLUDED_TYPES.includes(uType)) continue;
        const hasUniverses = Array.isArray(u?.data?.universes) && u.data.universes.length > 0;
        const isTech = u.isTechnicien === true || u.isTechnicien === 1 || uType === 'technicien' || (uType === 'utilisateur' && hasUniverses);
        if (!isTech) continue;
        const dataObj = u.data || {};
        const color = dataObj.bgcolor?.hex || u.bgcolor?.hex || dataObj.color?.hex || u.color?.hex || '#6366f1';
        const skills = Array.isArray(dataObj.universes) ? dataObj.universes : (Array.isArray(dataObj.skills) ? dataObj.skills : []);
        techMap.set(u.id, {
          id: u.id,
          name: `${u.firstname || ''} ${u.name || u.lastname || ''}`.trim() || `Tech ${u.id}`,
          color,
          skills,
        });
      }

      // Build project/client maps
      const projectsById = new Map<number, { clientId?: number; ref: string }>();
      for (const p of projects) {
        projectsById.set(p.id, { clientId: typeof p.clientId === 'number' ? p.clientId : undefined, ref: p.ref || `#${p.id}` });
      }
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

      // Parse interventions for today → build per-tech RDV list
      const interventionArray = Array.isArray(interventions) ? interventions : [];
      interface TechRdv {
        startTime: string;
        endTime: string;
        durationMin: number;
        label: string;
        postalCode: string;
        city: string;
        done: boolean; // estimated: past current time
      }
      const techRdvs = new Map<number, TechRdv[]>();

      const now = new Date();
      const nowStr = now.toISOString();

      for (const it of interventionArray) {
        const data = it?.data || {};
        const visites = Array.isArray(data.visites) ? data.visites : [];
        const todayVisits = visites.filter((v: any) => typeof v?.date === 'string' && v.date.startsWith(date!));
        if (todayVisits.length === 0) continue;

        const project = projectsById.get(it.projectId);
        const client = project?.clientId ? clientsById.get(project.clientId) : undefined;

        for (const v of todayVisits) {
          const userIds: number[] = Array.isArray(v.usersIds) ? v.usersIds : [];
          const dur = typeof v.duree === 'number' ? v.duree : 60;
          const startStr = v.date || '';
          const startDate = new Date(startStr);
          const endDate = new Date(startDate.getTime() + dur * 60000);
          const done = endDate < now;

          for (const uid of userIds) {
            if (!techMap.has(uid)) continue;
            if (!techRdvs.has(uid)) techRdvs.set(uid, []);
            techRdvs.get(uid)!.push({
              startTime: startStr,
              endTime: endDate.toISOString(),
              durationMin: dur,
              label: client?.name || project?.ref || `Intervention #${it.id}`,
              postalCode: client?.postalCode || '',
              city: client?.city || '',
              done,
            });
          }
        }
      }

      // Also check creneaux for blocks (conge, etc.)
      const creneauxArray = Array.isArray(creneaux) ? creneaux : [];
      const techBlocks = new Map<number, number>(); // techId → total blocked minutes today
      for (const c of creneauxArray) {
        if (!c.date || !c.date.startsWith(date!)) continue;
        if (c.refType === 'visite-interv') continue; // already handled via interventions
        const dur = typeof c.duree === 'number' ? c.duree : 0;
        const ids: number[] = Array.isArray(c.usersIds) ? c.usersIds : [];
        for (const uid of ids) {
          if (techMap.has(uid)) {
            techBlocks.set(uid, (techBlocks.get(uid) || 0) + dur);
          }
        }
      }

      // Geocode tech positions (last completed or current RDV postal code)
      const postalCodesToGeocode = new Map<string, string>();
      for (const [uid, rdvs] of techRdvs.entries()) {
        const sorted = [...rdvs].sort((a, b) => a.startTime.localeCompare(b.startTime));
        // Find current or last done
        const current = sorted.find(r => !r.done && new Date(r.startTime) <= now);
        const lastDone = [...sorted].reverse().find(r => r.done);
        const next = sorted.find(r => !r.done && new Date(r.startTime) > now);
        const ref = current || lastDone || next;
        if (ref?.postalCode) postalCodesToGeocode.set(ref.postalCode, ref.city);
      }
      const geoResults = await batchGeocodePostalCodes(postalCodesToGeocode, supabaseAdmin);

      // Build results
      const DEFAULT_DAY_MINUTES = 8 * 60; // 480 min
      const dispoResults: any[] = [];

      for (const [uid, tech] of techMap.entries()) {
        const rdvs = techRdvs.get(uid) || [];
        const sorted = [...rdvs].sort((a, b) => a.startTime.localeCompare(b.startTime));
        const totalOccupied = sorted.reduce((s, r) => s + r.durationMin, 0);
        const blockedMin = techBlocks.get(uid) || 0;
        const totalEngaged = totalOccupied + blockedMin;
        const remainingCapacity = Math.max(0, DEFAULT_DAY_MINUTES - totalEngaged);

        // Status logic
        const doneRdvs = sorted.filter(r => r.done);
        const remainingRdvs = sorted.filter(r => !r.done);
        const currentRdv = sorted.find(r => {
          const s = new Date(r.startTime);
          const e = new Date(r.endTime);
          return s <= now && e > now;
        });
        const nextRdv = remainingRdvs.find(r => new Date(r.startTime) > now);

        // Time free until next RDV
        let freeMinutes = 0;
        if (currentRdv) {
          freeMinutes = 0;
        } else if (nextRdv) {
          freeMinutes = Math.max(0, Math.round((new Date(nextRdv.startTime).getTime() - now.getTime()) / 60000));
        } else {
          // No more RDV today
          freeMinutes = remainingCapacity;
        }

        // Determine status
        let status: string;
        let statusLabel: string;
        const loadPct = DEFAULT_DAY_MINUTES > 0 ? totalEngaged / DEFAULT_DAY_MINUTES : 0;

        if (blockedMin >= DEFAULT_DAY_MINUTES * 0.8) {
          status = 'unavailable'; statusLabel = 'Indisponible';
        } else if (currentRdv) {
          if (loadPct >= 0.9) { status = 'saturated'; statusLabel = 'Saturé'; }
          else { status = 'busy'; statusLabel = 'Occupé'; }
        } else if (freeMinutes <= 30 && nextRdv) {
          status = 'soon'; statusLabel = 'Bientôt dispo';
        } else if (freeMinutes > 30 || remainingRdvs.length === 0) {
          status = 'available'; statusLabel = 'Disponible';
        } else {
          status = 'busy'; statusLabel = 'Occupé';
        }

        // Estimate travel time (rough: 1 min per km, assume 15km avg between RDVs)
        const travelEstimate = Math.max(0, (sorted.length - 1)) * 15;

        // Position: current/last/next RDV location
        const posRef = currentRdv || [...sorted].reverse().find(r => r.done) || nextRdv;
        let lat = 0, lng = 0;
        if (posRef?.postalCode) {
          const coords = geoResults.get(posRef.postalCode);
          if (coords) { lat = coords.lat; lng = coords.lng; }
        }

        dispoResults.push({
          techId: uid,
          name: tech.name,
          color: tech.color,
          lat, lng,
          status, statusLabel,
          currentTask: currentRdv?.label || null,
          nextTask: nextRdv?.label || null,
          nextTaskTime: nextRdv ? nextRdv.startTime.substring(11, 16) : null,
          freeMinutes,
          remainingCapacityMin: remainingCapacity,
          totalDayMin: DEFAULT_DAY_MINUTES,
          occupiedMin: totalEngaged,
          travelEstimateMin: travelEstimate,
          skills: tech.skills,
          rdvCount: sorted.length,
          rdvDone: doneRdvs.length,
          rdvRemaining: remainingRdvs.length,
        });
      }

      // Sort: available first
      const statusOrder: Record<string, number> = { available: 0, soon: 1, busy: 2, saturated: 3, unavailable: 4 };
      dispoResults.sort((a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5));

      console.log(`[GET-RDV-MAP] Disponibilite: ${dispoResults.length} techs in ${Date.now() - t0}ms`);
      return withCors(req, new Response(JSON.stringify({
        success: true,
        data: dispoResults,
        meta: { mode: 'disponibilite', date, agencySlug: targetAgency, totalTechs: dispoResults.length, durationMs: Date.now() - t0 },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // ── NORMAL MODE (RDV pins for a specific date) ──
    const interventionsAll = await apiFetch('apiGetInterventions', { API_KEY: apiKey, from: effectiveFrom, to: effectiveTo });
    const interventions = Array.isArray(interventionsAll) ? interventionsAll.filter((it: any) => {
      const rawDate = typeof it?.date === 'string' ? it.date : '';
      if (rawDate.startsWith(date!)) return true;
      const visites = it?.data?.visites;
      if (Array.isArray(visites)) return visites.some((v: any) => typeof v?.date === 'string' && v.date.startsWith(date!));
      return false;
    }) : [];

    // Fetch users + projects + clients in parallel
    const [users, projects, clients] = await Promise.all([
      apiFetch('apiGetUsers'),
      apiFetch('apiGetProjects'),
      apiFetch('apiGetClients'),
    ]);

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