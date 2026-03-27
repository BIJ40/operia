import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Cache duration: 5 minutes
const CACHE_TIME = 5 * 60 * 1000;
const STALE_TIME = 2 * 60 * 1000;

interface ProjectData {
  project: any;
  client: any;
  devis: any[];
  users: any[];
  factures: any[];
  interventions: any[];
  creneaux: any[];
}

export function useSecureProjectData(
  refDossier: string | undefined, 
  agencySlug?: string,
  codePostal?: string,
  hash?: string
) {
  return useQuery<ProjectData | null>({
    queryKey: ['secure-project-data', refDossier, agencySlug, codePostal, hash],
    queryFn: async () => {
      if (!refDossier || !codePostal || !hash) return null;

      const { data, error } = await supabase.functions.invoke('suivi-api-proxy', {
        body: { 
          refDossier,
          agencySlug: agencySlug || undefined,
          codePostal,
          hash,
        }
      });

      if (error) {
        console.error('Error fetching project data:', error);
        throw new Error('Impossible de récupérer les données du projet');
      }

      if (data.accessDenied) {
        throw new Error('Accès refusé');
      }

      if (data.error && !data.project) {
        throw new Error(data.error);
      }

      return data as ProjectData;
    },
    enabled: !!refDossier && !!codePostal && !!hash,
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 1,
  });
}
