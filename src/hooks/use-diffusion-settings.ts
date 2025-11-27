import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DiffusionSettings {
  id: string;
  auto_rotation_enabled: boolean;
  rotation_speed_seconds: number;
  objectif_title: string;
  objectif_amount: number;
  saviez_vous_templates: string[];
  enabled_slides: string[];
}

export const useDiffusionSettings = () => {
  const [settings, setSettings] = useState<DiffusionSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('diffusion_settings')
        .select('*')
        .eq('id', 'global')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error loading diffusion settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les paramètres de diffusion',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (partial: Partial<Omit<DiffusionSettings, 'id'>>) => {
    try {
      const { data, error } = await supabase
        .from('diffusion_settings')
        .update(partial)
        .eq('id', 'global')
        .select()
        .single();

      if (error) throw error;
      
      setSettings(data);
      toast({
        title: 'Succès',
        description: 'Paramètres mis à jour',
      });
      
      return data;
    } catch (error) {
      console.error('Error updating diffusion settings:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour les paramètres',
        variant: 'destructive',
      });
      throw error;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings,
    reload: loadSettings,
  };
};
