/**
 * GET-ZONES-DEPLACEMENT - Calcul mensuel des zones BTP par technicien
 * 
 * Pour chaque jour du mois, pour chaque technicien :
 * - Trouve le RDV le plus éloigné du dépôt (agence) à vol d'oiseau
 * - Classifie la distance max en zone BTP (1A/1B/2/3/4/5)
 * - Agrège les compteurs mensuels
 * 
 * Optimisation : géocodage par batch CSV (api-adresse.data.gouv.fr/search/csv/)
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

/**
 * Batch geocode via the French government CSV API.
 * Sends a CSV with columns: id, adresse, postcode, city
 * Returns a map of id → { lat, lng }
 */
async function batchGeocode(
  addresses: Array<{ id: string; address: string; postalCode: string; city: string }>
): Promise<Map<string, { lat: number; lng: number }>> {
  const results = new Map<string, { lat: number; lng: number }>();
  if (addresses.length === 0) return results;

  // Build CSV
  const csvLines = ['id,adresse,postcode,city'];
  for (const a of addresses) {
    // Escape CSV fields (replace quotes, commas)
    const esc = (s: string) => `"${(s || '').replace(/"/g, '""')}"`;
    csvLines.push(`${esc(a.id)},${esc(a.address)},${esc(a.postalCode)},${esc(a.city)}`);
  }
  const csvBody = csvLines.join('\n');

  // The CSV API accepts up to ~10k rows. Split into chunks of 5000 to be safe.
  const CHUNK_SIZE = 5000;
  const allLines = csvLines.slice(1); // without header
  const header = csvLines[0];

  const chunks: string[][] = [];
  for (let i = 0; i < allLines.length; i += CHUNK_SIZE) {
    chunks.push(allLines.slice(i, i + CHUNK_SIZE));
  }

  for (const chunk of chunks) {
    const csv = [header, ...chunk].join('\n');
    try {
      const formData = new FormData();
      formData.append('data', new Blob([csv], { type: 'text/csv' }), 'addresses.csv');
      formData.append('columns', 'adresse');
      formData.append('postcode', 'postcode');
      formData.append('city', 'city');

      const resp = await fetch('https://api-adresse.data.gouv.fr/search/csv/', {
        method: 'POST',
        body: formData,
      });

      if (!resp.ok) {
        console.warn(`[ZONES] Batch geocode failed: ${resp.status}`);
        continue;
      }

      const text = await resp.text();
      const lines = text.split('\n');
      if (lines.length < 2) continue;

      // Parse header to find column indices
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const idIdx = headers.indexOf('id');
      const latIdx = headers.indexOf('latitude');
      const lngIdx = headers.indexOf('longitude');
      const scoreIdx = headers.indexOf('result_score');

      if (idIdx < 0 || latIdx < 0 || lngIdx < 0) {
        console.warn('[ZONES] Batch geocode: missing expected columns', headers);
        continue;
      }

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Simple CSV parse (fields may be quoted)
        const fields = parseCSVLine(line);
        if (!fields || fields.length <= Math.max(idIdx, latIdx, lngIdx)) continue;

        const id = fields[idIdx]?.replace(/"/g, '');
        const lat = parseFloat(fields[latIdx]);
        const lng = parseFloat(fields[lngIdx]);
        const score = scoreIdx >= 0 ? parseFloat(fields[scoreIdx]) : 1;

        if (id && Number.isFinite(lat) && Number.isFinite(lng) && score >= 0.3) {
          results.set(id, { lat, lng });
        }
      }
    } catch (err) {
      console.warn('[ZONES] Batch geocode error:', err);
    }
  }

  return results;
}

/** Simple CSV line parser that handles quoted fields */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/** Single address geocode fallback for the depot */
async function geocodeAddress(address: string, postalCode: string, city: string): Promise<{ lat: number; lng: number } | null> {
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
    } catch { continue; }
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
      .select('agency_id, global_role')
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
    
    // Resolve slug from agency_id
    let profileAgencySlug: string | null = null;
    if (profile.agency_id) {
      const { data: agRow } = await supabase.from('apogee_agencies').select('slug').eq('id', profile.agency_id).eq('is_active', true).maybeSingle();
      profileAgencySlug = agRow?.slug ?? null;
    }
    
    let targetAgency = agencySlug || profileAgencySlug;

    if (agencySlug && agencySlug !== profileAgencySlug && !isFranchiseur) {
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

    // Auto-detect swapped code_postal / ville
    let cp = agency.code_postal || '';
    let ville = agency.ville || '';
    if (cp && !/^\d{4,5}$/.test(cp.trim()) && /^\d{4,5}$/.test(ville.trim())) {
      [cp, ville] = [ville, cp];
    }

    const depot = await geocodeAddress(agency.adresse, cp, ville);
    if (!depot) {
      console.warn('[ZONES] Could not geocode agency address, returning empty data');
      return withCors(req, new Response(
        JSON.stringify({ success: true, data: [], warning: 'Impossible de géocoder l\'adresse de l\'agence. Vérifiez l\'adresse dans les paramètres.' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
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

    // 3. Fetch users and cross-check with agency collaborators to identify technicians reliably
    const usersUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetUsers`;
    const usersResp = await fetch(usersUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });
    const allUsers = usersResp.ok ? await usersResp.json() : [];

    const { data: agencyRow } = await supabase
      .from('apogee_agencies')
      .select('id')
      .eq('slug', targetAgency)
      .eq('is_active', true)
      .maybeSingle();

    const { data: collaborators } = agencyRow
      ? await supabase
          .from('collaborators')
          .select('apogee_user_id, first_name, last_name, type, role, leaving_date')
          .eq('agency_id', agencyRow.id)
          .not('apogee_user_id', 'is', null)
          .is('leaving_date', null)
      : { data: [] as Array<{ apogee_user_id: number | null; first_name: string | null; last_name: string | null; type: string | null; role: string | null; leaving_date: string | null }> };

    const technicianIds = new Set<number>();
    const technicianNames = new Map<number, string>();
    for (const c of collaborators || []) {
      const apogeeId = Number(c.apogee_user_id);
      const type = String(c.type || '').toUpperCase();
      const role = String(c.role || '').toLowerCase();
      const isTech = type.includes('TECH') || role.includes('menuis') || role.includes('peintr') || role.includes('plomb') || role.includes('polyval');
      if (!Number.isFinite(apogeeId) || !isTech) continue;
      technicianIds.add(apogeeId);
      technicianNames.set(apogeeId, `${c.first_name || ''} ${c.last_name || ''}`.trim() || `Tech ${apogeeId}`);
    }

    const usersById = new Map<number, string>();
    for (const u of allUsers) {
      const apogeeId = Number(u?.id);
      if (!Number.isFinite(apogeeId) || !technicianIds.has(apogeeId)) continue;
      if (u?.is_on === false) continue;
      usersById.set(
        apogeeId,
        technicianNames.get(apogeeId) || `${u?.firstname || ''} ${u?.lastname || u?.name || ''}`.trim() || `Tech ${apogeeId}`
      );
    }

    console.log(`[ZONES] ${collaborators?.length || 0} collaborators matched, ${usersById.size} active techs retained`);

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

    // 7. First pass: collect all unique client IDs needed for geocoding
    const neededClientIds = new Set<number>();
    // Also build the intervention→visit structure for the second pass
    interface VisitInfo {
      date: string;
      techIds: number[];
      clientId: number;
      startMinutes: number;
      endMinutes: number;
      duration: number;
    }
    const relevantVisits: VisitInfo[] = [];

    for (const intervention of interventions) {
      const data = intervention?.data || {};
      const visites = Array.isArray(data.visites) ? data.visites : [];
      const projectId = intervention?.projectId ?? intervention?.project_id;
      const clientId = projectId ? projectClientMap.get(projectId) : null;
      if (!clientId) continue;

      for (const visite of visites) {
        const vDate = typeof visite?.date === 'string' ? visite.date.substring(0, 10) : null;
        if (!vDate || !days.includes(vDate)) continue;

        const techIds: number[] = Array.isArray(visite?.usersIds) ? visite.usersIds : [];
        const relevantTechs = techIds.filter(id => usersById.has(id));
        if (relevantTechs.length === 0) continue;

        // Extract time information for panier calculation
        let startMinutes = -1;
        let endMinutes = -1;
        const duree = typeof visite?.duree === 'number' ? visite.duree : (parseInt(visite?.duree) || 0);

        if (typeof visite?.date === 'string' && visite.date.length >= 16) {
          const timePart = visite.date.substring(11, 16);
          const [hh, mm] = timePart.split(':').map(Number);
          if (Number.isFinite(hh) && Number.isFinite(mm)) {
            startMinutes = hh * 60 + mm;
            if (duree > 0) endMinutes = startMinutes + duree;
          }
        }
        if (startMinutes < 0 && typeof visite?.heureDebut === 'string') {
          const [hh, mm] = visite.heureDebut.split(':').map(Number);
          if (Number.isFinite(hh)) startMinutes = hh * 60 + (mm || 0);
        }
        if (endMinutes < 0 && typeof visite?.heureFin === 'string') {
          const [hh, mm] = visite.heureFin.split(':').map(Number);
          if (Number.isFinite(hh)) endMinutes = hh * 60 + (mm || 0);
        }
        if (endMinutes < 0 && startMinutes >= 0 && duree > 0) {
          endMinutes = startMinutes + duree;
        }

        neededClientIds.add(clientId);
        relevantVisits.push({
          date: vDate,
          techIds: relevantTechs,
          clientId,
          startMinutes,
          endMinutes,
          duration: duree,
        });
      }
    }

    // 8. Batch geocode all needed client addresses at once
    const addressBatch: Array<{ id: string; address: string; postalCode: string; city: string }> = [];
    for (const cId of neededClientIds) {
      const client = clientsById.get(cId);
      if (!client?.address) continue;
      addressBatch.push({
        id: String(cId),
        address: client.address,
        postalCode: client.postalCode,
        city: client.city,
      });
    }

    console.log(`[ZONES] Batch geocoding ${addressBatch.length} unique addresses...`);
    const geocoded = await batchGeocode(addressBatch);
    console.log(`[ZONES] Geocoded ${geocoded.size}/${addressBatch.length} addresses`);

    // 9. Second pass: compute distances using geocoded coordinates
    const techDayMax = new Map<number, Map<string, number>>();
    const techDayTime = new Map<number, Map<string, { startMin: number; endMax: number; totalMinutes: number }>>();

    for (const visit of relevantVisits) {
      const coords = geocoded.get(String(visit.clientId));
      if (!coords) continue;

      const distKm = haversineKm(depot.lat, depot.lng, coords.lat, coords.lng);

      for (const techId of visit.techIds) {
        // Track max distance
        if (!techDayMax.has(techId)) techDayMax.set(techId, new Map());
        const dayMap = techDayMax.get(techId)!;
        const current = dayMap.get(visit.date) ?? 0;
        if (distKm > current) dayMap.set(visit.date, distKm);

        // Track time spans
        if (visit.startMinutes >= 0 || visit.endMinutes >= 0) {
          if (!techDayTime.has(techId)) techDayTime.set(techId, new Map());
          const timeMap = techDayTime.get(techId)!;
          const existing = timeMap.get(visit.date);
          const visitDuration = visit.duration > 0 ? visit.duration :
            (visit.endMinutes > visit.startMinutes ? visit.endMinutes - visit.startMinutes : 60);
          if (!existing) {
            timeMap.set(visit.date, {
              startMin: visit.startMinutes >= 0 ? visit.startMinutes : 1440,
              endMax: visit.endMinutes >= 0 ? visit.endMinutes : 0,
              totalMinutes: visitDuration,
            });
          } else {
            if (visit.startMinutes >= 0 && visit.startMinutes < existing.startMin) existing.startMin = visit.startMinutes;
            if (visit.endMinutes >= 0 && visit.endMinutes > existing.endMax) existing.endMax = visit.endMinutes;
            existing.totalMinutes += visitDuration;
          }
        }
      }
    }

    // 10. Aggregate into zone counts per tech + panier calculation
    const ZONE_LABELS: ZoneLabel[] = ['1A', '1B', '2', '3', '4', '5'];
    const results: Array<{
      techId: number;
      techName: string;
      zones: Record<ZoneLabel, number>;
      total: number;
      paniers: number;
      paniersExclus: number;
    }> = [];

    for (const [techId, dayMap] of techDayMax.entries()) {
      const zones: Record<ZoneLabel, number> = { '1A': 0, '1B': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
      let total = 0;
      let paniersExclus = 0;
      const timeMap = techDayTime.get(techId);

      for (const [day, maxKm] of dayMap) {
        const zone = classifyZone(maxKm);
        if (zone) {
          zones[zone]++;
          total++;

          // Panier exclusion: morning-only (<= 13h) AND < 5h total
          if (timeMap) {
            const timeInfo = timeMap.get(day);
            if (timeInfo && timeInfo.endMax > 0) {
              const morningOnly = timeInfo.endMax <= 13 * 60;
              const lessThan5h = timeInfo.totalMinutes < 300;
              if (morningOnly && lessThan5h) {
                paniersExclus++;
              }
            }
          }
        }
      }

      results.push({
        techId,
        techName: usersById.get(techId) || `Tech ${techId}`,
        zones,
        total,
        paniers: total - paniersExclus,
        paniersExclus,
      });
    }

    // Sort by name
    results.sort((a, b) => a.techName.localeCompare(b.techName));

    console.log(`[ZONES] Result: ${results.length} techs, ${geocoded.size} geocoded addresses`);

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
