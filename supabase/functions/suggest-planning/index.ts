import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCorsPreflightOrReject, withCors } from '../_shared/cors.ts';

// =============================================================================
// GEO HELPERS
// =============================================================================

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

// =============================================================================
// COMPETENCE ↔ UNIVERS MAPPING (miroir du front useTechCompetenceMatch)
// =============================================================================

const COMPETENCE_TO_UNIVERS: Record<string, string[]> = {
  'plomberie':            ['plomberie', 'sanitaire', 'sanitaires', 'plomb'],
  'electricite':          ['electricite', 'elec', 'electrique'],
  'serrurerie':           ['serrurerie', 'serrure', 'serrurier', 'serr'],
  'vitrerie':             ['vitrerie', 'vitre', 'vitres', 'vitrier', 'miroiterie', 'vitr'],
  'menuiserie':           ['menuiserie', 'menuisier', 'bois', 'porte', 'portes', 'fenetre', 'fenetres'],
  'chauffage':            ['chauffage', 'chaudiere', 'climatisation', 'clim', 'cvc', 'pac', 'pompe_a_chaleur'],
  'volet roulant':        ['volet_roulant', 'volets_roulants', 'volet', 'volets', 'store', 'stores'],
  'pmr / accessibilite':  ['pmr', 'amelioration_logement', 'ame_logement', 'pmr_amenagement', 'accessibilite'],
  'renovation':           ['renovation', 'reno', 'travaux'],
  'multiservices':        ['multiservices', 'multi'],
  'peinture':             ['peinture', 'peintre', 'revetement'],
  'carrelage / faience':  ['carrelage', 'faience', 'carreleur'],
  'recherche de fuite':   ['recherche_fuite', 'recherche_de_fuite', 'fuite'],
};

function normalize(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function normalizeSlug(s: string): string {
  return normalize(s).replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
}

// Build reverse map: univers slug → competence labels
const UNIVERS_TO_COMPETENCES = new Map<string, Set<string>>();
for (const [compLabel, slugs] of Object.entries(COMPETENCE_TO_UNIVERS)) {
  for (const slug of slugs) {
    const ns = normalizeSlug(slug);
    if (!UNIVERS_TO_COMPETENCES.has(ns)) UNIVERS_TO_COMPETENCES.set(ns, new Set());
    UNIVERS_TO_COMPETENCES.get(ns)!.add(compLabel);
  }
}

function competenceMatchesUnivers(competenceLabel: string, universSlug: string): boolean {
  const normComp = normalize(competenceLabel);
  const normUni = normalizeSlug(universSlug);
  if (!normComp || !normUni) return false;

  // Explicit mapping lookup
  const matchingComps = UNIVERS_TO_COMPETENCES.get(normUni);
  if (matchingComps) {
    for (const mapped of matchingComps) {
      if (normComp === mapped || normComp.includes(mapped) || mapped.includes(normComp)) return true;
    }
  }

  // Direct lookup
  const direct = COMPETENCE_TO_UNIVERS[normComp];
  if (direct) return direct.some(s => normalizeSlug(s) === normUni);

  // Fuzzy fallback
  const ca = normComp.replace(/[^a-z0-9]/g, '');
  const ua = normUni.replace(/[^a-z0-9]/g, '');
  return ca.length >= 3 && ua.length >= 3 && (ca.includes(ua) || ua.includes(ca));
}

function techMatchesDossierUniverses(techCompetences: string[], dossierUniverses: string[]): boolean {
  if (!techCompetences || techCompetences.length === 0) return true; // no data = compatible
  if (!dossierUniverses || dossierUniverses.length === 0) return true;
  return dossierUniverses.some(uni => techCompetences.some(comp => competenceMatchesUnivers(comp, uni)));
}

// =============================================================================
// SCORING
// =============================================================================

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

interface TechSlot {
  techId: number;
  techName: string;
  date: string;
  freeSlots: { hour: string; duration: number }[];
  totalLoadMinutes: number;
  competences: string[]; // from RH, not Apogée
  isCompatibleWithDossier: boolean;
}

/** Max minutes occupées au-delà desquelles un tech est considéré "plein" pour la journée */
const MAX_DAY_LOAD_MINUTES = 420; // 7h

function generateHalfHours(): string[] {
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
  weights: ScoringWeights,
  allTechSlots: TechSlot[],
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // SLA: earlier date + earlier hour = better
  const hourNum = parseInt(slotHour.split(':')[0]);
  const slaScore = Math.max(0, 100 - (hourNum - 8) * 5);
  score += weights.sla * slaScore;
  if (slaScore >= 80) reasons.push('Créneau optimal pour respecter le SLA');

  // Coherence: explicit competence match
  const coherenceScore = techSlot.isCompatibleWithDossier ? 100 : 20;
  score += weights.coherence * coherenceScore;
  if (techSlot.isCompatibleWithDossier && techSlot.competences.length > 0) {
    reasons.push(`Compétences alignées`);
  }

  // Equity: less loaded technicians score higher
  const avgLoad = allTechSlots.reduce((s, t) => s + t.totalLoadMinutes, 0) / Math.max(allTechSlots.length, 1);
  const equityScore = techSlot.totalLoadMinutes <= avgLoad 
    ? 100 
    : Math.max(0, 100 - (techSlot.totalLoadMinutes - avgLoad) / 5);
  score += weights.equity * equityScore;
  if (equityScore >= 80) reasons.push('Charge équilibrée pour ce technicien');

  // Penalize heavily loaded days
  if (techSlot.totalLoadMinutes > 360) {
    score -= 15; // penalty for near-full days
    reasons.push('⚠ Journée déjà chargée');
  }

  // Route: placeholder
  score += weights.route * 70;

  // CA: placeholder
  score += weights.ca * 60;

  // Continuity: placeholder
  score += weights.continuity * 50;

  return { score: Math.round(Math.max(0, score)), reasons };
}

// =============================================================================
// APOGEE API
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

    // =====================================================================
    // LOAD DATA: Apogée + RH competences in parallel
    // =====================================================================
    console.log(`[SUGGEST-PLANNING] Fetching data for agency ${agency.slug}, dossier ${dossier_id}`);

    const [apogeeUsers, interventions, projects, rhCompetences] = await Promise.all([
      fetchApogee(agency.slug, 'apiGetUsers', apiKey),
      fetchApogee(agency.slug, 'getInterventionsCreneaux', apiKey),
      fetchApogee(agency.slug, 'apiGetProjects', apiKey),
      // Load RH competences from DB
      supabase
        .from('collaborators')
        .select('apogee_user_id, rh_competencies(competences_techniques)')
        .eq('agency_id', agency_id)
        .not('apogee_user_id', 'is', null)
        .is('leaving_date', null)
        .then(r => r.data || []),
    ]);

    console.log(`[SUGGEST-PLANNING] Loaded: ${apogeeUsers.length} users, ${interventions.length} interventions, ${projects.length} projects, ${rhCompetences.length} RH records`);

    // Build competences map: apogeeUserId → string[]
    const competencesMap = new Map<number, string[]>();
    for (const c of rhCompetences) {
      const uid = c.apogee_user_id as number;
      const comps = (c as any).rh_competencies?.competences_techniques as string[] || [];
      if (uid) competencesMap.set(uid, comps);
    }

    // Find the target dossier
    const dossier = projects.find((p: any) => p.id === dossier_id || p.id === String(dossier_id));
    const dossierUniverses: string[] = dossier?.data?.universes || dossier?.universes || [];

    // Filter technicians (exclude office staff)
    const EXCLUDED_TYPES = new Set(['interimaire', 'commercial', 'admin', 'assistante', 'assistant', 'utilisateur', 'comptable', 'direction']);
    const technicians = apogeeUsers.filter((u: any) => {
      const type = (u.type || '').toLowerCase();
      if (EXCLUDED_TYPES.has(type)) return false;
      return type.includes('tech') || type.includes('ouvrier') || type.includes('intervenant') || 
             (u.is_on !== false); // include active users not in excluded list
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

    // =====================================================================
    // INDEX OCCUPIED SLOTS: tech+date → occupied half-hours + total minutes
    // =====================================================================
    const occupiedSlots = new Map<string, Set<string>>();
    const dayLoadMinutes = new Map<string, number>();

    for (const interv of interventions) {
      // Support multiple user IDs per intervention
      const techIds: number[] = [];
      if (interv.usersIds && Array.isArray(interv.usersIds)) {
        techIds.push(...interv.usersIds);
      } else if (interv.userId || interv.user_id) {
        techIds.push(interv.userId || interv.user_id);
      }

      const dateStr = (interv.date || interv.dateDebut || '').split('T')[0];
      if (!dateStr || !workingDays.includes(dateStr)) continue;

      const duration = interv.duree || interv.duration || 120;
      
      // Parse start time
      const timeMatch = (interv.date || interv.dateDebut || '').match(/T(\d{2}):(\d{2})/);
      const startHour = timeMatch ? parseInt(timeMatch[1]) : 8;
      const startMin = timeMatch ? parseInt(timeMatch[2]) : 0;

      for (const techId of techIds) {
        const key = `${techId}-${dateStr}`;
        if (!occupiedSlots.has(key)) occupiedSlots.set(key, new Set());
        
        // Mark occupied half-hours
        let currentMin = startHour * 60 + startMin;
        const endMin = currentMin + duration;
        while (currentMin < endMin && currentMin < 18 * 60) {
          const h = Math.floor(currentMin / 60);
          const m = currentMin % 60;
          occupiedSlots.get(key)!.add(`${h.toString().padStart(2, '0')}:${m < 30 ? '00' : '30'}`);
          currentMin += 30;
        }

        // Track total load
        dayLoadMinutes.set(key, (dayLoadMinutes.get(key) || 0) + duration);
      }
    }

    // =====================================================================
    // BUILD TECH SLOTS (only non-full days, with competence match)
    // =====================================================================
    const allTechSlots: TechSlot[] = [];
    const allHalfHours = generateHalfHours();

    for (const tech of technicians) {
      const techComps = competencesMap.get(tech.id) || [];
      const isCompat = techMatchesDossierUniverses(techComps, dossierUniverses);

      for (const dayStr of workingDays) {
        const key = `${tech.id}-${dayStr}`;
        const occupied = occupiedSlots.get(key) || new Set();
        const loadMin = dayLoadMinutes.get(key) || 0;

        // Skip days where tech is already fully booked
        if (loadMin >= MAX_DAY_LOAD_MINUTES) continue;

        // Find consecutive free slots of at least 2h (120min = 4 half-hours)
        const freeHalfHours = allHalfHours.filter(h => !occupied.has(h));
        
        // Group into contiguous blocks
        const freeSlots: { hour: string; duration: number }[] = [];
        let blockStart: string | null = null;
        let blockCount = 0;

        for (let i = 0; i < freeHalfHours.length; i++) {
          if (blockStart === null) {
            blockStart = freeHalfHours[i];
            blockCount = 1;
          } else {
            // Check if contiguous (30min apart)
            const prevH = parseInt(freeHalfHours[i - 1].split(':')[0]);
            const prevM = parseInt(freeHalfHours[i - 1].split(':')[1]);
            const currH = parseInt(freeHalfHours[i].split(':')[0]);
            const currM = parseInt(freeHalfHours[i].split(':')[1]);
            const diff = (currH * 60 + currM) - (prevH * 60 + prevM);

            if (diff === 30) {
              blockCount++;
            } else {
              // Save previous block if >= 2h
              if (blockCount >= 4) {
                freeSlots.push({ hour: blockStart, duration: blockCount * 30 });
              }
              blockStart = freeHalfHours[i];
              blockCount = 1;
            }
          }
        }
        // Last block
        if (blockStart && blockCount >= 4) {
          freeSlots.push({ hour: blockStart, duration: blockCount * 30 });
        }

        if (freeSlots.length === 0) continue;

        allTechSlots.push({
          techId: tech.id,
          techName: `${tech.prenom || tech.firstname || ''} ${tech.nom || tech.lastname || ''}`.trim() || tech.name || `Tech #${tech.id}`,
          date: dayStr,
          freeSlots,
          totalLoadMinutes: loadMin,
          competences: techComps,
          isCompatibleWithDossier: isCompat,
        });
      }
    }

    // =====================================================================
    // SCORE & RANK — diversify: max 1 suggestion per tech
    // =====================================================================
    const candidates: Array<Suggestion & { rawScore: number }> = [];
    for (const ts of allTechSlots) {
      // Only take the first (best) free slot per tech-day
      const bestSlot = ts.freeSlots[0];
      if (!bestSlot) continue;

      const { score, reasons } = scoreSuggestion(ts, bestSlot.hour, weights, allTechSlots);
      
      // Bonus for compatible techs
      const finalScore = ts.isCompatibleWithDossier ? score + 10 : score;

      candidates.push({
        rank: 0,
        date: ts.date,
        hour: bestSlot.hour,
        tech_id: ts.techId,
        tech_name: ts.techName,
        duration: Math.min(bestSlot.duration, 120), // cap at 2h default
        buffer: 15,
        score: finalScore,
        reasons,
        rawScore: finalScore,
      });
    }

    // Sort by score desc
    candidates.sort((a, b) => b.rawScore - a.rawScore);

    // Diversify: pick top 3 with different techs
    const suggestions: Suggestion[] = [];
    const usedTechIds = new Set<number>();
    for (const c of candidates) {
      if (usedTechIds.has(c.tech_id)) continue;
      usedTechIds.add(c.tech_id);
      suggestions.push({
        rank: suggestions.length + 1,
        date: c.date,
        hour: c.hour,
        tech_id: c.tech_id,
        tech_name: c.tech_name,
        duration: c.duration,
        buffer: c.buffer,
        score: c.score,
        reasons: c.reasons,
      });
      if (suggestions.length >= 3) break;
    }

    // If fewer than 3 different techs, allow same tech on different days
    if (suggestions.length < 3) {
      const usedKeys = new Set(suggestions.map(s => `${s.tech_id}-${s.date}`));
      for (const c of candidates) {
        const key = `${c.tech_id}-${c.date}`;
        if (usedKeys.has(key)) continue;
        usedKeys.add(key);
        suggestions.push({
          rank: suggestions.length + 1,
          date: c.date,
          hour: c.hour,
          tech_id: c.tech_id,
          tech_name: c.tech_name,
          duration: c.duration,
          buffer: c.buffer,
          score: c.score,
          reasons: c.reasons,
        });
        if (suggestions.length >= 3) break;
      }
    }

    // Audit trail
    try {
      const { error: auditErr } = await supabase.from('planning_suggestions').insert({
        agency_id,
        dossier_id,
        requested_by: user.id,
        input_json: { agency_id, dossier_id, weights, technicians_count: technicians.length },
        output_json: { suggestions },
        score_breakdown_json: { weights, techs: technicians.length, interventions: interventions.length, rh_competences: competencesMap.size },
        status: 'pending',
      });
      if (auditErr) console.warn('[SUGGEST-PLANNING] Audit insert failed:', auditErr.message);
    } catch (e) {
      console.warn('[SUGGEST-PLANNING] Audit insert exception:', e);
    }

    return withCors(req, new Response(JSON.stringify({
      success: true,
      suggestions,
      meta: {
        engine_version: 'v1-heuristic-live',
        weights,
        skills_loaded: competencesMap.size,
        calibrations_loaded: interventions.length,
        dossier_found: !!dossier,
        dossier_universes: dossierUniverses,
        techs_total: technicians.length,
        techs_compatible: allTechSlots.filter(t => t.isCompatibleWithDossier).length,
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
