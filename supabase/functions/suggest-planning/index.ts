import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { withSentry } from '../_shared/withSentry.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

const ENGINE_VERSION = 'v2-hard-soft';
const MAX_DAY_LOAD_MINUTES = 420; // 7h
const DEFAULT_BUFFER = 15; // min
const EARTH_RADIUS_KM = 6371;
const DEFAULT_SPEED_KMH = 35;

// Duration fallbacks by intervention type
const DURATION_DEFAULTS: Record<string, number> = {
  depannage: 60, dépannage: 60, dep: 60,
  rt: 90, 'releve technique': 90, 'relevé technique': 90, rdv: 90, diagnostic: 90,
  travaux: 180, tvx: 180, work: 180,
};
const DURATION_FALLBACK = 120; // 2h default

// Day-of-week names for work_days jsonb
const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// =============================================================================
// TYPES
// =============================================================================

interface ScoringWeights {
  coherence: number;
  equity: number;
  continuity: number;
  route: number;
  gap: number;
  proximity: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  coherence: 0.25, equity: 0.20, continuity: 0.15, route: 0.15, gap: 0.15, proximity: 0.10,
};

interface HardBlock {
  techId: number;
  techName: string;
  reason: string;
}

interface Suggestion {
  rank: number;
  date: string;
  hour: string;
  tech_id: number;
  tech_name: string;
  duration: number;
  buffer: number;
  score: number;
  score_breakdown: Record<string, number>;
  reasons: string[];
}

interface TechProfile {
  collaboratorId: string;
  apogeeUserId: number;
  name: string;
  skills: { code: string; level: number; isPrimary: boolean }[];
  workDays: Record<string, boolean>;
  dayStartMin: number;
  dayEndMin: number;
  lunchStartMin: number;
  lunchEndMin: number;
  homeLat: number | null;
  homeLng: number | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function normalizeSlug(s: string): string {
  return normalize(s).replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

function timeToMinutes(t: string | null | undefined): number {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

function estimateTravelMin(distKm: number): number {
  return Math.round((distKm / DEFAULT_SPEED_KMH) * 60);
}

// =============================================================================
// TECH DISCOVERY HELPERS
// =============================================================================

const EXCLUDED_TYPE_KEYWORDS = [
  'interimaire', 'interim', 'commercial', 'admin', 'administratif',
  'assist', 'utilisateur', 'comptable', 'direction', 'secret',
];

function isExcludedOfficeType(typeRaw: unknown): boolean {
  const type = normalize(String(typeRaw || ''));
  if (!type) return false;
  return EXCLUDED_TYPE_KEYWORDS.some(k => type.includes(k));
}

// =============================================================================
// DOSSIER UNIVERSE EXTRACTION
// =============================================================================

const DOSSIER_STOPWORDS = new Set([
  'de', 'du', 'des', 'les', 'pour', 'avec', 'sans', 'sur', 'dans', 'chez', 'client', 'dossier',
  'monsieur', 'madame', 'mme', 'rue', 'avenue', 'impasse', 'allee', 'boulevard', 'place',
]);

function extractDossierUniverses(dossier: any): string[] {
  if (!dossier) return [];
  const fromUniverses = [
    ...(Array.isArray(dossier?.data?.universes) ? dossier.data.universes : []),
    ...(Array.isArray(dossier?.universes) ? dossier.universes : []),
  ].map((u: string) => normalizeSlug(u)).filter(Boolean);

  const labelSource = [
    dossier?.label, dossier?.data?.label,
    ...(Array.isArray(dossier?.data?.pictosInterv) ? dossier.data.pictosInterv : []),
  ].filter(Boolean).join(' ');

  const labelTokens = labelSource
    .split(/[\s\-\/\+,;:|()]+/)
    .map((w: string) => normalizeSlug(w))
    .filter((w: string) => w.length >= 4 && !DOSSIER_STOPWORDS.has(w));

  return Array.from(new Set([...fromUniverses, ...labelTokens]));
}

// Mapping univers slug → catalog codes for fuzzy matching
const UNIVERS_ALIASES: Record<string, string> = {
  plomb: 'plomberie', sanitaire: 'plomberie', sanitaires: 'plomberie',
  elec: 'electricite', electrique: 'electricite',
  serrure: 'serrurerie', serrurier: 'serrurerie',
  vitre: 'vitrerie', vitres: 'vitrerie', vitrier: 'vitrerie', miroiterie: 'vitrerie',
  menuisier: 'menuiserie', bois: 'menuiserie', porte: 'menuiserie', fenetre: 'menuiserie',
  chaudiere: 'chauffage', climatisation: 'chauffage', clim: 'chauffage', cvc: 'chauffage', pac: 'chauffage',
  volet: 'volet_roulant', volets: 'volet_roulant', store: 'volet_roulant', stores: 'volet_roulant',
  peintre: 'peinture', revetement: 'peinture',
  faience: 'carrelage', carreleur: 'carrelage',
  reno: 'renovation', travaux: 'renovation',
  fuite: 'recherche_fuite', recherche_de_fuite: 'recherche_fuite',
  multi: 'multiservices',
  pmr: 'pmr', accessibilite: 'pmr', amelioration_logement: 'pmr',
  platrerie: 'platrerie', platrier: 'platrerie', platre: 'platrerie',
};

function resolveUniversCode(slug: string): string {
  const s = normalizeSlug(slug);
  return UNIVERS_ALIASES[s] || s;
}

// =============================================================================
// HARD CONSTRAINTS
// =============================================================================

function checkHardConstraints(
  tech: TechProfile,
  dateStr: string,
  slotStartMin: number,
  durationMin: number,
  requiredCodes: string[],
  occupiedIntervals: { start: number; end: number }[],
  minLevel: number,
): { pass: boolean; reason?: string } {
  // 1. Competence check
  if (requiredCodes.length > 0) {
    const techCodes = new Set(tech.skills.filter(s => s.level >= minLevel).map(s => s.code));
    if (techCodes.size === 0) {
      return { pass: false, reason: `Aucune compétence renseignée (niveau ≥${minLevel})` };
    }
    const missing = requiredCodes.filter(c => !techCodes.has(c));
    if (missing.length > 0) {
      return { pass: false, reason: `Compétence manquante : ${missing.join(', ')}` };
    }
  }

  // 2. Work day check
  const d = new Date(dateStr + 'T12:00:00Z');
  const dow = d.getUTCDay();
  const dowKey = DOW_KEYS[dow];
  if (!tech.workDays[dowKey]) {
    return { pass: false, reason: `${dowKey.toUpperCase()} non travaillé` };
  }

  // 3. Amplitude check
  const slotEndMin = slotStartMin + durationMin + DEFAULT_BUFFER;
  if (slotStartMin < tech.dayStartMin) {
    return { pass: false, reason: `Avant amplitude (${minutesToTime(tech.dayStartMin)})` };
  }
  if (slotEndMin > tech.dayEndMin) {
    return { pass: false, reason: `Après amplitude (${minutesToTime(tech.dayEndMin)})` };
  }

  // 4. Lunch overlap check
  if (slotStartMin < tech.lunchEndMin && (slotStartMin + durationMin) > tech.lunchStartMin) {
    // Allow if slot fits entirely before or after lunch
    if (!(slotStartMin + durationMin <= tech.lunchStartMin || slotStartMin >= tech.lunchEndMin)) {
      return { pass: false, reason: `Chevauche la pause déjeuner (${minutesToTime(tech.lunchStartMin)}-${minutesToTime(tech.lunchEndMin)})` };
    }
  }

  // 5. Overlap check with existing events
  for (const interval of occupiedIntervals) {
    if (slotStartMin < interval.end && (slotStartMin + durationMin) > interval.start) {
      return { pass: false, reason: `Chevauchement avec créneau existant (${minutesToTime(interval.start)}-${minutesToTime(interval.end)})` };
    }
  }

  return { pass: true };
}

// =============================================================================
// SOFT SCORING
// =============================================================================

function scoreSoft(
  tech: TechProfile,
  slotStartMin: number,
  dayLoadMin: number,
  avgLoadMin: number,
  requiredCodes: string[],
  dossierLat: number | null,
  dossierLng: number | null,
  weights: ScoringWeights,
): { total: number; breakdown: Record<string, number>; reasons: string[] } {
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  // 1. Coherence: skill level quality
  if (requiredCodes.length > 0 && tech.skills.length > 0) {
    const matchedSkills = tech.skills.filter(s => requiredCodes.includes(s.code));
    const avgLevel = matchedSkills.reduce((s, sk) => s + sk.level, 0) / Math.max(matchedSkills.length, 1);
    const hasPrimary = matchedSkills.some(s => s.isPrimary);
    let cScore = Math.min(100, avgLevel * 20);
    if (hasPrimary) { cScore += 15; reasons.push('Compétence principale'); }
    breakdown.coherence = Math.round(cScore);
    if (avgLevel >= 4) reasons.push(`Niveau élevé (${avgLevel.toFixed(1)}/5)`);
  } else {
    breakdown.coherence = 50;
  }

  // 2. Equity: less loaded → higher score
  const diff = dayLoadMin - avgLoadMin;
  breakdown.equity = Math.round(Math.max(0, Math.min(100, 80 - diff / 3)));
  if (diff < -60) reasons.push('Charge sous la moyenne → équilibrage');
  if (diff > 60) reasons.push('⚠ Journée déjà chargée');

  // 3. Route/distance
  if (dossierLat != null && dossierLng != null && tech.homeLat != null && tech.homeLng != null) {
    const km = haversineKm(tech.homeLat, tech.homeLng, dossierLat, dossierLng);
    const travelMin = estimateTravelMin(km);
    breakdown.route = Math.round(Math.max(0, 100 - travelMin * 1.5));
    if (travelMin <= 15) reasons.push(`Proche (${Math.round(km)} km)`);
    else if (travelMin >= 45) reasons.push(`⚠ Distance élevée (~${Math.round(km)} km, ~${travelMin} min)`);
  } else {
    breakdown.route = 50; // neutral when no geo data
  }

  // 4. Gap penalty: penalize if start creates unusable gap before
  if (slotStartMin > 9 * 60) {
    // Simple: deduct for late starts unless heavily loaded before
    breakdown.gap = Math.round(Math.max(0, 100 - (slotStartMin - 8 * 60) / 3));
  } else {
    breakdown.gap = 90;
  }

  // 5. Proximity: earlier dates better (reflected via hour preference)
  const hourScore = Math.max(0, 100 - (slotStartMin - 8 * 60) / 4);
  breakdown.proximity = Math.round(hourScore);
  if (slotStartMin <= 9 * 60) reasons.push('Créneau tôt → meilleur SLA');

  // 6. Continuity placeholder (needs initiator tech info)
  breakdown.continuity = 50;

  // Weighted total
  const total = Math.round(
    breakdown.coherence * weights.coherence +
    breakdown.equity * weights.equity +
    breakdown.route * weights.route +
    breakdown.gap * weights.gap +
    breakdown.proximity * weights.proximity +
    breakdown.continuity * weights.continuity
  );

  return { total: Math.max(0, Math.min(100, total)), breakdown, reasons };
}

// =============================================================================
// APOGEE API
// =============================================================================

async function fetchApogee(slug: string, endpoint: string, apiKey: string): Promise<any[]> {
  const url = `https://${slug}.hc-apogee.fr/api/${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ API_KEY: apiKey }),
    });
    if (!res.ok) {
      console.warn(`[SUGGEST] Apogée ${endpoint}: HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.warn(`[SUGGEST] Apogée ${endpoint} error:`, e);
    return [];
  }
}

// =============================================================================
// DATE/TIME PARSING
// =============================================================================

function parseDateAndTime(dateLike: unknown): { dateStr: string; startMinutes: number } | null {
  if (!dateLike) return null;
  const s = String(dateLike);
  const m = s.match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
  if (m) return { dateStr: m[1], startMinutes: Number(m[2]) * 60 + Number(m[3]) };
  return null;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(withSentry({ functionName: 'suggest-planning' }, async (req: Request) => {
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

    const body = await req.json();
    const { agency_id, dossier_id, options } = body;
    if (!agency_id || !dossier_id) {
      return withCors(req, new Response(JSON.stringify({ error: 'agency_id and dossier_id required' }), { status: 400 }));
    }

    const minSkillLevel = options?.min_skill_level ?? 2;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get agency — accept UUID or slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agency_id);
    const { data: agency } = await supabase
      .from('apogee_agencies')
      .select('id, slug')
      .eq(isUuid ? 'id' : 'slug', agency_id)
      .single();
    if (!agency?.slug || !apiKey) {
      return withCors(req, new Response(JSON.stringify({ error: 'Agency not found or API key missing' }), { status: 400 }));
    }
    const agencyUuid = agency.id;

    console.log(`[SUGGEST] agency=${agency.slug} dossier=${dossier_id}`);

    // =========================================================================
    // LOAD DATA IN PARALLEL
    // =========================================================================
    const [
      apogeeUsers,
      creneaux,
      interventions,
      projects,
      collabRows,
      skillRows,
      profileRows,
      configRow,
    ] = await Promise.all([
      fetchApogee(agency.slug, 'apiGetUsers', apiKey),
      fetchApogee(agency.slug, 'getInterventionsCreneaux', apiKey),
      fetchApogee(agency.slug, 'apiGetInterventions', apiKey),
      fetchApogee(agency.slug, 'apiGetProjects', apiKey),
      supabase
        .from('collaborators')
        .select('id, apogee_user_id, first_name, last_name, type, role')
        .eq('agency_id', agencyUuid)
        .not('apogee_user_id', 'is', null)
        .is('leaving_date', null)
        .then(r => r.data || []),
      supabase
        .from('technician_skills')
        .select('collaborator_id, univers_code, level, is_primary')
        .then(r => r.data || []),
      supabase
        .from('technician_profile')
        .select('*')
        .then(r => r.data || []),
      supabase
        .from('planning_optimizer_config')
        .select('weights')
        .eq('agency_id', agency_id)
        .maybeSingle()
        .then(r => r.data),
    ]);

    const weights: ScoringWeights = { ...DEFAULT_WEIGHTS, ...(configRow?.weights as any ?? {}) };

    console.log(`[SUGGEST] Data: ${apogeeUsers.length} users, ${creneaux.length} creneaux, ${interventions.length} interventions, ${collabRows.length} collabs, ${skillRows.length} skills, ${profileRows.length} profiles`);

    // =========================================================================
    // BUILD TECH PROFILES
    // =========================================================================

    // Index collaborators by apogee_user_id
    const collabByApogee = new Map<number, any>();
    for (const c of collabRows as any[]) {
      const uid = Number(c.apogee_user_id);
      if (Number.isFinite(uid)) collabByApogee.set(uid, c);
    }

    // Index skills by collaborator_id
    const skillsByCollab = new Map<string, typeof skillRows>();
    for (const s of skillRows as any[]) {
      const key = s.collaborator_id;
      if (!skillsByCollab.has(key)) skillsByCollab.set(key, []);
      skillsByCollab.get(key)!.push(s);
    }

    // Index profiles by collaborator_id
    const profileByCollab = new Map<string, any>();
    for (const p of profileRows as any[]) {
      profileByCollab.set(p.collaborator_id, p);
    }

    // Also index old rh_competencies for backward compat
    const { data: rhCompRows } = await supabase
      .from('rh_competencies')
      .select('collaborator_id, competences_techniques')
      .in('collaborator_id', collabRows.map((c: any) => c.id));
    const rhCompByCollab = new Map<string, string[]>();
    for (const r of (rhCompRows || []) as any[]) {
      if (r.competences_techniques?.length) {
        rhCompByCollab.set(r.collaborator_id, r.competences_techniques);
      }
    }

    // Discover technicians: include anyone in collaborators who isn't excluded office type
    // AND who has terrain activity or is a tech-type or has skills
    const terrainUserIds = new Set<number>();
    for (const c of creneaux) {
      if (normalizeSlug(String((c as any)?.refType || '')) === 'visite_interv') {
        const ids = Array.isArray((c as any)?.usersIds) ? (c as any).usersIds : [];
        for (const id of ids) { const n = Number(id); if (Number.isFinite(n)) terrainUserIds.add(n); }
      }
    }

    const techProfiles: TechProfile[] = [];
    const processedIds = new Set<number>();

    for (const [apogeeId, collab] of collabByApogee.entries()) {
      if (processedIds.has(apogeeId)) continue;
      if (isExcludedOfficeType(collab.type) || isExcludedOfficeType(collab.role)) continue;
      processedIds.add(apogeeId);

      // Check if active in Apogée
      const apUser = apogeeUsers.find((u: any) => Number(u.id) === apogeeId);
      if (apUser && (apUser.is_on === false || apUser.isOn === false)) continue;

      // Build skills from technician_skills (new structured) or fallback to rh_competencies
      const structuredSkills = (skillsByCollab.get(collab.id) || []) as any[];
      let skills: TechProfile['skills'] = structuredSkills.map(s => ({
        code: s.univers_code,
        level: s.level ?? 3,
        isPrimary: s.is_primary ?? false,
      }));

      // Fallback: convert rh_competencies labels to codes
      if (skills.length === 0) {
        const rhComps = rhCompByCollab.get(collab.id) || [];
        skills = rhComps.map(label => ({
          code: resolveUniversCode(label),
          level: 3,
          isPrimary: false,
        }));
      }

      // Profile (amplitude, work_days)
      const prof = profileByCollab.get(collab.id);
      const workDays = prof?.work_days ?? { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };

      const name = `${collab.first_name || ''} ${collab.last_name || ''}`.trim() ||
                   (apUser ? `${apUser.firstname || ''} ${apUser.name || ''}`.trim() : `Tech #${apogeeId}`);

      techProfiles.push({
        collaboratorId: collab.id,
        apogeeUserId: apogeeId,
        name,
        skills,
        workDays,
        dayStartMin: timeToMinutes(prof?.day_start || '08:00'),
        dayEndMin: timeToMinutes(prof?.day_end || '17:30'),
        lunchStartMin: timeToMinutes(prof?.lunch_start || '12:00'),
        lunchEndMin: timeToMinutes(prof?.lunch_end || '13:30'),
        homeLat: prof?.home_lat != null ? Number(prof.home_lat) : null,
        homeLng: prof?.home_lng != null ? Number(prof.home_lng) : null,
      });
    }

    console.log(`[SUGGEST] ${techProfiles.length} tech profiles built`);

    // =========================================================================
    // FIND TARGET DOSSIER
    // =========================================================================
    const dossier = projects.find((p: any) => Number(p.id) === Number(dossier_id));
    const dossierUniversSlugs = extractDossierUniverses(dossier);
    const requiredCodes = [...new Set(dossierUniversSlugs.map(resolveUniversCode))];
    const dossierType = normalize(dossier?.type || dossier?.data?.type || '');

    // Estimate duration
    let estimatedDuration = DURATION_FALLBACK;
    for (const [key, val] of Object.entries(DURATION_DEFAULTS)) {
      if (dossierType.includes(key)) { estimatedDuration = val; break; }
    }

    // Dossier location
    const dossierLat = Number(dossier?.data?.lat || dossier?.lat) || null;
    const dossierLng = Number(dossier?.data?.lng || dossier?.lng) || null;

    console.log(`[SUGGEST] Dossier: univers=${requiredCodes.join(',')}, type=${dossierType}, duration=${estimatedDuration}min, geo=${dossierLat},${dossierLng}`);

    // =========================================================================
    // BUILD OCCUPANCY INDEX: tech_id → date → intervals[]
    // =========================================================================
    const occupancy = new Map<string, { start: number; end: number }[]>();
    const dayLoad = new Map<string, number>();
    const seen = new Set<string>();

    const addOccupied = (techId: number, dateStr: string, startMin: number, dur: number) => {
      if (!Number.isFinite(techId) || !dateStr || !Number.isFinite(startMin)) return;
      dur = Math.max(30, dur || 120);
      const dedup = `${techId}-${dateStr}-${startMin}-${dur}`;
      if (seen.has(dedup)) return;
      seen.add(dedup);

      const key = `${techId}-${dateStr}`;
      if (!occupancy.has(key)) occupancy.set(key, []);
      occupancy.get(key)!.push({ start: startMin, end: startMin + dur });
      dayLoad.set(key, (dayLoad.get(key) || 0) + dur);
    };

    // Source 1: getInterventionsCreneaux
    for (const c of creneaux) {
      const parsed = parseDateAndTime((c as any)?.date || (c as any)?.dateDebut);
      if (!parsed) continue;
      const dur = (c as any)?.duree || (c as any)?.duration || 120;
      const ids = Array.isArray((c as any)?.usersIds) ? (c as any).usersIds : [(c as any)?.userId].filter(Boolean);
      for (const id of ids) addOccupied(Number(id), parsed.dateStr, parsed.startMinutes, dur);
    }

    // Source 2: apiGetInterventions visites
    for (const interv of interventions) {
      const visites = Array.isArray((interv as any)?.data?.visites) ? (interv as any).data.visites : [];
      for (const v of visites) {
        const parsed = parseDateAndTime((v as any)?.date || (interv as any)?.date);
        if (!parsed) continue;
        const dur = (v as any)?.duree || (interv as any)?.duree || 120;
        const ids = Array.isArray((v as any)?.usersIds) && (v as any).usersIds.length > 0
          ? (v as any).usersIds
          : [(interv as any)?.userId].filter(Boolean);
        for (const id of ids) addOccupied(Number(id), parsed.dateStr, parsed.startMinutes, dur);
      }
    }

    // =========================================================================
    // GENERATE CANDIDATE SLOTS (5 working days, no Saturday/Sunday)
    // =========================================================================
    const today = new Date();
    const workingDays: string[] = [];
    const d = new Date(today);
    while (workingDays.length < 5) {
      d.setDate(d.getDate() + 1);
      const dow = d.getDay();
      if (dow >= 1 && dow <= 5) { // Mon-Fri only
        workingDays.push(d.toISOString().split('T')[0]);
      }
    }

    // Compute avg load across all tech-days for equity scoring
    const allLoads = Array.from(dayLoad.values());
    const avgLoad = allLoads.length > 0 ? allLoads.reduce((a, b) => a + b, 0) / allLoads.length : 0;

    // =========================================================================
    // EVALUATE: HARD filter → SOFT score
    // =========================================================================
    const blockers: HardBlock[] = [];
    const candidates: (Suggestion & { _raw: number })[] = [];

    for (const tech of techProfiles) {
      for (const dayStr of workingDays) {
        const key = `${tech.apogeeUserId}-${dayStr}`;
        const intervals = occupancy.get(key) || [];
        const load = dayLoad.get(key) || 0;

        // Skip fully booked days
        if (load >= MAX_DAY_LOAD_MINUTES) {
          blockers.push({ techId: tech.apogeeUserId, techName: tech.name, reason: `${dayStr}: planning plein (${load}min)` });
          continue;
        }

        // Find free contiguous blocks within amplitude
        const sortedIntervals = [...intervals].sort((a, b) => a.start - b.start);

        // Build free windows
        const freeWindows: { start: number; end: number }[] = [];
        let cursor = tech.dayStartMin;

        for (const iv of sortedIntervals) {
          if (iv.start > cursor) {
            freeWindows.push({ start: cursor, end: iv.start });
          }
          cursor = Math.max(cursor, iv.end);
        }
        if (cursor < tech.dayEndMin) {
          freeWindows.push({ start: cursor, end: tech.dayEndMin });
        }

        // Remove lunch overlap from free windows
        const adjustedWindows: { start: number; end: number }[] = [];
        for (const w of freeWindows) {
          if (w.end <= tech.lunchStartMin || w.start >= tech.lunchEndMin) {
            adjustedWindows.push(w);
          } else {
            // Split around lunch
            if (w.start < tech.lunchStartMin) adjustedWindows.push({ start: w.start, end: tech.lunchStartMin });
            if (w.end > tech.lunchEndMin) adjustedWindows.push({ start: tech.lunchEndMin, end: w.end });
          }
        }

        // Filter windows large enough for duration + buffer
        const neededMin = estimatedDuration + DEFAULT_BUFFER;
        const viableWindows = adjustedWindows.filter(w => (w.end - w.start) >= neededMin);

        if (viableWindows.length === 0) continue;

        // Take the best (earliest) slot in each viable window
        for (const window of viableWindows) {
          const slotStart = window.start;

          // Run hard constraints
          const hardResult = checkHardConstraints(
            tech, dayStr, slotStart, estimatedDuration,
            requiredCodes, intervals, minSkillLevel,
          );

          if (!hardResult.pass) {
            blockers.push({ techId: tech.apogeeUserId, techName: tech.name, reason: `${dayStr} ${minutesToTime(slotStart)}: ${hardResult.reason}` });
            continue;
          }

          // Soft scoring
          const { total, breakdown, reasons } = scoreSoft(
            tech, slotStart, load, avgLoad,
            requiredCodes, dossierLat, dossierLng, weights,
          );

          candidates.push({
            rank: 0,
            date: dayStr,
            hour: minutesToTime(slotStart),
            tech_id: tech.apogeeUserId,
            tech_name: tech.name,
            duration: estimatedDuration,
            buffer: DEFAULT_BUFFER,
            score: total,
            score_breakdown: breakdown,
            reasons: reasons.slice(0, 6),
            _raw: total,
          });

          break; // Only best slot per tech per day
        }
      }
    }

    // Sort deterministically: score desc, then date asc, then tech_id asc
    candidates.sort((a, b) => b._raw - a._raw || a.date.localeCompare(b.date) || a.tech_id - b.tech_id);

    // Diversify: top 3 = different techs, then fill up to 10 alternatives
    const suggestions: Suggestion[] = [];
    const usedTechs = new Set<number>();
    const usedKeys = new Set<string>();

    // Pass 1: different techs
    for (const c of candidates) {
      if (usedTechs.has(c.tech_id)) continue;
      usedTechs.add(c.tech_id);
      usedKeys.add(`${c.tech_id}-${c.date}`);
      suggestions.push({ ...c, rank: suggestions.length + 1 });
      if (suggestions.length >= 3) break;
    }

    // Pass 2: fill with different tech-day combos
    if (suggestions.length < 3) {
      for (const c of candidates) {
        const key = `${c.tech_id}-${c.date}`;
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        suggestions.push({ ...c, rank: suggestions.length + 1 });
        if (suggestions.length >= 3) break;
      }
    }

    // Alternatives (next 10)
    const alternatives: Suggestion[] = [];
    for (const c of candidates) {
      const key = `${c.tech_id}-${c.date}`;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      alternatives.push({ ...c, rank: suggestions.length + alternatives.length + 1 });
      if (alternatives.length >= 10) break;
    }

    // Clean _raw from output
    const cleanSuggestions = suggestions.map(({ _raw, ...rest }) => rest);
    const cleanAlternatives = alternatives.map(({ _raw, ...rest }) => rest);

    // Deduplicate blockers (max 20)
    const uniqueBlockers = blockers
      .filter((b, i, arr) => arr.findIndex(x => x.techId === b.techId && x.reason === b.reason) === i)
      .slice(0, 20);

    console.log(`[SUGGEST] Results: ${cleanSuggestions.length} suggestions, ${cleanAlternatives.length} alternatives, ${uniqueBlockers.length} blockers`);

    // =========================================================================
    // AUDIT TRAIL
    // =========================================================================
    try {
      await supabase.from('planning_suggestions').insert({
        agency_id,
        dossier_id,
        requested_by: user.id,
        input_json: { agency_id, dossier_id, requiredCodes, estimatedDuration, minSkillLevel, weights },
        output_json: { suggestions: cleanSuggestions, alternatives: cleanAlternatives, blockers: uniqueBlockers },
        score_breakdown_json: {
          techs_total: techProfiles.length,
          candidates_evaluated: candidates.length,
          hard_blocked: blockers.length,
          weights,
        },
        status: 'pending',
      });
    } catch (e) { console.warn('[SUGGEST] Audit error:', e); }

    return withCors(req, new Response(JSON.stringify({
      success: true,
      suggestions: cleanSuggestions,
      alternatives: cleanAlternatives,
      blockers: uniqueBlockers,
      meta: {
        engine_version: ENGINE_VERSION,
        weights,
        techs_total: techProfiles.length,
        techs_with_skills: techProfiles.filter(t => t.skills.length > 0).length,
        dossier_found: !!dossier,
        dossier_universes: requiredCodes,
        estimated_duration: estimatedDuration,
        candidates_evaluated: candidates.length,
        hard_blocked: blockers.length,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  } catch (err) {
    console.error('[SUGGEST] Fatal error:', err);
    return withCors(req, new Response(JSON.stringify({
      success: false,
      error: 'Internal error',
      details: String(err),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
  }
}));
