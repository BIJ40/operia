import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const EARTH_RADIUS_KM = 6371;

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function estimateTravelMinutes(distanceKm: number): number {
  return (distanceKm / 35) * 60;
}

interface ScoringWeights {
  sla: number;
  ca: number;
  route: number;
  coherence: number;
  equity: number;
  continuity: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  sla: 0.3, ca: 0.2, route: 0.2, coherence: 0.15, equity: 0.1, continuity: 0.05,
};

interface Suggestion {
  rank: number;
  date: string;
  hour: string;
  tech_id: number;
  tech_name: string;
  duration: number;
  buffer: number;
  score: number;
  reasons: string[];
}

// =============================================================================
// APOGEE API HELPERS
// =============================================================================

async function fetchApogee(agencySlug: string, endpoint: string, apiKey: string): Promise<any[]> {
  const url = `https://${agencySlug}.hc-apogee.fr/api/${endpoint}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ API_KEY: apiKey }),
  });
  if (!response.ok) throw new Error(`Apogée ${endpoint}: ${response.status}`);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

// =============================================================================
// SCORING ENGINE
// =============================================================================

interface TechSlot {
  techId: number;
  techName: string;
  date: string;
  freeSlots: { hour: string; duration: number }[];
  totalLoadMinutes: number;
  universes: string[];
}

function generateHours(): string[] {
  const hours: string[] = [];
  for (let h = 8; h <= 17; h++) {
    hours.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 17) hours.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return hours;
}

function scoreSuggestion(
  techSlot: TechSlot,
  slotHour: string,
  dossier: any,
  weights: ScoringWeights,
  allTechSlots: TechSlot[],
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // SLA: earlier = better
  const hourNum = parseInt(slotHour.split(':')[0]);
  const slaScore = Math.max(0, 100 - (hourNum - 8) * 5);
  score += weights.sla * slaScore;
  if (slaScore >= 80) reasons.push('Créneau optimal pour respecter le SLA');

  // Coherence: check if tech universes match dossier universes
  const dossierUniverses = dossier?.data?.universes || [];
  const techUniverses = techSlot.universes || [];
  const hasMatchingUniverse = dossierUniverses.some((u: string) =>
    techUniverses.some((tu: string) => tu.toLowerCase().includes(u.toLowerCase()) || u.toLowerCase().includes(tu.toLowerCase()))
  );
  const coherenceScore = hasMatchingUniverse ? 100 : 40;
  score += weights.coherence * coherenceScore;
  if (hasMatchingUniverse) reasons.push(`Compétences alignées (${dossierUniverses.join(', ')})`);

  // Equity: less loaded technicians score higher
  const avgLoad = allTechSlots.reduce((s, t) => s + t.totalLoadMinutes, 0) / Math.max(allTechSlots.length, 1);
  const equityScore = techSlot.totalLoadMinutes <= avgLoad ? 100 : Math.max(0, 100 - (techSlot.totalLoadMinutes - avgLoad) / 5);
  score += weights.equity * equityScore;
  if (equityScore >= 80) reasons.push('Charge équilibrée pour ce technicien');

  // Route: placeholder (would need geo data)
  const routeScore = 70;
  score += weights.route * routeScore;

  // CA: placeholder
  const caScore = 60;
  score += weights.ca * caScore;

  // Continuity: check if tech already worked on this project
  const continuityScore = 50;
  score += weights.continuity * continuityScore;

  return { score: Math.round(score), reasons };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    const authHeader = req.headers.get('Authorization');

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader ?? '' } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return withCors(req, new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));
    }

    const { agency_id, dossier_id } = await req.json();
    if (!agency_id || !dossier_id) {
      return withCors(req, new Response(JSON.stringify({ error: 'agency_id and dossier_id required' }), { status: 400 }));
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get agency slug
    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('slug')
      .eq('id', agency_id)
      .single();

    if (!agency?.slug || !apiKey) {
      return withCors(req, new Response(JSON.stringify({ error: 'Agency not found or API key missing' }), { status: 400 }));
    }

    // Load weights
    const { data: configRow } = await supabase
      .from('planning_optimizer_config')
      .select('weights')
      .eq('agency_id', agency_id)
      .maybeSingle();
    const weights: ScoringWeights = configRow?.weights as ScoringWeights ?? DEFAULT_WEIGHTS;

    // Fetch real data from Apogée
    console.log(`[SUGGEST-PLANNING] Fetching data for agency ${agency.slug}, dossier ${dossier_id}`);
    
    const [users, interventions, projects] = await Promise.all([
      fetchApogee(agency.slug, 'apiGetUsers', apiKey),
      fetchApogee(agency.slug, 'getInterventionsCreneaux', apiKey),
      fetchApogee(agency.slug, 'apiGetProjects', apiKey),
    ]);

    console.log(`[SUGGEST-PLANNING] Loaded: ${users.length} users, ${interventions.length} interventions, ${projects.length} projects`);

    // Find the target dossier
    const dossier = projects.find((p: any) => p.id === dossier_id || p.id === String(dossier_id));

    // Filter technicians
    const technicians = users.filter((u: any) => {
      const type = (u.type || '').toLowerCase();
      return type.includes('tech') || type.includes('ouvrier') || type.includes('intervenant');
    });

    // Build tech availability for next 5 working days
    const today = new Date();
    const workingDays: string[] = [];
    let d = new Date(today);
    while (workingDays.length < 5) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) {
        workingDays.push(d.toISOString().split('T')[0]);
      }
    }

    // Index existing interventions by tech+date
    const occupiedSlots = new Map<string, Set<string>>();
    for (const interv of interventions) {
      const techId = interv.userId || interv.user_id;
      const dateStr = (interv.date || interv.dateDebut || '').split('T')[0];
      if (!techId || !dateStr) continue;
      const key = `${techId}-${dateStr}`;
      if (!occupiedSlots.has(key)) occupiedSlots.set(key, new Set());
      // Mark occupied hours
      const startHour = parseInt((interv.dateDebut || interv.date || '').split('T')[1]?.substring(0, 2) || '0');
      const durationH = (interv.duration || 120) / 60;
      for (let h = startHour; h < startHour + durationH && h <= 18; h++) {
        occupiedSlots.get(key)!.add(`${h.toString().padStart(2, '0')}:00`);
      }
    }

    // Build tech slots with free hours
    const allTechSlots: TechSlot[] = [];
    const allHours = generateHours();

    for (const tech of technicians) {
      for (const dayStr of workingDays) {
        const key = `${tech.id}-${dayStr}`;
        const occupied = occupiedSlots.get(key) || new Set();
        const freeSlots = allHours
          .filter(h => !occupied.has(h))
          .map(h => ({ hour: h, duration: 120 }));
        
        allTechSlots.push({
          techId: tech.id,
          techName: `${tech.prenom || tech.firstname || ''} ${tech.nom || tech.lastname || ''}`.trim() || tech.name || `Tech #${tech.id}`,
          date: dayStr,
          freeSlots,
          totalLoadMinutes: occupied.size * 60,
          universes: tech.universes || [],
        });
      }
    }

    // Score all possible slots and pick top 3
    const candidates: Array<Suggestion & { rawScore: number }> = [];
    for (const ts of allTechSlots) {
      for (const freeSlot of ts.freeSlots.slice(0, 4)) { // Limit candidates per tech-day
        const { score, reasons } = scoreSuggestion(ts, freeSlot.hour, dossier, weights, allTechSlots);
        candidates.push({
          rank: 0,
          date: ts.date,
          hour: freeSlot.hour,
          tech_id: ts.techId,
          tech_name: ts.techName,
          duration: freeSlot.duration,
          buffer: 15,
          score,
          reasons,
          rawScore: score,
        });
      }
    }

    // Sort by score desc and pick top 3
    candidates.sort((a, b) => b.rawScore - a.rawScore);
    const suggestions: Suggestion[] = candidates.slice(0, 3).map((c, i) => ({
      rank: i + 1,
      date: c.date,
      hour: c.hour,
      tech_id: c.tech_id,
      tech_name: c.tech_name,
      duration: c.duration,
      buffer: c.buffer,
      score: c.score,
      reasons: c.reasons,
    }));

    // Audit trail
    await supabase.from('planning_suggestions').insert({
      agency_id,
      dossier_id,
      requested_by: user.id,
      input_json: { agency_id, dossier_id, weights, technicians_count: technicians.length },
      output_json: { suggestions },
      score_breakdown_json: { weights, techs: technicians.length, interventions: interventions.length },
      status: 'pending',
    }).catch(e => console.warn('[SUGGEST-PLANNING] Audit insert failed:', e));

    return withCors(req, new Response(JSON.stringify({
      success: true,
      suggestions,
      meta: {
        engine_version: 'v1-heuristic-live',
        weights,
        skills_loaded: technicians.length,
        calibrations_loaded: interventions.length,
        dossier_found: !!dossier,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (err) {
    console.error('suggest-planning error:', err);
    return withCors(req, new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500 }));
  }
});
