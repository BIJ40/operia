import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EpiStock {
  id: string;
  agency_id: string;
  catalog_item_id: string;
  size: string | null;
  quantity: number;
  reorder_threshold: number | null;
  location: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  catalog_item?: {
    id: string;
    name: string;
    category: string;
    requires_size: boolean;
    available_sizes: string[] | null;
  };
}

export function useEpiStock(agencyId?: string) {
  return useQuery({
    queryKey: ["epi-stock", agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from("epi_stock")
        .select(`
          *,
          catalog_item:epi_catalog_items(id, name, category, requires_size, available_sizes)
        `)
        .eq("agency_id", agencyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as EpiStock[];
    },
    enabled: !!agencyId,
  });
}

export function useEpiStockLowAlert(agencyId?: string) {
  return useQuery({
    queryKey: ["epi-stock-low", agencyId],
    queryFn: async () => {
      if (!agencyId) return [];
      
      const { data, error } = await supabase
        .from("epi_stock")
        .select(`
          *,
          catalog_item:epi_catalog_items(id, name, category)
        `)
        .eq("agency_id", agencyId)
        .not("reorder_threshold", "is", null);

      if (error) throw error;
      
      // Filter where quantity <= threshold
      return (data as EpiStock[]).filter(s => 
        s.reorder_threshold !== null && s.quantity <= s.reorder_threshold
      );
    },
    enabled: !!agencyId,
  });
}

interface CreateStockParams {
  agency_id: string;
  catalog_item_id: string;
  size?: string | null;
  quantity: number;
  reorder_threshold?: number | null;
  location?: string | null;
}

export function useCreateEpiStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateStockParams) => {
      const { data, error } = await supabase
        .from("epi_stock")
        .insert(params)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-stock"] });
      toast.success("Stock ajouté");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useUpdateEpiStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EpiStock> & { id: string }) => {
      const { data, error } = await supabase
        .from("epi_stock")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-stock"] });
      toast.success("Stock mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useAdjustEpiStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      stockId, 
      adjustment 
    }: { 
      stockId: string; 
      adjustment: number; // positive = add, negative = remove
    }) => {
      // Get current stock
      const { data: current, error: fetchError } = await supabase
        .from("epi_stock")
        .select("quantity")
        .eq("id", stockId)
        .single();

      if (fetchError) throw fetchError;

      const newQuantity = Math.max(0, (current.quantity || 0) + adjustment);

      const { data, error } = await supabase
        .from("epi_stock")
        .update({ quantity: newQuantity })
        .eq("id", stockId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-stock"] });
      toast.success("Stock ajusté");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useDeleteEpiStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stockId: string) => {
      const { error } = await supabase
        .from("epi_stock")
        .delete()
        .eq("id", stockId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-stock"] });
      toast.success("Stock supprimé");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
