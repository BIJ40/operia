import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';
import { withSentry } from '../_shared/withSentry.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

const ENGINE_VERSION = 'v3-competence-first';
const MAX_DAY_LOAD_MINUTES = 420; // 7h
const DEFAULT_BUFFER = 15; // min
const EARTH_RADIUS_KM = 6371;
const DEFAULT_SPEED_KMH = 35;
const FIRST_RDV_DURATION = 60; // 1er RDV = toujours 1h

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
  universe_group?: string; // which universe this suggestion covers (multi-RDV)
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

function daysBetween(d1: string, d2: string): number {
  return Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24);
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

function extractDossierUniverses(dossier: any): string[] {
  if (!dossier) return [];
  const fromUniverses = [
    ...(Array.isArray(dossier?.data?.universes) ? dossier.data.universes : []),
    ...(Array.isArray(dossier?.universes) ? dossier.universes : []),
  ].map((u: string) => normalizeSlug(u)).filter(Boolean);
  return Array.from(new Set(fromUniverses));
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
// COMPETENCE CHECK — tech has ALL required codes (at any level)
// =============================================================================

function techHasCodes(tech: TechProfile, codes: string[]): boolean {
  if (codes.length === 0) return true;
  const techCodes = new Set(tech.skills.map(s => s.code));
  return codes.every(c => techCodes.has(c));
}

function techMatchRatio(tech: TechProfile, codes: string[]): number {
  if (codes.length === 0) return 1;
  const techCodes = new Set(tech.skills.map(s => s.code));
  return codes.filter(c => techCodes.has(c)).length / codes.length;
}

// =============================================================================
// HARD CONSTRAINTS (scheduling only, NOT competence — that's handled at a higher level)
// =============================================================================

function checkSchedulingConstraints(
  tech: TechProfile,
  dateStr: string,
  slotStartMin: number,
  durationMin: number,
  occupiedIntervals: { start: number; end: number }[],
): { pass: boolean; reason?: string } {
  // 1. Work day check
  const d = new Date(dateStr + 'T12:00:00Z');
  const dow = d.getUTCDay();
  const dowKey = DOW_KEYS[dow];
  if (!tech.workDays[dowKey]) {
    return { pass: false, reason: `${dowKey.toUpperCase()} non travaillé` };
  }

  // 2. Amplitude check
  const slotEndMin = slotStartMin + durationMin + DEFAULT_BUFFER;
  if (slotStartMin < tech.dayStartMin) {
    return { pass: false, reason: `Avant amplitude (${minutesToTime(tech.dayStartMin)})` };
  }
  if (slotEndMin > tech.dayEndMin) {
    return { pass: false, reason: `Après amplitude (${minutesToTime(tech.dayEndMin)})` };
  }

  // 3. Lunch overlap check
  if (slotStartMin < tech.lunchEndMin && (slotStartMin + durationMin) > tech.lunchStartMin) {
    if (!(slotStartMin + durationMin <= tech.lunchStartMin || slotStartMin >= tech.lunchEndMin)) {
      return { pass: false, reason: `Chevauche la pause déjeuner` };
    }
  }

  // 4. Overlap check with existing events
  for (const interval of occupiedIntervals) {
    if (slotStartMin < interval.end && (slotStartMin + durationMin) > interval.start) {
      return { pass: false, reason: `Chevauchement avec créneau existant` };
    }
  }

  return { pass: true };
}

// =============================================================================
// SCORING — New priorities:
//   #1 Competence match (45%) — HARD filter above, but score quality here
//   #2 Urgency + dossier age (25%) — 1er RDV = sooner is better
//   #3 Zone / proximity (20%) — distance tech↔dossier
//   #4 Equity + other (10%)
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
): { total: number; breakdown: Record<string, number>; reasons: string[] } {
  const breakdown: Record<string, number> = {};
  const reasons: string[] = [];

  // ── #1 COMPETENCE (45%) ──────────────────────────────────────────────────
  if (requiredCodes.length > 0) {
    const matchedSkills = tech.skills.filter(s => requiredCodes.includes(s.code));
    const avgLevel = matchedSkills.reduce((sum, sk) => sum + sk.level, 0) / Math.max(matchedSkills.length, 1);
    const hasPrimary = matchedSkills.some(s => s.isPrimary);
    let cScore = Math.min(100, avgLevel * 20);
    if (hasPrimary) { cScore = Math.min(100, cScore + 20); reasons.push('Compétence principale'); }
    if (avgLevel >= 4) reasons.push(`Niveau élevé (${avgLevel.toFixed(1)}/5)`);
    breakdown.competence = Math.round(cScore);
  } else {
    breakdown.competence = 70; // no universe info → neutral
  }

  // ── #2 URGENCY + AGE (25%) ──────────────────────────────────────────────
  const daysFromNow = daysBetween(dayStr, todayStr);
  let urgencyScore = 0;

  if (isFirstRdv) {
    // 1er RDV: the sooner the better. Day 1 = 100, Day 5 = 40
    urgencyScore = Math.max(0, 100 - (daysFromNow - 1) * 15);
    if (daysFromNow <= 2) reasons.push('1er RDV – créneau rapide');
  } else {
    // Travaux: older dossiers should be prioritized
    // Age > 30j = very urgent, Age < 7j = less urgent
    const ageBonus = Math.min(50, dossierAgeDays * 1.5);
    // Earlier slot is still slightly better
    const dateBonus = Math.max(0, 60 - daysFromNow * 8);
    urgencyScore = Math.min(100, ageBonus + dateBonus);
    if (dossierAgeDays > 21) reasons.push(`Dossier ancien (${Math.round(dossierAgeDays)}j)`);
  }
  breakdown.urgency = Math.round(urgencyScore);

  // ── #3 ZONE / PROXIMITY (20%) ──────────────────────────────────────────
  if (dossierLat != null && dossierLng != null && tech.homeLat != null && tech.homeLng != null) {
    const km = haversineKm(tech.homeLat, tech.homeLng, dossierLat, dossierLng);
    const travelMin = estimateTravelMin(km);
    breakdown.zone = Math.round(Math.max(0, 100 - travelMin * 2));
    if (travelMin <= 15) reasons.push(`Proche (${Math.round(km)} km)`);
    else if (travelMin >= 40) reasons.push(`⚠ Éloigné (~${Math.round(km)} km)`);
  } else {
    breakdown.zone = 50; // no geo data → neutral
  }

  // ── #4 EQUITY + OTHER (10%) ────────────────────────────────────────────
  const diff = dayLoadMin - avgLoadMin;
  breakdown.equity = Math.round(Math.max(0, Math.min(100, 80 - diff / 3)));
  if (diff < -60) reasons.push('Journée légère → équilibrage');

  // ── WEIGHTED TOTAL ─────────────────────────────────────────────────────
  const total = Math.round(
    breakdown.competence * 0.45 +
    breakdown.urgency * 0.25 +
    breakdown.zone * 0.20 +
    breakdown.equity * 0.10
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
    const { agency_id, dossier_id } = body;
    if (!agency_id || !dossier_id) {
      return withCors(req, new Response(JSON.stringify({ error: 'agency_id and dossier_id required' }), { status: 400 }));
    }

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

    console.log(`[SUGGEST] V3 — agency=${agency.slug} dossier=${dossier_id}`);

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

    console.log(`[SUGGEST] Data: ${apogeeUsers.length} users, ${creneaux.length} creneaux, ${collabRows.length} collabs, ${skillRows.length} skills`);

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

    for (const [apogeeId, collab] of collabByApogee.entries()) {
      if (processedIds.has(apogeeId)) continue;
      if (isExcludedOfficeType(collab.type) || isExcludedOfficeType(collab.role)) continue;
      processedIds.add(apogeeId);

      const apUser = apogeeUsers.find((u: any) => Number(u.id) === apogeeId);
      if (apUser && (apUser.is_on === false || apUser.isOn === false)) continue;

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

      // Strict tech filter: must be positively identified
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
    // FIND TARGET DOSSIER & DETERMINE PLANNING MODE
    // =========================================================================
    const dossier = projects.find((p: any) => Number(p.id) === Number(dossier_id));
    const rawUniverses = extractDossierUniverses(dossier);
    const requiredCodes = [...new Set(rawUniverses.map(resolveUniversCode))];
    const dossierState = normalize(dossier?.state || dossier?.data?.state || '');

    // Is this a 1er RDV or travaux?
    const isFirstRdv = dossierState === 'new' || dossierState === '' || dossierState === 'nouveau';

    // Count planned interventions to determine how many RDVs needed
    const dossierIntervs = interventions.filter((i: any) => Number(i.projectId) === Number(dossier_id));
    const plannedCount = dossierIntervs.filter((i: any) => {
      const visites = Array.isArray(i?.data?.visites) ? i.data.visites : [];
      return visites.some((v: any) => v?.date);
    }).length;

    // Determine planning mode:
    // - 1er RDV → always 1 slot, 60min, all universes needed on 1 tech
    // - Travaux, 1 univers → 1 tech, possibly multiple slots
    // - Travaux, N univers → 1 tech per univers
    let planningMode: 'single' | 'multi_slots' | 'multi_universe' = 'single';
    let estimatedDuration = DURATION_FALLBACK;

    if (isFirstRdv) {
      estimatedDuration = FIRST_RDV_DURATION;
      planningMode = 'single';
    } else {
      // Travaux duration estimation
      const dossierType = normalize(dossier?.type || dossier?.data?.type || '');
      for (const [key, val] of Object.entries(DURATION_DEFAULTS)) {
        if (dossierType.includes(key)) { estimatedDuration = val; break; }
      }

      if (requiredCodes.length > 1) {
        planningMode = 'multi_universe';
      } else {
        // Check if multiple passages needed (chiffrage)
        const nbPassages = dossierIntervs.reduce((sum: number, i: any) => {
          const postes = Array.isArray(i?.data?.chiffrages?.postes) ? i.data.chiffrages.postes : [];
          return sum + Math.max(postes.length, 1);
        }, 0);
        if (nbPassages > 1) planningMode = 'multi_slots';
      }
    }

    // Dossier location
    const dossierLat = Number(dossier?.data?.lat || dossier?.lat) || null;
    const dossierLng = Number(dossier?.data?.lng || dossier?.lng) || null;

    // Dossier age (days since creation)
    const dossierCreatedAt = dossier?.data?.dateCreation || dossier?.dateCreation || dossier?.created_at;
    const todayStr = new Date().toISOString().split('T')[0];
    const dossierAgeDays = dossierCreatedAt ? daysBetween(todayStr, String(dossierCreatedAt).split('T')[0]) : 0;

    console.log(`[SUGGEST] Dossier: univers=${requiredCodes.join(',')}, mode=${planningMode}, isFirstRdv=${isFirstRdv}, duration=${estimatedDuration}min, age=${Math.round(dossierAgeDays)}j`);

    // =========================================================================
    // BUILD OCCUPANCY INDEX
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

    for (const c of creneaux) {
      const parsed = parseDateAndTime((c as any)?.date || (c as any)?.dateDebut);
      if (!parsed) continue;
      const dur = (c as any)?.duree || (c as any)?.duration || 120;
      const ids = Array.isArray((c as any)?.usersIds) ? (c as any).usersIds : [(c as any)?.userId].filter(Boolean);
      for (const id of ids) addOccupied(Number(id), parsed.dateStr, parsed.startMinutes, dur);
    }

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
    // GENERATE WORKING DAYS (next 5)
    // =========================================================================
    const workingDays: string[] = [];
    const dt = new Date();
    while (workingDays.length < 5) {
      dt.setDate(dt.getDate() + 1);
      const dow = dt.getDay();
      if (dow >= 1 && dow <= 5) workingDays.push(dt.toISOString().split('T')[0]);
    }

    const allLoads = Array.from(dayLoad.values());
    const avgLoad = allLoads.length > 0 ? allLoads.reduce((a, b) => a + b, 0) / allLoads.length : 0;

    // =========================================================================
    // EVALUATE CANDIDATES
    // =========================================================================

    // Define universe groups to search for
    interface UniverseGroup {
      label: string;
      codes: string[];
      duration: number;
    }

    const universeGroups: UniverseGroup[] = [];

    if (planningMode === 'multi_universe') {
      // One group per universe → find 1 tech per universe
      for (const code of requiredCodes) {
        universeGroups.push({ label: code, codes: [code], duration: estimatedDuration });
      }
    } else {
      // Single group with all codes → find 1 tech with all competences
      universeGroups.push({ label: requiredCodes.join('+') || 'all', codes: requiredCodes, duration: estimatedDuration });
    }

    const allSuggestions: (Suggestion & { _raw: number })[] = [];
    const allBlockers: HardBlock[] = [];

    for (const group of universeGroups) {
      const candidates: (Suggestion & { _raw: number })[] = [];
      const groupBlockers: HardBlock[] = [];

      // Filter techs that have the required competences for this group
      const qualifiedTechs = techProfiles.filter(t => techHasCodes(t, group.codes));
      const unqualifiedTechs = techProfiles.filter(t => !techHasCodes(t, group.codes));

      // Log unqualified as blockers (grouped, not per-day)
      for (const t of unqualifiedTechs) {
        const techCodes = t.skills.map(s => s.code);
        const missing = group.codes.filter(c => !techCodes.includes(c));
        if (missing.length > 0) {
          groupBlockers.push({
            techId: t.apogeeUserId,
            techName: t.name,
            reason: `Compétence manquante : ${missing.join(', ')}`,
          });
        }
      }

      if (qualifiedTechs.length === 0) {
        console.log(`[SUGGEST] No qualified techs for group ${group.label}`);
        allBlockers.push(...groupBlockers);
        continue;
      }

      console.log(`[SUGGEST] Group "${group.label}": ${qualifiedTechs.length} techs qualifiés`);

      for (const tech of qualifiedTechs) {
        for (const dayStr of workingDays) {
          const key = `${tech.apogeeUserId}-${dayStr}`;
          const intervals = occupancy.get(key) || [];
          const load = dayLoad.get(key) || 0;

          if (load >= MAX_DAY_LOAD_MINUTES) {
            groupBlockers.push({ techId: tech.apogeeUserId, techName: tech.name, reason: `Planning plein (${load}min)` });
            continue;
          }

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

          const neededMin = group.duration + DEFAULT_BUFFER;
          const viableWindows = adjustedWindows.filter(w => (w.end - w.start) >= neededMin);
          if (viableWindows.length === 0) continue;

          // Best slot per tech per day
          for (const window of viableWindows) {
            const slotStart = window.start;
            const hardResult = checkSchedulingConstraints(tech, dayStr, slotStart, group.duration, intervals);
            if (!hardResult.pass) {
              groupBlockers.push({ techId: tech.apogeeUserId, techName: tech.name, reason: `${dayStr}: ${hardResult.reason}` });
              continue;
            }

            const { total, breakdown, reasons } = scoreCandidate(
              tech, slotStart, dayStr, load, avgLoad,
              group.codes, dossierLat, dossierLng,
              isFirstRdv, dossierAgeDays, todayStr,
            );

            candidates.push({
              rank: 0,
              date: dayStr,
              hour: minutesToTime(slotStart),
              tech_id: tech.apogeeUserId,
              tech_name: tech.name,
              duration: group.duration,
              buffer: DEFAULT_BUFFER,
              score: total,
              score_breakdown: breakdown,
              reasons: reasons.slice(0, 6),
              universe_group: group.label,
              _raw: total,
            });

            break; // best slot per tech per day
          }
        }
      }

      // Sort candidates
      candidates.sort((a, b) => b._raw - a._raw || a.date.localeCompare(b.date) || a.tech_id - b.tech_id);
      allSuggestions.push(...candidates);
      allBlockers.push(...groupBlockers);
    }

    // =========================================================================
    // SELECT TOP SUGGESTIONS
    // =========================================================================
    allSuggestions.sort((a, b) => b._raw - a._raw || a.date.localeCompare(b.date));

    const suggestions: Suggestion[] = [];
    const usedTechs = new Set<number>();
    const usedKeys = new Set<string>();

    // Pass 1: diverse techs (top 3)
    for (const c of allSuggestions) {
      if (usedTechs.has(c.tech_id)) continue;
      usedTechs.add(c.tech_id);
      usedKeys.add(`${c.tech_id}-${c.date}`);
      suggestions.push({ ...c, rank: suggestions.length + 1 });
      if (suggestions.length >= 3) break;
    }

    // Pass 2: fill to 3
    if (suggestions.length < 3) {
      for (const c of allSuggestions) {
        const key = `${c.tech_id}-${c.date}`;
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        suggestions.push({ ...c, rank: suggestions.length + 1 });
        if (suggestions.length >= 3) break;
      }
    }

    // Alternatives (next 10)
    const alternatives: Suggestion[] = [];
    for (const c of allSuggestions) {
      const key = `${c.tech_id}-${c.date}`;
      if (usedKeys.has(key)) continue;
      usedKeys.add(key);
      alternatives.push({ ...c, rank: suggestions.length + alternatives.length + 1 });
      if (alternatives.length >= 10) break;
    }

    // Clean output
    const cleanSuggestions = suggestions.map(({ _raw, ...rest }) => rest);
    const cleanAlternatives = alternatives.map(({ _raw, ...rest }) => rest);

    // Deduplicate blockers by tech (not per-day)
    const uniqueBlockers = allBlockers
      .filter((b, i, arr) => arr.findIndex(x => x.techId === b.techId && x.reason === b.reason) === i)
      .slice(0, 30);

    console.log(`[SUGGEST] V3 Results: mode=${planningMode}, ${cleanSuggestions.length} suggestions, ${cleanAlternatives.length} alternatives, ${uniqueBlockers.length} blockers`);

    // =========================================================================
    // AUDIT TRAIL
    // =========================================================================
    try {
      await supabase.from('planning_suggestions').insert({
        agency_id: agencyUuid,
        dossier_id,
        requested_by: user.id,
        input_json: { agency_id: agencyUuid, dossier_id, requiredCodes, estimatedDuration, planningMode, isFirstRdv },
        output_json: { suggestions: cleanSuggestions, alternatives: cleanAlternatives, blockers: uniqueBlockers },
        score_breakdown_json: {
          engine_version: ENGINE_VERSION,
          techs_total: techProfiles.length,
          candidates_evaluated: allSuggestions.length,
          hard_blocked: allBlockers.length,
          planning_mode: planningMode,
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
        planning_mode: planningMode,
        is_first_rdv: isFirstRdv,
        dossier_age_days: Math.round(dossierAgeDays),
        techs_total: techProfiles.length,
        techs_qualified: techProfiles.filter(t => techHasCodes(t, requiredCodes)).length,
        dossier_found: !!dossier,
        dossier_universes: requiredCodes,
        estimated_duration: estimatedDuration,
        candidates_evaluated: allSuggestions.length,
        hard_blocked: allBlockers.length,
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
