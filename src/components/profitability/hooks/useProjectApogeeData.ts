/**
 * useProjectApogeeData — Centralized source of Apogée data for a single project.
 * Filters factures and interventions from the global cached data.
 * 
 * v2: Fixed duration conversion (minutes → hours), proper technician extraction
 * from visites hierarchy, RT classification, visit-level detail.
 */
import { useQuery } from '@tanstack/react-query';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { getGlobalApogeeDataServices } from '@/statia/adapters/dataServiceAdapter';
import type { ProfitabilityFacture, ProfitabilityIntervention } from '@/types/projectProfitability';

/** A single visit (visite) from an intervention */
export interface VisiteDetail {
  id: string;
  type: string; // 'intervention', 'rt', 'sav', etc.
  label: string;
  date: string | null;
  durationMinutes: number;
  durationHours: number;
  technicianIds: string[];
  isRT: boolean;
}

export interface ProjectApogeeData {
  factures: ProfitabilityFacture[];
  interventions: ProfitabilityIntervention[];
  /** Detailed visit breakdown for display */
  visites: VisiteDetail[];
}

// ─── Helpers ─────────────────────────────────────────────────

function parseNum(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getUserIds(raw: Record<string, unknown>): string[] {
  const values = (raw?.usersIds ?? raw?.userIds ?? (raw?.data as Record<string, unknown>)?.usersIds ?? (raw?.data as Record<string, unknown>)?.userIds) as unknown[];
  if (!Array.isArray(values)) return [];
  return values.map(v => String(v)).filter(Boolean);
}

/** Get duration in minutes from creneaux (debut/fin) */
function getCreneauxDurationMinutes(creneaux: Array<Record<string, unknown>>): number {
  let totalMinutes = 0;
  for (const c of creneaux) {
    if (c?.debut && c?.fin) {
      const [dh, dm] = String(c.debut).split(':').map(Number);
      const [fh, fm] = String(c.fin).split(':').map(Number);
      if ([dh, dm, fh, fm].every(n => Number.isFinite(n))) {
        const minutes = (fh * 60 + fm) - (dh * 60 + dm);
        if (minutes > 0) totalMinutes += minutes;
        continue;
      }
    }
    // Fallback: duree field (already in minutes)
    const dur = parseNum(c?.duree) || parseNum(c?.dureeMinutes) || parseNum(c?.duration);
    if (dur > 0) totalMinutes += dur;
  }
  return totalMinutes;
}

/** Detect if an intervention/visite is a RT (relevé technique) */
function isRT(raw: Record<string, unknown>): boolean {
  const type = String(raw?.type ?? raw?.interventionType ?? raw?.typeIntervention ?? '').toLowerCase();
  const label = String(raw?.label ?? raw?.libelle ?? raw?.name ?? '').toLowerCase();
  return type.includes('rt') || type.includes('relev') || type.includes('technique') ||
    label.includes('relevé technique') || label.includes('rt ');
}

/**
 * Extract hours per technician from an intervention, following the same
 * hierarchy as chargeTravauxEngine:
 * 1. Chiffrage (RT postes) — most reliable
 * 2. Visites with creneaux (planning réel)
 * 3. Direct duree on intervention (in MINUTES → /60)
 */
function extractInterventionData(
  i: Record<string, unknown>
): { hours: number; technicianIds: string[]; visites: VisiteDetail[]; isRTIntervention: boolean } {
  const techIds: string[] = [];
  const visiteDetails: VisiteDetail[] = [];
  let totalHours = 0;
  const isRTItv = isRT(i);

  // Collect top-level tech IDs
  const topLevelIds = getUserIds(i);
  for (const id of topLevelIds) {
    if (!techIds.includes(id)) techIds.push(id);
  }

  // Check for visites (nested visits)
  const visites = [
    ...(Array.isArray(i.visites) ? i.visites : []),
    ...(Array.isArray((i.data as Record<string, unknown>)?.visites) ? (i.data as Record<string, unknown>).visites as unknown[] : []),
  ] as Array<Record<string, unknown>>;

  if (visites.length > 0) {
    for (const visite of visites) {
      const visiteUsers = getUserIds(visite);
      for (const uid of visiteUsers) {
        if (!techIds.includes(uid)) techIds.push(uid);
      }

      const visiteCreneaux = Array.isArray(visite?.creneaux)
        ? visite.creneaux as Array<Record<string, unknown>>
        : [];

      let durationMinutes = getCreneauxDurationMinutes(visiteCreneaux);

      // Fallback: duree fields on visite itself (in minutes)
      if (durationMinutes <= 0) {
        durationMinutes = parseNum(visite?.duree) || parseNum(visite?.dureeMinutes) ||
          parseNum(visite?.duration) || parseNum(visite?.tempsPrevu) || 0;
      }

      const durationHours = durationMinutes / 60;

      if (durationMinutes > 0) {
        const nbTechs = visiteUsers.length || 1;
        totalHours += durationHours * nbTechs;
      }

      const visiteIsRT = isRT(visite) || isRTItv;
      const visiteType = String(visite?.type ?? visite?.typeVisite ?? (isRTItv ? 'rt' : 'intervention')).toLowerCase();
      const visiteLabel = String(visite?.label ?? visite?.libelle ?? visite?.name ?? visiteType);
      const visiteDate = (visite?.dateDebut ?? visite?.date ?? visite?.created_at ?? null) as string | null;

      visiteDetails.push({
        id: String(visite?.id ?? Math.random().toString(36)),
        type: visiteType,
        label: visiteLabel,
        date: visiteDate,
        durationMinutes,
        durationHours,
        technicianIds: visiteUsers.length > 0 ? visiteUsers : topLevelIds,
        isRT: visiteIsRT,
      });
    }
  } else {
    // No visites — use direct duration (in MINUTES → /60)
    const directMins = parseNum(i.duree) || parseNum(i.tempsPrevu) || parseNum(i.duration) || 0;
    const directHours = directMins / 60;
    const nbTechs = techIds.length || 1;
    totalHours = directHours * nbTechs;

    if (directMins > 0) {
      visiteDetails.push({
        id: String(i.id ?? ''),
        type: isRTItv ? 'rt' : String(i.type ?? 'intervention').toLowerCase(),
        label: String(i.label ?? i.libelle ?? i.name ?? 'Intervention'),
        date: (i.dateDebut ?? i.date ?? i.created_at ?? null) as string | null,
        durationMinutes: directMins,
        durationHours: directHours,
        technicianIds: techIds,
        isRT: isRTItv,
      });
    }
  }

  // If somehow we have i.hours already pre-computed (rare), use it only if > totalHours
  const precomputedHours = parseNum(i.hours);
  if (precomputedHours > 0 && totalHours === 0) {
    // IMPORTANT: Check if precomputed is likely in minutes too
    // Heuristic: if > 24 and no visites found, it's probably minutes
    if (precomputedHours > 24 && visites.length === 0) {
      totalHours = precomputedHours / 60;
    } else {
      totalHours = precomputedHours;
    }
  }

  return { hours: totalHours, technicianIds: techIds, visites: visiteDetails, isRTIntervention: isRTItv };
}

// ─── DEFAULT HOURLY RATE ──────────────────────────────────────
export const DEFAULT_HOURLY_RATE = 35; // €/h charges comprises

/**
 * Loads and maps Apogée factures + interventions for a specific project.
 * Uses the global cached data service (2-min TTL) — no additional API calls.
 * 
 * v2: Correctly converts durations from minutes to hours.
 */
export function useProjectApogeeData(projectId: string | null) {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.slug || currentAgency?.id || '';
  const services = getGlobalApogeeDataServices();

  return useQuery<ProjectApogeeData>({
    queryKey: ['project-apogee-data', agencySlug, projectId],
    enabled: isAgencyReady && !!agencySlug && !!projectId,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const dateRange = { start: new Date('2020-01-01'), end: new Date() };

      const [rawFactures, rawInterventions] = await Promise.all([
        services.getFactures(agencySlug, dateRange),
        services.getInterventions(agencySlug, dateRange),
      ]);

      const numericProjectId = Number(projectId);

      const factures: ProfitabilityFacture[] = (rawFactures || [])
        .filter((f: Record<string, unknown>) => {
          const pId = f.projectId ?? f.project_id ?? (f.data as Record<string, unknown>)?.projectId;
          return Number(pId) === numericProjectId;
        })
        .map((f: Record<string, unknown>) => ({
          id: String(f.id ?? ''),
          totalHT: Number(f.totalHT ?? f.montantHT ?? (f.data as Record<string, unknown>)?.totalHT ?? 0),
          totalTTC: Number(f.totalTTC ?? 0),
          typeFacture: (f.typeFacture ?? f.type ?? null) as string | null,
          paidTTC: Number(f.paidTTC ?? f.totalTTC ?? 0),
          updatedAt: (f.updatedAt ?? f.updated_at ?? null) as string | null,
        }));

      // Extract interventions with proper duration conversion
      const allVisites: VisiteDetail[] = [];
      const interventions: ProfitabilityIntervention[] = (rawInterventions || [])
        .filter((i: Record<string, unknown>) => {
          const pId = i.projectId ?? i.project_id;
          return Number(pId) === numericProjectId;
        })
        .map((i: Record<string, unknown>) => {
          const extracted = extractInterventionData(i);
          allVisites.push(...extracted.visites);

          return {
            id: String(i.id ?? ''),
            technicianIds: extracted.technicianIds,
            hours: extracted.hours,
            updatedAt: (i.updatedAt ?? i.updated_at ?? null) as string | null,
          };
        });

      return { factures, interventions, visites: allVisites };
    },
  });
}
