import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

export interface CommercialProfile {
  id: string;
  agency_id: string;
  agence_nom_long: string | null;
  baseline: string | null;
  date_creation: string | null;
  rang_agence: string | null;
  nb_techniciens: number | null;
  nb_assistantes: number | null;
  description_equipe: string | null;
  zones_intervention: string | null;
  email_contact: string | null;
  phone_contact: string | null;
  texte_qui_sommes_nous: string | null;
  texte_nos_valeurs: string | null;
  texte_nos_engagements: string | null;
  texte_nos_competences: string | null;
  texte_comment_ca_se_passe: string | null;
  logo_agence_url: string | null;
  photo_equipe_url: string | null;
  photo_lien_suivi_url: string | null;
  photo_realisation1_avant_url: string | null;
  photo_realisation1_apres_url: string | null;
  photo_realisation2_avant_url: string | null;
  photo_realisation2_apres_url: string | null;
  photo_realisation3_avant_url: string | null;
  photo_realisation3_apres_url: string | null;
  photo_temoignage1_url: string | null;
  photo_temoignage2_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useCommercialProfile(agencyId: string | null) {
  return useQuery({
    queryKey: ['commercial-profile', agencyId],
    queryFn: async () => {
      if (!agencyId) return null;
      
      const { data, error } = await supabase
        .from('agency_commercial_profile')
        .select('*')
        .eq('agency_id', agencyId)
        .maybeSingle();
      
      if (error) throw error;
      return data as CommercialProfile | null;
    },
    enabled: !!agencyId,
  });
}

export function useUpsertCommercialProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (profile: Partial<CommercialProfile> & { agency_id: string }) => {
      // Check if profile exists
      const { data: existing } = await supabase
        .from('agency_commercial_profile')
        .select('id')
        .eq('agency_id', profile.agency_id)
        .maybeSingle();
      
      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('agency_commercial_profile')
          .update(profile)
          .eq('agency_id', profile.agency_id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        // Insert
        const { data, error } = await supabase
          .from('agency_commercial_profile')
          .insert(profile)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commercial-profile', variables.agency_id] });
      toast.success('Profil commercial enregistré');
    },
    onError: (error) => {
      logError('Error saving commercial profile:', error);
      toast.error('Erreur lors de la sauvegarde');
    },
  });
}

export function useGeneratePptx() {
  return useMutation({
    mutationFn: async (agencyId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-pptx', {
        body: { agencyId },
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      return data as {
        success: boolean;
        downloadUrl: string;
        fileName: string;
        generatedAt: string;
        path: string;
      };
    },
    onError: (error) => {
      console.error('Error generating PPTX:', error);
      toast.error(error.message || 'Erreur lors de la génération');
    },
  });
}

export function useUploadAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      file, 
      agencyId, 
      fieldName 
    }: { 
      file: File; 
      agencyId: string; 
      fieldName: string;
    }) => {
      const ext = file.name.split('.').pop();
      const path = `${agencyId}/${fieldName}_${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pptx-assets')
        .upload(path, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('pptx-assets')
        .getPublicUrl(path);
      
      return publicUrl;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commercial-profile', variables.agencyId] });
    },
  });
}

export function useUploadTemplate() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { error } = await supabase.storage
        .from('pptx-templates')
        .upload('templates/support_agence_v1.pptx', file, { 
          upsert: true,
          contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        });
      
      if (error) throw error;
      
      return true;
    },
    onSuccess: () => {
      toast.success('Template maître mis à jour');
    },
    onError: (error) => {
      console.error('Error uploading template:', error);
      toast.error('Erreur lors de l\'upload du template');
    },
  });
}
