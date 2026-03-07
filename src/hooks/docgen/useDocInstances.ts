import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logError } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { TokenConfig } from "@/lib/docgen/tokenConfig";

export interface DocInstance {
  id: string;
  template_id: string;
  agency_id: string;
  collaborator_id: string | null;
  name: string;
  token_values: Record<string, string>;
  preview_path: string | null;
  final_path: string | null;
  status: "draft" | "preview" | "finalized";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  template?: {
    id: string;
    name: string;
    tokens: (string | TokenConfig)[];
  };
}

export function useDocInstances(collaboratorId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["doc-instances", collaboratorId],
    queryFn: async () => {
      let query = supabase
        .from("doc_instances")
        .select(`
          *,
          template:doc_templates(id, name, tokens)
        `)
        .order("created_at", { ascending: false });

      if (collaboratorId) {
        query = query.eq("collaborator_id", collaboratorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DocInstance[];
    },
    enabled: !!user,
  });
}

export function useDocInstance(instanceId: string | undefined) {
  return useQuery({
    queryKey: ["doc-instance", instanceId],
    queryFn: async () => {
      if (!instanceId) return null;

      const { data, error } = await supabase
        .from("doc_instances")
        .select(`
          *,
          template:doc_templates(*)
        `)
        .eq("id", instanceId)
        .single();

      if (error) throw error;
      return data as DocInstance;
    },
    enabled: !!instanceId,
  });
}

export function useCreateDocInstance() {
  const queryClient = useQueryClient();
  const { user, agencyId } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      template_id: string;
      name: string;
      collaborator_id?: string;
      token_values?: Record<string, string>;
    }) => {
      if (!agencyId) throw new Error("Agency not found");

      const { data: result, error } = await supabase
        .from("doc_instances")
        .insert({
          ...data,
          agency_id: agencyId,
          created_by: user?.id,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-instances"] });
      toast.success("Document créé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création");
      logError(error);
    },
  });
}

export function useUpdateDocInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DocInstance> & { id: string }) => {
      const { error } = await supabase
        .from("doc_instances")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doc-instances"] });
      queryClient.invalidateQueries({ queryKey: ["doc-instance", variables.id] });
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteDocInstance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      const { error } = await supabase
        .from("doc_instances")
        .delete()
        .eq("id", instanceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-instances"] });
      toast.success("Document supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}

export function useGeneratePreview() {
  return useMutation({
    mutationFn: async ({ instanceId, tokenValues }: { instanceId: string; tokenValues: Record<string, string> }) => {
      const { data, error } = await supabase.functions.invoke("documents-preview", {
        body: { instanceId, tokenValues },
      });

      if (error) throw error;
      return data as { previewPath: string; format: string };
    },
    onError: (error) => {
      toast.error("Erreur lors de la génération de l'aperçu");
      console.error(error);
    },
  });
}

export function useFinalizeDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ instanceId, tokenValues }: { instanceId: string; tokenValues: Record<string, string> }) => {
      const { data, error } = await supabase.functions.invoke("documents-finalize", {
        body: { instanceId, tokenValues },
      });

      if (error) throw error;
      return data as { finalPath: string; format: string };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doc-instances"] });
      queryClient.invalidateQueries({ queryKey: ["doc-instance", variables.instanceId] });
      toast.success("Document finalisé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la finalisation");
      console.error(error);
    },
  });
}
