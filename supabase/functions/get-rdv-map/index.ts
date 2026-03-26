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
  projectRef: string; // Référence dossier Apogée (2025xxxxx)
  clientName: string; // Nom du client
  lat: number;
  lng: number;
  startAt: string;
  endAt: string; // Fin du créneau (startAt + durationMin)
  durationMin: number;
  univers: string;
  address: string; // Adresse complète pour affichage
  users: MapRdvUser[];
}

interface RequestBody {
  date?: string; // YYYY-MM-DD (required for normal mode)
  from?: string; // YYYY-MM-DD (heatmap mode range start)
  to?: string;   // YYYY-MM-DD (heatmap mode range end)
  mode?: 'normal' | 'heatmap' | 'profitability' | 'zones'; // zones = white zones analysis
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

    // 2bis. Vérifier si l'utilisateur est un apporteur (système séparé)
    const { data: apporteurUser } = await supabase
      .from('apporteur_users')
      .select('agency_id, apporteur_id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    const apporteurAgencyId = apporteurUser?.agency_id ?? null;
    const isApporteurUser = !!apporteurUser && apporteurUser.is_active;

    if ((profileError || !profile) && !isApporteurUser) {
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
    const { date, from: fromDate, to: toDate, techIds, agencySlug: requestedAgency, mode = 'normal' } = body;
    const isHeatmap = mode === 'heatmap';
    const isProfitability = mode === 'profitability';
    const isZones = mode === 'zones';

    // Date validation
    const effectiveFrom = (isHeatmap || isProfitability || isZones) ? (fromDate || '2020-01-01') : date;
    const effectiveTo = (isHeatmap || isProfitability || isZones) ? (toDate || new Date().toISOString().slice(0, 10)) : date;

    if (!isHeatmap && !isProfitability && !isZones && (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))) {
      return withCors(req, new Response(
        JSON.stringify({ success: false, error: 'Invalid date format (expected YYYY-MM-DD)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // 5. Déterminer l'agence cible avec contrôle d'accès
    const globalRole = profile?.global_role || '';
    const isFranchiseurRole = ['franchisor_user', 'franchisor_admin', 'platform_admin', 'superadmin'].includes(globalRole);
    let targetAgency = profile?.agence || null;

    // APPORTEUR: Les utilisateurs apporteurs accèdent à leur agence associée
    if (isApporteurUser && apporteurAgencyId) {
      const { data: apporteurAgency } = await supabase
        .from('apogee_agencies')
        .select('slug')
        .eq('id', apporteurAgencyId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (apporteurAgency?.slug) {
        console.log(`[GET-RDV-MAP] Mode apporteur: user ${user.id.substring(0, 8)}... accède à l'agence ${apporteurAgency.slug}`);
        targetAgency = apporteurAgency.slug;
      }
    }

    // MODE DÉMO: Les utilisateurs N0 (base_user sans agence) peuvent accéder à DAX en lecture seule
    const isN0DemoUser = !profile?.agence && profile?.global_role === 'base_user';
    const DEMO_AGENCY_SLUG = 'dax';

    if (requestedAgency && requestedAgency !== targetAgency) {
      // Cas spécial: Apporteur ne peut accéder qu'à son agence
      if (isApporteurUser) {
        if (targetAgency && requestedAgency !== targetAgency) {
          console.warn(`[GET-RDV-MAP] Apporteur ${user.id} tente d'accéder à une autre agence: ${requestedAgency}`);
          return withCors(req, new Response(
            JSON.stringify({ success: false, error: 'Access denied to this agency' }),
            { status: 403, headers: { 'Content-Type': 'application/json' } }
          ));
        }
      }
      // Cas spécial: Mode démo N0 pour l'agence DAX uniquement
      else if (isN0DemoUser && requestedAgency === DEMO_AGENCY_SLUG) {
        console.log(`[GET-RDV-MAP] Mode démo activé pour user ${user.id.substring(0, 8)}... sur agence ${DEMO_AGENCY_SLUG}`);
        targetAgency = DEMO_AGENCY_SLUG;
      }
      // Sinon vérifier que l'utilisateur a le droit d'accéder à cette agence (rôle franchiseur)
      else if (!isFranchiseurRole) {
        return withCors(req, new Response(
          JSON.stringify({ success: false, error: 'Access denied to this agency' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      else {
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
    }

    // Pour les utilisateurs N0 en mode démo, définir l'agence DAX par défaut
    if (!targetAgency && isN0DemoUser) {
      targetAgency = DEMO_AGENCY_SLUG;
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
        from: effectiveFrom,
        to: effectiveTo,
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

    // In heatmap mode, no date filtering needed (we want all data)
    const interventions = Array.isArray(interventionsAll)
      ? ((isHeatmap || isProfitability || isZones)
        ? interventionsAll
        : interventionsAll.filter((it: any) => {
            const rawDate = typeof it?.date === 'string' ? it.date : '';
            if (rawDate.startsWith(date!)) return true;
            const visites = it?.data?.visites;
            if (Array.isArray(visites)) {
              return visites.some((v: any) => typeof v?.date === 'string' && v.date.startsWith(date!));
            }
            return false;
          })
      )
      : [];

    console.log(
      `[GET-RDV-MAP] Got ${interventions.length}/${Array.isArray(interventionsAll) ? interventionsAll.length : 0} interventions for ${targetAgency} ${isHeatmap ? `(heatmap ${effectiveFrom}→${effectiveTo})` : `on ${date}`}`
    );

    // 7. Fetch users pour les couleurs (skip in heatmap mode)
    const usersById = new Map<number, { name: string; color: string }>();
    if (!isHeatmap && !isProfitability && !isZones) {
      const usersUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetUsers`;
      const usersResponse = await fetch(usersUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      });

      const users = usersResponse.ok ? await usersResponse.json() : [];
      
      if (users.length > 0) {
        const sample = users[0];
        console.log(`[GET-RDV-MAP] Sample user keys: ${Object.keys(sample).join(', ')}`);
        console.log(`[GET-RDV-MAP] Sample user color fields: bgcolor=${sample.bgcolor}, color=${sample.color}, bgColor=${sample.bgColor}`);
      }
      
      for (const u of users) {
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

    const projectsById = new Map<number, { univers: string; clientId?: number | null; ref: string }>();

    for (const p of projects) {
      const data = p.data || {};
      projectsById.set(p.id, {
        univers: Array.isArray(data.universes) ? data.universes[0] : (data.univers || 'Non classé'),
        clientId: typeof p.clientId === 'number' ? p.clientId : null,
        ref: p.ref || `#${p.id}`, // Référence Apogée (2025xxxxx)
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

    const clientsById = new Map<number, { name: string; address: string; postalCode: string; city: string }>();

    for (const c of clients) {
      const data = c.data || {};
      // Résolution robuste du nom client : nom direct, data.nom, composition prénom+nom, etc.
      const rawName = c.name || c.nom || data.nom || data.name;
      const composedName = [c.prenom || c.firstname || data.prenom, c.nom_famille || c.lastname || data.nom_famille]
        .filter(Boolean).join(' ').trim();
      const name = rawName || composedName || `Client #${c.id}`;
      const address = data.adresse || c.adresse || c.address || '';
      const postalCode = data.codePostal || c.codePostal || c.postalCode || '';
      const city = data.ville || c.ville || c.city || '';
      clientsById.set(c.id, { name, address, postalCode, city });
    }

    // ── HEATMAP FAST PATH ──
    // In heatmap mode, skip user/project enrichment; just return {lat, lng} for each intervention
    if (isHeatmap) {
      const heatPoints: { lat: number; lng: number }[] = [];
      let heatSkipped = 0;

      for (const intervention of interventions as any[]) {
        const project = projectsById.get(intervention.projectId);
        if (!project) { heatSkipped++; continue; }

        const rawClientId = intervention.client_id ?? project.clientId;
        const clientId = typeof rawClientId === 'number' ? rawClientId : null;
        const client = clientId ? clientsById.get(clientId) : undefined;
        if (!client?.address) { heatSkipped++; continue; }

        const coords = await geocodeAddress(client.address, client.postalCode, client.city);
        if (!coords) { heatSkipped++; continue; }

        heatPoints.push(coords);
      }

      console.log(`[GET-RDV-MAP] Heatmap for ${targetAgency}: ${heatPoints.length} points, ${heatSkipped} skipped`);

      return withCors(req, new Response(
        JSON.stringify({
          success: true,
          data: heatPoints,
          meta: {
            mode: 'heatmap',
            from: effectiveFrom,
            to: effectiveTo,
            agencySlug: targetAgency,
            totalPoints: heatPoints.length,
            timestamp: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // ── PROFITABILITY FAST PATH ──
    // Returns per-project aggregated: {lat, lng, ca, hours, margin}
    if (isProfitability) {
      // Fetch factures for CA data
      const facturesUrl = `https://${targetAgency}.hc-apogee.fr/api/apiGetFactures`;
      const facturesResponse = await fetch(facturesUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ API_KEY: apiKey }),
      });
      const factures = facturesResponse.ok ? await facturesResponse.json() : [];

      // Build CA per project from factures
      const caByProject = new Map<number, number>();
      for (const f of factures) {
        const pid = f.projectId;
        if (typeof pid !== 'number') continue;
        const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
        const montant = parseFloat(f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? 0) || 0;
        const net = isAvoir ? -Math.abs(montant) : montant;
        caByProject.set(pid, (caByProject.get(pid) || 0) + net);
      }

      // Build total hours per project from interventions
      const hoursByProject = new Map<number, number>();
      for (const intervention of interventions as any[]) {
        const pid = intervention.projectId;
        if (typeof pid !== 'number') continue;
        const data = intervention?.data || {};
        const visites = Array.isArray(data.visites) ? data.visites : [];
        let totalMin = 0;
        for (const v of visites) {
          totalMin += typeof v?.duree === 'number' ? v.duree : 60;
        }
        if (totalMin === 0) totalMin = typeof intervention?.duree === 'number' ? intervention.duree : 60;
        hoursByProject.set(pid, (hoursByProject.get(pid) || 0) + totalMin / 60);
      }

      // Estimated hourly cost (average for the sector ~35€/h all-in)
      const ESTIMATED_HOURLY_COST = 35;

      // Aggregate per project with coordinates
      const projectPoints: { lat: number; lng: number; ca: number; hours: number; margin: number; projectId: number }[] = [];
      const processedProjects = new Set<number>();
      let profSkipped = 0;

      for (const intervention of interventions as any[]) {
        const pid = intervention.projectId;
        if (processedProjects.has(pid)) continue;
        processedProjects.add(pid);

        const project = projectsById.get(pid);
        if (!project) { profSkipped++; continue; }

        const rawClientId = intervention.client_id ?? project.clientId;
        const clientId = typeof rawClientId === 'number' ? rawClientId : null;
        const client = clientId ? clientsById.get(clientId) : undefined;
        if (!client?.address) { profSkipped++; continue; }

        const coords = await geocodeAddress(client.address, client.postalCode, client.city);
        if (!coords) { profSkipped++; continue; }

        const ca = caByProject.get(pid) || 0;
        const hours = hoursByProject.get(pid) || 0;
        const estimatedCost = hours * ESTIMATED_HOURLY_COST;
        const margin = ca - estimatedCost;

        if (ca === 0 && hours === 0) { profSkipped++; continue; }

        projectPoints.push({ ...coords, ca, hours, margin, projectId: pid });
      }

      console.log(`[GET-RDV-MAP] Profitability for ${targetAgency}: ${projectPoints.length} projects, ${profSkipped} skipped`);

      return withCors(req, new Response(
        JSON.stringify({
          success: true,
          data: projectPoints,
          meta: {
            mode: 'profitability',
            from: effectiveFrom,
            to: effectiveTo,
            agencySlug: targetAgency,
            totalPoints: projectPoints.length,
            estimatedHourlyCost: ESTIMATED_HOURLY_COST,
            timestamp: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

    // ── ZONES BLANCHES FAST PATH ──
    // Aggregate KPIs per postal code for commercial white zones analysis
    if (isZones) {
      // Fetch factures + devis in parallel
      const [facturesResponse, devisResponse] = await Promise.all([
        fetch(`https://${targetAgency}.hc-apogee.fr/api/apiGetFactures`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ API_KEY: apiKey }),
        }),
        fetch(`https://${targetAgency}.hc-apogee.fr/api/apiGetDevis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ API_KEY: apiKey }),
        }),
      ]);
      const factures = facturesResponse.ok ? await facturesResponse.json() : [];
      const devis = devisResponse.ok ? await devisResponse.json() : [];

      // Get agency coordinates for proximity score
      const { data: agencyData } = await supabase
        .from('apogee_agencies')
        .select('adresse, code_postal, ville')
        .eq('slug', targetAgency)
        .maybeSingle();
      
      let agencyCoords: { lat: number; lng: number } | null = null;
      if (agencyData?.adresse && agencyData?.code_postal) {
        agencyCoords = await geocodeAddress(agencyData.adresse, agencyData.code_postal, agencyData.ville || '');
      }

      // Build project → postal code mapping
      const projectPostalCode = new Map<number, string>();
      const projectClientId = new Map<number, number>();
      const projectUnivers = new Map<number, string>();
      const projectApporteurId = new Map<number, number | null>();

      for (const [pid, proj] of projectsById.entries()) {
        projectUnivers.set(pid, proj.univers);
        const cid = proj.clientId;
        if (typeof cid === 'number') {
          projectClientId.set(pid, cid);
          const client = clientsById.get(cid);
          if (client?.postalCode) {
            projectPostalCode.set(pid, client.postalCode);
          }
        }
      }

      // Extract apporteur (commanditaire) from projects raw data
      for (const p of projects) {
        const commanditaireId = p.clientId || p.client_id || p.data?.clientId;
        if (typeof commanditaireId === 'number') {
          projectApporteurId.set(p.id, commanditaireId);
        }
      }

      // Build facture CA per project
      const caByProject = new Map<number, number>();
      for (const f of factures) {
        const pid = f.projectId;
        if (typeof pid !== 'number') continue;
        const isAvoir = (f.typeFacture || f.type || '').toLowerCase() === 'avoir';
        const montant = parseFloat(f.data?.totalHT ?? f.totalHT ?? f.montantHT ?? 0) || 0;
        caByProject.set(pid, (caByProject.get(pid) || 0) + (isAvoir ? -Math.abs(montant) : montant));
      }

      // Build devis per project (count + signed count)
      const devisByProject = new Map<number, { total: number; signed: number }>();
      for (const d of devis) {
        const pid = d.projectId;
        if (typeof pid !== 'number') continue;
        const entry = devisByProject.get(pid) || { total: 0, signed: 0 };
        entry.total++;
        const state = (d.state || '').toLowerCase();
        if (['accepted', 'validated', 'order', 'signed'].includes(state)) entry.signed++;
        devisByProject.set(pid, entry);
      }

      // Aggregate per postal code
      interface ZoneData {
        postalCode: string;
        city: string;
        projects: Set<number>;
        clients: Set<number>;
        apporteurs: Set<number>;
        univers: Set<string>;
        ca: number;
        devisTotal: number;
        devisSigned: number;
        interventionCount: number;
      }

      const zones = new Map<string, ZoneData>();

      // From projects
      for (const [pid, pc] of projectPostalCode.entries()) {
        if (!pc || pc.length < 2) continue;
        if (!zones.has(pc)) {
          const cid = projectClientId.get(pid);
          const client = cid ? clientsById.get(cid) : undefined;
          zones.set(pc, {
            postalCode: pc,
            city: client?.city || '',
            projects: new Set(),
            clients: new Set(),
            apporteurs: new Set(),
            univers: new Set(),
            ca: 0,
            devisTotal: 0,
            devisSigned: 0,
            interventionCount: 0,
          });
        }
        const zone = zones.get(pc)!;
        zone.projects.add(pid);
        
        const cid = projectClientId.get(pid);
        if (cid) zone.clients.add(cid);
        
        const apId = projectApporteurId.get(pid);
        if (apId) zone.apporteurs.add(apId);
        
        const univ = projectUnivers.get(pid);
        if (univ && univ !== 'Non classé') zone.univers.add(univ);
        
        zone.ca += caByProject.get(pid) || 0;
        
        const dv = devisByProject.get(pid);
        if (dv) {
          zone.devisTotal += dv.total;
          zone.devisSigned += dv.signed;
        }
      }

      // Count interventions per postal code
      for (const intervention of interventions as any[]) {
        const pid = intervention.projectId;
        const pc = projectPostalCode.get(pid);
        if (!pc || !zones.has(pc)) continue;
        zones.get(pc)!.interventionCount++;
      }

      // Geocode postal code centroids (batch: use city center)
      const zoneResults: any[] = [];
      const maxProjects = Math.max(...Array.from(zones.values()).map(z => z.projects.size), 1);
      const allUnivers = new Set<string>();
      for (const z of zones.values()) z.univers.forEach(u => allUnivers.add(u));
      const totalUniversCount = allUnivers.size || 1;

      for (const [pc, zone] of zones.entries()) {
        // Geocode using postal code + city
        const coords = await geocodeAddress('', pc, zone.city);
        if (!coords) continue;

        const nbProjects = zone.projects.size;
        const nbClients = zone.clients.size;
        const nbApporteurs = zone.apporteurs.size;
        const nbUnivers = zone.univers.size;
        const panierMoyen = nbProjects > 0 ? zone.ca / nbProjects : 0;

        // ── Opportunity Score (0-100) ──
        // Higher = more opportunity (underserved area worth targeting)
        
        // 1. Proximity score (30%): closer to agency = higher opportunity
        let proximityScore = 50; // default if no agency coords
        if (agencyCoords) {
          const R = 6371;
          const dLat = (coords.lat - agencyCoords.lat) * Math.PI / 180;
          const dLon = (coords.lng - agencyCoords.lng) * Math.PI / 180;
          const a = Math.sin(dLat/2)**2 + Math.cos(agencyCoords.lat * Math.PI / 180) * Math.cos(coords.lat * Math.PI / 180) * Math.sin(dLon/2)**2;
          const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          // 0-10km → 100, 10-30km → 80-40, 30-60km → 40-10, >60km → 0
          proximityScore = distKm <= 10 ? 100 : distKm <= 30 ? Math.round(100 - (distKm - 10) * 3) : distKm <= 60 ? Math.round(40 - (distKm - 30)) : 0;
          proximityScore = Math.max(0, Math.min(100, proximityScore));
        }

        // 2. Low activity score (20%): fewer projects = higher opportunity
        const activityRatio = nbProjects / maxProjects;
        const lowActivityScore = Math.round((1 - activityRatio) * 100);

        // 3. Historical presence (20%): some old presence = reactivation potential
        const historicalScore = nbProjects > 0 ? Math.min(100, nbProjects * 15) : 0;

        // 4. Missing métiers (15%): fewer univers = untapped potential
        const universGap = Math.round(((totalUniversCount - nbUnivers) / totalUniversCount) * 100);

        // 5. Apporteur dependency (15%): fewer apporteurs = fragile
        const apporteurScore = nbApporteurs === 0 ? 100 : nbApporteurs === 1 ? 80 : nbApporteurs <= 3 ? 40 : 0;

        const opportunityScore = Math.round(
          0.30 * proximityScore +
          0.20 * lowActivityScore +
          0.20 * historicalScore +
          0.15 * universGap +
          0.15 * apporteurScore
        );

        // Activity level for coloring
        let activityLevel: 'none' | 'low' | 'medium' | 'high';
        if (nbProjects === 0) activityLevel = 'none';
        else if (nbProjects <= 3) activityLevel = 'low';
        else if (nbProjects <= 10) activityLevel = 'medium';
        else activityLevel = 'high';

        // Generate insights
        const insights: string[] = [];
        if (proximityScore >= 70 && nbProjects <= 2) {
          const distStr = agencyCoords ? `${Math.round(
            6371 * 2 * Math.atan2(
              Math.sqrt(Math.sin(((coords.lat - agencyCoords.lat) * Math.PI / 180)/2)**2 + Math.cos(agencyCoords.lat * Math.PI / 180) * Math.cos(coords.lat * Math.PI / 180) * Math.sin(((coords.lng - agencyCoords.lng) * Math.PI / 180)/2)**2),
              Math.sqrt(1 - (Math.sin(((coords.lat - agencyCoords.lat) * Math.PI / 180)/2)**2 + Math.cos(agencyCoords.lat * Math.PI / 180) * Math.cos(coords.lat * Math.PI / 180) * Math.sin(((coords.lng - agencyCoords.lng) * Math.PI / 180)/2)**2))
            )
          )} km` : '';
          insights.push(`Zone sous-exploitée${distStr ? ` à ${distStr} de l'agence` : ''}`);
        }
        if (nbApporteurs === 1) insights.push('Dépendance à 1 seul apporteur');
        if (nbApporteurs === 0 && nbProjects > 0) insights.push('Aucun apporteur actif identifié');
        if (nbUnivers <= 1 && nbProjects >= 3) {
          const missing = Array.from(allUnivers).filter(u => !zone.univers.has(u));
          if (missing.length > 0) insights.push(`Métiers absents : ${missing.slice(0, 3).join(', ')}`);
        }
        if (nbProjects > 0 && nbProjects <= 3) insights.push('Présence faible — potentiel d\'ancrage');

        zoneResults.push({
          postalCode: pc,
          city: zone.city,
          lat: coords.lat,
          lng: coords.lng,
          nbProjects,
          nbClients,
          nbApporteurs,
          nbUnivers,
          univers: Array.from(zone.univers),
          ca: Math.round(zone.ca),
          panierMoyen: Math.round(panierMoyen),
          devisTotal: zone.devisTotal,
          devisSigned: zone.devisSigned,
          interventionCount: zone.interventionCount,
          activityLevel,
          opportunityScore: Math.min(100, Math.max(0, opportunityScore)),
          insights,
        });
      }

      // Sort by opportunity score descending
      zoneResults.sort((a, b) => b.opportunityScore - a.opportunityScore);

      console.log(`[GET-RDV-MAP] Zones for ${targetAgency}: ${zoneResults.length} postal codes analyzed`);

      return withCors(req, new Response(
        JSON.stringify({
          success: true,
          data: zoneResults,
          meta: {
            mode: 'zones',
            agencySlug: targetAgency,
            totalZones: zoneResults.length,
            agencyCoords,
            timestamp: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      ));
    }

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
        (v: any) => typeof v?.date === 'string' && v.date.startsWith(date!)
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

      // Calculer endAt
      const startDate = new Date(startAt);
      const endAtDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
      const endAt = endAtDate.toISOString();

      mapRdvs.push({
        rdvId: intervention.id,
        projectId: intervention.projectId,
        projectRef: project.ref,
        clientName: client.name,
        lat: coords.lat,
        lng: coords.lng,
        startAt,
        endAt,
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
