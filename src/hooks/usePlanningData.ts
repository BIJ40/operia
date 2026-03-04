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

      const [projects, clients] = await Promise.all([
        apogeeProxy.getProjects({ agencySlug }),
        apogeeProxy.getClients({ agencySlug }),
      ]);

      // Index clients by id
      const clientsById = new Map<number, any>();
      (clients || []).forEach((c: any) => {
        clientsById.set(c.id, c);
      });

      // Enrich projects with client name
      const enriched: PlanningProject[] = (projects || []).map((p: any) => {
        const client = clientsById.get(p.clientId);
        return {
          id: p.id,
          ref: p.ref || `#${p.id}`,
          label: p.label || '',
          state: p.state || '',
          date: p.date || p.createdAt || '',
          clientId: p.clientId,
          clientName: client?.nom || client?.raisonSociale || client?.name || '',
          ville: p.ville || client?.ville || '',
          data: p.data,
        };
      });

      // DEBUG: log tous les states uniques pour identifier les bons
      const uniqueStates = [...new Set(enriched.map(p => p.state))].sort();
      console.log('[PlanningData] States uniques des projets:', uniqueStates);
      console.log('[PlanningData] Total projets:', enriched.length);
      
      // DEBUG TEMPORAIRE: stocker les states dans window pour diagnostic
      (window as any).__PLANNING_STATES__ = uniqueStates;

      const planifiable = enriched.filter(p => {
        const st = (p.state || '').toLowerCase();
        // Matching large : "planif" dans le state = à planifier
        return st.includes('planif') || st.includes('a planifier') || st.includes('à planifier')
          || st.includes('a_planifier') || st.includes('devis_accept') || st.includes('devis_valid')
          || st.includes('rt_fait') || st.includes('devis_a_faire')
          || st.includes('stand_by') || st.includes('standby');
      });

      console.log('[PlanningData] Projets à planifier trouvés:', planifiable.length, 'states:', uniqueStates.join(', '));

      return { planifiable, all: enriched, _debugStates: uniqueStates };
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
      return (users || []).filter((u: any) => {
        const type = (u.type || '').toLowerCase();
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
