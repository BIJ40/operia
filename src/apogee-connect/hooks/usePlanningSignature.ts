import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfWeek, endOfWeek, format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { logApogee } from "@/lib/logger";

interface PlanningSignature {
  id: string;
  tech_id: number;
  week_start: string;
  week_end: string;
  signed_at: string | null;
  signed_by_user_id: string | null;
  comment: string | null;
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
    isSigned: !!data?.signed_at,
    signPlanning: (comment?: string) => signMutation.mutate(comment),
    unsignPlanning: () => unsignMutation.mutate(),
    isSigning: signMutation.isPending,
    isUnsigning: unsignMutation.isPending,
  };
}
