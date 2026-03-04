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

Deno.serve(async (req: Request) => {
  const corsResponse = handleCorsPreflightOrReject(req);
  if (corsResponse) return corsResponse;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
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

    // Load weights
    const { data: configRow } = await supabase
      .from('planning_optimizer_config')
      .select('weights')
      .eq('agency_id', agency_id)
      .maybeSingle();

    // V1: Placeholder moves — real implementation would analyze Apogée planning data
    const moves: Move[] = [
      {
        type: 'swap',
        description: 'Échange interventions entre Tech A et Tech B (proximité géographique)',
        from: 'Tech A — Intervention #1 (mardi 10h)',
        to: 'Tech B — Intervention #2 (mardi 10h)',
        gain_minutes: 42,
        gain_ca: 0,
        risk: 'low',
        explanation: 'Les deux interventions sont proches géographiquement mais assignées aux mauvais techniciens. Le swap réduit le trajet de 42 min au total.',
      },
      {
        type: 'move',
        description: 'Déplacer intervention dans un trou (jeudi 14h → mercredi 11h)',
        from: 'Jeudi 14h — Tech C',
        to: 'Mercredi 11h — Tech C',
        gain_minutes: 25,
        gain_ca: 320,
        risk: 'low',
        explanation: 'Le créneau de mercredi 11h est libre et plus optimal. Libère jeudi 14h pour un éventuel dépannage urgent. CA potentiel récupéré: 320€.',
      },
      {
        type: 'reassign',
        description: 'Réassigner intervention plomberie à un tech spécialisé',
        from: 'Tech D (généraliste)',
        to: 'Tech E (plomberie niveau 4)',
        gain_minutes: 0,
        gain_ca: 0,
        risk: 'medium',
        explanation: 'Tech E a une meilleure compétence en plomberie (niveau 4 vs 2). Risque moyen car Tech E a déjà 6 interventions cette semaine.',
      },
    ];

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
      input_json: { agency_id, week_start },
      moves_json: moves,
      summary_gains_json: summaryGains,
    });

    return withCors(req, new Response(JSON.stringify({
      success: true,
      moves,
      summary: summaryGains,
      meta: { engine_version: 'v1-heuristic', weights: configRow?.weights ?? null },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
  } catch (err) {
    console.error('optimize-week error:', err);
    return withCors(req, new Response(JSON.stringify({ error: 'Internal error', details: String(err) }), { status: 500 }));
  }
});
