/**
 * Hooks pour la gestion des demandes RH côté back-office (N2)
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logError, logInfo } from "@/lib/logger";
import { toast } from "sonner";

export type RequestType = "EPI_RENEWAL" | "LEAVE" | "DOCUMENT" | "OTHER";
export type RequestStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface RHRequestWithEmployee {
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
  // Joined data
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
  reviewer?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

export function useAgencyRequests(filters?: {
  status?: RequestStatus[];
  request_type?: RequestType[];
}) {
  const { agencyId } = useAuth();

  return useQuery({
    queryKey: ["agency-requests", agencyId, filters],
    queryFn: async (): Promise<RHRequestWithEmployee[]> => {
      if (!agencyId) return [];

      let query = supabase
        .from("rh_requests")
        .select("*")
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (filters?.status?.length) {
        query = query.in("status", filters.status);
      }
      if (filters?.request_type?.length) {
        query = query.in("request_type", filters.request_type);
      }

      const { data, error } = await query;

      if (error) {
        logError("Erreur récupération demandes agence:", error);
        throw error;
      }

      return (data || []) as RHRequestWithEmployee[];
    },
    enabled: !!agencyId,
  });
}

export function useApproveRequest() {
  const { user, agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: string; comment?: string }) => {
      if (!user?.id) throw new Error("Non authentifié");

      // Get request details first to find the employee
      const { data: request, error: fetchError } = await supabase
        .from("rh_requests")
        .select("employee_user_id, request_type, agency_id")
        .eq("id", requestId)
        .single();

      if (fetchError) {
        logError("Erreur récupération demande:", fetchError);
        throw fetchError;
      }

      // Update the request status
      const { error } = await supabase
        .from("rh_requests")
        .update({
          status: "APPROVED",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          decision_comment: comment || null,
        })
        .eq("id", requestId);

      if (error) {
        logError("Erreur approbation demande:", error);
        throw error;
      }

      // Get collaborator_id for the employee
      const { data: collaborator } = await supabase
        .from("collaborators")
        .select("id")
        .eq("user_id", request.employee_user_id)
        .maybeSingle();

      // Create notification for the employee
      if (collaborator?.id) {
        const notificationTitle = request.request_type === "LEAVE" 
          ? "Demande de congé approuvée" 
          : "Demande approuvée";
        const notificationMessage = request.request_type === "LEAVE"
          ? "Votre demande de congé a été acceptée"
          : "Votre demande a été acceptée";

        await supabase.from("rh_notifications").insert({
          collaborator_id: collaborator.id,
          recipient_id: request.employee_user_id,
          sender_id: user.id,
          agency_id: request.agency_id || agencyId,
          notification_type: "REQUEST_COMPLETED",
          title: notificationTitle,
          message: notificationMessage,
          related_request_id: requestId,
        });
      }

      logInfo(`Demande ${requestId} approuvée`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      queryClient.invalidateQueries({ queryKey: ["rh-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["rh-notifications-count"] });
      toast.success("Demande approuvée");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useRejectRequest() {
  const { user, agencyId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, comment }: { requestId: string; comment: string }) => {
      if (!user?.id) throw new Error("Non authentifié");
      if (!comment.trim()) throw new Error("Un motif de refus est requis");

      // Get request details first to find the employee
      const { data: request, error: fetchError } = await supabase
        .from("rh_requests")
        .select("employee_user_id, request_type, agency_id")
        .eq("id", requestId)
        .single();

      if (fetchError) {
        logError("Erreur récupération demande:", fetchError);
        throw fetchError;
      }

      // Update the request status
      const { error } = await supabase
        .from("rh_requests")
        .update({
          status: "REJECTED",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          decision_comment: comment,
        })
        .eq("id", requestId);

      if (error) {
        logError("Erreur refus demande:", error);
        throw error;
      }

      // Get collaborator_id for the employee
      const { data: collaborator } = await supabase
        .from("collaborators")
        .select("id")
        .eq("user_id", request.employee_user_id)
        .maybeSingle();

      // Create notification for the employee
      if (collaborator?.id) {
        const notificationTitle = request.request_type === "LEAVE" 
          ? "Demande de congé refusée" 
          : "Demande refusée";
        const notificationMessage = request.request_type === "LEAVE"
          ? `Votre demande de congé a été refusée. Motif : ${comment}`
          : `Votre demande a été refusée. Motif : ${comment}`;

        await supabase.from("rh_notifications").insert({
          collaborator_id: collaborator.id,
          recipient_id: request.employee_user_id,
          sender_id: user.id,
          agency_id: request.agency_id || agencyId,
          notification_type: "REQUEST_REJECTED",
          title: notificationTitle,
          message: notificationMessage,
          related_request_id: requestId,
        });
      }

      logInfo(`Demande ${requestId} refusée`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      queryClient.invalidateQueries({ queryKey: ["rh-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["rh-notifications-count"] });
      toast.success("Demande refusée");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useGenerateLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-rh-letter", {
        body: { request_id: requestId },
      });

      if (error) {
        logError("Erreur génération lettre:", error);
        throw new Error(error.message || "Erreur lors de la génération");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Échec de la génération");
      }

      logInfo(`Lettre générée pour demande ${requestId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      toast.success("Lettre générée avec succès");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function usePublishLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from("rh_requests")
        .update({ employee_can_download: true })
        .eq("id", requestId);

      if (error) {
        logError("Erreur publication lettre:", error);
        throw error;
      }

      logInfo(`Lettre publiée pour demande ${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      toast.success("Lettre mise à disposition du salarié");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useGetLetterDownloadUrl() {
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("get-rh-letter-download-url", {
        body: { request_id: requestId },
      });

      if (error) {
        logError("Erreur téléchargement lettre:", error);
        throw new Error(error.message || "Erreur lors du téléchargement");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Échec du téléchargement");
      }

      return data as { url: string; file_name: string; expires_in: number };
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useAddLetterToVault() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      requestId, 
      collaboratorId 
    }: { 
      requestId: string; 
      collaboratorId: string;
    }) => {
      // Get request details
      const { data: request, error: reqError } = await supabase
        .from("rh_requests")
        .select("generated_letter_path, generated_letter_file_name, agency_id")
        .eq("id", requestId)
        .single();

      if (reqError || !request?.generated_letter_path) {
        throw new Error("Lettre non trouvée");
      }

      // Create document in coffre
      const { error } = await supabase.from("collaborator_documents").insert({
        collaborator_id: collaboratorId,
        agency_id: request.agency_id,
        doc_type: "ATTESTATION",
        title: "Lettre renouvellement EPI",
        file_name: request.generated_letter_file_name || "lettre-epi.pdf",
        file_path: request.generated_letter_path,
        employee_visible: true,
        visibility: "employee",
      });

      if (error) {
        logError("Erreur ajout au coffre:", error);
        throw error;
      }

      logInfo(`Lettre ajoutée au coffre pour demande ${requestId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-requests"] });
      queryClient.invalidateQueries({ queryKey: ["collaborator-documents"] });
      toast.success("Lettre ajoutée au coffre du salarié");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
