/**
 * Forecast UI — Data orchestrator hook
 * Phase 6B Lot 6.1
 *
 * Loads all data sources, runs the full forecast pipeline,
 * returns a UI-ready result. Zero JSX, zero display logic.
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { apogeeProxy } from '@/services/apogeeProxy';
import { supabase } from '@/integrations/supabase/client';
import { logDebug, logError } from '@/lib/logger';
import { normalizeIsOn } from '@/apogee-connect/utils/techTools';
import { useTechnicianAbsences, summarizeAbsences } from '../../hooks/useTechnicianAbsences';
import { usePerformanceConfig } from '../../hooks/usePerformanceConfig';
import { computeChargeTravauxAvenirParUnivers } from '@/statia/shared/chargeTravauxEngine';

import { computeFutureCapacity } from '../capacityFuture';
import { computeCommittedWorkload } from '../committedWorkload';
import { computeProbableWorkload } from '../probableWorkload';
import {
  aggregateForecastTeamStats,
  mergeCapacityAndCommittedWorkload,
  mergeCommittedAndProbableIntoForecast,
} from '../projection';
import { computeForecastTension } from '../tension';
import { generateForecastRecommendations } from '../recommendations';

import type {
  ForecastHorizon,
  ForecastSnapshot,
  ForecastTeamStats,
  ForecastTensionSnapshot,
  ForecastTeamTensionStats,
  ForecastRecommendationsResult,
  CapacityFutureInput,
  CommittedWorkloadInput,
  ProbableWorkloadInput,
  ForecastProbableTeamStats,
} from '../types';

function normalizePersonName(value: string | null | undefined): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeWeeklyHoursFromSchedule(
  workStart: string | null,
  workEnd: string | null,
  workDays: number[] | null
): number | null {
  if (!workStart || !workEnd) return null;

  const [sh, sm] = workStart.split(':').map(Number);
  const [eh, em] = workEnd.split(':').map(Number);

  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em)) return null;

  const dailyMinutes = (eh * 60 + em) - (sh * 60 + sm);
  if (dailyMinutes <= 0 || dailyMinutes > 14 * 60) return null;

  const daysPerWeek = (workDays && workDays.length > 0)
    ? workDays.filter((d) => d >= 1 && d <= 5).length
    : 5;

  if (daysPerWeek === 0) return null;

  const weeklyHours = Math.round((dailyMinutes * daysPerWeek / 60) * 10) / 10;
  return weeklyHours > 0 && weeklyHours <= 60 ? weeklyHours : null;
}

// ============================================================================
// PUBLIC INTERFACE
// ============================================================================

export interface UseForecastDataResult {
  horizon: ForecastHorizon;
  period: { start: Date; end: Date };
  snapshots: ForecastSnapshot[];
  teamStats: ForecastTeamStats;
  tensionSnapshots: ForecastTensionSnapshot[];
  teamTension: ForecastTeamTensionStats;
  recommendations: ForecastRecommendationsResult;
  probableTeamStats?: ForecastProbableTeamStats;
  meta: {
    hasCommittedData: boolean;
    hasProbableData: boolean;
    hasUnassignedProbable: boolean;
    isLowConfidence: boolean;
    technicianCount: number;
  };
  isLoading: boolean;
  error: Error | null;
}

// ============================================================================
// HOOK
// ============================================================================

export function useForecastData(
  horizon: ForecastHorizon,
  period: { start: Date; end: Date }
): UseForecastDataResult {
  const { agence, agencyId } = useProfile();
  const { isAgencyReady, currentAgency } = useAgency();
  const { config } = usePerformanceConfig();

  const agencySlug = currentAgency?.slug || agence || '';
  const effectiveAgencyId = agencyId || null;

  const { data: rhAbsences } = useTechnicianAbsences({
    agencyId: effectiveAgencyId,
    period,
    enabled: !!effectiveAgencyId && isAgencyReady,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      'forecast-data',
      agencySlug,
      effectiveAgencyId,
      horizon,
      period.start.toISOString(),
      period.end.toISOString(),
      rhAbsences ? 'rh' : 'no-rh',
    ],
    enabled: !!agencySlug && isAgencyReady,
    staleTime: 5 * 60 * 1000,

    queryFn: async () => {
      logDebug('FORECAST_UI', `Pipeline forecast ${horizon}`, { period });

      // === FETCH ALL DATA ===
      const [loaded, planningCreneaux] = await Promise.all([
        DataService.loadAllData(true, false, agencySlug),
        apogeeProxy.getPlanningCreneaux({ agencySlug }).catch(() => []),
      ]);

      const interventions = (loaded?.interventions || []) as unknown as Record<string, unknown>[];
      const projects = (loaded?.projects || []) as unknown as Record<string, unknown>[];
      const users = (loaded?.users || []) as unknown as Record<string, unknown>[];
      const creneaux = (loaded?.creneaux || []) as unknown as Record<string, unknown>[];
      const devis = (loaded?.devis || []) as unknown as Record<string, unknown>[];
      const planningData = (planningCreneaux || []) as Record<string, unknown>[];

      // === WEEKLY HOURS ===
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
        const { data: rows, error: weeklyHoursError } = await supabase.rpc(
          'get_agency_performance_weekly_hours',
          { target_agency_id: effectiveAgencyId }
        );

        if (weeklyHoursError) {
          logError('FORECAST_UI', 'Impossible de charger les durées hebdo via RPC', weeklyHoursError);
        }

        if (Array.isArray(rows)) {
          for (const row of rows as Array<{ apogee_user_id: number | string | null; weekly_hours: number | null }>) {
            const id = row.apogee_user_id != null ? String(row.apogee_user_id) : null;
            const wh = Number(row.weekly_hours);
            if (id && Number.isFinite(wh) && wh > 0) weeklyHoursByApogeeId.set(id, wh);
          }
        }

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
              collab.work_days as number[] | null,
            );

            if (scheduleHours !== null) {
              if (collab.apogee_user_id != null && !weeklyHoursByApogeeId.has(String(collab.apogee_user_id))) {
                weeklyHoursByApogeeId.set(String(collab.apogee_user_id), scheduleHours);
              }
              registerNameFallback(fullName, scheduleHours);
            }
          }

          const unresolvedCollabIds = collaborators
            .filter((c) => c.id && (c.apogee_user_id == null || !weeklyHoursByApogeeId.has(String(c.apogee_user_id))))
            .map((c) => c.id);

          if (unresolvedCollabIds.length > 0) {
            const { data: contracts } = await supabase
              .from('employment_contracts')
              .select('collaborator_id, weekly_hours')
              .in('collaborator_id', unresolvedCollabIds)
              .not('weekly_hours', 'is', null)
              .order('start_date', { ascending: false });

            if (contracts) {
              const weeklyByCollabId = new Map<string, number>();
              for (const contract of contracts) {
                if (contract.weekly_hours != null && !weeklyByCollabId.has(contract.collaborator_id)) {
                  weeklyByCollabId.set(contract.collaborator_id, contract.weekly_hours);
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
      const techMap = new Map<string, { id: string; name: string; weeklyHours?: number; isKnown: boolean }>();
      for (const u of users) {
        if (!normalizeIsOn(u.is_on)) continue;
        const uData = (u.data || {}) as Record<string, unknown>;
        const skills = uData.skills;
        if (!Array.isArray(skills) || skills.length === 0) continue;

        const id = String(u.id);
        const name = `${u.firstname || ''} ${u.name || ''}`.trim() || `Tech ${id}`;
        const weeklyHours = weeklyHoursByApogeeId.get(id) ?? weeklyHoursByName.get(normalizePersonName(name));

        techMap.set(id, { id, name, weeklyHours, isKnown: true });
      }

      // === ABSENCES ===
      const absenceMap = new Map<string, {
        technicianId: string;
        source: 'leave_table' | 'planning_unavailability' | 'none';
        label: string;
        days?: number;
        hours?: number;
      }>();

      if (rhAbsences && rhAbsences.size > 0) {
        for (const [techId, entries] of rhAbsences) {
          const summary = summarizeAbsences(entries);
          absenceMap.set(techId, {
            technicianId: techId,
            source: 'leave_table',
            label: entries[0]?.type || 'Absence',
            days: summary.days,
            hours: summary.hours,
          });
        }
      }

      // === PROJECTS INDEX ===
      const projectsById = new Map<string, Record<string, unknown>>();
      for (const p of projects) {
        projectsById.set(String(p.id), p);
      }

      // ================================================================
      // FORECAST PIPELINE
      // ================================================================

      // 1. Capacity future
      const capacityInput: CapacityFutureInput = {
        technicians: techMap,
        absences: absenceMap,
        config: {
          defaultWeeklyHours: config.defaultWeeklyHours,
          holidays: config.holidays,
          deductPlanningUnavailability: config.deductPlanningUnavailability,
        },
        period,
        horizon,
      };
      const capacitySnapshots = computeFutureCapacity(capacityInput);

      // 2. Committed workload
      const committedInput: CommittedWorkloadInput = {
        interventions,
        creneaux: [...creneaux, ...planningData.filter(c => {
          const rt = String((c as Record<string, unknown>).refType || '').toLowerCase();
          return rt === 'visite-interv';
        })],
        projectsById,
        technicians: techMap,
        period,
        defaultTaskDurationMinutes: config.defaultTaskDurationMinutes,
      };
      const committedResult = computeCommittedWorkload(committedInput, horizon);

      // 3. Merge capacity + committed
      const mergedCommitted = mergeCapacityAndCommittedWorkload(
        capacitySnapshots, committedResult.workloads, horizon
      );

      // 4. Probable workload (from chargeTravauxEngine)
      const chargeResult = computeChargeTravauxAvenirParUnivers(
        projects as any[], interventions as any[], devis as any[], creneaux as any[]
      );

      const probableInput: ProbableWorkloadInput = {
        technicians: techMap,
        period,
        probableSourceData: {
          pipelineMaturity: chargeResult.pipelineMaturity,
          pipelineAging: chargeResult.pipelineAging,
          riskProjects: chargeResult.riskProjects,
          chargeByTechnician: chargeResult.chargeByTechnician,
          weeklyLoad: chargeResult.weeklyLoad,
          dataQuality: chargeResult.dataQuality,
          parProjet: chargeResult.parProjet,
        },
      };
      const probableResult = computeProbableWorkload(probableInput, horizon);

      // 5. Merge committed + probable
      const mergedForecast = mergeCommittedAndProbableIntoForecast(
        mergedCommitted, probableResult.workloads, horizon
      );

      // 6. Team stats
      const teamStats = aggregateForecastTeamStats(mergedForecast, horizon);

      // 7. Tension
      const tensionResult = computeForecastTension(mergedForecast, horizon);

      // 8. Recommendations
      const recommendations = generateForecastRecommendations(
        mergedForecast,
        tensionResult.snapshots,
        teamStats,
        tensionResult.teamStats,
        horizon
      );

      // Meta
      const hasCommittedData = committedResult.workloads.length > 0;
      const hasProbableData = probableResult.workloads.length > 0;
      const hasUnassignedProbable = probableResult.unassignedTeamMinutes > 0;
      const isLowConfidence = teamStats.averageConfidenceLevel === 'low';

      return {
        snapshots: mergedForecast,
        teamStats,
        tensionSnapshots: tensionResult.snapshots,
        teamTension: tensionResult.teamStats,
        recommendations,
        probableTeamStats: probableResult.teamStats,
        meta: {
          hasCommittedData,
          hasProbableData,
          hasUnassignedProbable,
          isLowConfidence,
          technicianCount: techMap.size,
        },
      };
    },
  });

  const empty: UseForecastDataResult = {
    horizon,
    period,
    snapshots: [],
    teamStats: {
      horizon,
      totalTheoreticalMinutes: 0,
      totalAdjustedMinutes: 0,
      totalAvailableMinutes: 0,
      totalAbsenceImpactMinutes: 0,
      technicianCount: 0,
      averageConfidenceLevel: 'low',
    },
    tensionSnapshots: [],
    teamTension: {
      horizon,
      predictedTensionLevel: 'comfort',
      techniciansInComfort: 0,
      techniciansInWatch: 0,
      techniciansInTension: 0,
      techniciansInCritical: 0,
      averageGlobalLoadRatio: null,
      topFactors: [],
    },
    recommendations: {
      horizon,
      teamRecommendations: [],
      technicianRecommendations: [],
      universeRecommendations: [],
      all: [],
    },
    meta: {
      hasCommittedData: false,
      hasProbableData: false,
      hasUnassignedProbable: false,
      isLowConfidence: true,
      technicianCount: 0,
    },
    isLoading,
    error: error as Error | null,
  };

  if (!data) return empty;

  return {
    horizon,
    period,
    ...data,
    isLoading,
    error: error as Error | null,
  };
}
