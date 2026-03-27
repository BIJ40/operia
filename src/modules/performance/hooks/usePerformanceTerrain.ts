/**
 * Performance Terrain — Hook refondu V2
 * Thin wrapper: fetch DataService + Supabase → engine → TechnicianSnapshot[]
 * Techniciens identifiés via apiGetUsers (DataService) avec règles buildTechMap
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { apogeeProxy } from '@/services/apogeeProxy';
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

function normalizePersonName(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns an ISO week key like "2026-W12" for a given date.
 */
function getISOWeekKey(d: Date): string {
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1;
  const weekNum = Math.ceil((dayOfYear + jan4.getDay() - 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function computeOverlapHours(
  eventStart: Date | null,
  eventEnd: Date | null,
  period: DateRange
): number {
  if (!eventStart || Number.isNaN(eventStart.getTime())) return 0;

  const fallbackEnd = eventEnd && !Number.isNaN(eventEnd.getTime()) ? eventEnd : eventStart;
  const start = new Date(Math.max(eventStart.getTime(), period.start.getTime()));
  const end = new Date(Math.min(fallbackEnd.getTime(), period.end.getTime()));

  if (end < start) return 0;

  const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return diffHours > 0 ? diffHours : 0;
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
  if (dailyMinutes <= 0 || dailyMinutes > 14 * 60) return null;

  const daysPerWeek = (workDays && workDays.length > 0)
    ? workDays.filter(d => d >= 1 && d <= 5).length
    : 5;

  if (daysPerWeek === 0) return null;

  const weeklyHours = Math.round((dailyMinutes * daysPerWeek / 60) * 10) / 10;
  return weeklyHours > 0 && weeklyHours <= 60 ? weeklyHours : null;
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

  const agencySlug = currentAgency?.slug || agence || '';
  const effectiveAgencyId = agencyId || null;

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
    refetchOnMount: 'always',

    queryFn: async (): Promise<PerformanceTerrainData | null> => {
      logDebug('PERF_TERRAIN_V2', `Calcul pour ${agencySlug}`, { dateRange });

      try {
        // === FETCH DATA ===
        const [loaded, planningCreneauxRaw] = await Promise.all([
          DataService.loadAllData(true, false, agencySlug),
          apogeeProxy.getPlanningCreneaux({ agencySlug }).catch(() => []),
        ]);
        const interventions = (loaded?.interventions || []) as unknown as Record<string, unknown>[];
        const projects = (loaded?.projects || []) as unknown as Record<string, unknown>[];
        const users = (loaded?.users || []) as unknown as Record<string, unknown>[];
        const creneaux = (loaded?.creneaux || []) as unknown as Record<string, unknown>[];
        // Planning créneaux includes congés/absences — use for absence detection
        const planningCreneaux = (planningCreneauxRaw || []) as Record<string, unknown>[];

        // === LOAD WEEKLY HOURS ===
        // Hierarchy: collaborator schedule (work_start/end/days) → contract weekly_hours → config default
        const weeklyHoursByApogeeId = new Map<string, number>();
        const weeklyHoursByName = new Map<string, number>();
        const ambiguousNames = new Set<string>();

        const registerNameFallback = (fullName: string, hours: number) => {
          const normalized = normalizePersonName(fullName);
          if (!normalized || hours <= 0) return;
          if (weeklyHoursByName.has(normalized)) {
            ambiguousNames.add(normalized);
            weeklyHoursByName.delete(normalized);
            return;
          }
          if (!ambiguousNames.has(normalized)) {
            weeklyHoursByName.set(normalized, hours);
          }
        };

        if (effectiveAgencyId) {
          const { data: weeklyHoursRows, error: weeklyHoursError } = await supabase.rpc(
            'get_agency_performance_weekly_hours',
            { target_agency_id: effectiveAgencyId }
          );

          if (weeklyHoursError) {
            logError('PERF_TERRAIN_V2', 'Impossible de charger les durées hebdo via RPC', weeklyHoursError);
          }

          if (Array.isArray(weeklyHoursRows)) {
            for (const row of weeklyHoursRows as Array<{ apogee_user_id: number | string | null; weekly_hours: number | null }>) {
              const apogeeUserId = row.apogee_user_id != null ? String(row.apogee_user_id) : null;
              const weeklyHours = Number(row.weekly_hours);
              if (!apogeeUserId || !Number.isFinite(weeklyHours) || weeklyHours <= 0) continue;
              weeklyHoursByApogeeId.set(apogeeUserId, weeklyHours);
            }
          }

          // Fallback legacy: direct RH reads when available, mainly to preserve name-based matching
          const { data: collaborators } = await supabase
            .from('collaborators')
            .select('id, apogee_user_id, first_name, last_name, work_start, work_end, work_days')
            .eq('agency_id', effectiveAgencyId);

          if (collaborators && collaborators.length > 0) {
            for (const collab of collaborators) {
              const fullName = `${collab.first_name || ''} ${collab.last_name || ''}`.trim();

              const scheduleHours = computeWeeklyHoursFromSchedule(
                collab.work_start,
                collab.work_end,
                collab.work_days
              );

              if (scheduleHours !== null) {
                if (collab.apogee_user_id != null && !weeklyHoursByApogeeId.has(String(collab.apogee_user_id))) {
                  weeklyHoursByApogeeId.set(String(collab.apogee_user_id), scheduleHours);
                }
                registerNameFallback(fullName, scheduleHours);
              }
            }

            const unresolvedCollabIds = collaborators
              .filter(c => c.id && (c.apogee_user_id == null || !weeklyHoursByApogeeId.has(String(c.apogee_user_id))))
              .map(c => c.id);

            if (unresolvedCollabIds.length > 0) {
              const { data: contracts } = await supabase
                .from('employment_contracts')
                .select('collaborator_id, weekly_hours')
                .in('collaborator_id', unresolvedCollabIds)
                .not('weekly_hours', 'is', null)
                .order('start_date', { ascending: false });

              if (contracts) {
                const weeklyByCollabId = new Map<string, number>();
                for (const c of contracts) {
                  if (c.weekly_hours != null && !weeklyByCollabId.has(c.collaborator_id)) {
                    weeklyByCollabId.set(c.collaborator_id, c.weekly_hours);
                  }
                }

                for (const collab of collaborators) {
                  const weeklyHours = weeklyByCollabId.get(collab.id);
                  if (weeklyHours == null) continue;

                  if (collab.apogee_user_id != null && !weeklyHoursByApogeeId.has(String(collab.apogee_user_id))) {
                    weeklyHoursByApogeeId.set(String(collab.apogee_user_id), weeklyHours);
                  }

                  const fullName = `${collab.first_name || ''} ${collab.last_name || ''}`.trim();
                  registerNameFallback(fullName, weeklyHours);
                }
              }
            }
          }
        }

        // === BUILD TECHNICIAN MAP ===
        // Règle métier : technicien = is_on === true && data.skills non vide
        const unresolvedTechnicians: string[] = [];
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
          const weeklyHours = weeklyHoursByApogeeId.get(id) ?? weeklyHoursByName.get(normalizePersonName(name));

          if (weeklyHours == null) {
            unresolvedTechnicians.push(`${name} (#${id})`);
          }

          technicianMap.set(id, {
            id,
            name,
            color,
            weeklyHours,
            isKnown: true,
          });
        }

        if (unresolvedTechnicians.length > 0) {
          logDebug('PERF_TERRAIN_V2', 'Techniciens sans durée hebdo résolue', {
            unresolvedTechnicians,
            total: unresolvedTechnicians.length,
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
        // Track consecutive absence days per tech to detect multi-day leaves split into daily slots
        const absenceDaysByTech = new Map<string, Set<string>>();

        // === BUILD ACTIVITY INDEX per tech per ISO week ===
        // Used to distinguish rest days (4-day week) from real absences
        // Key: "techId:YYYY-Wxx", Value: Set of day-of-week numbers with activity
        const activityByTechWeek = new Map<string, Set<number>>();
        for (const item of planningCreneaux) {
          const rec = item as Record<string, unknown>;
          const refType = String(rec.refType || '').toLowerCase();
          if (refType !== 'visite-interv') continue;

          const rawDate = rec.date || rec.dateStart || rec.start;
          if (!rawDate) continue;
          const d = new Date(String(rawDate));
          if (Number.isNaN(d.getTime())) continue;

          const userIds = (rec.usersIds || []) as unknown[];
          const weekKey = getISOWeekKey(d);
          const dow = d.getDay(); // 0=Sun..6=Sat

          for (const uid of userIds) {
            const k = `${uid}:${weekKey}`;
            if (!activityByTechWeek.has(k)) activityByTechWeek.set(k, new Set());
            activityByTechWeek.get(k)!.add(dow);
          }
        }

        for (const item of planningCreneaux) {
          const rec = item as Record<string, unknown>;
          const refType = String(rec.refType || '').toLowerCase();
          const type = String(rec.type || (rec.data as Record<string, unknown>)?.type || '').toLowerCase();
          const type2 = String(rec.type2 || (rec.data as Record<string, unknown>)?.type2 || '').toLowerCase();
          const label = String(rec.label || (rec.data as Record<string, unknown>)?.label || '').toLowerCase();
          const combined = `${refType} ${type} ${type2} ${label}`;

          const isAbsenceType = PLANNING_ABSENCE_TYPES.some(t => refType === t || type === t);
          const isAbsenceKeyword = !isAbsenceType
            && ABSENCE_KEYWORDS.some(kw => combined.includes(kw))
            && !combined.includes('repos')
            && !combined.includes('indispo')
            && !combined.includes('indisponible');

          if (!isAbsenceType && !isAbsenceKeyword) continue;

          const dureeRaw = Number(rec.duree || (rec.data as Record<string, unknown>)?.duree || 0);
          const rawStart = rec.dateStart || rec.start || rec.date || (rec.data as Record<string, unknown>)?.dateStart || (rec.data as Record<string, unknown>)?.date;
          const rawEnd = rec.dateEnd || rec.end || (rec.data as Record<string, unknown>)?.dateEnd || (rec.data as Record<string, unknown>)?.end;

          const eventStart = rawStart ? new Date(String(rawStart)) : null;
          const eventEnd = rawEnd
            ? new Date(String(rawEnd))
            : eventStart && dureeRaw > 0
              ? new Date(eventStart.getTime() + dureeRaw * 60 * 1000)
              : eventStart;

          const overlapHours = computeOverlapHours(eventStart, eventEnd, dateRange);
          const hasDateInPeriod = eventStart && overlapHours > 0;

          if (!hasDateInPeriod) continue;

          // === REST DAY DETECTION ===
          // If a conge spans only 1 calendar day AND the tech has work activity
          // on other days of the same week, it's a weekly rest day — not a real absence.
          const spansDays = eventStart && eventEnd
            ? Math.ceil((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60 * 24))
            : dureeRaw > 0 ? Math.ceil(dureeRaw / (60 * 24)) : 1;

          // Extract user IDs
          const usersRaw = (rec.usersIds || (rec.data as Record<string, unknown>)?.usersIds || []) as unknown[];
          const userId = rec.userId != null ? String(rec.userId) : undefined;
          const ids = Array.isArray(usersRaw) ? usersRaw.map(x => String(x)) : [];
          if (userId) ids.push(userId);

          // Compute duration in hours from créneau — duree is in MINUTES
          let absHours = 0;

          if (overlapHours > 0) {
            absHours = overlapHours;
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

          const isSingleDayConge = spansDays <= 1 && isAbsenceType;
          const isLikelyRealLeave = absHours > 16.5 || spansDays > 1;

          const absLabel = combined.includes('maladie') ? 'Arrêt maladie'
            : combined.includes('arret') || combined.includes('arrêt') ? 'En arrêt'
            : combined.includes('conge') || combined.includes('congé') || refType === 'conge' ? 'En congé'
            : combined.includes('formation') ? 'Formation'
            : 'Absent';

          for (const id of ids) {
            // Only accumulate if no RH data for this tech
            if (absences.has(id)) continue;

            // Check if this is a rest day (tech works other days of the same week)
            if (isSingleDayConge && eventStart && !isLikelyRealLeave) {
              const weekKey = getISOWeekKey(eventStart);
              const k = `${id}:${weekKey}`;
              const activeDays = activityByTechWeek.get(k);
              if (activeDays && activeDays.size >= 3) {
                // Tech has activity on the rest of the week → likely weekly rest day, skip
                logDebug('PERF_TERRAIN_V2', `Repos hebdo ignoré pour tech ${id}`, {
                  date: eventStart.toISOString().slice(0, 10),
                  activeDaysInWeek: activeDays.size,
                });
                continue;
              }
            }

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
