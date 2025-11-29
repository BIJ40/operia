/**
 * Utilitaires pour le planning hebdomadaire des techniciens
 */
import { addMinutes, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, format } from "date-fns";
import { fr } from "date-fns/locale";

// ========================================
// RAW TYPES (from Apogée API)
// ========================================

export interface RawCreneau {
  id: number;
  date: string;
  duree: number;
  usersIds: number[];
}

export interface RawUser {
  id: number;
  firstname: string;
  name?: string;
  lastname?: string;
  color?: string | null;
  role?: string | null;
  data?: {
    bgcolor?: { hex?: string };
    color?: { hex?: string };
  };
  isTechnicien?: boolean;
  type?: string;
}

export interface RawVisite {
  date: string;
  duree: number;
  usersIds: number[];
  pEventId?: number;
  state?: string;
}

export interface RawInterventionData {
  type2?: string | null;
  visites?: RawVisite[];
}

export interface RawIntervention {
  id: number;
  projectId?: number | null;
  usersIds?: number[];
  data?: RawInterventionData;
}

export interface RawProject {
  id: number;
  ref: string;
  clientId: number;
  label?: string;
}

export interface RawClient {
  id: number;
  firstname?: string;
  lastname?: string;
  company?: string;
}

// ========================================
// PLANNING TYPES
// ========================================

export interface TechPlanningSlot {
  slotId: number;
  start: string;
  end: string;
  durationMinutes: number;
  isBreak?: boolean;
  projectId?: number | null;
  projectRef?: string | null;
  clientName?: string | null;
  type?: string | null;
  state?: string | null;
  interventionId?: number;
}

export interface TechPlanning {
  techId: number;
  techName: string;
  color?: string | null;
  slots: TechPlanningSlot[];
}

export type PlanningByTech = Record<number, TechPlanning>;

export interface DailyTechPlanning {
  date: string;
  label: string;
  slots: TechPlanningSlot[];
  totalMinutes: number;
}

export interface WeeklyTechPlanning {
  techId: number;
  techName: string;
  color?: string | null;
  days: DailyTechPlanning[];
  weeklyTotalMinutes: number;
}

// ========================================
// HELPER FUNCTIONS
// ========================================

export function formatMinutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

function getUserColor(user: RawUser): string | null {
  return user.data?.bgcolor?.hex || user.data?.color?.hex || user.color || null;
}

function getUserName(user: RawUser): string {
  const firstname = user.firstname || "";
  const lastname = user.lastname || user.name || "";
  return `${firstname} ${lastname}`.trim() || `Tech #${user.id}`;
}

// ========================================
// BUILD PLANNING BY TECH
// ========================================

interface BuildPlanningParams {
  creneaux: RawCreneau[] | null;
  users: RawUser[];
  interventions?: RawIntervention[];
  projects?: RawProject[];
  clients?: RawClient[];
}

/**
 * Construit le planning par technicien
 * 
 * STRATÉGIE: Les RDV viennent de deux sources possibles:
 * 1. L'endpoint getInterventionsCreneaux (si disponible)
 * 2. Les visites extraites de chaque intervention (fallback principal)
 * 
 * La méthode principale est d'extraire les visites des interventions
 * car c'est plus fiable et contient toutes les infos nécessaires.
 */
export function buildPlanningByTech({
  creneaux,
  users,
  interventions = [],
  projects = [],
  clients = [],
}: BuildPlanningParams): PlanningByTech {
  if (!users || users.length === 0) {
    return {};
  }

  // 1) Index users
  const userMap = new Map<number, RawUser>();
  users.forEach((u) => {
    userMap.set(u.id, u);
  });

  // 2) Index projects
  const projectMap = new Map<number, RawProject>();
  projects.forEach((p) => {
    projectMap.set(p.id, p);
  });

  // 3) Index clients
  const clientMap = new Map<number, RawClient>();
  clients.forEach((c) => {
    clientMap.set(c.id, c);
  });

  const planningByTech: PlanningByTech = {};

  // MÉTHODE PRINCIPALE: Extraire les visites directement des interventions
  // C'est plus fiable que getInterventionsCreneaux qui peut être vide
  interventions.forEach((intervention) => {
    const visites = intervention.data?.visites || [];
    const type = intervention.data?.type2 ?? null;
    const isBreak = type != null && type.toLowerCase().includes("pause");
    
    // Récupérer les infos du projet et client
    const project = intervention.projectId ? projectMap.get(intervention.projectId) : undefined;
    const client = project?.clientId ? clientMap.get(project.clientId) : undefined;
    
    let clientName: string | null = null;
    if (client) {
      if (client.company) {
        clientName = client.company;
      } else {
        const fn = client.firstname || "";
        const ln = client.lastname || "";
        clientName = `${fn} ${ln}`.trim() || null;
      }
    }

    visites.forEach((visite, visiteIndex) => {
      if (!visite.date || !visite.usersIds || visite.usersIds.length === 0) {
        return;
      }

      const startDate = new Date(visite.date);
      const durationMinutes = visite.duree || 60; // default 1h si pas de durée
      const endDate = addMinutes(startDate, durationMinutes);
      
      // Créer un ID unique pour le slot
      const slotId = visite.pEventId ?? (intervention.id * 1000 + visiteIndex);

      visite.usersIds.forEach((techId) => {
        const user = userMap.get(techId);
        if (!user) return;

        if (!planningByTech[techId]) {
          planningByTech[techId] = {
            techId,
            techName: getUserName(user),
            color: getUserColor(user),
            slots: [],
          };
        }

        const slot: TechPlanningSlot = {
          slotId,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          durationMinutes,
          interventionId: intervention.id,
          projectId: intervention.projectId ?? null,
          projectRef: project?.ref ?? null,
          clientName,
          type,
          state: visite.state ?? null,
          isBreak,
        };

        planningByTech[techId].slots.push(slot);
      });
    });
  });

  // MÉTHODE SECONDAIRE: Utiliser les créneaux si disponibles et pas de visites trouvées
  // (backup au cas où les interventions ne contiennent pas toutes les visites)
  if (creneaux && creneaux.length > 0) {
    // Index des visites par pEventId pour enrichissement
    const visitesByEventId = new Map<number, { intervention: RawIntervention; visite: RawVisite }[]>();
    interventions.forEach((intervention) => {
      const visites = intervention.data?.visites || [];
      visites.forEach((visite) => {
        if (visite.pEventId == null) return;
        const current = visitesByEventId.get(visite.pEventId) || [];
        current.push({ intervention, visite });
        visitesByEventId.set(visite.pEventId, current);
      });
    });

    creneaux.forEach((creneau) => {
      // Vérifier si ce créneau n'a pas déjà été ajouté via les visites
      const alreadyAdded = Object.values(planningByTech).some(tp =>
        tp.slots.some(s => s.slotId === creneau.id)
      );
      if (alreadyAdded) return;

      const startDate = new Date(creneau.date);
      const endDate = addMinutes(startDate, creneau.duree);
      const visitesLinked = visitesByEventId.get(creneau.id) || [];

      creneau.usersIds.forEach((techId) => {
        const user = userMap.get(techId);
        if (!user) return;

        if (!planningByTech[techId]) {
          planningByTech[techId] = {
            techId,
            techName: getUserName(user),
            color: getUserColor(user),
            slots: [],
          };
        }

        const baseSlot: TechPlanningSlot = {
          slotId: creneau.id,
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          durationMinutes: creneau.duree,
        };

        if (visitesLinked.length === 0) {
          planningByTech[techId].slots.push(baseSlot);
          return;
        }

        visitesLinked.forEach(({ intervention, visite }) => {
          if (visite.usersIds && !visite.usersIds.includes(techId)) {
            return;
          }

          const project = intervention.projectId ? projectMap.get(intervention.projectId) : undefined;
          const client = project?.clientId ? clientMap.get(project.clientId) : undefined;

          let clientName: string | null = null;
          if (client) {
            if (client.company) {
              clientName = client.company;
            } else {
              const fn = client.firstname || "";
              const ln = client.lastname || "";
              clientName = `${fn} ${ln}`.trim() || null;
            }
          }

          const type = intervention.data?.type2 ?? null;
          const isBreak = type != null && type.toLowerCase().includes("pause");

          const enrichedSlot: TechPlanningSlot = {
            ...baseSlot,
            interventionId: intervention.id,
            projectId: intervention.projectId ?? null,
            projectRef: project?.ref ?? null,
            clientName,
            type,
            state: visite.state ?? null,
            isBreak,
          };

          planningByTech[techId].slots.push(enrichedSlot);
        });
      });
    });
  }

  // Sort slots by start time and deduplicate
  Object.values(planningByTech).forEach((techPlanning) => {
    // Dédupliquer par slotId + start
    const seen = new Set<string>();
    techPlanning.slots = techPlanning.slots.filter((slot) => {
      const key = `${slot.slotId}-${slot.start}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    techPlanning.slots.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
  });

  return planningByTech;
}

// ========================================
// BUILD WEEKLY TECH PLANNING
// ========================================

export function buildWeeklyTechPlanning(
  planningByTech: PlanningByTech,
  weekDate: Date
): WeeklyTechPlanning[] {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const result: WeeklyTechPlanning[] = [];

  Object.values(planningByTech).forEach((techPlanning) => {
    const daily: DailyTechPlanning[] = [];
    let weeklyTotal = 0;

    days.forEach((day) => {
      const slotsOfDay = techPlanning.slots.filter((slot) =>
        isSameDay(new Date(slot.start), day)
      );

      const totalMinutes = slotsOfDay.reduce(
        (acc, s) => acc + (s.durationMinutes || 0),
        0
      );

      weeklyTotal += totalMinutes;

      daily.push({
        date: format(day, "yyyy-MM-dd"),
        label: format(day, "EEEE dd/MM", { locale: fr }),
        slots: slotsOfDay,
        totalMinutes,
      });
    });

    result.push({
      techId: techPlanning.techId,
      techName: techPlanning.techName,
      color: techPlanning.color,
      days: daily,
      weeklyTotalMinutes: weeklyTotal,
    });
  });

  // Sort by tech name
  result.sort((a, b) => a.techName.localeCompare(b.techName));

  return result;
}
