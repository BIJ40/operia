import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EpiAssignment {
  id: string;
  agency_id: string;
  user_id: string;
  catalog_item_id: string;
  size: string | null;
  serial_number: string | null;
  assigned_at: string;
  assigned_by_user_id: string;
  status: "active" | "returned" | "replaced" | "lost";
  expected_renewal_at: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  catalog_item?: {
    id: string;
    name: string;
    category: string;
    default_renewal_days: number | null;
  };
  collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export const EPI_ASSIGNMENT_STATUSES = [
  { value: "active", label: "Actif", color: "bg-green-100 text-green-800" },
  { value: "returned", label: "Rendu", color: "bg-slate-100 text-slate-800" },
  { value: "replaced", label: "Remplacé", color: "bg-blue-100 text-blue-800" },
  { value: "lost", label: "Perdu", color: "bg-red-100 text-red-800" },
] as const;

export function useEpiAssignments(options?: { 
  agencyId?: string; 
  userId?: string; 
  status?: string;
  collaboratorId?: string;
}) {
  const { agencyId, userId, status = "active", collaboratorId } = options || {};

  return useQuery({
    queryKey: ["epi-assignments", agencyId, userId, status, collaboratorId],
    queryFn: async () => {
      let query = supabase
        .from("epi_assignments")
        .select(`
          *,
          catalog_item:epi_catalog_items(id, name, category, default_renewal_days),
          collaborator:collaborators(id, first_name, last_name)
        `)
        .order("assigned_at", { ascending: false });

      if (agencyId) {
        query = query.eq("agency_id", agencyId);
      }
      if (collaboratorId) {
        query = query.eq("user_id", collaboratorId);
      }
      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EpiAssignment[];
    },
    enabled: !!(agencyId || collaboratorId),
  });
}

export function useMyEpiAssignments(collaboratorId?: string) {
  return useQuery({
    queryKey: ["my-epi-assignments", collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];
      
      const { data, error } = await supabase
        .from("epi_assignments")
        .select(`
          *,
          catalog_item:epi_catalog_items(id, name, category, default_renewal_days, description)
        `)
        .eq("user_id", collaboratorId)
        .eq("status", "active")
        .order("assigned_at", { ascending: false });

      if (error) throw error;
      return data as EpiAssignment[];
    },
    enabled: !!collaboratorId,
  });
}

interface CreateAssignmentParams {
  agency_id: string;
  user_id: string;
  catalog_item_id: string;
  size?: string | null;
  serial_number?: string | null;
  assigned_by_user_id: string;
  notes?: string | null;
  expected_renewal_at?: string | null;
}

export function useCreateEpiAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateAssignmentParams) => {
      const { data, error } = await supabase
        .from("epi_assignments")
        .insert({
          ...params,
          status: "active",
          assigned_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-epi-assignments"] });
      toast.success("EPI attribué avec succès");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'attribution: " + error.message);
    },
  });
}

export function useUpdateEpiAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EpiAssignment> & { id: string }) => {
      const { data, error } = await supabase
        .from("epi_assignments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["my-epi-assignments"] });
      toast.success("Attribution mise à jour");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
