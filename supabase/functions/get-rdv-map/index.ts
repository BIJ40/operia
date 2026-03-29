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
  mode?: 'normal' | 'heatmap' | 'profitability' | 'zones' | 'apporteurs' | 'disponibilite' | 'saisonnalite' | 'score_global';
  techIds?: number[]; agencySlug?: string;
}

// In-memory cache for geocoding within a single request
const geoCache = new Map<string, { lat: number; lng: number; code_insee?: string } | null>();

// In-memory cache for commune polygons (persists across requests in same worker)
let communeGeoJsonCache: any = null;
let communeCacheTimestamp = 0;
const COMMUNE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Geocode via BAN API with postal code filter — also extracts code_insee (citycode)
 */
async function geocodeAddress(address: string, postalCode: string, city: string): Promise<{ lat: number; lng: number; code_insee?: string } | null> {
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
      const code_insee = data.features[0].properties?.citycode || undefined;
      const result = { lat, lng, code_insee };
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
 * Fetch commune GeoJSON polygons from geo.api.gouv.fr
 * Departments 40 (Landes) and 64 (Pyrénées-Atlantiques) — can be extended
 */
async function fetchCommunePolygons(): Promise<any> {
  if (communeGeoJsonCache && Date.now() - communeCacheTimestamp < COMMUNE_CACHE_TTL) {
    return communeGeoJsonCache;
  }
  
  try {
    const depts = ['40', '64'];
    const allFeatures: any[] = [];
    
    for (const dept of depts) {
      const url = `https://geo.api.gouv.fr/departements/${dept}/communes?fields=code,nom&format=geojson&geometry=contour`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!resp.ok) {
        console.warn(`[GET-RDV-MAP] geo.api.gouv.fr error for dept ${dept}: ${resp.status}`);
        continue;
      }
      const geojson = await resp.json();
      if (geojson?.features) {
        for (const feature of geojson.features) {
          const geometry = feature?.geometry;
          if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) continue;

          allFeatures.push({
            type: 'Feature',
            properties: {
              code: feature?.properties?.code,
              nom: feature?.properties?.nom,
            },
            geometry,
          });
        }
      }
    }
    
    const result = { type: 'FeatureCollection', features: allFeatures };
    communeGeoJsonCache = result;
    communeCacheTimestamp = Date.now();
    console.log(`[GET-RDV-MAP] Fetched ${allFeatures.length} commune polygons`);
    return result;
  } catch (error) {
    console.error('[GET-RDV-MAP] Failed to fetch commune polygons:', error);
    return { type: 'FeatureCollection', features: [] };
  }
}

/**
 * Batch geocode postal codes using DB cache + BAN API for misses
 * Returns Map<postalCode, {lat, lng}>
 */
async function batchGeocodePostalCodes(
  postalCodes: Map<string, string>, // postalCode → city
  supabaseAdmin: any
): Promise<Map<string, { lat: number; lng: number; code_insee?: string }>> {
  const result = new Map<string, { lat: number; lng: number; code_insee?: string }>();
  const keys = Array.from(postalCodes.keys());
  if (keys.length === 0) return result;

  // 1. Check DB cache
  const cacheKeys = keys.map(pc => `${pc}|${(postalCodes.get(pc) || '').toLowerCase()}`);
  const { data: cached } = await supabaseAdmin
    .from('geocode_cache')
    .select('cache_key, postal_code, lat, lng, code_insee')
    .in('cache_key', cacheKeys);

  const cachedSet = new Set<string>();
  const staleSet = new Set<string>();
  if (cached) {
    for (const row of cached) {
      const codeInsee = typeof row.code_insee === 'string' && row.code_insee.length > 0
        ? row.code_insee
        : undefined;

      // Keep cached coords as a fallback, but force a refresh when INSEE is missing.
      result.set(row.postal_code, { lat: row.lat, lng: row.lng, code_insee: codeInsee });

      if (codeInsee) {
        cachedSet.add(row.postal_code);
      } else {
        staleSet.add(row.postal_code);
      }
    }
  }
  
  console.log(`[GET-RDV-MAP] Geocode cache: ${cachedSet.size}/${keys.length} hits, ${staleSet.size} stale rows without INSEE`);

  // 2. Geocode misses + stale cache rows via BAN
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
          code_insee: coords.code_insee || null,
          source: 'ban',
        });
      }
    });
    await Promise.all(promises);
  }

  // 3. Store new/refreshed results in DB cache (must update stale rows)
  if (toInsert.length > 0) {
    await supabaseAdmin
      .from('geocode_cache')
      .upsert(toInsert, { onConflict: 'cache_key' })
      .then(() => console.log(`[GET-RDV-MAP] Cached/refreshed ${toInsert.length} geocode results`));
  }

  return result;
}

function formatAddress(address: string, postalCode: string, city: string): string {
  const parts: string[] = [];
  if (address) parts.push(address);
  if (postalCode || city) parts.push(`${postalCode} ${city}`.trim());
  return parts.join(' - ') || 'Adresse non renseignée';
}

/**
 * Build a mapping from postal code → code_insee using the geocoded data
 */
function buildPostalToInseeMap(
  coordsByPostalCode: Map<string, { lat: number; lng: number; code_insee?: string }>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [pc, data] of coordsByPostalCode.entries()) {
    if (data.code_insee) {
      map.set(pc, data.code_insee);
    }
  }
  return map;
}

/**
 * Merge commune polygons with aggregated metrics by code_insee
 * Returns a GeoJSON FeatureCollection with polygon geometries and metric properties
 */
function buildChoroplethGeoJSON(
  communePolygons: any,
  metricsByInsee: Map<string, Record<string, any>>,
  zoneCodes?: Set<string>,
  defaultMetrics?: Record<string, any>
): any {
  const features: any[] = [];
  
  for (const feature of communePolygons.features || []) {
    const code = feature.properties?.code;
    if (!code) continue;
    
    const metrics = metricsByInsee.get(code);
    const isInZone = zoneCodes ? zoneCodes.has(code) : false;
    
    // Include commune if it has data OR is in the configured zone
    if (!metrics && !isInZone) continue;
    
    features.push({
      type: 'Feature',
      properties: {
        code_insee: code,
        nom: feature.properties?.nom || '',
        ...(metrics || defaultMetrics || {}),
      },
      geometry: feature.geometry,
    });
  }
  
  return { type: 'FeatureCollection', features };
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
    const { data: profile } = await supabase.from('profiles').select('agency_id, global_role').eq('id', user.id).single();
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
    const isScoreGlobal = mode === 'score_global';
    const isAnalyticsMode = isHeatmap || isProfitability || isZones || isApporteurs || isSaisonnalite || isScoreGlobal;

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
    // Resolve slug from agency_id
    let targetAgency: string | null = null;
    if (profile?.agency_id) {
      const { data: userAgency } = await supabase.from('apogee_agencies').select('slug').eq('id', profile.agency_id).eq('is_active', true).maybeSingle();
      if (userAgency?.slug) targetAgency = userAgency.slug;
    }

    if (isApporteurUser && apporteurUser?.agency_id) {
      const { data: apAgency } = await supabase.from('apogee_agencies').select('slug').eq('id', apporteurUser.agency_id).eq('is_active', true).maybeSingle();
      if (apAgency?.slug) targetAgency = apAgency.slug;
    }

    const isN0DemoUser = !targetAgency && profile?.global_role === 'base_user';
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
      // ── Load agency zone (selected communes) ──
      let zoneCodes: Set<string> | undefined;
      {
        // Look up agency ID from slug
        const { data: agencyRow } = await supabaseAdmin.from('apogee_agencies').select('id').eq('slug', targetAgency).maybeSingle();
        if (agencyRow?.id) {
          const { data: zoneRows } = await supabaseAdmin.from('agency_map_zone_communes').select('code_insee').eq('agency_id', agencyRow.id);
          if (zoneRows && zoneRows.length > 0) {
            zoneCodes = new Set(zoneRows.map((r: any) => r.code_insee));
            console.log(`[GET-RDV-MAP] Agency zone loaded: ${zoneCodes.size} communes`);
          }
        }
      }

      // ── ANALYTICS MODES (heatmap, profitability, zones) ──
      // Strategy: aggregate by postal code, batch geocode ~100 postal codes instead of ~5000 addresses
      
      // Fetch interventions + projects + clients in parallel
      const fetchPromises: Promise<any>[] = [
        apiFetch('apiGetInterventions', { API_KEY: apiKey, from: effectiveFrom, to: effectiveTo }),
        apiFetch('apiGetProjects'),
        apiFetch('apiGetClients'),
      ];
      
      // For profitability/zones/apporteurs/saisonnalite/score_global, also fetch factures
      if (isProfitability || isZones || isApporteurs || isSaisonnalite || isScoreGlobal) {
        fetchPromises.push(apiFetch('apiGetFactures'));
      }
      // For zones/apporteurs/score_global, also fetch devis
      if (isZones || isApporteurs || isScoreGlobal) {
        fetchPromises.push(apiFetch('apiGetDevis'));
      }

      const results = await Promise.all(fetchPromises);
      const interventions = results[0] || [];
      const projects = results[1] || [];
      const clients = results[2] || [];
      const factures = (isProfitability || isZones || isApporteurs || isSaisonnalite || isScoreGlobal) ? (results[3] || []) : [];
      const devis = (isZones || isApporteurs || isScoreGlobal) ? (results[4] || []) : [];

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

      // ── BUILD POSTAL → INSEE MAP ──
      const postalToInsee = buildPostalToInseeMap(coordsByPostalCode);
      
      // Also build projectToInsee for direct project → commune mapping
      const projectToInsee = new Map<number, string>();
      for (const [pid, pc] of projectToPostalCode.entries()) {
        const insee = postalToInsee.get(pc);
        if (insee) projectToInsee.set(pid, insee);
      }

      // Build projectsByInsee (like projectsByPostalCode but by INSEE code)
      const projectsByInsee = new Map<string, Set<number>>();
      const inseeCities = new Map<string, string>(); // code_insee → city name
      for (const [pc, pids] of projectsByPostalCode.entries()) {
        const insee = postalToInsee.get(pc);
        if (!insee) continue;
        if (!projectsByInsee.has(insee)) projectsByInsee.set(insee, new Set());
        for (const pid of pids) projectsByInsee.get(insee)!.add(pid);
        if (!inseeCities.has(insee) && postalCodeCities.has(pc)) {
          inseeCities.set(insee, postalCodeCities.get(pc)!);
        }
      }

      // ── FETCH COMMUNE POLYGONS (for all choropleth modes including heatmap/density) ──
      const communePolygons = await fetchCommunePolygons();
      console.log(`[GET-RDV-MAP] Commune polygons: ${communePolygons?.features?.length || 0} communes loaded`);

      // ── HEATMAP / DENSITY MODE — Choropleth by commune with intervention count ──
      if (isHeatmap) {
        const interventionArray = Array.isArray(interventions) ? interventions : [];
        
        // Count interventions per code_insee
        const countByInsee = new Map<string, number>();
        for (const intervention of interventionArray) {
          const pid = intervention.projectId;
          if (typeof pid !== 'number') continue;
          const insee = projectToInsee.get(pid);
          if (!insee) continue;
          countByInsee.set(insee, (countByInsee.get(insee) || 0) + 1);
        }

        // Build metrics for choropleth
        const metricsByInsee = new Map<string, Record<string, any>>();
        const allCounts = Array.from(countByInsee.values());
        const maxCount = Math.max(...allCounts, 1);
        
        for (const [insee, count] of countByInsee.entries()) {
          // Normalize to 0-7 scale for 8 color levels
          const norm = count / maxCount; // 0 to 1
          const level = Math.min(7, Math.floor(norm * 8)); // 0-7
          metricsByInsee.set(insee, {
            count,
            norm: Math.round(norm * 1000) / 1000,
            level,
            city: inseeCities.get(insee) || '',
          });
        }

        const choropleth = buildChoroplethGeoJSON(communePolygons, metricsByInsee, zoneCodes, { count: 0, norm: 0, level: 0, city: '' });
        
        console.log(`[GET-RDV-MAP] Density choropleth: ${choropleth.features.length} communes, max=${maxCount} interventions in ${Date.now() - t0}ms`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: choropleth,
          meta: { mode: 'heatmap', format: 'choropleth', from: effectiveFrom, to: effectiveTo, agencySlug: targetAgency, totalCommunes: choropleth.features.length, maxCount, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      // ── PROFITABILITY MODE — Choropleth by commune ──
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
        
        // Aggregate by code_insee
        const metricsByInsee = new Map<string, Record<string, any>>();
        for (const [insee, pids] of projectsByInsee.entries()) {
          let totalCA = 0, totalHours = 0, nbProjects = 0;
          for (const pid of pids) {
            const ca = caByProject.get(pid) || 0;
            totalCA += ca;
            totalHours += hoursByProject.get(pid) || 0;
            nbProjects++;
          }
          if (nbProjects === 0) continue;
          
          const margin = totalCA - totalHours * HOURLY_COST;
          const marginRate = totalCA > 0 ? margin / totalCA : (totalHours > 0 ? -1 : 0);
          
          metricsByInsee.set(insee, {
            ca: Math.round(totalCA),
            hours: Math.round(totalHours * 10) / 10,
            margin: Math.round(margin),
            marginRate: Math.round(marginRate * 100),
            nbProjects,
            city: inseeCities.get(insee) || '',
          });
        }

        // Normalize marginRate for color interpolation
        const allMarginRates = Array.from(metricsByInsee.values()).map(m => m.marginRate);
        const maxMarginRate = Math.max(...allMarginRates, 1);
        const minMarginRate = Math.min(...allMarginRates, -1);
        for (const metrics of metricsByInsee.values()) {
          metrics.marginNorm = minMarginRate === maxMarginRate ? 0 :
            ((metrics.marginRate - minMarginRate) / (maxMarginRate - minMarginRate)) * 2 - 1; // -1 to 1
        }

        const choropleth = buildChoroplethGeoJSON(communePolygons, metricsByInsee, zoneCodes, { ca: 0, hours: 0, margin: 0, marginRate: 0, marginNorm: -1, nbProjects: 0, city: '' });
        
        console.log(`[GET-RDV-MAP] Profitability choropleth: ${choropleth.features.length} communes in ${Date.now() - t0}ms total`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: choropleth,
          meta: { mode: 'profitability', format: 'choropleth', agencySlug: targetAgency, totalCommunes: choropleth.features.length, estimatedHourlyCost: HOURLY_COST, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      // ── ZONES BLANCHES MODE — Choropleth by commune ──
      if (isZones) {
        const { data: agencyData } = await supabase.from('apogee_agencies').select('adresse, code_postal, ville').eq('slug', targetAgency).maybeSingle();
        let agencyCoords: { lat: number; lng: number } | null = null;
        if (agencyData?.code_postal) {
          agencyCoords = coordsByPostalCode.get(agencyData.code_postal) || await geocodeAddress(agencyData.adresse || '', agencyData.code_postal, agencyData.ville || '');
        }

        const caByProject = new Map<number, number>();
        for (const f of factures) {
          const pid = f.projectId;
          if (typeof pid !== 'number') continue;
          const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
          const montant = parseFloat(f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? 0) || 0;
          caByProject.set(pid, (caByProject.get(pid) || 0) + (isAvoir ? -Math.abs(montant) : montant));
        }

        const devisByProject = new Map<number, { total: number; signed: number }>();
        for (const d of devis) {
          const pid = d.projectId;
          if (typeof pid !== 'number') continue;
          const entry = devisByProject.get(pid) || { total: 0, signed: 0 };
          entry.total++;
          if (['accepted', 'validated', 'order', 'signed'].includes((d.state || '').toLowerCase())) entry.signed++;
          devisByProject.set(pid, entry);
        }

        const interventionsByInsee = new Map<string, number>();
        const interventionArray = Array.isArray(interventions) ? interventions : [];
        for (const it of interventionArray) {
          const insee = projectToInsee.get(it.projectId);
          if (insee) interventionsByInsee.set(insee, (interventionsByInsee.get(insee) || 0) + 1);
        }

        const zoneApporteurIds = new Map<number, number>();
        for (const p of projects) {
          const data = p.data || {};
          const commanditaireId = data.commanditaireId || data.commanditaire_id;
          if (typeof commanditaireId === 'number' && commanditaireId !== p.clientId) {
            zoneApporteurIds.set(p.id, commanditaireId);
          }
        }

        const allUnivers = new Set<string>();
        // Aggregate by code_insee
        const zoneAggregates = new Map<string, {
          projects: Set<number>; clients: Set<number>; apporteurs: Set<number>;
          univers: Set<string>; ca: number; devisTotal: number; devisSigned: number;
        }>();

        for (const [insee, pids] of projectsByInsee.entries()) {
          const zone = { projects: new Set<number>(), clients: new Set<number>(), apporteurs: new Set<number>(), univers: new Set<string>(), ca: 0, devisTotal: 0, devisSigned: 0 };
          for (const pid of pids) {
            zone.projects.add(pid);
            const proj = projectsById.get(pid);
            if (proj?.clientId) zone.clients.add(proj.clientId);
            if (proj?.univers && proj.univers !== 'Non classé') { zone.univers.add(proj.univers); allUnivers.add(proj.univers); }
            zone.ca += caByProject.get(pid) || 0;
            const dv = devisByProject.get(pid);
            if (dv) { zone.devisTotal += dv.total; zone.devisSigned += dv.signed; }
            const apporteurId = zoneApporteurIds.get(pid);
            if (apporteurId) zone.apporteurs.add(apporteurId);
          }
          zoneAggregates.set(insee, zone);
        }

        const maxProjects = Math.max(...Array.from(zoneAggregates.values()).map(z => z.projects.size), 1);
        const totalUniversCount = allUnivers.size || 1;

        const metricsByInsee = new Map<string, Record<string, any>>();
        for (const [insee, zone] of zoneAggregates.entries()) {
          const nbProjects = zone.projects.size;
          const nbClients = zone.clients.size;
          const nbApporteurs = zone.apporteurs.size;
          const nbUnivers = zone.univers.size;
          const panierMoyen = nbProjects > 0 ? zone.ca / nbProjects : 0;
          const interventionCount = interventionsByInsee.get(insee) || 0;
          const activityIndex = nbProjects === 0 ? 0 : nbProjects <= 3 ? 1 : nbProjects <= 10 ? 2 : 3;

          let opportunityScore = 50;
          // Simplified opportunity score (no proximity without coords per commune)
          const lowActivityScore = Math.round((1 - nbProjects / maxProjects) * 100);
          const historicalScore = nbProjects > 0 ? Math.min(100, nbProjects * 15) : 0;
          const universGap = Math.round(((totalUniversCount - nbUnivers) / totalUniversCount) * 100);
          const apporteurScore = nbApporteurs === 0 ? 100 : nbApporteurs === 1 ? 80 : nbApporteurs <= 3 ? 40 : 0;
          opportunityScore = Math.min(100, Math.max(0, Math.round(0.25*lowActivityScore + 0.25*historicalScore + 0.25*universGap + 0.25*apporteurScore)));

          const insights: string[] = [];
          if (nbApporteurs === 1) insights.push('Dépendance à 1 seul apporteur');
          if (nbApporteurs === 0 && nbProjects > 0) insights.push('Aucun apporteur actif identifié');
          if (nbProjects > 0 && nbProjects <= 3) insights.push('Présence faible — potentiel d\'ancrage');

          metricsByInsee.set(insee, {
            city: inseeCities.get(insee) || '',
            nbProjects, nbClients, nbApporteurs, nbUnivers,
            univers: JSON.stringify(Array.from(zone.univers)),
            ca: Math.round(zone.ca), panierMoyen: Math.round(panierMoyen),
            devisTotal: zone.devisTotal, devisSigned: zone.devisSigned, interventionCount,
            activityIndex, opportunityScore,
            insights: JSON.stringify(insights),
          });
        }

        const choropleth = buildChoroplethGeoJSON(communePolygons, metricsByInsee, zoneCodes, { activityIndex: 0, nbProjects: 0, opportunityScore: 0, city: '' });

        console.log(`[GET-RDV-MAP] Zones choropleth: ${choropleth.features.length} communes in ${Date.now() - t0}ms total`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: choropleth,
          meta: { mode: 'zones', format: 'choropleth', agencySlug: targetAgency, totalZones: choropleth.features.length, agencyCoords, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }

      // ── APPORTEURS MODE ──
      // Aggregate by postal code with apporteur/origin breakdown
      if (isApporteurs) {
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

        const projectApporteurType = new Map<number, string>();
        const projectApporteurName = new Map<number, string>();
        for (const p of projects) {
          const data = p.data || {};
          const commanditaireId = data.commanditaireId || data.commanditaire_id;
          if (typeof commanditaireId === 'number' && commanditaireId !== p.clientId) {
            const cmdClient = clientsById.get(commanditaireId);
            if (cmdClient) {
              projectApporteurType.set(p.id, classifyOrigin(cmdClient.name));
              projectApporteurName.set(p.id, cmdClient.name);
            }
          } else {
            projectApporteurType.set(p.id, 'Client direct');
          }
        }

        const caByProject = new Map<number, number>();
        for (const f of factures) {
          const pid = f.projectId;
          if (typeof pid !== 'number') continue;
          const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
          const montant = parseFloat(f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? 0) || 0;
          caByProject.set(pid, (caByProject.get(pid) || 0) + (isAvoir ? -Math.abs(montant) : montant));
        }

        const ORIGIN_COLORS: Record<string, string> = {
          'Assurance': '#3b82f6', 'Agence Immobilière': '#8b5cf6', 'Syndic': '#f97316',
          'Bailleur': '#06b6d4', 'Franchise / Réseau': '#10b981', 'Client direct': '#6b7280', 'Autre': '#9ca3af',
        };

        // Aggregate by code_insee
        const metricsByInsee = new Map<string, Record<string, any>>();
        for (const [insee, pids] of projectsByInsee.entries()) {
          const originCounts: Record<string, number> = {};
          let totalProjects = 0, totalCA = 0;
          for (const pid of pids) {
            totalProjects++;
            totalCA += caByProject.get(pid) || 0;
            const origin = projectApporteurType.get(pid) || 'Autre';
            originCounts[origin] = (originCounts[origin] || 0) + 1;
          }

          let dominantOrigin = 'Autre', dominantCount = 0;
          for (const [origin, count] of Object.entries(originCounts)) {
            if (count > dominantCount) { dominantOrigin = origin; dominantCount = count; }
          }
          const top1Share = totalProjects > 0 ? Math.round((dominantCount / totalProjects) * 100) : 0;
          const diversificationIndex = Math.round((Object.keys(originCounts).length / Object.keys(ORIGIN_COLORS).length) * 100);

          metricsByInsee.set(insee, {
            city: inseeCities.get(insee) || '',
            totalProjects, totalCA: Math.round(totalCA),
            panierMoyen: totalProjects > 0 ? Math.round(totalCA / totalProjects) : 0,
            dominantOrigin, dominantColor: ORIGIN_COLORS[dominantOrigin] || '#9ca3af',
            top1Share, diversificationIndex,
            breakdown: JSON.stringify(Object.entries(originCounts).map(([type, count]) => ({
              type, count, share: totalProjects > 0 ? Math.round((count / totalProjects) * 100) : 0,
              color: ORIGIN_COLORS[type] || '#9ca3af',
            })).sort((a, b) => b.count - a.count)),
          });
        }

        const choropleth = buildChoroplethGeoJSON(communePolygons, metricsByInsee, zoneCodes, { dominantType: 'inconnu', dominantPct: 0, nbProjects: 0, city: '' });

        console.log(`[GET-RDV-MAP] Apporteurs choropleth: ${choropleth.features.length} communes in ${Date.now() - t0}ms total`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: choropleth,
          meta: { mode: 'apporteurs', format: 'choropleth', agencySlug: targetAgency, totalZones: choropleth.features.length, originColors: ORIGIN_COLORS, durationMs: Date.now() - t0 },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
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

      // ── SCORE GLOBAL MODE — Composite multi-criteria score per postal code ──
      if (isScoreGlobal) {
        // Build base data
        const caByProject = new Map<number, number>();
        for (const f of factures) {
          const pid = f.projectId;
          if (typeof pid !== 'number') continue;
          const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
          const montant = parseFloat(f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? 0) || 0;
          caByProject.set(pid, (caByProject.get(pid) || 0) + (isAvoir ? -Math.abs(montant) : montant));
        }

        const devisByProject = new Map<number, { total: number; signed: number }>();
        for (const d of devis) {
          const pid = d.projectId;
          if (typeof pid !== 'number') continue;
          const entry = devisByProject.get(pid) || { total: 0, signed: 0 };
          entry.total++;
          if (['accepted', 'validated', 'order', 'signed'].includes((d.state || '').toLowerCase())) entry.signed++;
          devisByProject.set(pid, entry);
        }

        const interventionArray = Array.isArray(interventions) ? interventions : [];
        const hoursByProject = new Map<number, number>();
        const interventionsByPC = new Map<string, number>();
        const interventionMonthsByPC = new Map<string, Set<string>>();
        // SAV detection
        const savByPC = new Map<string, number>();
        const totalIntervByPC = new Map<string, number>();

        // Apporteur classification
        const ORIGIN_KEYWORDS: Record<string, string[]> = {
          'Assurance': ['assur', 'axa', 'maif', 'macif', 'groupama', 'allianz', 'generali', 'matmut', 'maaf', 'gan', 'mma'],
          'Agence Immobilière': ['immo', 'agence', 'laforet', 'century', 'orpi', 'foncia'],
          'Syndic': ['syndic', 'copropriété', 'gestionnaire', 'citya'],
          'Bailleur': ['bailleur', 'hlm', 'habitat', 'opac'],
        };
        function classifyOriginSG(clientName: string): string {
          const lower = (clientName || '').toLowerCase();
          for (const [type, keywords] of Object.entries(ORIGIN_KEYWORDS)) {
            if (keywords.some(kw => lower.includes(kw))) return type;
          }
          return 'Client direct';
        }
        const projectApporteurType = new Map<number, string>();
        for (const p of projects) {
          const data = p.data || {};
          const commanditaireId = data.commanditaireId || data.commanditaire_id;
          if (typeof commanditaireId === 'number' && commanditaireId !== p.clientId) {
            const cmdClient = clientsById.get(commanditaireId);
            projectApporteurType.set(p.id, cmdClient ? classifyOriginSG(cmdClient.name) : 'Autre');
          } else {
            projectApporteurType.set(p.id, 'Client direct');
          }
        }

        for (const it of interventionArray) {
          const pid = it.projectId;
          if (typeof pid !== 'number') continue;
          const pc = projectToPostalCode.get(pid);
          if (!pc) continue;

          // Count interventions
          interventionsByPC.set(pc, (interventionsByPC.get(pc) || 0) + 1);
          totalIntervByPC.set(pc, (totalIntervByPC.get(pc) || 0) + 1);

          // Hours
          const visites = Array.isArray(it?.data?.visites) ? it.data.visites : [];
          let totalMin = 0;
          for (const v of visites) totalMin += typeof v?.duree === 'number' ? v.duree : 60;
          if (totalMin === 0) totalMin = typeof it?.duree === 'number' ? it.duree : 60;
          hoursByProject.set(pid, (hoursByProject.get(pid) || 0) + totalMin / 60);

          // SAV detection
          const type2 = ((it?.data?.type2 || it?.type2 || '') + '').toLowerCase();
          if (type2 === 'sav') savByPC.set(pc, (savByPC.get(pc) || 0) + 1);

          // Month tracking for seasonality
          const rawDate = typeof it?.date === 'string' ? it.date : '';
          const month = rawDate.slice(0, 7);
          if (month.length === 7) {
            if (!interventionMonthsByPC.has(pc)) interventionMonthsByPC.set(pc, new Set());
            interventionMonthsByPC.get(pc)!.add(month);
          }
        }

        // Agency coords for proximity
        const { data: agencyData } = await supabase.from('apogee_agencies').select('adresse, code_postal, ville').eq('slug', targetAgency).maybeSingle();
        let agencyCoords: { lat: number; lng: number } | null = null;
        if (agencyData?.code_postal) {
          agencyCoords = coordsByPostalCode.get(agencyData.code_postal) || await geocodeAddress(agencyData.adresse || '', agencyData.code_postal, agencyData.ville || '');
        }

        // Aggregate per code_insee (choropleth)
        const HOURLY_COST = 35;
        const allZoneData: Array<{
          insee: string; nbProjects: number; ca: number; margin: number;
          devisTotal: number; devisSigned: number; panierMoyen: number;
          savRate: number; originTypes: number; top1Share: number;
          monthSpread: number; nbClients: number;
        }> = [];

        // Also build interventionsByInsee, savByInsee, totalIntervByInsee, interventionMonthsByInsee
        const interventionsByInsee2 = new Map<string, number>();
        const savByInsee = new Map<string, number>();
        const totalIntervByInsee = new Map<string, number>();
        const interventionMonthsByInsee = new Map<string, Set<string>>();
        for (const it of interventionArray) {
          const pid = it.projectId;
          if (typeof pid !== 'number') continue;
          const insee = projectToInsee.get(pid);
          if (!insee) continue;
          interventionsByInsee2.set(insee, (interventionsByInsee2.get(insee) || 0) + 1);
          totalIntervByInsee.set(insee, (totalIntervByInsee.get(insee) || 0) + 1);
          const type2 = ((it?.data?.type2 || it?.type2 || '') + '').toLowerCase();
          if (type2 === 'sav') savByInsee.set(insee, (savByInsee.get(insee) || 0) + 1);
          const rawDate = typeof it?.date === 'string' ? it.date : '';
          const month = rawDate.slice(0, 7);
          if (month.length === 7) {
            if (!interventionMonthsByInsee.has(insee)) interventionMonthsByInsee.set(insee, new Set());
            interventionMonthsByInsee.get(insee)!.add(month);
          }
        }

        for (const [insee, pids] of projectsByInsee.entries()) {
          let zoneCA = 0, zoneHours = 0, devisT = 0, devisS = 0;
          const originCounts: Record<string, number> = {};
          const clientIds = new Set<number>();

          for (const pid of pids) {
            zoneCA += caByProject.get(pid) || 0;
            zoneHours += hoursByProject.get(pid) || 0;
            const dv = devisByProject.get(pid);
            if (dv) { devisT += dv.total; devisS += dv.signed; }
            const proj = projectsById.get(pid);
            if (proj?.clientId) clientIds.add(proj.clientId);
            const origin = projectApporteurType.get(pid) || 'Autre';
            originCounts[origin] = (originCounts[origin] || 0) + 1;
          }

          const nbProjects = pids.size;
          const margin = zoneCA - zoneHours * HOURLY_COST;
          const panierMoyen = nbProjects > 0 ? zoneCA / nbProjects : 0;
          const savCount = savByInsee.get(insee) || 0;
          const totalInterv = totalIntervByInsee.get(insee) || 0;
          const savRate = totalInterv > 0 ? savCount / totalInterv : 0;
          const originTypes = Object.keys(originCounts).length;
          const originValues = Object.values(originCounts);
          const maxOriginCount = Math.max(...originValues, 0);
          const top1Share = nbProjects > 0 ? maxOriginCount / nbProjects : 0;
          const monthSpread = interventionMonthsByInsee.get(insee)?.size || 0;

          allZoneData.push({ insee, nbProjects, ca: zoneCA, margin, devisTotal: devisT, devisSigned: devisS, panierMoyen, savRate, originTypes, top1Share, monthSpread, nbClients: clientIds.size });
        }

        // Compute normalization bounds
        const maxCA = Math.max(...allZoneData.map(z => z.ca), 1);
        const maxProjects = Math.max(...allZoneData.map(z => z.nbProjects), 1);
        const maxPanier = Math.max(...allZoneData.map(z => z.panierMoyen), 1);
        const maxMargin = Math.max(...allZoneData.map(z => z.margin), 1);
        const minMargin = Math.min(...allZoneData.map(z => z.margin), 0);
        const maxMonths = Math.max(...allZoneData.map(z => z.monthSpread), 1);

        // Agency coords for proximity (reuse from saisonnalite block above)
        const { data: agencyData2 } = await supabase.from('apogee_agencies').select('adresse, code_postal, ville').eq('slug', targetAgency).maybeSingle();
        agencyCoords = null;
        if (agencyData2?.code_postal) {
          agencyCoords = coordsByPostalCode.get(agencyData2.code_postal) || await geocodeAddress(agencyData2.adresse || '', agencyData2.code_postal, agencyData2.ville || '');
        }

        const metricsByInsee = new Map<string, Record<string, any>>();
        const insightsList: any[] = []; // for meta

        for (const z of allZoneData) {
          // Get coords for proximity calc — use first postal code mapped to this insee
          let zoneCoords: { lat: number; lng: number } | null = null;
          for (const [pc, ins] of postalToInsee.entries()) {
            if (ins === z.insee) { zoneCoords = coordsByPostalCode.get(pc) || null; break; }
          }

          // ── BLOC 1: Commercial (25%) ──
          const transfoDevis = z.devisTotal > 0 ? z.devisSigned / z.devisTotal : 0;
          const volumeScore = Math.min(100, (z.nbProjects / maxProjects) * 100);
          const panierScore = Math.min(100, (z.panierMoyen / maxPanier) * 100);
          const transfoScore = transfoDevis * 100;
          const scoreCommercial = Math.round(0.30 * transfoScore + 0.30 * volumeScore + 0.20 * panierScore + 0.20 * Math.min(100, (z.devisTotal / Math.max(1, z.nbProjects)) * 50));

          // ── BLOC 2: Economique (25%) ──
          const caScore = Math.min(100, (z.ca / maxCA) * 100);
          const marginNorm = minMargin < 0 ? (z.margin - minMargin) / (maxMargin - minMargin) * 100 : (maxMargin > 0 ? (z.margin / maxMargin) * 100 : 50);
          const marginScore = Math.min(100, Math.max(0, marginNorm));
          let proximityScore = 50;
          if (agencyCoords && zoneCoords) {
            const R = 6371;
            const dLat = (zoneCoords.lat - agencyCoords.lat) * Math.PI / 180;
            const dLon = (zoneCoords.lng - agencyCoords.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2)**2 + Math.cos(agencyCoords.lat*Math.PI/180)*Math.cos(zoneCoords.lat*Math.PI/180)*Math.sin(dLon/2)**2;
            const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            proximityScore = distKm <= 15 ? 100 : distKm <= 40 ? Math.round(100-(distKm-15)*2.5) : distKm <= 80 ? Math.round(40-(distKm-40)*0.5) : 10;
            proximityScore = Math.max(0, Math.min(100, proximityScore));
          }
          const scoreEconomique = Math.round(0.35 * caScore + 0.35 * marginScore + 0.30 * proximityScore);

          // ── BLOC 3: Operationnel (20%) ──
          const interventionCount = interventionsByInsee2.get(z.insee) || 0;
          const projectToIntervRatio = z.nbProjects > 0 ? Math.min(1, interventionCount / (z.nbProjects * 2)) : 0;
          const scoreOperationnel = Math.round(projectToIntervRatio * 100);

          // ── BLOC 4: Qualité (15%) ──
          const savScore = Math.round(Math.max(0, (1 - z.savRate * 5)) * 100);
          const scoreQualite = savScore;

          // ── BLOC 5: Résilience (15%) ──
          const diversityScore = Math.min(100, z.originTypes * 20);
          const nonDependenceScore = Math.round((1 - z.top1Share) * 100);
          const stabilityScore = Math.min(100, (z.monthSpread / maxMonths) * 100);
          const clientDensityScore = Math.min(100, z.nbClients * 10);
          const scoreResilience = Math.round(0.30 * diversityScore + 0.30 * nonDependenceScore + 0.20 * stabilityScore + 0.20 * clientDensityScore);

          // ── SCORE GLOBAL ──
          const scoreGlobal = Math.round(
            0.25 * scoreCommercial +
            0.25 * scoreEconomique +
            0.20 * scoreOperationnel +
            0.15 * scoreQualite +
            0.15 * scoreResilience
          );

          const scores = [
            { label: 'Commercial', value: scoreCommercial },
            { label: 'Économique', value: scoreEconomique },
            { label: 'Opérationnel', value: scoreOperationnel },
            { label: 'Qualité', value: scoreQualite },
            { label: 'Résilience', value: scoreResilience },
          ];
          const sorted = [...scores].sort((a, b) => b.value - a.value);
          const mainStrength = sorted[0];
          const mainWeakness = sorted[sorted.length - 1];

          let recommendation = '';
          if (scoreGlobal >= 85) recommendation = 'Zone premium — consolider et développer';
          else if (scoreGlobal >= 70) recommendation = 'Zone saine — maintenir la performance';
          else if (scoreGlobal >= 55) {
            if (mainWeakness.label === 'Commercial') recommendation = 'Renforcer la prospection commerciale';
            else if (mainWeakness.label === 'Résilience') recommendation = 'Diversifier les sources de clients';
            else if (mainWeakness.label === 'Qualité') recommendation = 'Améliorer la qualité d\'exécution';
            else if (mainWeakness.label === 'Opérationnel') recommendation = 'Optimiser la capacité opérationnelle';
            else recommendation = 'Améliorer la rentabilité des interventions';
          } else if (scoreGlobal >= 40) {
            recommendation = `Zone fragile — priorité ${mainWeakness.label.toLowerCase()}`;
          } else {
            recommendation = 'Zone critique — action corrective urgente';
          }

          const scoreLabel = scoreGlobal >= 85 ? 'Premium' : scoreGlobal >= 70 ? 'Saine' : scoreGlobal >= 55 ? 'Moyenne' : scoreGlobal >= 40 ? 'Fragile' : 'Critique';
          const city = inseeCities.get(z.insee) || '';

          metricsByInsee.set(z.insee, {
            city,
            scoreGlobal, scoreCommercial, scoreEconomique, scoreOperationnel, scoreQualite, scoreResilience,
            scoreLabel, nbProjects: z.nbProjects, nbClients: z.nbClients,
            ca: Math.round(z.ca), margin: Math.round(z.margin),
            panierMoyen: Math.round(z.panierMoyen),
            transfoRate: z.devisTotal > 0 ? Math.round((z.devisSigned / z.devisTotal) * 100) : 0,
            savRate: Math.round(z.savRate * 100),
            mainStrength: mainStrength.label, mainStrengthScore: mainStrength.value,
            mainWeakness: mainWeakness.label, mainWeaknessScore: mainWeakness.value,
            recommendation,
          });

          insightsList.push({ insee: z.insee, city, scoreGlobal, margin: Math.round(z.margin), scoreCommercial, scoreOperationnel });
        }

        const choropleth = buildChoroplethGeoJSON(communePolygons, metricsByInsee, zoneCodes, { scoreGlobal: 0, scoreNorm: 0, nbProjects: 0, city: '' });

        // Build top insights from the computed data
        const sortedInsights = [...insightsList].sort((a, b) => b.scoreGlobal - a.scoreGlobal);
        const topDevelop = sortedInsights.filter(z => z.scoreCommercial < 50).slice(0, 5);
        const topTension = sortedInsights.filter(z => z.scoreOperationnel < 40).slice(0, 5);
        const topRentable = [...insightsList].sort((a, b) => b.margin - a.margin).slice(0, 5);
        const topRisk = sortedInsights.filter(z => z.scoreGlobal < 50).slice(0, 5);

        console.log(`[GET-RDV-MAP] ScoreGlobal choropleth: ${choropleth.features.length} communes in ${Date.now() - t0}ms`);
        return withCors(req, new Response(JSON.stringify({
          success: true,
          data: choropleth,
          meta: {
            mode: 'score_global',
            format: 'choropleth',
            agencySlug: targetAgency,
            totalZones: choropleth.features.length,
            durationMs: Date.now() - t0,
            insights: {
              topDevelop: topDevelop.map(z => ({ pc: z.insee, city: z.city, score: z.scoreGlobal })),
              topTension: topTension.map(z => ({ pc: z.insee, city: z.city, score: z.scoreGlobal })),
              topRentable: topRentable.map(z => ({ pc: z.insee, city: z.city, margin: z.margin })),
              topRisk: topRisk.map(z => ({ pc: z.insee, city: z.city, score: z.scoreGlobal })),
            },
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
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