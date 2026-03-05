import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

interface Move {
  type: 'swap' | 'move' | 'reassign';
  description: string;
  from: string;
  to: string;
  gain_minutes: number;
  gain_ca: number;
  risk: 'low' | 'medium' | 'high';
  explanation: string;
}

// =============================================================================
// APOGEE API HELPER
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
// TECH DISCOVERY (aligned with suggest-planning)
// =============================================================================

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const EXCLUDED_TYPE_KEYWORDS = [
  'interimaire', 'interim', 'commercial', 'admin', 'administratif',
  'assist', 'utilisateur', 'comptable', 'direction', 'secret',
];

const TECHNICIAN_HINT_KEYWORDS = [
  'techn', 'ouvrier', 'intervenant',
  'plomb', 'peint', 'menuis', 'chauff', 'elect', 'serrur',
  'vitr', 'carrel', 'reno', 'multi', 'fuite',
];

function isExcludedOfficeType(typeRaw: unknown): boolean {
  const type = normalize(String(typeRaw || ''));
  if (!type) return false;
  return EXCLUDED_TYPE_KEYWORDS.some((k) => type.includes(k));
}

function hasTechnicianHint(typeRaw: unknown): boolean {
  const type = normalize(String(typeRaw || ''));
  if (!type) return false;
  return TECHNICIAN_HINT_KEYWORDS.some((k) => type.includes(k));
}

function discoverTechnicians(users: any[], interventions: any[], rhCollaborators: any[]): any[] {
  // 1. Users with tech hint or non-excluded type with interventions
  const userIdsWithInterventions = new Set<number>();
  for (const interv of interventions) {
    const uid = interv.userId || interv.user_id;
    if (uid) userIdsWithInterventions.add(Number(uid));
  }

  const techMap = new Map<number, any>();
  
  for (const u of users) {
    const uid = Number(u.id);
    if (isExcludedOfficeType(u.type)) continue;
    
    if (hasTechnicianHint(u.type) || userIdsWithInterventions.has(uid)) {
      techMap.set(uid, u);
    }
  }

  // 2. Add RH collaborators with apogee_user_id that aren't already included
  for (const collab of rhCollaborators) {
    const apogeeId = collab.apogee_user_id;
    if (!apogeeId || techMap.has(Number(apogeeId))) continue;
    
    const collabType = normalize(collab.type || collab.role || '');
    if (collabType.includes('technic') || collabType.includes('ouvrier') || 
        userIdsWithInterventions.has(Number(apogeeId))) {
      // Create a synthetic user entry
      techMap.set(Number(apogeeId), {
        id: Number(apogeeId),
        firstname: collab.first_name || '',
        lastname: collab.last_name || '',
        prenom: collab.first_name || '',
        nom: collab.last_name || '',
        type: collab.type || 'technicien',
      });
    }
  }

  return Array.from(techMap.values());
}

// =============================================================================
// OPTIMIZATION LOGIC
// =============================================================================

interface TechDayLoad {
  techId: number;
  techName: string;
  date: string;
  interventions: any[];
  totalMinutes: number;
}

function detectSwapOpportunities(techLoads: TechDayLoad[]): Move[] {
  const moves: Move[] = [];

  const byDate = new Map<string, TechDayLoad[]>();
  for (const tl of techLoads) {
    if (!byDate.has(tl.date)) byDate.set(tl.date, []);
    byDate.get(tl.date)!.push(tl);
  }

  for (const [date, dayLoads] of byDate) {
    const avgLoad = dayLoads.reduce((s, t) => s + t.totalMinutes, 0) / Math.max(dayLoads.length, 1);
    const overloaded = dayLoads.filter(t => t.totalMinutes > avgLoad + 60);
    const underloaded = dayLoads.filter(t => t.totalMinutes < avgLoad - 60);

    for (const over of overloaded) {
      for (const under of underloaded) {
        if (over.interventions.length > 0 && moves.length < 8) {
          const gainMin = Math.round((over.totalMinutes - under.totalMinutes) / 2);
          moves.push({
            type: 'reassign',
            description: `Réassigner intervention de ${over.techName} → ${under.techName} le ${date}`,
            from: `${over.techName} (${over.totalMinutes}min chargé)`,
            to: `${under.techName} (${under.totalMinutes}min chargé)`,
            gain_minutes: gainMin,
            gain_ca: 0,
            risk: gainMin > 90 ? 'medium' : 'low',
            explanation: `${over.techName} est surchargé (${over.totalMinutes}min) vs ${under.techName} (${under.totalMinutes}min). Rééquilibrage de ~${gainMin}min.`,
          });
        }
      }
    }
  }

  return moves;
}

function detectGapOptimizations(techLoads: TechDayLoad[]): Move[] {
  const moves: Move[] = [];

  const byTech = new Map<number, TechDayLoad[]>();
  for (const tl of techLoads) {
    if (!byTech.has(tl.techId)) byTech.set(tl.techId, []);
    byTech.get(tl.techId)!.push(tl);
  }

  for (const [_techId, days] of byTech) {
    days.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < days.length - 1; i++) {
      const today = days[i];
      const tomorrow = days[i + 1];
      if (today.totalMinutes > 420 && tomorrow.totalMinutes < 180 && today.interventions.length > 1) {
        moves.push({
          type: 'move',
          description: `Déplacer dernière intervention de ${today.techName} du ${today.date} → ${tomorrow.date}`,
          from: `${today.date} — ${today.techName} (${today.totalMinutes}min)`,
          to: `${tomorrow.date} — ${today.techName} (${tomorrow.totalMinutes}min)`,
          gain_minutes: 0,
          gain_ca: 0,
          risk: 'low',
          explanation: `Lissage charge : ${today.date} surchargé (${today.totalMinutes}min) vs ${tomorrow.date} sous-chargé (${tomorrow.totalMinutes}min)`,
        });
        if (moves.length >= 5) break;
      }
    }
  }

  return moves;
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

    const { agency_id, week_start } = await req.json();
    if (!agency_id || !week_start) {
      return withCors(req, new Response(JSON.stringify({ error: 'agency_id and week_start required' }), { status: 400 }));
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

    // Load weights + RH collaborators in parallel
    const [configResult, collabResult] = await Promise.all([
      supabase
        .from('planning_optimizer_config')
        .select('weights')
        .eq('agency_id', agency_id)
        .maybeSingle(),
      supabase
        .from('collaborators')
        .select('id, first_name, last_name, type, role, apogee_user_id')
        .eq('agency_id', agency_id)
        .not('apogee_user_id', 'is', null),
    ]);

    const configRow = configResult.data;
    const rhCollaborators = collabResult.data || [];

    // Fetch real data from Apogée
    console.log(`[OPTIMIZE-WEEK] Fetching data for agency ${agency.slug}, week ${week_start}`);
    
    const [users, creneaux, interventions] = await Promise.all([
      fetchApogee(agency.slug, 'apiGetUsers', apiKey),
      fetchApogee(agency.slug, 'getInterventionsCreneaux', apiKey),
      fetchApogee(agency.slug, 'apiGetInterventions', apiKey),
    ]);

    console.log(`[OPTIMIZE-WEEK] Loaded: ${users.length} users, ${creneaux.length} créneaux, ${interventions.length} interventions`);

    // Discover technicians using robust logic
    const technicians = discoverTechnicians(users, [...creneaux, ...interventions], rhCollaborators);
    console.log(`[OPTIMIZE-WEEK] Discovered ${technicians.length} technicians`);

    // Build 2-week range (14 days)
    const weekStartDate = new Date(week_start);
    const rangeEndDate = new Date(weekStartDate);
    rangeEndDate.setDate(rangeEndDate.getDate() + 13); // 2 weeks = 14 days
    const rangeStartStr = weekStartDate.toISOString().split('T')[0];
    const rangeEndStr = rangeEndDate.toISOString().split('T')[0];

    // Merge créneaux + interventions for comprehensive occupancy
    const allSlots = [...creneaux, ...interventions];
    
    // Filter for 2-week range
    const rangeSlots = allSlots.filter((interv: any) => {
      const dateStr = (interv.date || interv.dateDebut || '').split('T')[0];
      return dateStr >= rangeStartStr && dateStr <= rangeEndStr;
    });

    console.log(`[OPTIMIZE-WEEK] ${rangeSlots.length} slots in 2-week range ${rangeStartStr} → ${rangeEndStr}`);

    // Build tech-day loads
    const techMap = new Map<number, any>();
    for (const tech of technicians) techMap.set(Number(tech.id), tech);

    const loadMap = new Map<string, TechDayLoad>();
    for (const interv of rangeSlots) {
      const techId = Number(interv.userId || interv.user_id);
      const dateStr = (interv.date || interv.dateDebut || '').split('T')[0];
      if (!techId || !dateStr) continue;
      if (!techMap.has(techId)) continue; // Only count discovered technicians

      const key = `${techId}-${dateStr}`;
      if (!loadMap.has(key)) {
        const tech = techMap.get(techId);
        loadMap.set(key, {
          techId,
          techName: tech ? `${tech.prenom || tech.firstname || ''} ${tech.nom || tech.lastname || ''}`.trim() : `Tech #${techId}`,
          date: dateStr,
          interventions: [],
          totalMinutes: 0,
        });
      }
      const load = loadMap.get(key)!;
      load.interventions.push(interv);
      
      // Compute duration from créneaux (30min slots) or explicit duration
      const duration = interv.duration || 30;
      load.totalMinutes += duration;
    }

    const allTechLoads = Array.from(loadMap.values());

    // Detect optimization opportunities
    const swapMoves = detectSwapOpportunities(allTechLoads);
    const gapMoves = detectGapOptimizations(allTechLoads);
    const moves = [...swapMoves, ...gapMoves].slice(0, 8);

    const summaryGains = {
      total_gain_minutes: moves.reduce((s, m) => s + m.gain_minutes, 0),
      total_gain_ca: moves.reduce((s, m) => s + m.gain_ca, 0),
      moves_count: moves.length,
      low_risk_count: moves.filter(m => m.risk === 'low').length,
    };

    // Audit trail (non-blocking)
    supabase.from('planning_moves').insert({
      agency_id,
      week_start,
      requested_by: user.id,
      input_json: { agency_id, week_start, techs: technicians.length, slots_in_range: rangeSlots.length },
      moves_json: moves,
      summary_gains_json: summaryGains,
    }).then(() => {}).catch(e => console.warn('[OPTIMIZE-WEEK] Audit insert failed:', e));

    return withCors(req, new Response(JSON.stringify({
      success: true,
      moves,
      summary: summaryGains,
      meta: {
        engine_version: 'v1-heuristic-2weeks',
        weights: configRow?.weights ?? null,
        technicians_count: technicians.length,
        range_slots: rangeSlots.length,
        range: `${rangeStartStr} → ${rangeEndStr}`,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (err) {
    console.error('[OPTIMIZE-WEEK] error:', err);
    return withCors(req, new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal error', 
      details: String(err) 
    }), { 
      status: 200, // Return 200 to avoid FunctionsHttpError
      headers: { 'Content-Type': 'application/json' },
    }));
  }
});
