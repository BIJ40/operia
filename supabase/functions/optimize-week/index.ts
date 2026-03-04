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

  // Group by date
  const byDate = new Map<string, TechDayLoad[]>();
  for (const tl of techLoads) {
    if (!byDate.has(tl.date)) byDate.set(tl.date, []);
    byDate.get(tl.date)!.push(tl);
  }

  for (const [date, dayLoads] of byDate) {
    // Find overloaded and underloaded techs
    const avgLoad = dayLoads.reduce((s, t) => s + t.totalMinutes, 0) / Math.max(dayLoads.length, 1);
    const overloaded = dayLoads.filter(t => t.totalMinutes > avgLoad + 60);
    const underloaded = dayLoads.filter(t => t.totalMinutes < avgLoad - 60);

    for (const over of overloaded) {
      for (const under of underloaded) {
        if (over.interventions.length > 0 && moves.length < 5) {
          const intervToMove = over.interventions[over.interventions.length - 1];
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

  // Find techs with gaps (days with low load adjacent to days with high load)
  const byTech = new Map<number, TechDayLoad[]>();
  for (const tl of techLoads) {
    if (!byTech.has(tl.techId)) byTech.set(tl.techId, []);
    byTech.get(tl.techId)!.push(tl);
  }

  for (const [techId, days] of byTech) {
    days.sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < days.length - 1; i++) {
      const today = days[i];
      const tomorrow = days[i + 1];
      if (today.totalMinutes > 420 && tomorrow.totalMinutes < 180 && today.interventions.length > 1) {
        const lastInterv = today.interventions[today.interventions.length - 1];
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
        if (moves.length >= 3) break;
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

    // Load weights
    const { data: configRow } = await supabase
      .from('planning_optimizer_config')
      .select('weights')
      .eq('agency_id', agency_id)
      .maybeSingle();

    // Fetch real data from Apogée
    console.log(`[OPTIMIZE-WEEK] Fetching data for agency ${agency.slug}, week ${week_start}`);
    
    const [users, interventions] = await Promise.all([
      fetchApogee(agency.slug, 'apiGetUsers', apiKey),
      fetchApogee(agency.slug, 'getInterventionsCreneaux', apiKey),
    ]);

    console.log(`[OPTIMIZE-WEEK] Loaded: ${users.length} users, ${interventions.length} interventions`);

    // Filter technicians
    const technicians = users.filter((u: any) => {
      const type = (u.type || '').toLowerCase();
      return type.includes('tech') || type.includes('ouvrier') || type.includes('intervenant');
    });

    // Build week range
    const weekStartDate = new Date(week_start);
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);
    const weekStartStr = weekStartDate.toISOString().split('T')[0];
    const weekEndStr = weekEndDate.toISOString().split('T')[0];

    // Filter interventions for the week
    const weekInterventions = interventions.filter((interv: any) => {
      const dateStr = (interv.date || interv.dateDebut || '').split('T')[0];
      return dateStr >= weekStartStr && dateStr <= weekEndStr;
    });

    // Build tech-day loads
    const techLoads: TechDayLoad[] = [];
    const techMap = new Map<number, any>();
    for (const tech of technicians) techMap.set(tech.id, tech);

    const loadMap = new Map<string, TechDayLoad>();
    for (const interv of weekInterventions) {
      const techId = interv.userId || interv.user_id;
      const dateStr = (interv.date || interv.dateDebut || '').split('T')[0];
      if (!techId || !dateStr) continue;

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
      load.totalMinutes += (interv.duration || 120);
    }

    const allTechLoads = Array.from(loadMap.values());

    // Detect optimization opportunities
    const swapMoves = detectSwapOpportunities(allTechLoads);
    const gapMoves = detectGapOptimizations(allTechLoads);
    const moves = [...swapMoves, ...gapMoves].slice(0, 5);

    const summaryGains = {
      total_gain_minutes: moves.reduce((s, m) => s + m.gain_minutes, 0),
      total_gain_ca: moves.reduce((s, m) => s + m.gain_ca, 0),
      moves_count: moves.length,
      low_risk_count: moves.filter(m => m.risk === 'low').length,
    };

    // Audit trail
    await supabase.from('planning_moves').insert({
      agency_id,
      week_start,
      requested_by: user.id,
      input_json: { agency_id, week_start, techs: technicians.length, interventions_week: weekInterventions.length },
      moves_json: moves,
      summary_gains_json: summaryGains,
    }).catch(e => console.warn('[OPTIMIZE-WEEK] Audit insert failed:', e));

    return withCors(req, new Response(JSON.stringify({
      success: true,
      moves,
      summary: summaryGains,
      meta: {
        engine_version: 'v1-heuristic-live',
        weights: configRow?.weights ?? null,
        technicians_count: technicians.length,
        week_interventions: weekInterventions.length,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (err) {
    console.error('optimize-week error:', err);
    return withCors(req, new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500 }));
  }
});
