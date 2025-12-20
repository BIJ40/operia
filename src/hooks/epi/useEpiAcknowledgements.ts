import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EpiMonthlyAck {
  id: string;
  agency_id: string;
  user_id: string;
  month: string;
  status: "pending" | "signed_by_n1" | "signed_by_n2" | "overdue";
  signed_by_n1_at: string | null;
  n1_signature_ip: string | null;
  n1_signature_ua: string | null;
  signed_by_n2_at: string | null;
  n2_signer_id: string | null;
  generated_at: string;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
  items?: EpiMonthlyAckItem[];
}

export interface EpiMonthlyAckItem {
  id: string;
  ack_id: string;
  assignment_id: string;
  catalog_item_id: string;
  size: string | null;
  is_confirmed_present: boolean;
  notes: string | null;
  created_at: string;
  catalog_item?: {
    id: string;
    name: string;
    category: string;
  };
}

export const EPI_ACK_STATUSES = [
  { value: "pending", label: "En attente", color: "bg-yellow-100 text-yellow-800" },
  { value: "signed_by_n1", label: "Signé N1", color: "bg-blue-100 text-blue-800" },
  { value: "signed_by_n2", label: "Validé", color: "bg-green-100 text-green-800" },
  { value: "overdue", label: "En retard", color: "bg-red-100 text-red-800" },
] as const;

export function useEpiAcknowledgements(options?: {
  agencyId?: string;
  month?: string;
  status?: string;
  userId?: string;
}) {
  const { agencyId, month, status, userId } = options || {};

  return useQuery({
    queryKey: ["epi-acknowledgements", agencyId, month, status, userId],
    queryFn: async () => {
      let query = supabase
        .from("epi_monthly_acknowledgements")
        .select(`
          *,
          collaborator:collaborators!user_id(id, first_name, last_name)
        `)
        .order("month", { ascending: false });

      if (agencyId) {
        query = query.eq("agency_id", agencyId);
      }
      if (month) {
        query = query.eq("month", month);
      }
      if (status) {
        query = query.eq("status", status);
      }
      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EpiMonthlyAck[];
    },
    enabled: !!(agencyId || userId),
  });
}

export function useMyCurrentAck(collaboratorId?: string) {
  const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

  return useQuery({
    queryKey: ["my-current-ack", collaboratorId, currentMonth],
    queryFn: async () => {
      if (!collaboratorId) return null;

      const { data, error } = await supabase
        .from("epi_monthly_acknowledgements")
        .select(`
          *,
          items:epi_monthly_ack_items(
            *,
            catalog_item:epi_catalog_items(id, name, category)
          )
        `)
        .eq("user_id", collaboratorId)
        .eq("month", currentMonth)
        .maybeSingle();

      if (error) throw error;
      return data as EpiMonthlyAck | null;
    },
    enabled: !!collaboratorId,
  });
}

export function useSignAckN1() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      ackId, 
      confirmedItems 
    }: { 
      ackId: string; 
      confirmedItems: { itemId: string; confirmed: boolean; notes?: string }[];
    }) => {
      // First update all items
      for (const item of confirmedItems) {
        const { error: itemError } = await supabase
          .from("epi_monthly_ack_items")
          .update({
            is_confirmed_present: item.confirmed,
            notes: item.notes,
          })
          .eq("id", item.itemId);
        
        if (itemError) throw itemError;
      }

      // Then update the acknowledgement
      const { data, error } = await supabase
        .from("epi_monthly_acknowledgements")
        .update({
          status: "signed_by_n1",
          signed_by_n1_at: new Date().toISOString(),
          n1_signature_ip: "N/A", // In production, get from request
          n1_signature_ua: navigator.userAgent,
        })
        .eq("id", ackId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-acknowledgements"] });
      queryClient.invalidateQueries({ queryKey: ["my-current-ack"] });
      toast.success("Attestation signée");
    },
    onError: (error) => {
      toast.error("Erreur lors de la signature: " + error.message);
    },
  });
}

export function useValidateAckN2() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ackId, signerId }: { ackId: string; signerId: string }) => {
      const { data, error } = await supabase
        .from("epi_monthly_acknowledgements")
        .update({
          status: "signed_by_n2",
          signed_by_n2_at: new Date().toISOString(),
          n2_signer_id: signerId,
        })
        .eq("id", ackId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-acknowledgements"] });
      toast.success("Attestation validée");
    },
    onError: (error) => {
      toast.error("Erreur lors de la validation: " + error.message);
    },
  });
}

export function useGenerateMonthlyAcks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ agencyId, month }: { agencyId: string; month: string }) => {
      // Get active collaborators for the agency
      const { data: collaborators, error: collabError } = await supabase
        .from("collaborators")
        .select("id")
        .eq("agency_id", agencyId)
        .is("leaving_date", null);

      if (collabError) throw collabError;

      const results = [];

      for (const collab of collaborators || []) {
        // Check if ack already exists
        const { data: existing } = await supabase
          .from("epi_monthly_acknowledgements")
          .select("id")
          .eq("user_id", collab.id)
          .eq("month", month)
          .maybeSingle();

        if (existing) continue;

        // Get active assignments
        const { data: assignments } = await supabase
          .from("epi_assignments")
          .select("id, catalog_item_id, size")
          .eq("user_id", collab.id)
          .eq("status", "active");

        if (!assignments || assignments.length === 0) continue;

        // Create acknowledgement
        const { data: ack, error: ackError } = await supabase
          .from("epi_monthly_acknowledgements")
          .insert({
            agency_id: agencyId,
            user_id: collab.id,
            month,
            status: "pending",
          })
          .select()
          .single();

        if (ackError) throw ackError;

        // Create ack items
        const items = assignments.map(a => ({
          ack_id: ack.id,
          assignment_id: a.id,
          catalog_item_id: a.catalog_item_id,
          size: a.size,
          is_confirmed_present: false,
        }));

        const { error: itemsError } = await supabase
          .from("epi_monthly_ack_items")
          .insert(items);

        if (itemsError) throw itemsError;

        results.push(ack);
      }

      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["epi-acknowledgements"] });
      toast.success(`${data.length} attestation(s) générée(s)`);
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
