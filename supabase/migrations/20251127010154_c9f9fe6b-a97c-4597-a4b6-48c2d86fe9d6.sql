-- Create diffusion_settings table for TV mode configuration
CREATE TABLE IF NOT EXISTS public.diffusion_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  auto_rotation_enabled BOOLEAN NOT NULL DEFAULT true,
  rotation_speed_seconds INTEGER NOT NULL DEFAULT 15,
  objectif_title TEXT NOT NULL DEFAULT 'OBJECTIF MOIS EN COURS',
  objectif_amount NUMERIC NOT NULL DEFAULT 100000,
  saviez_vous_templates TEXT[] NOT NULL DEFAULT ARRAY[
    'Le mois avec le plus de dossiers est {moisMax} {annee} avec {nbDossiersMax} dossiers.',
    'En {moisCourant} {annee}, nous avons traité {nbProjetsMois} projets.',
    'Le CA moyen par dossier ce mois-ci est de {caMoyenDossier}€.'
  ],
  enabled_slides TEXT[] NOT NULL DEFAULT ARRAY['univers_apporteurs', 'ca_techniciens', 'segmentation', 'apporteurs_sav'],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.diffusion_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read settings
CREATE POLICY "Everyone can read diffusion settings"
  ON public.diffusion_settings
  FOR SELECT
  USING (true);

-- Policy: Only admins can update settings
CREATE POLICY "Only admins can update diffusion settings"
  ON public.diffusion_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Only admins can insert settings
CREATE POLICY "Only admins can insert diffusion settings"
  ON public.diffusion_settings
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.diffusion_settings (id) VALUES ('global')
ON CONFLICT (id) DO NOTHING;

-- Create trigger for updated_at
CREATE TRIGGER update_diffusion_settings_updated_at
  BEFORE UPDATE ON public.diffusion_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();