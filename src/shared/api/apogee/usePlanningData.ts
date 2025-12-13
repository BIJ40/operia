/**
 * Hook unifié pour les données planning
 * Gère les fallbacks et la normalisation
 * Enrichit les créneaux avec les infos client (nom + ville)
 */

import { useQuery } from "@tanstack/react-query";
import { apogeeProxy } from "@/services/apogeeProxy";
import { useAgency } from "@/apogee-connect/contexts/AgencyContext";
import { normalizeCreneaux, unwrapArray, type NormalizedCreneau } from "@/shared/planning/normalize";

export interface EnrichedCreneau extends NormalizedCreneau {
  clientName?: string;
  clientCity?: string;
  projectRef?: string;
  interventionType?: string;
}

interface RawIntervention {
  id: number;
  projectId?: number;
  type?: string;
  type2?: string;
  data?: {
    visites?: Array<{
      pEventId?: number;
      date?: string;
      usersIds?: number[];
      type?: string;
      type2?: string;
    }>;
  };
}

interface RawProject {
  id: number;
  ref?: string;
  clientId?: number;
}

interface RawClient {
  id: number;
  nom?: string;
  prenom?: string;
  ville?: string;
  city?: string;
}

export function usePlanningData() {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.slug;

  const { data, isLoading, error } = useQuery<EnrichedCreneau[]>({
    queryKey: ["apogee-planning-data-enriched", agencySlug],
    enabled: isAgencyReady && !!agencySlug,
    queryFn: async () => {
      if (!agencySlug) return [];
      
      // Charger les créneaux et les données de jointure en parallèle
      const [creneauxRaw, interventionsRaw, projectsRaw, clientsRaw] = await Promise.all([
        apogeeProxy.getInterventionsCreneaux({ agencySlug }),
        apogeeProxy.getInterventions({ agencySlug }),
        apogeeProxy.getProjects({ agencySlug }),
        apogeeProxy.getClients({ agencySlug }),
      ]);
      
      const creneaux = normalizeCreneaux(creneauxRaw);
      const interventions = unwrapArray(interventionsRaw) as RawIntervention[];
      const projects = unwrapArray(projectsRaw) as RawProject[];
      const clients = unwrapArray(clientsRaw) as RawClient[];
      
      // Créer les maps pour jointures rapides
      const projectMap = new Map<number, RawProject>();
      projects.forEach(p => projectMap.set(p.id, p));
      
      const clientMap = new Map<number, RawClient>();
      clients.forEach(c => clientMap.set(c.id, c));
      
      // Map pEventId → intervention (la jointure se fait via visites[].pEventId)
      const pEventToIntervention = new Map<number, RawIntervention>();
      for (const interv of interventions) {
        const visites = interv.data?.visites ?? [];
        for (const v of visites) {
          if (v.pEventId) {
            pEventToIntervention.set(v.pEventId, interv);
          }
        }
      }
      
      // Map pEventId → visite pour récupérer le type
      const pEventToVisite = new Map<number, { type?: string; type2?: string }>();
      for (const interv of interventions) {
        const visites = interv.data?.visites ?? [];
        for (const v of visites) {
          if (v.pEventId) {
            pEventToVisite.set(v.pEventId, { type: v.type, type2: v.type2 });
          }
        }
      }
      
      // Enrichir les créneaux
      return creneaux.map(creneau => {
        // creneau.id = pEventId dans les visites
        const intervention = pEventToIntervention.get(creneau.id);
        const visite = pEventToVisite.get(creneau.id);
        const project = intervention?.projectId ? projectMap.get(intervention.projectId) : undefined;
        const client = project?.clientId ? clientMap.get(project.clientId) : undefined;
        
        let clientName: string | undefined;
        if (client) {
          const prenom = (client.prenom || "").trim();
          const nom = (client.nom || "").trim();
          clientName = `${prenom} ${nom}`.trim() || undefined;
        }
        
        const clientCity = client?.ville || client?.city || undefined;
        
        // Type d'intervention: visite.type2 > visite.type > intervention.type2 > intervention.type
        const interventionType = visite?.type2 || visite?.type || intervention?.type2 || intervention?.type;
        
        return {
          ...creneau,
          clientName,
          clientCity,
          projectRef: project?.ref,
          interventionType,
        };
      });
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    creneaux: data ?? [],
    loading: isLoading,
    error,
  };
}

export function useApogeeUsersNormalized() {
  const { currentAgency, isAgencyReady } = useAgency();
  const agencySlug = currentAgency?.slug;

  const { data, isLoading, error } = useQuery({
    queryKey: ["apogee-users-normalized", agencySlug],
    enabled: isAgencyReady && !!agencySlug,
    queryFn: async () => {
      if (!agencySlug) return [];
      const result = await apogeeProxy.getUsers({ agencySlug });
      return unwrapArray(result);
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    users: data ?? [],
    loading: isLoading,
    error,
  };
}
