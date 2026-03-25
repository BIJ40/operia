/**
 * Performance Terrain — Hook refondu V2
 * Thin wrapper: fetch DataService + Supabase → engine → TechnicianSnapshot[]
 */

import { useQuery } from '@tanstack/react-query';
import { useProfile } from '@/contexts/ProfileContext';
import { useAgency } from '@/apogee-connect/contexts/AgencyContext';
import { DataService } from '@/apogee-connect/services/dataService';
import { supabase } from '@/integrations/supabase/client';
import { logDebug, logError } from '@/lib/logger';

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
// TYPES
// ============================================================================

interface DateRange {
  start: Date;
  end: Date;
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

  return useQuery<PerformanceTerrainData | null>({
    queryKey: [
      'performance-terrain',
      agencySlug,
      effectiveAgencyId,
      dateRange.start.toISOString(),
      dateRange.end.toISOString(),
    ],
    enabled: !!agencySlug && isAgencyReady,
    staleTime: 5 * 60 * 1000,

    queryFn: async (): Promise<PerformanceTerrainData | null> => {
      logDebug('PERF_TERRAIN_V2', `Calcul pour ${agencySlug}`, { dateRange });

      try {
        // === FETCH DATA ===
        const loaded = await DataService.loadAllData(true, false, agencySlug);
        const interventions = (loaded?.interventions || []) as Record<string, unknown>[];
        const projects = (loaded?.projects || []) as Record<string, unknown>[];
        const users = (loaded?.users || []) as Record<string, unknown>[];
        const creneaux = (loaded?.creneaux || []) as Record<string, unknown>[];

        // === LOAD WEEKLY HOURS FROM RH CONTRACTS ===
        const weeklyHoursByApogeeId = new Map<string, number>();

        if (effectiveAgencyId) {
          const { data: collaborators } = await supabase
            .from('collaborators')
            .select('id, apogee_user_id')
            .eq('agency_id', effectiveAgencyId)
            .not('apogee_user_id', 'is', null);

          if (collaborators && collaborators.length > 0) {
            const collabIds = collaborators.map(c => c.id);
            const { data: contracts } = await supabase
              .from('employment_contracts')
              .select('collaborator_id, weekly_hours')
              .in('collaborator_id', collabIds)
              .eq('is_current', true);

            if (contracts) {
              const weeklyByCollabId = new Map<string, number>();
              for (const c of contracts) {
                if (c.weekly_hours) weeklyByCollabId.set(c.collaborator_id, c.weekly_hours);
              }
              for (const collab of collaborators) {
                if (collab.apogee_user_id && weeklyByCollabId.has(collab.id)) {
                  weeklyHoursByApogeeId.set(String(collab.apogee_user_id), weeklyByCollabId.get(collab.id)!);
                }
              }
            }
          }
        }

        // === BUILD TECHNICIAN MAP ===
        const technicianMap = new Map<string, TechnicianInput>();
        for (const u of users) {
          const userType = String(u.type || '').toLowerCase();
          if (EXCLUDED_USER_TYPES.some(ex => userType.includes(ex))) continue;
          if (userType !== 'technicien' && userType !== 'utilisateur') continue;

          const id = String(u.id);
          const name = `${u.firstname || ''} ${u.lastname || u.name || ''}`.trim() || `Tech ${id}`;
          const color = (u.color as string) || ((u.data as Record<string, unknown>)?.bgcolor as Record<string, unknown>)?.hex as string || undefined;

          technicianMap.set(id, {
            id,
            name,
            color,
            weeklyHours: weeklyHoursByApogeeId.get(id),
            isKnown: true,
          });
        }

        // === DETECT ABSENCES (planning_unavailability only) ===
        const absences = new Map<string, AbsenceInfo>();
        const allSources = [...creneaux, ...interventions];
        for (const item of allSources) {
          const type = String((item as Record<string, unknown>).type || ((item as Record<string, unknown>).data as Record<string, unknown>)?.type || '').toLowerCase();
          const type2 = String((item as Record<string, unknown>).type2 || ((item as Record<string, unknown>).data as Record<string, unknown>)?.type2 || '').toLowerCase();
          const label = String((item as Record<string, unknown>).label || ((item as Record<string, unknown>).data as Record<string, unknown>)?.label || '').toLowerCase();
          const combined = `${type} ${type2} ${label}`;

          if (ABSENCE_KEYWORDS.some(kw => combined.includes(kw))) {
            const usersRaw = ((item as Record<string, unknown>).usersIds || (item as Record<string, unknown>).data && ((item as Record<string, unknown>).data as Record<string, unknown>)?.usersIds || []) as unknown[];
            const userId = (item as Record<string, unknown>).userId != null ? String((item as Record<string, unknown>).userId) : undefined;
            const ids = Array.isArray(usersRaw) ? usersRaw.map(x => String(x)) : [];
            if (userId) ids.push(userId);

            const absLabel = combined.includes('maladie') ? 'Arrêt maladie'
              : combined.includes('arret') || combined.includes('arrêt') ? 'En arrêt'
              : combined.includes('conge') || combined.includes('congé') ? 'En congé'
              : 'Absent';

            for (const id of ids) {
              if (!absences.has(id)) {
                absences.set(id, {
                  technicianId: id,
                  source: 'planning_unavailability',
                  label: absLabel,
                  days: 1, // approximation — no real absence table
                });
              }
            }
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
        };

        const engineOutput = computeTechnicianSnapshots(engineInput);
        engineOutput.matchLog = matchLog.map(m => ({
          a: m.aId,
          b: m.bId,
          outcome: m.outcome,
          score: m.score,
        }));

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
