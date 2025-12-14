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
import { getRoleLevel } from "@/types/globalRoles";

export type RequestType = "EPI_RENEWAL" | "LEAVE" | "DOCUMENT" | "OTHER";
export type RequestStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";

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

const requestTypeLabel: Record<RequestType, string> = {
  EPI_RENEWAL: "Renouvellement EPI",
  LEAVE: "Congé",
  DOCUMENT: "Document",
  OTHER: "Autre",
};

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

      // Notification N1→N2 : récupérer les N2+ de l'agence via RPC sécurisée
      // On utilise une approche qui contourne les RLS en passant par le recipient connu
      const { data: agencyN2Users, error: mgrError } = await supabase
        .rpc("get_agency_rh_managers", { p_agency_id: collaborator.agency_id });

      // Fallback: si la RPC n'existe pas, on tente avec agency_id direct (N2+ peuvent voir)
      let recipients: string[] = [];
      
      if (mgrError) {
        logError("RPC get_agency_rh_managers indisponible, fallback:", mgrError);
        // Fallback: essayer directement - marche si la RLS permet
        const { data: fallbackUsers } = await supabase
          .from("profiles")
          .select("id, global_role, agency_id")
          .eq("agency_id", collaborator.agency_id);
        
        recipients = (fallbackUsers ?? [])
          .filter(u => !!u.id && u.id !== user.id)
          .filter(u => getRoleLevel(u.global_role) >= 2)
          .map(u => u.id);
      } else {
        recipients = (agencyN2Users ?? [])
          .filter((u: { id: string }) => u.id !== user.id)
          .map((u: { id: string }) => u.id);
      }

      logInfo("Destinataires N2+ pour notif RH", {
        agencyId: collaborator.agency_id,
        count: recipients.length,
        recipients,
      });

      const label = requestTypeLabel[payload.request_type] ?? payload.request_type;

      logInfo(`Notif N1→N2: ${recipients.length} destinataires pour demande ${data.id}`, recipients);

      if (recipients.length > 0) {
        const notifications = recipients.map((recipient_id) => ({
          collaborator_id: collaborator.id ?? null,
          recipient_id,
          sender_id: user.id,
          agency_id: collaborator.agency_id,
          notification_type: "REQUEST_CREATED",
          title: `Nouvelle demande : ${label}`,
          message: `${collaborator.first_name} ${collaborator.last_name} a soumis une demande de ${label}`,
          related_request_id: data.id,
        }));

        const { data: notifData, error: notifErr } = await supabase
          .from("rh_notifications")
          .insert(notifications)
          .select("id");

        if (notifErr) {
          logError("Erreur notification N1→N2:", notifErr);
        } else {
          logInfo(`OK notifications créées: ${notifData?.length ?? 0}`);
        }
      }

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
