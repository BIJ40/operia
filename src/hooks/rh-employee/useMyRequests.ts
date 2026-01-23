/**
 * Hook pour gérer les demandes RH du salarié
 */
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCollaborator } from "./useMyCollaborator";
import { logError, logInfo } from "@/lib/logger";
import { toast } from "sonner";

export type RequestType = "EPI_RENEWAL" | "LEAVE" | "DOCUMENT" | "OTHER";
export type RequestStatus = "DRAFT" | "SUBMITTED" | "SEEN" | "PROCESSED" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface RHRequest {
  id: string;
  request_type: RequestType;
  employee_user_id: string;
  agency_id: string;
  status: RequestStatus;
  payload: Record<string, unknown>;
  generated_letter_path: string | null;
  generated_letter_file_name: string | null;
  employee_can_download: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision_comment: string | null;
  archived_at: string | null;
  archived_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateRequestPayload {
  request_type: RequestType;
  payload: Record<string, unknown>;
}

// Helper to check if request can be archived
export function canArchiveRequest(status: RequestStatus): boolean {
  return ['PROCESSED', 'APPROVED', 'REJECTED'].includes(status);
}

export function useMyRequests(filters?: { archived?: boolean }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Realtime subscription pour mise à jour instantanée
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("my-requests-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rh_requests",
          filter: `employee_user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-requests", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return useQuery({
    queryKey: ["my-requests", user?.id, filters?.archived],
    queryFn: async (): Promise<RHRequest[]> => {
      if (!user?.id) return [];

      let query = supabase
        .from("rh_requests")
        .select("*")
        .eq("employee_user_id", user.id)
        .order("created_at", { ascending: false });

      // Filter by archived status
      if (filters?.archived === true) {
        query = query.not("archived_at", "is", null);
      } else if (filters?.archived === false) {
        query = query.is("archived_at", null);
      }

      const { data, error } = await query;

      if (error) {
        logError("Erreur récupération demandes:", error);
        throw error;
      }

      return (data || []) as RHRequest[];
    },
    enabled: !!user?.id,
  });
}

const requestTypeLabel: Record<RequestType, string> = {
  EPI_RENEWAL: "Renouvellement EPI",
  LEAVE: "Congé",
  DOCUMENT: "Document",
  OTHER: "Autre",
};

// Labels véhicule pour les notifications
function getRequestLabel(type: RequestType, payload?: Record<string, unknown>): string {
  if (type === "OTHER" && payload?.is_vehicle_request) {
    return payload?.is_anomaly 
      ? `Signalement véhicule (${payload?.category || 'anomalie'})`
      : `Demande véhicule (${payload?.category || 'autre'})`;
  }
  return requestTypeLabel[type] ?? type;
}

export function useCreateRequest() {
  const { user } = useAuth();
  const { data: collaborator } = useMyCollaborator();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRequestPayload) => {
      if (!user?.id) throw new Error("Utilisateur non connecté");
      if (!collaborator?.agency_id) throw new Error("Agence non trouvée");

      logInfo(`Création demande ${payload.request_type}`);

      const { data, error } = await supabase
        .from("rh_requests")
        .insert([{
          request_type: payload.request_type,
          employee_user_id: user.id,
          agency_id: collaborator.agency_id,
          status: "SUBMITTED",
          payload: payload.payload as unknown as Record<string, never>,
        }])
        .select()
        .single();

      if (error) {
        logError("Erreur création demande:", error);
        throw error;
      }

      // Notifications supprimées - plus de popups

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      queryClient.invalidateQueries({ queryKey: ["rh-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["rh-notifications-count"] });
      toast.success("Demande envoyée avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      // Update status to CANCELLED instead of deleting
      const { error } = await supabase
        .from("rh_requests")
        .update({ status: "CANCELLED" })
        .eq("id", requestId);

      if (error) {
        logError("Erreur annulation demande:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      toast.success("Demande annulée");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

/**
 * Hook pour télécharger la lettre de demande (N1)
 * Appelle get-rh-letter-download-url et ouvre l'URL
 */
export function useDownloadMyLetter() {
  return useMutation({
    mutationFn: async (requestId: string) => {
      logInfo(`Téléchargement lettre pour demande ${requestId}`);

      const { data, error } = await supabase.functions.invoke("get-rh-letter-download-url", {
        body: { request_id: requestId },
      });

      if (error) {
        logError("Erreur téléchargement lettre:", error);
        throw new Error(error.message || "Erreur téléchargement");
      }

      if (data?.url) {
        window.open(data.url, "_blank");
        return data.url;
      } else {
        throw new Error("URL de téléchargement non disponible");
      }
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

/**
 * Hook pour archiver une de ses demandes terminées (N1)
 */
export function useArchiveMyRequest() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      if (!user?.id) throw new Error("Non authentifié");

      const { error } = await supabase
        .from("rh_requests")
        .update({
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq("id", requestId)
        .eq("employee_user_id", user.id);

      if (error) {
        logError("Erreur archivage demande:", error);
        throw error;
      }

      logInfo(`Demande ${requestId} archivée`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      toast.success("Demande archivée");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
