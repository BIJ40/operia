/**
 * Performance Terrain — Hook refondu V2
 * Thin wrapper: fetch DataService + Supabase → engine → TechnicianSnapshot[]
 * Techniciens identifiés via apiGetUsers (DataService) avec règles buildTechMap
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { supabase } from '@/integrations/supabase/client';
import { logDebug, logError } from '@/lib/logger';
import { normalizeIsOn, isExcludedUserType } from '@/apogee-connect/utils/techTools';
import { useTechnicianAbsences, summarizeAbsences } from './useTechnicianAbsences';

import type {
  PerformanceEngineInput,
  PerformanceEngineOutput,
  TechnicianInput,
  AbsenceInfo,
  TechnicianPerformance,
  PerformanceConfig,
  snapshotToLegacy,
} from '../engine/types';
import { snapshotToLegacy as convertToLegacy } from '../engine/types';
import { buildUnifiedWorkItems } from '../engine/consolidation';
import { computeTechnicianSnapshots } from '../engine/performanceEngine';
import { DEFAULT_THRESHOLDS, ABSENCE_KEYWORDS, EXCLUDED_USER_TYPES } from '../engine/rules';
import { usePerformanceConfig } from './usePerformanceConfig';

// ============================================================================
// TYPES & HELPERS
// ============================================================================

interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Compute weekly hours from collaborator schedule fields.
 * work_start/work_end = "HH:MM" strings, work_days = array of day numbers (0=Sun..6=Sat)
 * Returns null if insufficient data.
 */
function computeWeeklyHoursFromSchedule(
  workStart: string | null,
  workEnd: string | null,
  workDays: number[] | null
): number | null {
  if (!workStart || !workEnd) return null;

  const [sh, sm] = workStart.split(':').map(Number);
  const [eh, em] = workEnd.split(':').map(Number);

  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;

  const dailyMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (dailyMinutes <= 0 || dailyMinutes > 14 * 60) return null; // sanity: max 14h/day

  // work_days: count of working days per week; default to 5 if not set
  const daysPerWeek = (workDays && workDays.length > 0)
    ? workDays.filter(d => d >= 1 && d <= 5).length // only count weekdays
    : 5;

  if (daysPerWeek === 0) return null;

  const weeklyHours = Math.round((dailyMinutes * daysPerWeek / 60) * 10) / 10;
  return weeklyHours > 0 && weeklyHours <= 60 ? weeklyHours : null; // sanity bounds
}

export interface PerformanceTerrainData {
  technicians: TechnicianPerformance[];
  teamStats: {
    avgProductivityRate: number;
    avgLoadRatio: number;
    totalSavCount: number;
    totalInterventions: number;
    totalCA: number;
  };
  period: { start: Date; end: Date };
  engineOutput: PerformanceEngineOutput;
}

// ============================================================================
// HOOK
// ============================================================================

export function usePerformanceTerrain(dateRange: DateRange) {
  const { agence, agencyId } = useProfile();
  const { isAgencyReady, currentAgency } = useAgency();
  const { config } = usePerformanceConfig();

  const agencySlug = currentAgency?.slug || currentAgency?.id || agence || '';
  const effectiveAgencyId = currentAgency?.id || agencyId;

  // Fetch structured absences from RH table
  const { data: rhAbsences } = useTechnicianAbsences({
    agencyId: effectiveAgencyId,
    period: dateRange,
    enabled: !!effectiveAgencyId && isAgencyReady,
  });

  return useQuery<PerformanceTerrainData | null>({
    queryKey: [
      'performance-terrain',
      agencySlug,
      effectiveAgencyId,
      dateRange.start.toISOString(),
      dateRange.end.toISOString(),
      rhAbsences ? 'rh' : 'no-rh',
    ],
    enabled: !!agencySlug && isAgencyReady,
    staleTime: 5 * 60 * 1000,

    queryFn: async (): Promise<PerformanceTerrainData | null> => {
      logDebug('PERF_TERRAIN_V2', `Calcul pour ${agencySlug}`, { dateRange });

      try {
        // === FETCH DATA ===
        const loaded = await DataService.loadAllData(true, false, agencySlug);
        const interventions = (loaded?.interventions || []) as unknown as Record<string, unknown>[];
        const projects = (loaded?.projects || []) as unknown as Record<string, unknown>[];
        const users = (loaded?.users || []) as unknown as Record<string, unknown>[];
        const creneaux = (loaded?.creneaux || []) as unknown as Record<string, unknown>[];

        // === LOAD WEEKLY HOURS ===
        // Hierarchy: collaborator schedule (work_start/end/days) → contract weekly_hours → config default
        const weeklyHoursByApogeeId = new Map<string, number>();

        if (effectiveAgencyId) {
          const { data: collaborators } = await supabase
            .from('collaborators')
            .select('id, apogee_user_id, work_start, work_end, work_days')
            .eq('agency_id', effectiveAgencyId)
            .not('apogee_user_id', 'is', null);

          if (collaborators && collaborators.length > 0) {
            // 1. Compute from schedule fields first
            for (const collab of collaborators) {
              if (!collab.apogee_user_id) continue;
              const scheduleHours = computeWeeklyHoursFromSchedule(
                collab.work_start,
                collab.work_end,
                collab.work_days
              );
              if (scheduleHours !== null) {
                weeklyHoursByApogeeId.set(String(collab.apogee_user_id), scheduleHours);
              }
            }

            // 2. Fallback: contract weekly_hours for those not yet resolved
            const unresolvedCollabIds = collaborators
              .filter(c => c.apogee_user_id && !weeklyHoursByApogeeId.has(String(c.apogee_user_id)))
              .map(c => c.id);

            if (unresolvedCollabIds.length > 0) {
              // Query ALL contracts (not just is_current) ordered by most recent first
              const { data: contracts } = await supabase
                .from('employment_contracts')
                .select('collaborator_id, weekly_hours')
                .in('collaborator_id', unresolvedCollabIds)
                .not('weekly_hours', 'is', null)
                .order('start_date', { ascending: false });

              if (contracts) {
                const weeklyByCollabId = new Map<string, number>();
                for (const c of contracts) {
                  if (c.weekly_hours) weeklyByCollabId.set(c.collaborator_id, c.weekly_hours);
                }
                for (const collab of collaborators) {
                  if (collab.apogee_user_id && !weeklyHoursByApogeeId.has(String(collab.apogee_user_id)) && weeklyByCollabId.has(collab.id)) {
                    weeklyHoursByApogeeId.set(String(collab.apogee_user_id), weeklyByCollabId.get(collab.id)!);
                  }
                }
              }
            }
          }
        }

        // === BUILD TECHNICIAN MAP ===
        // Règle métier : technicien = is_on === true && data.skills non vide
        const technicianMap = new Map<string, TechnicianInput>();
        for (const u of users) {
          if (!normalizeIsOn(u.is_on)) continue;

          const uData = (u.data || {}) as Record<string, unknown>;
          const skills = uData.skills;
          if (!Array.isArray(skills) || skills.length === 0) continue;

          const id = String(u.id);
          const name = `${u.firstname || ''} ${u.name || ''}`.trim() || `Tech ${id}`;
          const bgColor = (uData.bgcolor as Record<string, unknown>)?.hex as string | undefined;
          const color = bgColor || (uData.color as Record<string, unknown>)?.hex as string | undefined;

          technicianMap.set(id, {
            id,
            name,
            color,
            weeklyHours: weeklyHoursByApogeeId.get(id),
            isKnown: true,
          });
        }

        // === DETECT ABSENCES ===
        // Priority: RH table (leave_table) > planning heuristic (planning_unavailability)
        const absences = new Map<string, AbsenceInfo>();

        // 1. Inject RH absences if available
        if (rhAbsences && rhAbsences.size > 0) {
          for (const [techId, entries] of rhAbsences) {
            const summary = summarizeAbsences(entries);
            absences.set(techId, {
              technicianId: techId,
              source: 'leave_table',
              label: entries[0]?.type || 'Absence',
              days: summary.days,
              hours: summary.hours,
            });
          }
        }

        // 2. Fallback: planning creneaux for techs without RH data
        // Detect type "conge", "absence" or keyword matches, with real duration
        const PLANNING_ABSENCE_TYPES = ['conge', 'congé', 'absence'];
        const absenceAccum = new Map<string, { hours: number; label: string }>();

        for (const item of creneaux) {
          const rec = item as Record<string, unknown>;
          const refType = String(rec.refType || '').toLowerCase();
          const type = String(rec.type || (rec.data as Record<string, unknown>)?.type || '').toLowerCase();
          const type2 = String(rec.type2 || (rec.data as Record<string, unknown>)?.type2 || '').toLowerCase();
          const label = String(rec.label || (rec.data as Record<string, unknown>)?.label || '').toLowerCase();
          const combined = `${refType} ${type} ${type2} ${label}`;

          const isAbsenceType = PLANNING_ABSENCE_TYPES.some(t => refType === t || type === t);
          const isAbsenceKeyword = !isAbsenceType && ABSENCE_KEYWORDS.some(kw => combined.includes(kw));

          if (!isAbsenceType && !isAbsenceKeyword) continue;

          // Extract user IDs
          const usersRaw = (rec.usersIds || (rec.data as Record<string, unknown>)?.usersIds || []) as unknown[];
          const userId = rec.userId != null ? String(rec.userId) : undefined;
          const ids = Array.isArray(usersRaw) ? usersRaw.map(x => String(x)) : [];
          if (userId) ids.push(userId);

          // Compute duration in hours from créneau
          // API duree field is in SECONDS (e.g. 73980 = ~20.55h)
          const dureeRaw = Number(rec.duree || (rec.data as Record<string, unknown>)?.duree || 0);
          let absHours = 0;

          if (dureeRaw > 0) {
            // Heuristic: if value > 1440 it's seconds, otherwise minutes
            absHours = dureeRaw > 1440 ? dureeRaw / 3600 : dureeRaw / 60;
          }

          // If no duree, try start/end
          if (absHours === 0) {
            const dateStart = rec.dateStart || rec.start || (rec.data as Record<string, unknown>)?.dateStart;
            const dateEnd = rec.dateEnd || rec.end || (rec.data as Record<string, unknown>)?.dateEnd;
            if (dateStart && dateEnd) {
              const ms = new Date(String(dateEnd)).getTime() - new Date(String(dateStart)).getTime();
              if (ms > 0) absHours = ms / (1000 * 60 * 60);
            }
          }

          // Fallback: 7h if still 0
          if (absHours <= 0) absHours = 7;

          const absLabel = combined.includes('maladie') ? 'Arrêt maladie'
            : combined.includes('arret') || combined.includes('arrêt') ? 'En arrêt'
            : combined.includes('conge') || combined.includes('congé') || refType === 'conge' ? 'En congé'
            : combined.includes('formation') ? 'Formation'
            : 'Absent';

          for (const id of ids) {
            // Only accumulate if no RH data for this tech
            if (absences.has(id)) continue;

            const prev = absenceAccum.get(id);
            if (prev) {
              prev.hours += absHours;
            } else {
              absenceAccum.set(id, { hours: absHours, label: absLabel });
            }
          }
        }

        // Convert accumulated planning absences into AbsenceInfo
        for (const [id, { hours, label }] of absenceAccum) {
          if (!absences.has(id)) {
            const days = Math.round((hours / 7) * 10) / 10; // approximate days (7h/day)
            absences.set(id, {
              technicianId: id,
              source: 'planning_unavailability',
              label,
              days,
              hours,
            });
          }
        }

        // === BUILD PROJECT INDEX ===
        const projectsById = new Map<string, Record<string, unknown>>();
        for (const p of projects) {
          projectsById.set(String(p.id), p);
        }

        // === CONSOLIDATION ===
        const { items: workItems, matchLog } = buildUnifiedWorkItems(
          interventions,
          creneaux,
          projectsById,
          dateRange,
          config.defaultTaskDurationMinutes
        );

        // === ENGINE ===
        const engineInput: PerformanceEngineInput = {
          workItems,
          technicians: technicianMap,
          absences,
          config,
          period: dateRange,
          matchLog: matchLog.map(m => ({
            aId: m.aId,
            bId: m.bId,
            outcome: m.outcome,
            score: m.score,
          })),
        };

        const engineOutput = computeTechnicianSnapshots(engineInput);

        // === CONVERT TO LEGACY FORMAT ===
        const technicians = engineOutput.snapshots.map(convertToLegacy);

        logDebug('PERF_TERRAIN_V2', 'Résultat', {
          techCount: technicians.length,
          unknownWorkload: engineOutput.unknownTechnicianWorkload,
          matchLog: matchLog.length,
        });

        return {
          technicians: technicians.sort((a, b) => b.productivityRate - a.productivityRate),
          teamStats: {
            ...engineOutput.teamStats,
            totalCA: 0, // V1: not available
          },
          period: dateRange,
          engineOutput,
        };
      } catch (error) {
        logError('PERF_TERRAIN_V2', 'Erreur calcul', { error });
        return null;
      }
    },
  });
}

/**
 * Hook for a specific technician
 */
export function useTechnicianPerformance(technicianId: string, dateRange: DateRange) {
  const { data } = usePerformanceTerrain(dateRange);
  return {
    data: data?.technicians.find(t => t.id === technicianId) || null,
    teamStats: data?.teamStats,
  };
}
