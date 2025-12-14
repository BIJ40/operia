/**
 * Hook pour récupérer le collaborateur associé à l'utilisateur connecté
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logError, logWarn } from "@/lib/logger";

export interface MyCollaborator {
  id: string;
  agency_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  type: string | null;
  role: string;
  hiring_date: string | null;
  leaving_date: string | null;
  apogee_user_id: number | null;
}

// Flag pour éviter le spam de logs
let warnedNoCollaborator = false;

export function useMyCollaborator() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-collaborator", user?.id],
    queryFn: async (): Promise<MyCollaborator | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("collaborators")
        .select(`
          id, agency_id, first_name, last_name, email, phone,
          type, role, hiring_date, leaving_date, apogee_user_id
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        logError("Erreur récupération collaborateur:", error);
        throw error;
      }

      // Log unique si pas de collaborateur trouvé
      if (!data && !warnedNoCollaborator) {
        warnedNoCollaborator = true;
        logWarn("useMyCollaborator: Aucun collaborateur lié à l'utilisateur", { userId: user.id });
      }

      return data as MyCollaborator | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
