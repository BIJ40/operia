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
  showInactiveTechs?: boolean;
}

/**
 * Détermine si un utilisateur est actif (même logique que buildTechMap dans techTools.ts)
 */
function isUserActive(user: RawUser): boolean {
  return (user as any)?.is_on === true || (user as any)?.isActive === true;
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
  showInactiveTechs = false,
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
      // Skip invalid dates
      if (isNaN(startDate.getTime())) {
        return;
      }
      
      const durationMinutes = visite.duree || 60; // default 1h si pas de durée
      const endDate = addMinutes(startDate, durationMinutes);
      
      // Créer un ID unique pour le slot
      const slotId = visite.pEventId ?? (intervention.id * 1000 + visiteIndex);

      visite.usersIds.forEach((techId) => {
        const user = userMap.get(techId);
        if (!user) return;
        
        // Filtrer les techniciens inactifs si demandé
        if (!showInactiveTechs && !isUserActive(user)) return;

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
        
        // Filtrer les techniciens inactifs si demandé
        if (!showInactiveTechs && !isUserActive(user)) return;

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
// CALCULATE WORKING TIME (with overlap handling)
// ========================================

interface TimeInterval {
  start: number;
  end: number;
}

/**
 * Fusionne les intervalles qui se chevauchent ou se touchent
 */
function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (intervals.length === 0) return [];
  
  // Trier par heure de début
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  
  const merged: TimeInterval[] = [sorted[0]];
  
  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];
    
    // Si chevauchement ou adjacent, fusionner
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      // Sinon, nouvel intervalle
      merged.push(current);
    }
  }
  
  return merged;
}

/**
 * Calcule le temps de travail effectif pour une journée
 * en gérant les chevauchements de RDV.
 * 
 * Logique: 
 * 1. Fusionner les RDV qui se chevauchent
 * 2. Sommer les durées des intervalles fusionnés
 * 3. Déduire les pauses
 */
function calculateDailyWorkingMinutes(slots: TechPlanningSlot[]): number {
  if (slots.length === 0) return 0;

  // Séparer pauses et RDV de travail
  const workSlots = slots.filter(s => !s.isBreak);
  const breakSlots = slots.filter(s => s.isBreak);

  if (workSlots.length === 0) return 0;

  // Convertir les slots en intervalles
  const workIntervals: TimeInterval[] = workSlots.map(slot => ({
    start: new Date(slot.start).getTime(),
    end: new Date(slot.end).getTime(),
  }));

  // Fusionner les intervalles qui se chevauchent
  const mergedWork = mergeIntervals(workIntervals);

  // Calculer le temps de travail total (somme des intervalles fusionnés)
  let workMinutes = 0;
  mergedWork.forEach(interval => {
    workMinutes += (interval.end - interval.start) / (1000 * 60);
  });

  // Déduire les pauses qui sont dans les plages de travail
  let breakMinutes = 0;
  breakSlots.forEach(breakSlot => {
    const breakStart = new Date(breakSlot.start).getTime();
    const breakEnd = new Date(breakSlot.end).getTime();
    
    // Vérifier si la pause chevauche un intervalle de travail
    mergedWork.forEach(workInterval => {
      if (breakStart < workInterval.end && breakEnd > workInterval.start) {
        // Pause partiellement ou totalement dans la plage de travail
        const effectiveStart = Math.max(breakStart, workInterval.start);
        const effectiveEnd = Math.min(breakEnd, workInterval.end);
        breakMinutes += (effectiveEnd - effectiveStart) / (1000 * 60);
      }
    });
  });

  return Math.max(0, workMinutes - breakMinutes);
}

// ========================================
// BUILD WEEKLY TECH PLANNING
// ========================================

/**
 * Découpe un slot multi-jours en slots quotidiens
 * Ex: Un congé de 274h débutant le lundi 08:00 sera découpé en 
 * plusieurs jours de 07:00-19:00 (ou la portion effective)
 */
function splitSlotIntoDays(slot: TechPlanningSlot, days: Date[]): TechPlanningSlot[] {
  const slotStart = new Date(slot.start);
  const slotEnd = new Date(slot.end);
  
  // Si le slot ne couvre qu'un seul jour, pas besoin de découper
  if (isSameDay(slotStart, slotEnd)) {
    return [slot];
  }

  const result: TechPlanningSlot[] = [];
  
  days.forEach((day) => {
    // Définir les limites de la journée (07:00 - 19:00)
    const dayStart = new Date(day);
    dayStart.setHours(7, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(19, 0, 0, 0);
    
    // Vérifier si le slot chevauche cette journée
    if (slotEnd <= dayStart || slotStart >= dayEnd) {
      return; // Pas de chevauchement
    }
    
    // Calculer l'intersection
    const effectiveStart = slotStart > dayStart ? slotStart : dayStart;
    const effectiveEnd = slotEnd < dayEnd ? slotEnd : dayEnd;
    
    const durationMinutes = Math.round((effectiveEnd.getTime() - effectiveStart.getTime()) / 60000);
    
    if (durationMinutes > 0) {
      result.push({
        ...slot,
        slotId: slot.slotId + day.getTime(), // ID unique par jour
        start: effectiveStart.toISOString(),
        end: effectiveEnd.toISOString(),
        durationMinutes,
      });
    }
  });
  
  return result;
}

export function buildWeeklyTechPlanning(
  planningByTech: PlanningByTech,
  weekDate: Date
): WeeklyTechPlanning[] {
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const result: WeeklyTechPlanning[] = [];

  Object.values(planningByTech).forEach((techPlanning) => {
    // D'abord, éclater les slots multi-jours en slots quotidiens
    const expandedSlots: TechPlanningSlot[] = [];
    techPlanning.slots.forEach((slot) => {
      const splitSlots = splitSlotIntoDays(slot, days);
      expandedSlots.push(...splitSlots);
    });
    
    const daily: DailyTechPlanning[] = [];
    let weeklyTotal = 0;

    days.forEach((day) => {
      const slotsOfDay = expandedSlots.filter((slot) =>
        isSameDay(new Date(slot.start), day)
      );

      // Nouveau calcul: début le plus tôt → fin la plus tardive - pauses
      const totalMinutes = calculateDailyWorkingMinutes(slotsOfDay);

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
