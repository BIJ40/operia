import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { withSentry } from '../_shared/withSentry.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

const ENGINE_VERSION = 'v4-smart';
const MAX_DAY_LOAD_MINUTES = 420; // 7h
const DEFAULT_BUFFER = 15; // min
const EARTH_RADIUS_KM = 6371;
const DEFAULT_SPEED_KMH = 35;
const FIRST_RDV_DURATION = 60;
const SCAN_DAYS = 15; // scan 15 working days ahead
const MAX_SUGGESTIONS = 5;

const DURATION_DEFAULTS: Record<string, number> = {
  depannage: 60, dépannage: 60, dep: 60,
  rt: 90, 'releve technique': 90, 'relevé technique': 90, rdv: 90, diagnostic: 90,
  travaux: 180, tvx: 180, work: 180,
};
const DURATION_FALLBACK = 120;

const DOW_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

// Absence detection keywords
const ABSENCE_KEYWORDS = ['arret', 'arrêt', 'maladie', 'absence', 'conge', 'congé', 'repos', 'indisponible'];

// =============================================================================
// TYPES
// =============================================================================

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
  universe_group?: string;
  travel_km?: number;
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

interface AbsenceInfo {
  techId: number;
  label: string;
  dates: Set<string>; // dates where absent
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

function daysBetween(d1: string, d2: string): number {
  return Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24);
}

function parseDateAndTime(dateLike: unknown): { dateStr: string; startMinutes: number } | null {
  if (!dateLike) return null;
  const s = String(dateLike);
  const m = s.match(/(\d{4}-\d{2}-\d{2})[T\s](\d{2}):(\d{2})/);
  if (m) return { dateStr: m[1], startMinutes: Number(m[2]) * 60 + Number(m[3]) };
  return null;
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
// UNIVERSE EXTRACTION & MATCHING
// =============================================================================

function extractDossierUniverses(dossier: any): string[] {
  if (!dossier) return [];
  const fromUniverses = [
    ...(Array.isArray(dossier?.data?.universes) ? dossier.data.universes : []),
    ...(Array.isArray(dossier?.universes) ? dossier.universes : []),
  ].map((u: string) => normalizeSlug(u)).filter(Boolean);
  return Array.from(new Set(fromUniverses));
}

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

function techHasCodes(tech: TechProfile, codes: string[]): boolean {
  if (codes.length === 0) return true;
  const techCodes = new Set(tech.skills.map(s => s.code));
  return codes.every(c => techCodes.has(c));
}

// =============================================================================
// ABSENCE DETECTION — from Apogée creneaux data
// =============================================================================

function detectAbsences(creneaux: any[], interventions: any[]): Map<number, AbsenceInfo> {
  const absences = new Map<number, AbsenceInfo>();

  const allItems = [...creneaux, ...interventions];
  for (const item of allItems) {
    const type = normalize(String(item?.type || item?.data?.type || ''));
    const type2 = normalize(String(item?.type2 || item?.data?.type2 || ''));
    const label = normalize(String(item?.label || item?.data?.label || ''));
    const refType = normalize(String(item?.refType || item?.data?.refType || ''));
    const combined = `${type} ${type2} ${label} ${refType}`;

    const isAbsence = ABSENCE_KEYWORDS.some(k => combined.includes(k));
    if (!isAbsence) continue;

    const parsed = parseDateAndTime(item?.date || item?.dateDebut || item?.data?.date);
    if (!parsed) continue;

    const usersRaw = item?.usersIds || item?.data?.usersIds || [];
    const userId = item?.userId != null ? Number(item.userId) : undefined;
    const ids: number[] = Array.isArray(usersRaw) ? usersRaw.map((x: any) => Number(x)).filter(Number.isFinite) : [];
    if (userId && Number.isFinite(userId)) ids.push(userId);

    const absLabel = combined.includes('maladie') ? 'Arrêt maladie'
      : combined.includes('arret') || combined.includes('arrêt') ? 'En arrêt'
      : combined.includes('conge') || combined.includes('congé') ? 'En congé'
      : 'Absent';

    for (const id of ids) {
      if (!absences.has(id)) {
        absences.set(id, { techId: id, label: absLabel, dates: new Set() });
      }
      absences.get(id)!.dates.add(parsed.dateStr);
    }
  }

  return absences;
}

// =============================================================================
// SCHEDULING CONSTRAINTS
// =============================================================================

function checkSchedulingConstraints(
  tech: TechProfile,
  dateStr: string,
  slotStartMin: number,
  durationMin: number,
  occupiedIntervals: { start: number; end: number }[],
): { pass: boolean; reason?: string } {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dow = d.getUTCDay();
  const dowKey = DOW_KEYS[dow];
  if (!tech.workDays[dowKey]) {
    return { pass: false, reason: `${dowKey.toUpperCase()} non travaillé` };
  }

  const slotEndMin = slotStartMin + durationMin + DEFAULT_BUFFER;
  if (slotStartMin < tech.dayStartMin) return { pass: false, reason: 'Avant amplitude' };
  if (slotEndMin > tech.dayEndMin) return { pass: false, reason: 'Après amplitude' };

  if (slotStartMin < tech.lunchEndMin && (slotStartMin + durationMin) > tech.lunchStartMin) {
    if (!(slotStartMin + durationMin <= tech.lunchStartMin || slotStartMin >= tech.lunchEndMin)) {
      return { pass: false, reason: 'Pause déjeuner' };
    }
  }

  for (const interval of occupiedIntervals) {
    if (slotStartMin < interval.end && (slotStartMin + durationMin) > interval.start) {
      return { pass: false, reason: 'Chevauchement' };
    }
  }

  return { pass: true };
}

// =============================================================================
// SCORING V4 — Smart: proximity vs delay tradeoff
//
//   The key insight: a slot 3 days later but 5km away is BETTER than
//   a slot tomorrow but 50km away. We model this as a combined score.
//
//   Weights: Competence 35%, Proximity+Delay 40%, Urgency/Age 15%, Equity 10%
// =============================================================================

function scoreCandidate(
  tech: TechProfile,
  slotStartMin: number,
  dayStr: string,
  dayLoadMin: number,
  avgLoadMin: number,
  requiredCodes: string[],
  dossierLat: number | null,
  dossierLng: number | null,
  isFirstRdv: boolean,
  dossierAgeDays: number,
  todayStr: string,
  nearbyAppointmentLat: number | null,
  nearbyAppointmentLng: number | null,
): { total: number; breakdown: Record<string, number>; reasons: string[]; travelKm: number | null } {
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];
  let travelKm: number | null = null;

  // ── COMPETENCE QUALITY (35%) ─────────────────────────────────────────
  if (requiredCodes.length > 0) {
    const matchedSkills = tech.skills.filter(s => requiredCodes.includes(s.code));
    const avgLevel = matchedSkills.reduce((sum, sk) => sum + sk.level, 0) / Math.max(matchedSkills.length, 1);
    const hasPrimary = matchedSkills.some(s => s.isPrimary);
    let cScore = Math.min(100, avgLevel * 20);
    if (hasPrimary) { cScore = Math.min(100, cScore + 20); reasons.push('Compétence principale'); }
    if (avgLevel >= 4) reasons.push(`Niveau ${avgLevel.toFixed(0)}/5`);
    breakdown.competence = Math.round(cScore);
  } else {
    breakdown.competence = 70;
  }

  // ── PROXIMITY + DELAY COMBINED (40%) ─────────────────────────────────
  // This is the "intelligent" part:
  // - We compute a distance score (0-100)
  // - We compute a delay penalty (0-100, sooner = better)
  // - We combine them: close+later can beat far+sooner
  const daysFromNow = daysBetween(dayStr, todayStr);

  // Distance score: check both home base and nearby appointments that day
  let bestDistKm = Infinity;
  if (dossierLat != null && dossierLng != null) {
    if (tech.homeLat != null && tech.homeLng != null) {
      bestDistKm = haversineKm(tech.homeLat, tech.homeLng, dossierLat, dossierLng);
    }
    if (nearbyAppointmentLat != null && nearbyAppointmentLng != null) {
      const nearbyDist = haversineKm(nearbyAppointmentLat, nearbyAppointmentLng, dossierLat, dossierLng);
      bestDistKm = Math.min(bestDistKm, nearbyDist);
    }
  }

  let distanceScore: number;
  if (bestDistKm === Infinity) {
    distanceScore = 50; // no geo data
  } else {
    travelKm = Math.round(bestDistKm);
    // 0km = 100, 10km = 80, 25km = 50, 50km = 0
    distanceScore = Math.max(0, Math.min(100, 100 - bestDistKm * 2));
    if (bestDistKm <= 10) reasons.push(`Proche (${travelKm} km)`);
    else if (bestDistKm >= 40) reasons.push(`Éloigné (~${travelKm} km)`);
  }

  // Delay score: sooner is better, but not by a huge margin
  // Day 1 = 100, Day 3 = 80, Day 7 = 40, Day 15 = 0
  const delayScore = Math.max(0, Math.min(100, 100 - (daysFromNow - 1) * 7));

  // SMART COMBINATION: if tech is nearby, a few days delay is OK
  // if tech is far, even being soon doesn't help much
  // Formula: 60% distance + 40% delay
  const proximityDelayScore = Math.round(distanceScore * 0.6 + delayScore * 0.4);
  breakdown.proximite_delai = proximityDelayScore;

  if (distanceScore >= 80 && delayScore < 60) {
    reasons.push('Proche → vaut le délai');
  }

  // ── URGENCY / DOSSIER AGE (15%) ─────────────────────────────────────
  let urgencyScore = 0;
  if (isFirstRdv) {
    urgencyScore = Math.max(0, 100 - (daysFromNow - 1) * 12);
    if (daysFromNow <= 2) reasons.push('1er RDV rapide');
  } else {
    const ageBonus = Math.min(60, dossierAgeDays * 2);
    const dateBonus = Math.max(0, 40 - daysFromNow * 4);
    urgencyScore = Math.min(100, ageBonus + dateBonus);
    if (dossierAgeDays > 21) reasons.push(`Dossier ancien (${Math.round(dossierAgeDays)}j)`);
  }
  breakdown.urgence = Math.round(urgencyScore);

  // ── EQUITY (10%) ────────────────────────────────────────────────────
  const diff = dayLoadMin - avgLoadMin;
  breakdown.equilibrage = Math.round(Math.max(0, Math.min(100, 80 - diff / 3)));
  if (diff < -60) reasons.push('Journée légère');

  // ── WEIGHTED TOTAL ──────────────────────────────────────────────────
  const total = Math.round(
    breakdown.competence * 0.35 +
    breakdown.proximite_delai * 0.40 +
    breakdown.urgence * 0.15 +
    breakdown.equilibrage * 0.10
  );

  return { total: Math.max(0, Math.min(100, total)), breakdown, reasons, travelKm };
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
    const { agency_id, dossier_id } = body;
    if (!agency_id || !dossier_id) {
      return withCors(req, new Response(JSON.stringify({ error: 'agency_id and dossier_id required' }), { status: 400 }));
    }

    const supabase = createClient(supabaseUrl, serviceKey);

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

    console.log(`[SUGGEST] V4-smart — agency=${agency.slug} dossier=${dossier_id}`);

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
    ]);

    // Also fetch leave_requests for the scan period
    const todayStr = new Date().toISOString().split('T')[0];
    const endScanDate = new Date();
    endScanDate.setDate(endScanDate.getDate() + SCAN_DAYS + 5);
    const endScanStr = endScanDate.toISOString().split('T')[0];

    const { data: leaveRows } = await supabase
      .from('leave_requests')
      .select('collaborator_id, start_date, end_date, status, type')
      .in('status', ['approved', 'validated'])
      .lte('start_date', endScanStr)
      .gte('end_date', todayStr);

    console.log(`[SUGGEST] Data: ${apogeeUsers.length} users, ${creneaux.length} creneaux, ${collabRows.length} collabs, ${skillRows.length} skills, ${leaveRows?.length || 0} leave requests`);

    // =========================================================================
    // DETECT ABSENCES from Apogée creneaux + leave_requests
    // =========================================================================
    const absences = detectAbsences(creneaux, interventions);

    // Add leave_requests as absences
    const collabIdByApogee = new Map<string, number>();
    for (const c of collabRows as any[]) {
      const uid = Number(c.apogee_user_id);
      if (Number.isFinite(uid)) collabIdByApogee.set(c.id, uid);
    }

    for (const lr of (leaveRows || []) as any[]) {
      const apogeeId = collabIdByApogee.get(lr.collaborator_id);
      if (!apogeeId) continue;
      if (!absences.has(apogeeId)) {
        absences.set(apogeeId, { techId: apogeeId, label: lr.type || 'En congé', dates: new Set() });
      }
      // Add all dates in range
      const start = new Date(lr.start_date);
      const end = new Date(lr.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        absences.get(apogeeId)!.dates.add(d.toISOString().split('T')[0]);
      }
    }

    console.log(`[SUGGEST] Absences detected: ${absences.size} techs with absences`);

    // =========================================================================
    // BUILD TECH PROFILES
    // =========================================================================
    const collabByApogee = new Map<number, any>();
    for (const c of collabRows as any[]) {
      const uid = Number(c.apogee_user_id);
      if (Number.isFinite(uid)) collabByApogee.set(uid, c);
    }

    const skillsByCollab = new Map<string, typeof skillRows>();
    for (const s of skillRows as any[]) {
      const key = s.collaborator_id;
      if (!skillsByCollab.has(key)) skillsByCollab.set(key, []);
      skillsByCollab.get(key)!.push(s);
    }

    const profileByCollab = new Map<string, any>();
    for (const p of profileRows as any[]) {
      profileByCollab.set(p.collaborator_id, p);
    }

    // Fallback: rh_competencies
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

    // Discover terrain users
    const terrainUserIds = new Set<number>();
    for (const c of creneaux) {
      if (normalizeSlug(String((c as any)?.refType || '')) === 'visite_interv') {
        const ids = Array.isArray((c as any)?.usersIds) ? (c as any).usersIds : [];
        for (const id of ids) { const n = Number(id); if (Number.isFinite(n)) terrainUserIds.add(n); }
      }
    }

    const techProfiles: TechProfile[] = [];
    const processedIds = new Set<number>();
    const excludedTechs: { id: number; name: string; reason: string }[] = [];

    for (const [apogeeId, collab] of collabByApogee.entries()) {
      if (processedIds.has(apogeeId)) continue;
      if (isExcludedOfficeType(collab.type) || isExcludedOfficeType(collab.role)) continue;
      processedIds.add(apogeeId);

      const apUser = apogeeUsers.find((u: any) => Number(u.id) === apogeeId);
      if (apUser && (apUser.is_on === false || apUser.isOn === false)) continue;

      const name = `${collab.first_name || ''} ${collab.last_name || ''}`.trim() ||
                   (apUser ? `${apUser.firstname || ''} ${apUser.name || ''}`.trim() : `Tech #${apogeeId}`);

      // Check if tech is globally absent (all scan days)
      const absence = absences.get(apogeeId);

      // Build skills
      const structuredSkills = (skillsByCollab.get(collab.id) || []) as any[];
      let skills: TechProfile['skills'] = structuredSkills.map(s => ({
        code: s.univers_code,
        level: s.level ?? 3,
        isPrimary: s.is_primary ?? false,
      }));

      if (skills.length === 0) {
        const rhComps = rhCompByCollab.get(collab.id) || [];
        skills = rhComps.map(label => ({
          code: resolveUniversCode(label),
          level: 3,
          isPrimary: false,
        }));
      }

      // Strict tech filter
      const collabType = normalize(collab.type || '');
      const collabRole = normalize(collab.role || '');
      const isTechType = collabType.includes('technicien') || collabRole.includes('technicien');
      const hasTerrainActivity = terrainUserIds.has(apogeeId);
      const hasSkills = skills.length > 0;
      const apogeeIsTech = apUser?.isTechnicien === true || apUser?.isTechnicien === 1 ||
                           normalize(String(apUser?.type || '')) === 'technicien';
      const hasUniverses = Array.isArray(apUser?.data?.universes) && apUser.data.universes.length > 0;

      if (!isTechType && !hasTerrainActivity && !hasSkills && !apogeeIsTech && !hasUniverses) continue;

      const prof = profileByCollab.get(collab.id);
      const workDays = prof?.work_days ?? { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false };

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
    const rawUniverses = extractDossierUniverses(dossier);
    const requiredCodes = [...new Set(rawUniverses.map(resolveUniversCode))];
    const dossierState = normalize(dossier?.state || dossier?.data?.state || '');
    const isFirstRdv = dossierState === 'new' || dossierState === '' || dossierState === 'nouveau';

    const dossierIntervs = interventions.filter((i: any) => Number(i.projectId) === Number(dossier_id));

    let planningMode: 'single' | 'multi_slots' | 'multi_universe' = 'single';
    let estimatedDuration = DURATION_FALLBACK;

    if (isFirstRdv) {
      estimatedDuration = FIRST_RDV_DURATION;
      planningMode = 'single';
    } else {
      const dossierType = normalize(dossier?.type || dossier?.data?.type || '');
      for (const [key, val] of Object.entries(DURATION_DEFAULTS)) {
        if (dossierType.includes(key)) { estimatedDuration = val; break; }
      }
      if (requiredCodes.length > 1) {
        planningMode = 'multi_universe';
      } else {
        const nbPassages = dossierIntervs.reduce((sum: number, i: any) => {
          const postes = Array.isArray(i?.data?.chiffrages?.postes) ? i.data.chiffrages.postes : [];
          return sum + Math.max(postes.length, 1);
        }, 0);
        if (nbPassages > 1) planningMode = 'multi_slots';
      }
    }

    const dossierLat = Number(dossier?.data?.lat || dossier?.lat) || null;
    const dossierLng = Number(dossier?.data?.lng || dossier?.lng) || null;
    const dossierCreatedAt = dossier?.data?.dateCreation || dossier?.dateCreation || dossier?.created_at;
    const dossierAgeDays = dossierCreatedAt ? daysBetween(todayStr, String(dossierCreatedAt).split('T')[0]) : 0;

    console.log(`[SUGGEST] Dossier: univers=${requiredCodes.join(',')}, mode=${planningMode}, 1erRDV=${isFirstRdv}, duration=${estimatedDuration}min, age=${Math.round(dossierAgeDays)}j`);

    // =========================================================================
    // FILTER: only qualified techs (silently exclude incompetent ones)
    // =========================================================================
    const qualifiedTechs = techProfiles.filter(t => techHasCodes(t, requiredCodes));
    const qualifiedCount = qualifiedTechs.length;

    console.log(`[SUGGEST] ${qualifiedCount}/${techProfiles.length} techs ont la compétence ${requiredCodes.join('+')}`);

    if (qualifiedCount === 0) {
      return withCors(req, new Response(JSON.stringify({
        success: true,
        suggestions: [],
        alternatives: [],
        blockers: [],
        meta: {
          engine_version: ENGINE_VERSION,
          planning_mode: planningMode,
          is_first_rdv: isFirstRdv,
          dossier_age_days: Math.round(dossierAgeDays),
          techs_total: techProfiles.length,
          techs_qualified: 0,
          dossier_universes: requiredCodes,
          estimated_duration: estimatedDuration,
          candidates_evaluated: 0,
          message: `Aucun technicien n'a la compétence ${requiredCodes.join(' + ')}`,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }

    // =========================================================================
    // BUILD OCCUPANCY INDEX
    // =========================================================================
    const occupancy = new Map<string, { start: number; end: number }[]>();
    const dayLoad = new Map<string, number>();
    const seen = new Set<string>();

    // Also track appointment locations per tech per day for proximity scoring
    const dayAppointmentLocations = new Map<string, { lat: number; lng: number }[]>();

    const addOccupied = (techId: number, dateStr: string, startMin: number, dur: number, lat?: number, lng?: number) => {
      if (!Number.isFinite(techId) || !dateStr || !Number.isFinite(startMin)) return;
      dur = Math.max(30, dur || 120);
      const dedup = `${techId}-${dateStr}-${startMin}-${dur}`;
      if (seen.has(dedup)) return;
      seen.add(dedup);
      const key = `${techId}-${dateStr}`;
      if (!occupancy.has(key)) occupancy.set(key, []);
      occupancy.get(key)!.push({ start: startMin, end: startMin + dur });
      dayLoad.set(key, (dayLoad.get(key) || 0) + dur);
      if (lat && lng && Number.isFinite(lat) && Number.isFinite(lng)) {
        if (!dayAppointmentLocations.has(key)) dayAppointmentLocations.set(key, []);
        dayAppointmentLocations.get(key)!.push({ lat, lng });
      }
    };

    for (const c of creneaux) {
      const parsed = parseDateAndTime((c as any)?.date || (c as any)?.dateDebut);
      if (!parsed) continue;
      const dur = (c as any)?.duree || (c as any)?.duration || 120;
      const lat = Number((c as any)?.data?.lat || (c as any)?.lat) || undefined;
      const lng = Number((c as any)?.data?.lng || (c as any)?.lng) || undefined;
      const ids = Array.isArray((c as any)?.usersIds) ? (c as any).usersIds : [(c as any)?.userId].filter(Boolean);
      for (const id of ids) addOccupied(Number(id), parsed.dateStr, parsed.startMinutes, dur, lat, lng);
    }

    for (const interv of interventions) {
      const visites = Array.isArray((interv as any)?.data?.visites) ? (interv as any).data.visites : [];
      for (const v of visites) {
        const parsed = parseDateAndTime((v as any)?.date || (interv as any)?.date);
        if (!parsed) continue;
        const dur = (v as any)?.duree || (interv as any)?.duree || 120;
        const lat = Number((interv as any)?.data?.lat || (interv as any)?.lat) || undefined;
        const lng = Number((interv as any)?.data?.lng || (interv as any)?.lng) || undefined;
        const ids = Array.isArray((v as any)?.usersIds) && (v as any).usersIds.length > 0
          ? (v as any).usersIds
          : [(interv as any)?.userId].filter(Boolean);
        for (const id of ids) addOccupied(Number(id), parsed.dateStr, parsed.startMinutes, dur, lat, lng);
      }
    }

    // =========================================================================
    // GENERATE WORKING DAYS (next SCAN_DAYS)
    // =========================================================================
    const workingDays: string[] = [];
    const dt = new Date();
    while (workingDays.length < SCAN_DAYS) {
      dt.setDate(dt.getDate() + 1);
      const dow = dt.getDay();
      if (dow >= 1 && dow <= 5) workingDays.push(dt.toISOString().split('T')[0]);
    }

    const allLoads = Array.from(dayLoad.values());
    const avgLoad = allLoads.length > 0 ? allLoads.reduce((a, b) => a + b, 0) / allLoads.length : 0;

    // =========================================================================
    // EVALUATE: for each qualified tech, find FIRST available slot then a few more
    // =========================================================================

    interface RawCandidate {
      date: string;
      hour: string;
      tech_id: number;
      tech_name: string;
      duration: number;
      score: number;
      score_breakdown: Record<string, number>;
      reasons: string[];
      travel_km: number | null;
      universe_group: string;
    }

    const allCandidates: RawCandidate[] = [];
    const genuineBlockers: { techName: string; reason: string }[] = [];

    for (const tech of qualifiedTechs) {
      const techAbsence = absences.get(tech.apogeeUserId);
      let foundSlots = 0;
      let allDaysBlocked = true;

      for (const dayStr of workingDays) {
        // Check absence for this specific day
        if (techAbsence?.dates.has(dayStr)) continue;

        const key = `${tech.apogeeUserId}-${dayStr}`;
        const intervals = occupancy.get(key) || [];
        const load = dayLoad.get(key) || 0;

        if (load >= MAX_DAY_LOAD_MINUTES) continue;

        // Find free windows
        const sortedIntervals = [...intervals].sort((a, b) => a.start - b.start);
        const freeWindows: { start: number; end: number }[] = [];
        let cursor = tech.dayStartMin;
        for (const iv of sortedIntervals) {
          if (iv.start > cursor) freeWindows.push({ start: cursor, end: iv.start });
          cursor = Math.max(cursor, iv.end);
        }
        if (cursor < tech.dayEndMin) freeWindows.push({ start: cursor, end: tech.dayEndMin });

        // Remove lunch
        const adjustedWindows: { start: number; end: number }[] = [];
        for (const w of freeWindows) {
          if (w.end <= tech.lunchStartMin || w.start >= tech.lunchEndMin) {
            adjustedWindows.push(w);
          } else {
            if (w.start < tech.lunchStartMin) adjustedWindows.push({ start: w.start, end: tech.lunchStartMin });
            if (w.end > tech.lunchEndMin) adjustedWindows.push({ start: tech.lunchEndMin, end: w.end });
          }
        }

        const neededMin = estimatedDuration + DEFAULT_BUFFER;
        const viableWindows = adjustedWindows.filter(w => (w.end - w.start) >= neededMin);
        if (viableWindows.length === 0) continue;

        allDaysBlocked = false;

        // Best slot this day (earliest viable)
        const window = viableWindows[0];
        const slotStart = window.start;
        const hardResult = checkSchedulingConstraints(tech, dayStr, slotStart, estimatedDuration, intervals);
        if (!hardResult.pass) continue;

        // Find nearest appointment location that day for proximity scoring
        const dayLocs = dayAppointmentLocations.get(key) || [];
        let nearestLat: number | null = null;
        let nearestLng: number | null = null;
        if (dossierLat && dossierLng && dayLocs.length > 0) {
          let minDist = Infinity;
          for (const loc of dayLocs) {
            const d = haversineKm(loc.lat, loc.lng, dossierLat, dossierLng);
            if (d < minDist) {
              minDist = d;
              nearestLat = loc.lat;
              nearestLng = loc.lng;
            }
          }
        }

        const { total, breakdown, reasons, travelKm } = scoreCandidate(
          tech, slotStart, dayStr, load, avgLoad,
          requiredCodes, dossierLat, dossierLng,
          isFirstRdv, dossierAgeDays, todayStr,
          nearestLat, nearestLng,
        );

        allCandidates.push({
          date: dayStr,
          hour: minutesToTime(slotStart),
          tech_id: tech.apogeeUserId,
          tech_name: tech.name,
          duration: estimatedDuration,
          score: total,
          score_breakdown: breakdown,
          reasons: reasons.slice(0, 5),
          travel_km: travelKm,
          universe_group: requiredCodes.join('+') || 'all',
        });

        foundSlots++;
        if (foundSlots >= 4) break; // max 4 slots per tech
      }

      // If a qualified tech has no availability at all, they're a genuine blocker
      if (foundSlots === 0) {
        if (techAbsence) {
          genuineBlockers.push({ techName: tech.name, reason: techAbsence.label });
        } else if (allDaysBlocked) {
          genuineBlockers.push({ techName: tech.name, reason: 'Planning complet sur 3 semaines' });
        }
      }
    }

    // =========================================================================
    // SELECT TOP SUGGESTIONS — best overall scores, diverse techs + dates
    // =========================================================================
    allCandidates.sort((a, b) => b.score - a.score || a.date.localeCompare(b.date));

    const suggestions: Suggestion[] = [];
    const usedKeys = new Set<string>();

    // Pass 1: best slot per tech (diverse techs)
    const seenTechs = new Set<number>();
    for (const c of allCandidates) {
      if (seenTechs.has(c.tech_id)) continue;
      seenTechs.add(c.tech_id);
      const key = `${c.tech_id}-${c.date}`;
      usedKeys.add(key);
      suggestions.push({ ...c, rank: suggestions.length + 1, buffer: DEFAULT_BUFFER });
      if (suggestions.length >= MAX_SUGGESTIONS) break;
    }

    // Pass 2: fill with same-tech different-date alternatives
    if (suggestions.length < MAX_SUGGESTIONS) {
      for (const c of allCandidates) {
        const key = `${c.tech_id}-${c.date}`;
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        suggestions.push({ ...c, rank: suggestions.length + 1, buffer: DEFAULT_BUFFER });
        if (suggestions.length >= MAX_SUGGESTIONS) break;
      }
    }

    // Alternatives: next 8
    const alternatives: Suggestion[] = [];
    for (const c of allCandidates) {
      const key = `${c.tech_id}-${c.date}`;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      alternatives.push({ ...c, rank: suggestions.length + alternatives.length + 1, buffer: DEFAULT_BUFFER });
      if (alternatives.length >= 8) break;
    }

    console.log(`[SUGGEST] V4 Results: ${suggestions.length} suggestions, ${alternatives.length} alternatives, ${genuineBlockers.length} blockers, ${allCandidates.length} candidates evaluated`);

    // =========================================================================
    // AUDIT TRAIL
    // =========================================================================
    try {
      await supabase.from('planning_suggestions').insert({
        agency_id: agencyUuid,
        dossier_id,
        requested_by: user.id,
        input_json: { agency_id: agencyUuid, dossier_id, requiredCodes, estimatedDuration, planningMode, isFirstRdv },
        output_json: { suggestions, alternatives, blockers: genuineBlockers },
        score_breakdown_json: {
          engine_version: ENGINE_VERSION,
          techs_total: techProfiles.length,
          techs_qualified: qualifiedCount,
          candidates_evaluated: allCandidates.length,
          genuine_blockers: genuineBlockers.length,
          planning_mode: planningMode,
        },
        status: 'pending',
      });
    } catch (e) { console.warn('[SUGGEST] Audit error:', e); }

    return withCors(req, new Response(JSON.stringify({
      success: true,
      suggestions,
      alternatives,
      blockers: genuineBlockers,
      meta: {
        engine_version: ENGINE_VERSION,
        planning_mode: planningMode,
        is_first_rdv: isFirstRdv,
        dossier_age_days: Math.round(dossierAgeDays),
        techs_total: techProfiles.length,
        techs_qualified: qualifiedCount,
        dossier_universes: requiredCodes,
        estimated_duration: estimatedDuration,
        candidates_evaluated: allCandidates.length,
      },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

  } catch (err) {
    console.error('[SUGGEST] Fatal error:', err);
    return withCors(req, new Response(JSON.stringify({ error: String(err) }), { status: 500 }));
  }
}));
