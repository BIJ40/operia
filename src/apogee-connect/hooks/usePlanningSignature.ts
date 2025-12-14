import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { logApogee } from "@/lib/logger";
import { toast } from "sonner";
import { createPlanningNotification } from "@/hooks/planning/usePlanningNotifications";

interface PlanningSignature {
  id: string;
  tech_id: number;
  week_start: string;
  week_end: string;
  signed_at: string | null;
  signed_by_user_id: string | null;
  comment: string | null;
  // Nouvelles colonnes workflow
  sent_at: string | null;
  sent_by_user_id: string | null;
  tech_signed_at: string | null;
  tech_signature_png: string | null;
}

interface UsePlanningSignatureArgs {
  techId: number;
  weekDate: Date;
}

export function usePlanningSignature({ techId, weekDate }: UsePlanningSignatureArgs) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const { data, isLoading, error } = useQuery<PlanningSignature | null>({
    queryKey: ["planning-signature", techId, weekStartStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("planning_signatures")
        .select("*")
        .eq("tech_id", techId)
        .eq("week_start", weekStartStr)
        .maybeSingle();

      if (error) {
        logApogee.error("Erreur récupération signature planning:", error);
        throw error;
      }

      return data as PlanningSignature | null;
    },
    enabled: !!techId && !!user,
  });

  // N2 envoie le planning au technicien
  const sendToTechMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Utilisateur non connecté");

      const payload = {
        tech_id: techId,
        week_start: weekStartStr,
        week_end: weekEndStr,
        sent_at: new Date().toISOString(),
        sent_by_user_id: user.id,
      };

      logApogee.info(`Envoi planning tech ${techId} semaine ${weekStartStr}`);

      const { error } = await supabase
        .from("planning_signatures")
        .upsert(payload, {
          onConflict: "tech_id,week_start",
        });

      if (error) {
        logApogee.error("Erreur envoi planning:", error);
        throw error;
      }

      // Créer notification pour le technicien (N1)
      // Trouver le user_id du technicien via son apogee_user_id
      const { data: collaborator } = await supabase
        .from("collaborators")
        .select("user_id, agency_id")
        .eq("apogee_user_id", techId)
        .maybeSingle();

      if (collaborator?.user_id && collaborator?.agency_id) {
        await createPlanningNotification({
          agencyId: collaborator.agency_id,
          techId,
          recipientUserId: collaborator.user_id,
          senderUserId: user.id,
          notificationType: "PLANNING_SENT",
          weekStart: weekStartStr,
        });
      }
    },
    onSuccess: () => {
      toast.success("Planning envoyé au technicien");
      queryClient.invalidateQueries({
        queryKey: ["planning-signature", techId, weekStartStr],
      });
    },
    onError: () => {
      toast.error("Erreur lors de l'envoi");
    },
  });

  // N1 signe son planning avec sa signature personnelle
  const techSignMutation = useMutation({
    mutationFn: async (signaturePng: string) => {
      if (!user?.id) throw new Error("Utilisateur non connecté");
      if (!data?.id) throw new Error("Aucun planning à signer");

      logApogee.info(`Signature tech planning ${techId} semaine ${weekStartStr}`);

      const { error } = await supabase
        .from("planning_signatures")
        .update({
          tech_signed_at: new Date().toISOString(),
          tech_signature_png: signaturePng,
        })
        .eq("id", data.id);

      if (error) {
        logApogee.error("Erreur signature tech:", error);
        throw error;
      }

      // Créer notification pour le N2 (celui qui a envoyé le planning)
      if (data?.sent_by_user_id) {
        // Récupérer les infos du tech pour le message
        const { data: collaborator } = await supabase
          .from("collaborators")
          .select("first_name, last_name, agency_id")
          .eq("apogee_user_id", techId)
          .maybeSingle();

        if (collaborator?.agency_id) {
          const techName = [collaborator.first_name, collaborator.last_name]
            .filter(Boolean)
            .join(" ") || "Le technicien";

          await createPlanningNotification({
            agencyId: collaborator.agency_id,
            techId,
            recipientUserId: data.sent_by_user_id,
            senderUserId: user.id,
            notificationType: "PLANNING_SIGNED",
            weekStart: weekStartStr,
            techName,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Planning signé avec succès");
      queryClient.invalidateQueries({
        queryKey: ["planning-signature", techId, weekStartStr],
      });
    },
    onError: () => {
      toast.error("Erreur lors de la signature");
    },
  });

  // Annuler l'envoi (N2)
  const cancelSendMutation = useMutation({
    mutationFn: async () => {
      if (!data?.id) throw new Error("Aucun planning à annuler");

      logApogee.info(`Annulation envoi planning tech ${techId} semaine ${weekStartStr}`);

      const { error } = await supabase
        .from("planning_signatures")
        .update({ 
          sent_at: null, 
          sent_by_user_id: null,
          tech_signed_at: null,
          tech_signature_png: null,
        })
        .eq("id", data.id);

      if (error) {
        logApogee.error("Erreur annulation:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast.success("Envoi annulé");
      queryClient.invalidateQueries({
        queryKey: ["planning-signature", techId, weekStartStr],
      });
    },
  });

  // Legacy: validation simple (conservé pour compatibilité)
  const signMutation = useMutation({
    mutationFn: async (comment?: string) => {
      if (!user?.id) throw new Error("Utilisateur non connecté");

      const payload = {
        tech_id: techId,
        week_start: weekStartStr,
        week_end: weekEndStr,
        signed_at: new Date().toISOString(),
        signed_by_user_id: user.id,
        comment: comment || null,
      };

      logApogee.info(`Signature planning tech ${techId} semaine ${weekStartStr}`);

      const { error } = await supabase
        .from("planning_signatures")
        .upsert(payload, {
          onConflict: "tech_id,week_start",
        });

      if (error) {
        logApogee.error("Erreur signature planning:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["planning-signature", techId, weekStartStr],
      });
    },
  });

  const unsignMutation = useMutation({
    mutationFn: async () => {
      if (!data?.id) throw new Error("Aucune signature à annuler");

      logApogee.info(`Annulation signature planning tech ${techId} semaine ${weekStartStr}`);

      const { error } = await supabase
        .from("planning_signatures")
        .update({ signed_at: null, signed_by_user_id: null })
        .eq("id", data.id);

      if (error) {
        logApogee.error("Erreur annulation signature:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["planning-signature", techId, weekStartStr],
      });
    },
  });

  return {
    signature: data,
    isLoading,
    error,
    // États du workflow
    isSent: !!data?.sent_at,
    isSignedByTech: !!data?.tech_signed_at,
    // Legacy
    isSigned: !!data?.signed_at,
    // Actions N2
    sendToTech: () => sendToTechMutation.mutate(),
    cancelSend: () => cancelSendMutation.mutate(),
    // Actions N1
    techSign: (signaturePng: string) => techSignMutation.mutate(signaturePng),
    // Legacy
    signPlanning: (comment?: string) => signMutation.mutate(comment),
    unsignPlanning: () => unsignMutation.mutate(),
    // Loading states
    isSending: sendToTechMutation.isPending,
    isTechSigning: techSignMutation.isPending,
    isCancelling: cancelSendMutation.isPending,
    isSigning: signMutation.isPending,
    isUnsigning: unsignMutation.isPending,
  };
}
