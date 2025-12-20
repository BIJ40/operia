import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EpiRequest {
  id: string;
  agency_id: string;
  requester_user_id: string;
  catalog_item_id: string;
  size: string | null;
  reason: "missing" | "renewal" | "new_hire" | "size_change";
  priority: "low" | "normal" | "high" | "blocking";
  notes: string | null;
  status: "pending" | "approved" | "rejected" | "needs_info" | "fulfilled" | "cancelled";
  reviewed_by_user_id: string | null;
  reviewed_at: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  catalog_item?: {
    id: string;
    name: string;
    category: string;
  };
  requester?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  reviewer?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export const EPI_REQUEST_REASONS = [
  { value: "missing", label: "Manquant" },
  { value: "renewal", label: "Renouvellement" },
  { value: "new_hire", label: "Embauche" },
  { value: "size_change", label: "Changement de taille" },
] as const;

export const EPI_REQUEST_PRIORITIES = [
  { value: "low", label: "Basse", color: "bg-slate-100 text-slate-700" },
  { value: "normal", label: "Normale", color: "bg-blue-100 text-blue-700" },
  { value: "high", label: "Haute", color: "bg-orange-100 text-orange-700" },
  { value: "blocking", label: "Bloquante", color: "bg-red-100 text-red-700" },
] as const;

export const EPI_REQUEST_STATUSES = [
  { value: "pending", label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  { value: "approved", label: "Approuvée", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Refusée", color: "bg-red-100 text-red-800" },
  { value: "needs_info", label: "Infos requises", color: "bg-purple-100 text-purple-800" },
  { value: "fulfilled", label: "Traitée", color: "bg-blue-100 text-blue-800" },
  { value: "cancelled", label: "Annulée", color: "bg-slate-100 text-slate-800" },
] as const;

export function useEpiRequests(options?: {
  agencyId?: string;
  status?: string;
  requesterId?: string;
}) {
  const { agencyId, status, requesterId } = options || {};

  return useQuery({
    queryKey: ["epi-requests", agencyId, status, requesterId],
    queryFn: async () => {
      let query = supabase
        .from("epi_requests")
        .select(`
          *,
          catalog_item:epi_catalog_items(id, name, category),
          requester:collaborators!requester_user_id(id, first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (agencyId) {
        query = query.eq("agency_id", agencyId);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (requesterId) {
        query = query.eq("requester_user_id", requesterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EpiRequest[];
    },
    enabled: !!(agencyId || requesterId),
  });
}

export function useMyEpiRequests(collaboratorId?: string) {
  return useQuery({
    queryKey: ["my-epi-requests", collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];
      
      const { data, error } = await supabase
        .from("epi_requests")
        .select(`
          *,
          catalog_item:epi_catalog_items(id, name, category)
        `)
        .eq("requester_user_id", collaboratorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EpiRequest[];
    },
    enabled: !!collaboratorId,
  });
}

interface CreateRequestParams {
  agency_id: string;
  requester_user_id: string;
  catalog_item_id: string;
  size?: string | null;
  reason: string;
  priority?: string;
  notes?: string | null;
}

export function useCreateEpiRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateRequestParams) => {
      const { data, error } = await supabase
        .from("epi_requests")
        .insert({
          ...params,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-epi-requests"] });
      toast.success("Demande d'EPI envoyée");
    },
    onError: (error) => {
      toast.error("Erreur lors de la demande: " + error.message);
    },
  });
}

export function useUpdateEpiRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EpiRequest> & { id: string }) => {
      const { data, error } = await supabase
        .from("epi_requests")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-requests"] });
      queryClient.invalidateQueries({ queryKey: ["my-epi-requests"] });
      toast.success("Demande mise à jour");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useApproveEpiRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, reviewerId }: { requestId: string; reviewerId: string }) => {
      const { data, error } = await supabase
        .from("epi_requests")
        .update({
          status: "approved",
          reviewed_by_user_id: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-requests"] });
      toast.success("Demande approuvée");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useRejectEpiRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, reviewerId }: { requestId: string; reviewerId: string }) => {
      const { data, error } = await supabase
        .from("epi_requests")
        .update({
          status: "rejected",
          reviewed_by_user_id: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-requests"] });
      toast.success("Demande refusée");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
