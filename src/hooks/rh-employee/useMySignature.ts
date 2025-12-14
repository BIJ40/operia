/**
 * Hook pour gérer la signature personnelle du salarié
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { logError, logInfo } from "@/lib/logger";
import { toast } from "sonner";

export interface UserSignature {
  id: string;
  user_id: string;
  signature_svg: string;
  created_at: string;
  updated_at: string;
}

export function useMySignature() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-signature", user?.id],
    queryFn: async (): Promise<UserSignature | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_signatures")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        logError("Erreur récupération signature:", error);
        throw error;
      }

      return data as UserSignature | null;
    },
    enabled: !!user?.id,
  });
}

export function useSaveSignature() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (signatureSvg: string) => {
      if (!user?.id) throw new Error("Utilisateur non connecté");

      logInfo("Sauvegarde signature utilisateur");

      const { data, error } = await supabase
        .from("user_signatures")
        .upsert(
          {
            user_id: user.id,
            signature_svg: signatureSvg,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (error) {
        logError("Erreur sauvegarde signature:", error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-signature"] });
      toast.success("Signature enregistrée");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}

export function useDeleteSignature() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Utilisateur non connecté");

      const { error } = await supabase
        .from("user_signatures")
        .delete()
        .eq("user_id", user.id);

      if (error) {
        logError("Erreur suppression signature:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-signature"] });
      toast.success("Signature supprimée");
    },
    onError: (error) => {
      toast.error(`Erreur: ${error.message}`);
    },
  });
}
