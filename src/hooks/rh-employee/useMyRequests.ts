/**
 * Hook pour gérer les demandes RH du salarié
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMyCollaborator } from "./useMyCollaborator";
import { logError, logInfo } from "@/lib/logger";
import { toast } from "sonner";

export type RequestType = "EPI_RENEWAL" | "LEAVE" | "DOCUMENT" | "OTHER";
export type RequestStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

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
  created_at: string;
  updated_at: string;
}

export interface CreateRequestPayload {
  request_type: RequestType;
  payload: Record<string, unknown>;
}

export function useMyRequests() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-requests", user?.id],
    queryFn: async (): Promise<RHRequest[]> => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("rh_requests")
        .select("*")
        .eq("employee_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        logError("Erreur récupération demandes:", error);
        throw error;
      }

      return (data || []) as RHRequest[];
    },
    enabled: !!user?.id,
  });
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

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
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
      const { error } = await supabase
        .from("rh_requests")
        .delete()
        .eq("id", requestId);

      if (error) {
        logError("Erreur annulation demande:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
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
