import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { logError } from '@/lib/logger';
import { supabase } from "@/integrations/supabase/client";
import { useAuthCore } from "@/contexts/AuthCoreContext";
import { toast } from "sonner";
import { TokenConfig } from "@/lib/docgen/tokenConfig";
import { Json } from "@/integrations/supabase/types";

export interface DocTemplate {
  id: string;
  agency_id: string | null;
  name: string;
  description: string | null;
  category: string;
  docx_storage_path: string;
  tokens: (string | TokenConfig)[];
  is_published: boolean;
  scope: "global" | "agency";
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useDocTemplates() {
  const { user } = useAuthCore();

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
      tokens: (string | TokenConfig)[];
      scope: "global" | "agency";
      agency_id?: string;
    }) => {
      const { data: result, error } = await supabase
        .from("doc_templates")
        .insert({
          name: data.name,
          description: data.description,
          category: data.category,
          docx_storage_path: data.docx_storage_path,
          tokens: data.tokens as unknown as Json,
          scope: data.scope,
          agency_id: data.agency_id,
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
      logError(error);
    },
  });
}

export function useUpdateDocTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tokens, ...rest }: Partial<DocTemplate> & { id: string }) => {
      const updateData: Record<string, unknown> = { ...rest };
      if (tokens !== undefined) {
        updateData.tokens = tokens as unknown as Json;
      }
      
      const { error } = await supabase
        .from("doc_templates")
        .update(updateData)
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
      logError(error);
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
      logError(error);
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

      const raw = data as { tokens?: unknown; count?: unknown };
      const tokens = Array.isArray(raw?.tokens) ? raw.tokens : [];

      // Safety net: keep only clean token names (avoid Word XML fragments)
      const cleanedTokens = Array.from(
        new Set(
          tokens
            .map((t) => String(t).trim())
            .map((t) => t.replace(/^\{\{/, "").replace(/\}\}$/, ""))
            .map((t) => t.replace(/\s+/g, ""))
            .filter((t) => /^[A-Za-z0-9_.-]+$/.test(t))
        )
      );

      return { tokens: cleanedTokens, count: cleanedTokens.length };
    },
    onError: (error) => {
      toast.error("Erreur lors de l'analyse du document");
      logError(error);
    },
  });
}
