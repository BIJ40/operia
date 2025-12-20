import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EpiIncident {
  id: string;
  agency_id: string;
  reporter_user_id: string;
  assignment_id: string | null;
  catalog_item_id: string | null;
  incident_type: "worn" | "broken" | "non_compliant" | "lost" | "stolen";
  severity: "minor" | "major" | "blocking";
  description: string;
  status: "open" | "in_review" | "resolved" | "rejected";
  handled_by_user_id: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  catalog_item?: {
    id: string;
    name: string;
    category: string;
  };
  reporter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  assignment?: {
    id: string;
    size: string | null;
  };
  attachments?: EpiIncidentAttachment[];
}

export interface EpiIncidentAttachment {
  id: string;
  incident_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

export const EPI_INCIDENT_TYPES = [
  { value: "worn", label: "Usé", icon: "⚠️" },
  { value: "broken", label: "Cassé", icon: "💔" },
  { value: "non_compliant", label: "Non conforme", icon: "❌" },
  { value: "lost", label: "Perdu", icon: "❓" },
  { value: "stolen", label: "Volé", icon: "🚨" },
] as const;

export const EPI_INCIDENT_SEVERITIES = [
  { value: "minor", label: "Mineur", color: "bg-yellow-100 text-yellow-800" },
  { value: "major", label: "Majeur", color: "bg-orange-100 text-orange-800" },
  { value: "blocking", label: "Bloquant", color: "bg-red-100 text-red-800" },
] as const;

export const EPI_INCIDENT_STATUSES = [
  { value: "open", label: "Ouvert", color: "bg-red-100 text-red-800" },
  { value: "in_review", label: "En cours", color: "bg-yellow-100 text-yellow-800" },
  { value: "resolved", label: "Résolu", color: "bg-green-100 text-green-800" },
  { value: "rejected", label: "Rejeté", color: "bg-slate-100 text-slate-800" },
] as const;

export function useEpiIncidents(options?: {
  agencyId?: string;
  status?: string;
  reporterId?: string;
}) {
  const { agencyId, status, reporterId } = options || {};

  return useQuery({
    queryKey: ["epi-incidents", agencyId, status, reporterId],
    queryFn: async () => {
      let query = supabase
        .from("epi_incidents")
        .select(`
          *,
          catalog_item:epi_catalog_items(id, name, category),
          reporter:collaborators!reporter_user_id(id, first_name, last_name)
        `)
        .order("created_at", { ascending: false });

      if (agencyId) {
        query = query.eq("agency_id", agencyId);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (reporterId) {
        query = query.eq("reporter_user_id", reporterId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EpiIncident[];
    },
    enabled: !!(agencyId || reporterId),
  });
}

export function useMyEpiIncidents(collaboratorId?: string) {
  return useQuery({
    queryKey: ["my-epi-incidents", collaboratorId],
    queryFn: async () => {
      if (!collaboratorId) return [];
      
      const { data, error } = await supabase
        .from("epi_incidents")
        .select(`
          *,
          catalog_item:epi_catalog_items(id, name, category)
        `)
        .eq("reporter_user_id", collaboratorId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EpiIncident[];
    },
    enabled: !!collaboratorId,
  });
}

interface CreateIncidentParams {
  agency_id: string;
  reporter_user_id: string;
  assignment_id?: string | null;
  catalog_item_id?: string | null;
  incident_type: string;
  severity?: string;
  description: string;
}

export function useCreateEpiIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateIncidentParams) => {
      const { data, error } = await supabase
        .from("epi_incidents")
        .insert({
          ...params,
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["my-epi-incidents"] });
      toast.success("Signalement envoyé");
    },
    onError: (error) => {
      toast.error("Erreur lors du signalement: " + error.message);
    },
  });
}

export function useUpdateEpiIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EpiIncident> & { id: string }) => {
      const { data, error } = await supabase
        .from("epi_incidents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-incidents"] });
      queryClient.invalidateQueries({ queryKey: ["my-epi-incidents"] });
      toast.success("Signalement mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useResolveEpiIncident() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      incidentId, 
      handlerId, 
      resolutionNotes 
    }: { 
      incidentId: string; 
      handlerId: string;
      resolutionNotes?: string;
    }) => {
      const { data, error } = await supabase
        .from("epi_incidents")
        .update({
          status: "resolved",
          handled_by_user_id: handlerId,
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", incidentId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-incidents"] });
      toast.success("Incident résolu");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
