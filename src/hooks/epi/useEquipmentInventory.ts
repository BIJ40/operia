import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EquipmentCategory = 
  | "electroportatif"
  | "gros_outillage"
  | "outillage_main"
  | "mesure"
  | "securite"
  | "autre";

export type EquipmentStatus = 
  | "fonctionnel"
  | "en_reparation"
  | "hs"
  | "perdu";

export interface EquipmentItem {
  id: string;
  agency_id: string;
  name: string;
  category: EquipmentCategory;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string | null;
  status: EquipmentStatus;
  location: string | null;
  notes: string | null;
  assigned_to_collaborator_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  assigned_collaborator?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export const EQUIPMENT_CATEGORIES = [
  { value: "electroportatif", label: "Électroportatif" },
  { value: "gros_outillage", label: "Gros outillage" },
  { value: "outillage_main", label: "Outillage à main" },
  { value: "mesure", label: "Mesure" },
  { value: "securite", label: "Sécurité" },
  { value: "autre", label: "Autre" },
] as const;

export const EQUIPMENT_STATUSES = [
  { value: "fonctionnel", label: "Fonctionnel", color: "bg-green-100 text-green-800" },
  { value: "en_reparation", label: "En réparation", color: "bg-orange-100 text-orange-800" },
  { value: "hs", label: "Hors service", color: "bg-red-100 text-red-800" },
  { value: "perdu", label: "Perdu", color: "bg-slate-100 text-slate-800" },
] as const;

export function useEquipmentInventory(agencyId?: string) {
  return useQuery({
    queryKey: ["equipment-inventory", agencyId],
    queryFn: async () => {
      let query = supabase
        .from("equipment_inventory")
        .select(`
          *,
          assigned_collaborator:collaborators!assigned_to_collaborator_id(id, first_name, last_name)
        `)
        .order("name", { ascending: true });

      if (agencyId) {
        query = query.eq("agency_id", agencyId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EquipmentItem[];
    },
    enabled: !!agencyId,
  });
}

interface CreateEquipmentParams {
  agency_id: string;
  name: string;
  category: EquipmentCategory;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  purchase_date?: string | null;
  status?: EquipmentStatus;
  location?: string | null;
  notes?: string | null;
  assigned_to_collaborator_id?: string | null;
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateEquipmentParams) => {
      const { data, error } = await supabase
        .from("equipment_inventory")
        .insert({
          ...params,
          status: params.status || "fonctionnel",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-inventory"] });
      toast.success("Matériel ajouté");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EquipmentItem> & { id: string }) => {
      const { data, error } = await supabase
        .from("equipment_inventory")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-inventory"] });
      toast.success("Matériel mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_inventory")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-inventory"] });
      toast.success("Matériel supprimé");
    },
    onError: (error) => {
      toast.error("Erreur: " + error.message);
    },
  });
}
