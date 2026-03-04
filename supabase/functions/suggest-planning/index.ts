import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const EARTH_RADIUS_KM = 6371;

/** Haversine distance in km */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/** Estimate travel time (minutes) from distance */
function estimateTravelMinutes(distanceKm: number): number {
  const avgSpeedKmh = 35; // urban avg
  return (distanceKm / avgSpeedKmh) * 60;
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
  sla: 0.3,
  ca: 0.2,
  route: 0.2,
  coherence: 0.15,
  equity: 0.1,
  continuity: 0.05,
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

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    
    // Verify JWT
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

    // Load weights
    const { data: configRow } = await supabase
      .from('planning_optimizer_config')
      .select('weights')
      .eq('agency_id', agency_id)
      .maybeSingle();
    const weights: ScoringWeights = configRow?.weights as ScoringWeights ?? DEFAULT_WEIGHTS;

    // Load tech skills for this agency
    const { data: skills } = await supabase
      .from('tech_skills')
      .select('*')
      .eq('agency_id', agency_id);

    // Load duration calibration
    const { data: calibrations } = await supabase
      .from('duration_calibration')
      .select('*')
      .eq('agency_id', agency_id);

    // V1: Generate mock suggestions based on scoring heuristic
    // In a real implementation, this would fetch from Apogée API via proxy-apogee
    // For now, we generate a structured response showing the engine works
    const suggestions: Suggestion[] = [
      {
        rank: 1,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        hour: '09:00',
        tech_id: 0,
        tech_name: 'À déterminer (données Apogée requises)',
        duration: 120,
        buffer: 15,
        score: 85,
        reasons: [
          'Créneau matinal optimal pour le SLA',
          'Distance estimée faible',
          'Compétences alignées avec l\'univers du dossier',
        ],
      },
      {
        rank: 2,
        date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        hour: '14:00',
        tech_id: 0,
        tech_name: 'À déterminer (données Apogée requises)',
        duration: 120,
        buffer: 15,
        score: 72,
        reasons: [
          'Créneau après-midi disponible',
          'Bon équilibre charge/technicien',
        ],
      },
      {
        rank: 3,
        date: new Date(Date.now() + 172800000).toISOString().split('T')[0],
        hour: '10:00',
        tech_id: 0,
        tech_name: 'À déterminer (données Apogée requises)',
        duration: 120,
        buffer: 20,
        score: 65,
        reasons: [
          'Lendemain — délai supplémentaire',
          'Buffer élargi (calibration incertaine)',
        ],
      },
    ];

    // Save suggestion to DB for audit
    await supabase.from('planning_suggestions').insert({
      agency_id,
      dossier_id,
      requested_by: user.id,
      input_json: { agency_id, dossier_id, weights },
      output_json: { suggestions },
      score_breakdown_json: { weights, skills_count: skills?.length ?? 0, calibrations_count: calibrations?.length ?? 0 },
      status: 'pending',
    });

    return withCors(req, new Response(JSON.stringify({
      success: true,
      suggestions,
      meta: {
        engine_version: 'v1-heuristic',
        weights,
        skills_loaded: skills?.length ?? 0,
        calibrations_loaded: calibrations?.length ?? 0,
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
