import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EpiCatalogItem {
  id: string;
  agency_id: string | null;
  name: string;
  category: string;
  requires_size: boolean;
  available_sizes: string[] | null;
  default_renewal_days: number | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const EPI_CATEGORIES = [
  { value: "casque", label: "Casque" },
  { value: "gants", label: "Gants" },
  { value: "lunettes", label: "Lunettes" },
  { value: "chaussures", label: "Chaussures" },
  { value: "harnais", label: "Harnais" },
  { value: "masque", label: "Masque" },
  { value: "vetement", label: "Vêtement" },
  { value: "gilet", label: "Gilet" },
  { value: "protection_auditive", label: "Protection auditive" },
  { value: "autre", label: "Autre" },
] as const;

export function useEpiCatalog(agencyId?: string) {
  return useQuery({
    queryKey: ["epi-catalog", agencyId],
    queryFn: async () => {
      let query = supabase
        .from("epi_catalog_items")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (agencyId) {
        query = query.or(`agency_id.is.null,agency_id.eq.${agencyId}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EpiCatalogItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateEpiCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<EpiCatalogItem, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("epi_catalog_items")
        .insert(item)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-catalog"] });
      toast.success("Article EPI créé");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });
}

export function useUpdateEpiCatalogItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EpiCatalogItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("epi_catalog_items")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epi-catalog"] });
      toast.success("Article EPI mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}
