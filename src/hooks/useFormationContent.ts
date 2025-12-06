import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

export interface FormationContent {
  id: string;
  source_block_id: string;
  source_block_title: string;
  source_category_id: string | null;
  source_category_title: string | null;
  generated_summary: string | null;
  extracted_images: string[];
  status: "pending" | "processing" | "complete" | "error";
  error_message: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Fetch all formation content
export function useFormationContentList() {
  return useQuery({
    queryKey: ["formation-content"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formation_content")
        .select("*")
        .order("generated_at", { ascending: true, nullsFirst: true });

      if (error) throw error;
      return (data || []) as FormationContent[];
    }
  });
}

// Fetch formation content by category
export function useFormationContentByCategory(categoryId: string | null) {
  return useQuery({
    queryKey: ["formation-content", "category", categoryId],
    queryFn: async () => {
      if (!categoryId) return [];
      
      const { data, error } = await supabase
        .from("formation_content")
        .select("*")
        .eq("source_category_id", categoryId)
        .eq("status", "complete")
        .order("source_block_title", { ascending: true });

      if (error) throw error;
      return (data || []) as FormationContent[];
    },
    enabled: !!categoryId
  });
}

// Fetch single formation content by block ID
export function useFormationContentByBlock(blockId: string | null) {
  return useQuery({
    queryKey: ["formation-content", "block", blockId],
    queryFn: async () => {
      if (!blockId) return null;
      
      const { data, error } = await supabase
        .from("formation_content")
        .select("*")
        .eq("source_block_id", blockId)
        .maybeSingle();

      if (error) throw error;
      return data as FormationContent | null;
    },
    enabled: !!blockId
  });
}

// Generate formation content for a block
export function useGenerateFormationContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blockId: string) => {
      const { data, error } = await supabase.functions.invoke("generate-formation-content", {
        body: { blockId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, blockId) => {
      queryClient.invalidateQueries({ queryKey: ["formation-content"] });
      toast.success("Contenu de formation généré");
    },
    onError: (error: Error) => {
      logError("[useFormationContent] Generation error:", error);
      toast.error("Erreur lors de la génération: " + error.message);
    }
  });
}

// Update formation content summary
export function useUpdateFormationContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, summary }: { id: string; summary: string }) => {
      const { error } = await supabase
        .from("formation_content")
        .update({ generated_summary: summary, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formation-content"] });
      toast.success("Contenu mis à jour");
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    }
  });
}

// Delete formation content
export function useDeleteFormationContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("formation_content")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formation-content"] });
      toast.success("Contenu supprimé");
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    }
  });
}

// Reorder formation content (swap two items)
export function useReorderFormationContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      items, 
      direction, 
      currentIndex 
    }: { 
      items: FormationContent[]; 
      direction: "up" | "down"; 
      currentIndex: number;
    }) => {
      const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= items.length) return;

      const currentItem = items[currentIndex];
      const swapItem = items[newIndex];

      // Swap the generated_at timestamps between the two items
      const currentTimestamp = currentItem.generated_at || new Date().toISOString();
      const swapTimestamp = swapItem.generated_at || new Date(Date.now() - 1000).toISOString();

      const { error: error1 } = await supabase
        .from("formation_content")
        .update({ generated_at: swapTimestamp })
        .eq("id", currentItem.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from("formation_content")
        .update({ generated_at: currentTimestamp })
        .eq("id", swapItem.id);

      if (error2) throw error2;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formation-content"] });
      toast.success("Ordre modifié");
    },
    onError: (error: Error) => {
      toast.error("Erreur: " + error.message);
    }
  });
}

// Get generation stats
export function useFormationStats() {
  return useQuery({
    queryKey: ["formation-content", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formation_content")
        .select("status");

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        pending: data?.filter(d => d.status === "pending").length || 0,
        processing: data?.filter(d => d.status === "processing").length || 0,
        complete: data?.filter(d => d.status === "complete").length || 0,
        error: data?.filter(d => d.status === "error").length || 0
      };

      return stats;
    }
  });
}
