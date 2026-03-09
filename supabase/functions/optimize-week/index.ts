import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

const ENGINE_VERSION = 'v2-2weeks';
const MAX_DAY_LOAD = 420;

interface Move {
  type: 'swap' | 'move' | 'reassign';
  description: string;
  from: string;
  to: string;
  gain_minutes: number;
  gain_ca: number;
  risk: 'low' | 'medium' | 'high';
  explanation: string;
  why: string[];
}

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

const EXCLUDED_TYPES = ['interimaire','interim','commercial','admin','administratif','assist','utilisateur','comptable','direction','secret'];

function isExcluded(t: unknown): boolean {
  const s = normalize(String(t || ''));
  return s ? EXCLUDED_TYPES.some(k => s.includes(k)) : false;
}

async function fetchApogee(slug: string, endpoint: string, key: string): Promise<any[]> {
  try {
    const res = await fetch(`https://${slug}.hc-apogee.fr/api/${endpoint}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: key }),
    });
    if (!res.ok) return [];
    const d = await res.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

function parseDT(v: unknown): { date: string; min: number } | null {
  if (!v) return null;
  const m = String(v).match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
  return m ? { date: m[1], min: +m[2] * 60 + +m[3] } : null;
}

interface TechDay {
  techId: number;
  name: string;
  date: string;
  load: number;
  events: { start: number; dur: number; ref?: string }[];
}

Deno.serve(async (req: Request) => {
  const cors = handleCorsPreflightOrReject(req);
  if (cors) return cors;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('APOGEE_API_KEY');
    const auth = req.headers.get('Authorization');

    const sAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: auth ?? '' } },
    });
    const { data: { user }, error } = await sAuth.auth.getUser();
    if (error || !user) return withCors(req, new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }));

    const { agency_id, week_start } = await req.json();
    if (!agency_id || !week_start) return withCors(req, new Response(JSON.stringify({ error: 'Missing params' }), { status: 400 }));

    const sb = createClient(supabaseUrl, serviceKey);
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agency_id);
    const { data: agency } = await sb.from('apogee_agencies').select('id, slug').eq(isUuid ? 'id' : 'slug', agency_id).single();
    if (!agency?.slug || !apiKey) return withCors(req, new Response(JSON.stringify({ error: 'No agency/key' }), { status: 400 }));
    const agencyUuid = agency.id;

    console.log(`[OPTIMIZE] agency=${agency.slug} week=${week_start}`);

    // Parallel data fetch
    const [users, creneaux, interventions, collabs, skillRows] = await Promise.all([
      fetchApogee(agency.slug, 'apiGetUsers', apiKey),
      fetchApogee(agency.slug, 'getInterventionsCreneaux', apiKey),
      fetchApogee(agency.slug, 'apiGetInterventions', apiKey),
      sb.from('collaborators').select('id, apogee_user_id, first_name, last_name, type, role')
        .eq('agency_id', agency_id).not('apogee_user_id', 'is', null).is('leaving_date', null)
        .then(r => r.data || []),
      sb.from('technician_skills').select('collaborator_id, univers_code, level')
        .then(r => r.data || []),
    ]);

    // Build tech roster
    const techMap = new Map<number, { name: string; skills: string[] }>();
    const skillByCollab = new Map<string, string[]>();
    for (const s of (skillRows as any[])) {
      if (!skillByCollab.has(s.collaborator_id)) skillByCollab.set(s.collaborator_id, []);
      skillByCollab.get(s.collaborator_id)!.push(s.univers_code);
    }

    for (const c of (collabs as any[])) {
      const uid = Number(c.apogee_user_id);
      if (!Number.isFinite(uid) || isExcluded(c.type) || isExcluded(c.role)) continue;
      const apUser = users.find((u: any) => Number(u.id) === uid);
      if (apUser && (apUser.is_on === false)) continue;
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || `Tech #${uid}`;
      techMap.set(uid, { name, skills: skillByCollab.get(c.id) || [] });
    }

    console.log(`[OPTIMIZE] ${techMap.size} technicians`);

    // 2-week range (14 days, Mon-Fri only)
    const start = new Date(week_start);
    const rangeDays: string[] = [];
    const d = new Date(start);
    for (let i = 0; i < 14; i++) {
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) rangeDays.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() + 1);
    }

    // Build occupancy
    const techDays = new Map<string, TechDay>();
    const seen = new Set<string>();

    const addSlot = (techId: number, dateStr: string, startMin: number, dur: number, ref?: string) => {
      if (!techMap.has(techId) || !rangeDays.includes(dateStr)) return;
      dur = Math.max(30, dur || 120);
      const dd = `${techId}-${dateStr}-${startMin}-${dur}`;
      if (seen.has(dd)) return;
      seen.add(dd);

      const key = `${techId}-${dateStr}`;
      if (!techDays.has(key)) techDays.set(key, { techId, name: techMap.get(techId)!.name, date: dateStr, load: 0, events: [] });
      const td = techDays.get(key)!;
      td.events.push({ start: startMin, dur, ref });
      td.load += dur;
    };

    for (const c of creneaux) {
      const p = parseDT((c as any)?.date);
      if (!p) continue;
      const dur = (c as any)?.duree || 120;
      const ids = Array.isArray((c as any)?.usersIds) ? (c as any).usersIds : [(c as any)?.userId].filter(Boolean);
      for (const id of ids) addSlot(Number(id), p.date, p.min, dur, (c as any)?.projectRef);
    }

    for (const interv of interventions) {
      const visites = Array.isArray((interv as any)?.data?.visites) ? (interv as any).data.visites : [];
      for (const v of visites) {
        const p = parseDT((v as any)?.date || (interv as any)?.date);
        if (!p) continue;
        const dur = (v as any)?.duree || 120;
        const ids = Array.isArray((v as any)?.usersIds) ? (v as any).usersIds : [(interv as any)?.userId].filter(Boolean);
        for (const id of ids) addSlot(Number(id), p.date, p.min, dur);
      }
    }

    const allTDs = Array.from(techDays.values());
    console.log(`[OPTIMIZE] ${allTDs.length} tech-days in range`);

    // =========================================================================
    // MOVE DETECTION
    // =========================================================================
    const moves: Move[] = [];

    // Type A: Move within same tech (lissage charge)
    const byTech = new Map<number, TechDay[]>();
    for (const td of allTDs) {
      if (!byTech.has(td.techId)) byTech.set(td.techId, []);
      byTech.get(td.techId)!.push(td);
    }
    for (const [_, days] of byTech) {
      days.sort((a, b) => a.date.localeCompare(b.date));
      for (let i = 0; i < days.length - 1; i++) {
        const t = days[i], n = days[i + 1];
        if (t.load > MAX_DAY_LOAD && n.load < 180 && t.events.length > 1) {
          moves.push({
            type: 'move',
            description: `Déplacer 1 intervention de ${t.name} du ${t.date} → ${n.date}`,
            from: `${t.date} (${t.load}min)`,
            to: `${n.date} (${n.load}min)`,
            gain_minutes: Math.round((t.load - n.load) / 3),
            gain_ca: 0,
            risk: 'low',
            explanation: `Lissage: ${t.date} surchargé (${t.load}min) vs ${n.date} sous-chargé (${n.load}min)`,
            why: ['Rééquilibrage journalier', 'Même technicien'],
          });
        }
      }
    }

    // Type C: Reassign between techs on same day
    const byDate = new Map<string, TechDay[]>();
    for (const td of allTDs) {
      if (!byDate.has(td.date)) byDate.set(td.date, []);
      byDate.get(td.date)!.push(td);
    }
    for (const [date, dayTDs] of byDate) {
      const avgDay = dayTDs.reduce((s, t) => s + t.load, 0) / Math.max(dayTDs.length, 1);
      const over = dayTDs.filter(t => t.load > avgDay + 60);
      const under = dayTDs.filter(t => t.load < avgDay - 60);
      for (const o of over) {
        for (const u of under) {
          if (moves.length >= 10) break;
          const gain = Math.round((o.load - u.load) / 2);
          moves.push({
            type: 'reassign',
            description: `Réassigner de ${o.name} → ${u.name} le ${date}`,
            from: `${o.name} (${o.load}min)`,
            to: `${u.name} (${u.load}min)`,
            gain_minutes: gain,
            gain_ca: 0,
            risk: gain > 90 ? 'medium' : 'low',
            explanation: `${o.name} surchargé vs ${u.name} disponible`,
            why: ['Rééquilibrage inter-techniciens'],
          });
        }
      }
    }

    // Sort by gain desc, limit to 8
    moves.sort((a, b) => b.gain_minutes - a.gain_minutes);
    const topMoves = moves.slice(0, 8);

    const summary = {
      total_gain_minutes: topMoves.reduce((s, m) => s + m.gain_minutes, 0),
      total_gain_ca: 0,
      moves_count: topMoves.length,
      low_risk_count: topMoves.filter(m => m.risk === 'low').length,
    };

    // Audit (non-blocking)
    sb.from('planning_moves').insert({
      agency_id,
      week_start,
      requested_by: user.id,
      input_json: { agency_id, week_start, techs: techMap.size, days: rangeDays.length },
      moves_json: topMoves,
      summary_gains_json: summary,
    }).then(() => {}).catch(e => console.warn('[OPTIMIZE] Audit error:', e));

    return withCors(req, new Response(JSON.stringify({
      success: true,
      moves: topMoves,
      summary,
      meta: {
        engine_version: ENGINE_VERSION,
        technicians_count: techMap.size,
        range: `${rangeDays[0]} → ${rangeDays[rangeDays.length - 1]}`,
        working_days: rangeDays.length,
        tech_days_analyzed: allTDs.length,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  } catch (err) {
    console.error('[OPTIMIZE] error:', err);
    return withCors(req, new Response(JSON.stringify({
      success: false, error: 'Internal error', details: String(err),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
});
