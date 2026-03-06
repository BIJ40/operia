/**
 * Planning V2 — Hook principal de données
 * Fetch parallèle via apogeeProxy, normalisation, calcul charge/conflits
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apogeeProxy } from "@/services/apogeeProxy";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { normalizeApogeeData } from "../services/normalizeApogee";
import { computeTechDayLoad, computeScheduleConflicts } from "../services/computeLoad";
import { computeTechDayTravel } from "../services/computeTravel";
import { useTechSchedules } from "./useTechSchedules";
import { getScheduleForDayOfWeek } from "../types/schedule";
import { dateKey } from "../utils/dateUtils";
import type {
  PlanningTechnician,
  PlanningAppointment,
  PlanningBlock,
  PlanningUnscheduled,
  PlanningAlert,
  TechDayLoad,
} from "../types";

interface PlanningV2Result {
  technicians: PlanningTechnician[];
  appointments: PlanningAppointment[];
  blocks: PlanningBlock[];
  unscheduled: PlanningUnscheduled[];
  alerts: PlanningAlert[];
  loads: Map<string, TechDayLoad>; // key = "techId:YYYY-MM-DD"
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function usePlanningV2Data(selectedDate: Date): PlanningV2Result {
  const { currentAgency, isAgencyReady } = useAgency();
  const { schedulesByApogeeId } = useTechSchedules();
  const agencySlug = currentAgency?.slug;

  const { data: rawData, isLoading, error, refetch } = useQuery({
    queryKey: ["planning-v2-raw", agencySlug],
    enabled: isAgencyReady && !!agencySlug,
    queryFn: async () => {
      if (!agencySlug) return null;
      const [creneaux, interventions, projects, clients, users] = await Promise.all([
        apogeeProxy.getPlanningCreneaux({ agencySlug }),
        apogeeProxy.getInterventions({ agencySlug }),
        apogeeProxy.getProjects({ agencySlug }),
        apogeeProxy.getClients({ agencySlug }),
        apogeeProxy.getUsers({ agencySlug }),
      ]);
      return { creneaux, interventions, projects, clients, users };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Normalisation (memoized)
  const normalized = useMemo(() => {
    if (!rawData) return null;
    return normalizeApogeeData(
      rawData.creneaux,
      rawData.interventions,
      rawData.projects,
      rawData.clients,
      rawData.users
    );
  }, [rawData]);

  // Alertes conflits
  const alerts = useMemo(() => {
    if (!normalized) return [];
    return computeScheduleConflicts(normalized.appointments, normalized.blocks);
  }, [normalized]);

  // Charges par technicien/jour pour la date sélectionnée
  const loads = useMemo(() => {
    if (!normalized) return new Map<string, TechDayLoad>();
    const map = new Map<string, TechDayLoad>();
    const dk = dateKey(selectedDate);
    const dayOfWeek = selectedDate.getDay(); // 0=Dim, 1=Lun...

    for (const tech of normalized.technicians) {
      // Get schedule for this tech's day of week
      const techSchedule = schedulesByApogeeId.get(tech.apogeeId);
      const daySchedule = techSchedule
        ? getScheduleForDayOfWeek(techSchedule, dayOfWeek)
        : undefined;

      const load = computeTechDayLoad(
        tech.id,
        dk,
        normalized.appointments,
        normalized.blocks,
        tech.maxDailyMinutes,
        daySchedule
      );

      // Enrichir avec le temps de trajet
      const techAppts = normalized.appointments.filter(
        (a) => a.technicianIds.includes(tech.id) && dateKey(a.start) === dk
      );
      load.travelMinutes = computeTechDayTravel(techAppts);

      map.set(`${tech.id}:${dk}`, load);
    }

    return map;
  }, [normalized, selectedDate, schedulesByApogeeId]);

  return {
    technicians: normalized?.technicians ?? [],
    appointments: normalized?.appointments ?? [],
    blocks: normalized?.blocks ?? [],
    unscheduled: normalized?.unscheduled ?? [],
    alerts,
    loads,
    isLoading,
    error: error as Error | null,
    refresh: () => refetch(),
  };
}
