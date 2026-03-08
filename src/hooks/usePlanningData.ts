/**
 * Hook pour charger les données de planification depuis Apogée
 * - Projets à planifier (filtré par state)
 * - Techniciens
 * - Créneaux d'interventions (planning semaine)
 */
import { useQuery } from '@tanstack/react-query';
import { apogeeProxy } from '@/services/apogeeProxy';

// ============================================================================
// TYPES
// ============================================================================

export interface PlanningProject {
  id: number;
  ref: string;
  label: string;
  state: string;
  date: string;
  clientId: number;
  clientName?: string;
  ville?: string;
  data?: {
    commanditaireId?: number;
    universes?: string[];
    nbHeures?: number;
    nbTechs?: number;
    pictosInterv?: string[];
  };
}

export interface PlanningTechnician {
  id: number;
  nom: string;
  prenom: string;
  firstname?: string;
  lastname?: string;
  name?: string;
  initiales?: string;
  type?: string;
  universes?: string[];
  bgcolor?: string;
  color?: string;
}

export interface PlanningSlot {
  id?: number;
  userId?: number;
  projectId?: number;
  date?: string;
  dateDebut?: string;
  dateFin?: string;
  type?: string;
  state?: string;
  ref?: string;
  label?: string;
  // Créneaux data can vary
  [key: string]: unknown;
}

// States that indicate "à planifier"
const PLANIFIABLE_STATES = [
  'a_planifier',
  'a_planifier_travaux',
  'devis_accepte',
  'devis_valide',
  'planifie_rt',
  'rt_fait',
  'devis_a_faire',
];

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Fetch all projects and filter those that need scheduling
 */
export function usePlanningProjects(agencySlug: string | undefined) {
  return useQuery({
    queryKey: ['planning-projects', agencySlug],
    queryFn: async () => {
      if (!agencySlug) return { planifiable: [] as PlanningProject[], all: [] as PlanningProject[] };

      const [projects, clients, interventions] = await Promise.all([
        apogeeProxy.getProjects({ agencySlug }),
        apogeeProxy.getClients({ agencySlug }),
        apogeeProxy.getInterventions({ agencySlug }),
      ]);

      // Index clients by id
      const clientsById = new Map<number, Record<string, unknown>>();
      (clients || []).forEach((c: Record<string, unknown>) => {
        clientsById.set(c.id as number, c);
      });

      // Build a set of projectIds that already have a planned/validated TVX intervention
      // These are no longer truly "à planifier travaux"
      const projectsWithPlannedTvx = new Set<number>();
      (interventions || []).forEach((interv: Record<string, unknown>) => {
        const type = (String(interv.type || '') + String(interv.type2 || '')).toLowerCase();
        const state = String(interv.state || '').toLowerCase();
        const isTvx = type.includes('travaux') || type.includes('tvx') || type.includes('work');
        const isPlanned = state.includes('planned') || state.includes('planifi') || 
                          state.includes('validated') || state.includes('done') || 
                          state.includes('in_progress') || state.includes('finished');
        if (isTvx && isPlanned && interv.projectId) {
          projectsWithPlannedTvx.add(interv.projectId as number);
        }
      });

      // Enrich projects with client name
      const enriched: PlanningProject[] = (projects || []).map((p: Record<string, unknown>) => {
        const client = clientsById.get(p.clientId as number);
        const pData = (p.data ?? {}) as Record<string, unknown>;
        return {
          id: p.id as number,
          ref: String(p.ref || `#${p.id}`),
          label: String(p.label || ''),
          state: String(p.state || ''),
          date: String(p.date || p.createdAt || ''),
          clientId: p.clientId as number,
          clientName: String(client?.nom || client?.raisonSociale || client?.name || ''),
          ville: String(p.ville || client?.ville || ''),
          data: pData as PlanningProject['data'],
        };
      });

      if (import.meta.env.DEV) {
        const uniqueStates = [...new Set(enriched.map(p => p.state))].sort();
        console.log('[PlanningData] States uniques:', uniqueStates, 'Total:', enriched.length);
      }

      const planifiable = enriched.filter(p => {
        const st = (p.state || '').toLowerCase();
        if (st === 'new') return true;
        if (st === 'to_planify_tvx') {
          // Exclure les dossiers to_planify_tvx qui ont déjà une intervention TVX planifiée
          // (le state Apogée n'a pas été mis à jour mais l'intervention existe déjà)
          return !projectsWithPlannedTvx.has(p.id);
        }
        return false;
      });

      if (import.meta.env.DEV) {
        console.log('[PlanningData] Projets à planifier:', planifiable.length);
      }

      return { planifiable, all: enriched };
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000, // 5 min
  });
}

/**
 * Fetch technicians for the agency
 */
export function usePlanningTechnicians(agencySlug: string | undefined) {
  return useQuery({
    queryKey: ['planning-technicians', agencySlug],
    queryFn: async () => {
      if (!agencySlug) return [];
      const users = await apogeeProxy.getUsers({ agencySlug });
      // Filter to only technicians
      return (users || []).filter((u: Record<string, unknown>) => {
        const type = String(u.type || '').toLowerCase();
        return type.includes('tech') || type.includes('ouvrier') || type.includes('intervenant');
      }) as PlanningTechnician[];
    },
    enabled: !!agencySlug,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch planning slots (créneaux) for the week
 */
export function usePlanningSlots(agencySlug: string | undefined) {
  return useQuery({
    queryKey: ['planning-slots', agencySlug],
    queryFn: async () => {
      if (!agencySlug) return [];
      const creneaux = await apogeeProxy.getInterventionsCreneaux({ agencySlug });
      return (creneaux || []) as PlanningSlot[];
    },
    enabled: !!agencySlug,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search projects by ref or label
 */
export function searchProjects(projects: PlanningProject[], query: string): PlanningProject[] {
  if (!query || query.length < 2) return projects;
  const q = query.toLowerCase();
  return projects.filter(p =>
    p.ref?.toLowerCase().includes(q) ||
    p.label?.toLowerCase().includes(q) ||
    p.clientName?.toLowerCase().includes(q) ||
    p.ville?.toLowerCase().includes(q) ||
    String(p.id).includes(q)
  );
}
