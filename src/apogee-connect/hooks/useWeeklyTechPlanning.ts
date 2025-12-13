import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { addWeeks, subWeeks } from "date-fns";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { apogeeProxy } from "@/services/apogeeProxy";
import {
  buildPlanningByTech,
  buildWeeklyTechPlanning,
  WeeklyTechPlanning,
  PlanningByTech,
  RawCreneau,
  RawUser,
  RawIntervention,
  RawProject,
  RawClient,
} from "@/apogee-connect/utils/planning";
import { logApogee } from "@/lib/logger";

interface WeeklyPlanningHookResult {
  data: WeeklyTechPlanning[] | undefined;
  planningByTech: PlanningByTech | undefined;
  isLoading: boolean;
  error: unknown;
  weekDate: Date;
  goToPrevWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
}

export function useWeeklyTechPlanning(techFilterId?: number, showInactiveTechs = false): WeeklyPlanningHookResult {
  const { isAgencyReady } = useAgency();
  const [weekDate, setWeekDate] = useState<Date>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("rh-planning-week-date");
        if (stored) {
          const parsed = new Date(stored);
          if (!isNaN(parsed.getTime())) {
            return parsed;
          }
        }
      } catch {
        // ignore storage errors
      }
    }
    return new Date();
  });

  // Fetch créneaux
  const {
    data: creneaux,
    isLoading: loadingCreneaux,
    error: errorCreneaux,
  } = useQuery<RawCreneau[] | null>({
    queryKey: ["planning-creneaux"],
    queryFn: async () => {
      logApogee.debug("Fetching créneaux planning via proxy...");
      const result = await apogeeProxy.getInterventionsCreneaux();
      logApogee.debug(`Créneaux récupérés: ${(result as RawCreneau[] | null)?.length || 0}`);
      return result as RawCreneau[] | null;
    },
    enabled: isAgencyReady,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch users
  const {
    data: users,
    isLoading: loadingUsers,
    error: errorUsers,
  } = useQuery<RawUser[]>({
    queryKey: ["planning-users"],
    queryFn: async () => {
      logApogee.debug("Fetching users for planning via proxy...");
      const result = await apogeeProxy.getUsers();
      return (result || []) as RawUser[];
    },
    enabled: isAgencyReady,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch interventions
  const {
    data: interventions,
    isLoading: loadingInterventions,
    error: errorInterventions,
  } = useQuery<RawIntervention[]>({
    queryKey: ["planning-interventions"],
    queryFn: async () => {
      logApogee.debug("Fetching interventions for planning via proxy...");
      const result = await apogeeProxy.getInterventions();
      return (result || []) as RawIntervention[];
    },
    enabled: isAgencyReady,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch projects
  const {
    data: projects,
    isLoading: loadingProjects,
    error: errorProjects,
  } = useQuery<RawProject[]>({
    queryKey: ["planning-projects"],
    queryFn: async () => {
      logApogee.debug("Fetching projects for planning via proxy...");
      const result = await apogeeProxy.getProjects();
      return (result || []) as RawProject[];
    },
    enabled: isAgencyReady,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch clients
  const {
    data: clients,
    isLoading: loadingClients,
    error: errorClients,
  } = useQuery<RawClient[]>({
    queryKey: ["planning-clients"],
    queryFn: async () => {
      logApogee.debug("Fetching clients for planning via proxy...");
      const result = await apogeeProxy.getClients();
      return (result || []) as RawClient[];
    },
    enabled: isAgencyReady,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading =
    loadingCreneaux ||
    loadingUsers ||
    loadingInterventions ||
    loadingProjects ||
    loadingClients;

  const error =
    errorCreneaux || errorUsers || errorInterventions || errorProjects || errorClients;

  // Build planning data
  // Build planning data
  const { planningByTech, weeklyData } = useMemo(() => {
    if (isLoading || error || !users) {
      return { planningByTech: undefined, weeklyData: undefined };
    }

    const planning = buildPlanningByTech({
      creneaux: creneaux ?? [],
      users,
      interventions: interventions ?? [],
      projects: projects ?? [],
      clients: clients ?? [],
      showInactiveTechs,
    });

    let weekly = buildWeeklyTechPlanning(planning, weekDate);

    // Filter by tech if specified
    if (techFilterId != null) {
      weekly = weekly.filter((w) => w.techId === techFilterId);
    }

    return { planningByTech: planning, weeklyData: weekly };
  }, [creneaux, users, interventions, projects, clients, weekDate, techFilterId, showInactiveTechs, isLoading, error]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("rh-planning-week-date", weekDate.toISOString());
      } catch {
        // ignore storage errors
      }
    }
  }, [weekDate]);

  const goToPrevWeek = () => setWeekDate((prev) => subWeeks(prev, 1));
  const goToNextWeek = () => setWeekDate((prev) => addWeeks(prev, 1));
  const goToCurrentWeek = () => setWeekDate(new Date());

  return {
    data: weeklyData,
    planningByTech,
    isLoading,
    error,
    weekDate,
    goToPrevWeek,
    goToNextWeek,
    goToCurrentWeek,
  };
}
