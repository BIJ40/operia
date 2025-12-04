import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { errorToast, successToast } from "@/lib/toastHelpers";
import { logError } from "@/lib/logger";
import type { MergeTicketsPayload } from "../types";

// Lightweight ticket type for duplicate suggestions
interface DuplicateTicketInfo {
  id: string;
  ticket_number: number;
  element_concerne: string;
  kanban_status: string;
  module: string | null;
  created_at: string;
  description?: string | null;
  impact_tags?: string[] | null;
}

interface DuplicateSuggestionWithTickets {
  id: string;
  ticket_id_source: string;
  ticket_id_candidate: string;
  similarity: number;
  status: string;
  created_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  source_ticket?: DuplicateTicketInfo;
  candidate_ticket?: DuplicateTicketInfo;
}

export function useTicketDuplicates(ticketId?: string) {
  const queryClient = useQueryClient();
  const [isScanning, setIsScanning] = useState(false);

  // Fetch suggestions for a specific ticket
  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ["ticket-duplicates", ticketId],
    queryFn: async (): Promise<DuplicateSuggestionWithTickets[]> => {
      if (!ticketId) return [];

      const { data, error } = await supabase
        .from("ticket_duplicate_suggestions")
        .select(`
          *,
          source_ticket:apogee_tickets!ticket_duplicate_suggestions_ticket_id_source_fkey(
            id, ticket_number, element_concerne, kanban_status, module, created_at, description, impact_tags
          ),
          candidate_ticket:apogee_tickets!ticket_duplicate_suggestions_ticket_id_candidate_fkey(
            id, ticket_number, element_concerne, kanban_status, module, created_at, description, impact_tags
          )
        `)
        .or(`ticket_id_source.eq.${ticketId},ticket_id_candidate.eq.${ticketId}`)
        .order("similarity", { ascending: false });

      if (error) {
        logError('[TICKET-DUPLICATES] Error fetching suggestions', error);
        return [];
      }

      return (data || []) as unknown as DuplicateSuggestionWithTickets[];
    },
    enabled: !!ticketId,
  });

  // Scan for duplicates
  const scanForDuplicates = async (targetTicketId: string) => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-ticket-duplicates", {
        body: { ticket_id: targetTicketId, threshold: 0.82, topK: 10 },
      });

      if (error) throw error;

      await refetch();
      return data;
    } catch (error: unknown) {
      logError('[TICKET-DUPLICATES] Scan error', error);
      const message = error instanceof Error ? error.message : "Erreur lors du scan des doublons";
      errorToast(message);
      throw error;
    } finally {
      setIsScanning(false);
    }
  };

  // Reject suggestion
  const rejectMutation = useMutation({
    mutationFn: async (suggestionId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("ticket_duplicate_suggestions")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", suggestionId);

      if (error) throw error;
    },
    onSuccess: () => {
      successToast("Suggestion ignorée");
      queryClient.invalidateQueries({ queryKey: ["ticket-duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["pending-duplicates"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur lors du rejet";
      errorToast(message);
    },
  });

  // Merge tickets
  const mergeMutation = useMutation({
    mutationFn: async (payload: MergeTicketsPayload) => {
      const { data, error } = await supabase.functions.invoke("merge-tickets", {
        body: payload,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      successToast(data?.message || "Tickets fusionnés avec succès");
      queryClient.invalidateQueries({ queryKey: ["ticket-duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["pending-duplicates"] });
      queryClient.invalidateQueries({ queryKey: ["apogee-tickets"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Erreur lors de la fusion";
      errorToast(message);
    },
  });

  return {
    suggestions,
    isLoading,
    isScanning,
    scanForDuplicates,
    rejectSuggestion: rejectMutation.mutate,
    isRejecting: rejectMutation.isPending,
    mergeTickets: mergeMutation.mutate,
    isMerging: mergeMutation.isPending,
    refetch,
  };
}

// Hook for global pending suggestions view
export function usePendingDuplicates() {
  const queryClient = useQueryClient();

  const { data: suggestions = [], isLoading, refetch } = useQuery({
    queryKey: ["pending-duplicates"],
    queryFn: async (): Promise<DuplicateSuggestionWithTickets[]> => {
      const { data, error } = await supabase
        .from("ticket_duplicate_suggestions")
        .select(`
          *,
          source_ticket:apogee_tickets!ticket_duplicate_suggestions_ticket_id_source_fkey(
            id, ticket_number, element_concerne, kanban_status, module, created_at, description, impact_tags
          ),
          candidate_ticket:apogee_tickets!ticket_duplicate_suggestions_ticket_id_candidate_fkey(
            id, ticket_number, element_concerne, kanban_status, module, created_at, description, impact_tags
          )
        `)
        .eq("status", "pending")
        .order("similarity", { ascending: false });

      if (error) {
        logError('[TICKET-DUPLICATES] Error fetching pending suggestions', error);
        return [];
      }

      return (data || []) as unknown as DuplicateSuggestionWithTickets[];
    },
  });

  // Batch scan all recent tickets - parallelized by batches of 5
  const batchScan = async () => {
    const { data: recentTickets } = await supabase
      .from("apogee_tickets")
      .select("id")
      .is("merged_into_ticket_id", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (!recentTickets?.length) return { scanned: 0 };

    let scanned = 0;
    const BATCH_SIZE = 5;
    
    for (let i = 0; i < recentTickets.length; i += BATCH_SIZE) {
      const batch = recentTickets.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(ticket => 
          supabase.functions.invoke("scan-ticket-duplicates", {
            body: { ticket_id: ticket.id },
          })
        )
      );
      
      results.forEach((result, idx) => {
        if (result.status === 'fulfilled') {
          scanned++;
        } else {
          logError(`[TICKET-DUPLICATES] Batch scan error for ticket: ${batch[idx].id}`, result.reason);
        }
      });
    }

    await refetch();
    return { scanned };
  };

  return {
    suggestions,
    isLoading,
    refetch,
    batchScan,
  };
}

export type { DuplicateSuggestionWithTickets, DuplicateTicketInfo };
