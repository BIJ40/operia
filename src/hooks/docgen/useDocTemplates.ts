import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DocTemplate {
  id: string;
  agency_id: string | null;
  name: string;
  description: string | null;
  category: string;
  docx_storage_path: string;
  tokens: string[];
  is_published: boolean;
  scope: "global" | "agency";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocTemplates() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["doc-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doc_templates")
        .select("*")
        .order("name");

      if (error) throw error;
      return (data || []) as DocTemplate[];
    },
    enabled: !!user,
  });
}

export function useDocTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ["doc-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await supabase
        .from("doc_templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) throw error;
      return data as DocTemplate;
    },
    enabled: !!templateId,
  });
}

export function useCreateDocTemplate() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      category: string;
      docx_storage_path: string;
      tokens: string[];
      scope: "global" | "agency";
      agency_id?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("doc_templates")
        .insert({
          ...data,
          created_by: user?.id,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-templates"] });
      toast.success("Template créé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création du template");
      console.error(error);
    },
  });
}

export function useUpdateDocTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DocTemplate> & { id: string }) => {
      const { error } = await supabase
        .from("doc_templates")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["doc-templates"] });
      queryClient.invalidateQueries({ queryKey: ["doc-template", variables.id] });
      toast.success("Template mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteDocTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("doc_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doc-templates"] });
      toast.success("Template supprimé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}

export function useParseDocxTokens() {
  return useMutation({
    mutationFn: async (storagePath: string) => {
      const { data, error } = await supabase.functions.invoke("parse-docx-tokens", {
        body: { storagePath },
      });

      if (error) throw error;
      return data as { tokens: string[]; count: number };
    },
    onError: (error) => {
      toast.error("Erreur lors de l'analyse du document");
      console.error(error);
    },
  });
}
