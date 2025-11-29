/**
 * Hooks React Query pour la gestion des collaborateurs d'agence
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AgencyCollaborator, CreateCollaboratorPayload, UpdateCollaboratorPayload } from "./types";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const collaboratorsKey = (agencyId?: string | null) =>
  ["agencyCollaborators", agencyId] as const;

/**
 * Récupère les collaborateurs d'une agence
 */
export function useAgencyCollaborators(agencyId: string | null) {
  return useQuery({
    queryKey: collaboratorsKey(agencyId || "none"),
    enabled: !!agencyId,
    queryFn: async (): Promise<AgencyCollaborator[]> => {
      const { data, error } = await supabase
        .from("agency_collaborators")
        .select("*")
        .eq("agency_id", agencyId)
        .order("last_name", { ascending: true })
        .order("first_name", { ascending: true });

      if (error) throw error;
      return (data || []) as AgencyCollaborator[];
    },
  });
}

/**
 * Récupère tous les collaborateurs non inscrits (pour admin)
 * Version simplifiée sans jointure problématique
 */
export function useUnregisteredCollaborators(agencyIdFilter?: string | null) {
  return useQuery({
    queryKey: ["unregisteredCollaborators", agencyIdFilter ?? "all"],
    queryFn: async (): Promise<(AgencyCollaborator & { agency_label?: string })[]> => {
      // Requête simple sur agency_collaborators
      let query = supabase
        .from("agency_collaborators")
        .select("*")
        .eq("is_registered_user", false)
        .order("created_at", { ascending: false });

      if (agencyIdFilter) {
        query = query.eq("agency_id", agencyIdFilter);
      }

      const { data: collaborators, error } = await query;
      if (error) throw error;

      if (!collaborators || collaborators.length === 0) {
        return [];
      }

      // Récupérer les agences correspondantes pour afficher les labels
      const agencyIds = [...new Set(collaborators.map(c => c.agency_id))];
      const { data: agencies } = await supabase
        .from("apogee_agencies")
        .select("id, label")
        .in("id", agencyIds);

      // Créer un map agence_id -> label
      const agencyMap = new Map(agencies?.map(a => [a.id, a.label]) || []);

      return collaborators.map((collab: any) => ({
        ...collab,
        agency_label: agencyMap.get(collab.agency_id) || "Agence inconnue",
      })) as (AgencyCollaborator & { agency_label?: string })[];
    },
  });
}

/**
 * Crée un nouveau collaborateur
 */
export function useCreateAgencyCollaborator(agencyId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: CreateCollaboratorPayload) => {
      const { data, error } = await supabase
        .from("agency_collaborators")
        .insert({
          agency_id: agencyId,
          first_name: payload.first_name,
          last_name: payload.last_name,
          email: payload.email || null,
          phone: payload.phone || null,
          role: payload.role,
          notes: payload.notes || null,
          created_by: user?.id || null,
        })
        .select("*")
        .single();

      if (error) throw error;
      return data as AgencyCollaborator;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorsKey(agencyId) });
      queryClient.invalidateQueries({ queryKey: ["unregisteredCollaborators"] });
      toast.success("Collaborateur ajouté");
    },
    onError: (error) => {
      console.error("Erreur création collaborateur:", error);
      toast.error("Erreur lors de l'ajout du collaborateur");
    },
  });
}

/**
 * Met à jour un collaborateur
 */
export function useUpdateAgencyCollaborator(agencyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateCollaboratorPayload) => {
      const { id, ...updates } = payload;
      const { data, error } = await supabase
        .from("agency_collaborators")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();

      if (error) throw error;
      return data as AgencyCollaborator;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorsKey(agencyId) });
      queryClient.invalidateQueries({ queryKey: ["unregisteredCollaborators"] });
      toast.success("Collaborateur mis à jour");
    },
    onError: (error) => {
      console.error("Erreur mise à jour collaborateur:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

/**
 * Supprime un collaborateur
 */
export function useDeleteAgencyCollaborator(agencyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("agency_collaborators")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorsKey(agencyId) });
      queryClient.invalidateQueries({ queryKey: ["unregisteredCollaborators"] });
      toast.success("Collaborateur supprimé");
    },
    onError: (error) => {
      console.error("Erreur suppression collaborateur:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

/**
 * Marque un collaborateur comme inscrit (après création user)
 */
export function useMarkCollaboratorAsRegistered(agencyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ collaboratorId, userId }: { collaboratorId: string; userId: string }) => {
      const { data, error } = await supabase
        .from("agency_collaborators")
        .update({
          is_registered_user: true,
          user_id: userId,
        })
        .eq("id", collaboratorId)
        .select("*")
        .single();

      if (error) throw error;
      return data as AgencyCollaborator;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorsKey(agencyId) });
      queryClient.invalidateQueries({ queryKey: ["unregisteredCollaborators"] });
    },
  });
}
