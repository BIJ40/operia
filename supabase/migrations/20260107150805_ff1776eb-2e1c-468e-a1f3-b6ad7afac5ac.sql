-- Create operia_blocks table for OPERIA guide content
CREATE TABLE public.operia_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'section',
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  parent_id UUID REFERENCES public.operia_blocks(id) ON DELETE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  color_preset TEXT NOT NULL DEFAULT 'blue',
  hide_from_sidebar BOOLEAN DEFAULT false,
  hide_title BOOLEAN DEFAULT false,
  attachments JSONB DEFAULT '[]'::jsonb,
  content_type TEXT,
  tips_type TEXT,
  summary TEXT,
  show_summary BOOLEAN DEFAULT false,
  is_in_progress BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  content_updated_at TIMESTAMP WITH TIME ZONE,
  is_empty BOOLEAN DEFAULT false,
  show_title_on_card BOOLEAN DEFAULT true,
  target_roles TEXT[] DEFAULT ARRAY['all']::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on slug
CREATE UNIQUE INDEX operia_blocks_slug_unique ON public.operia_blocks(slug);

-- Enable RLS
ALTER TABLE public.operia_blocks ENABLE ROW LEVEL SECURITY;

-- Read policy: all authenticated users can read
CREATE POLICY "operia_blocks_select_authenticated" 
ON public.operia_blocks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Write policies: platform_admin or users with help_academy edition option
CREATE POLICY "operia_blocks_insert_admin" 
ON public.operia_blocks 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.global_role = 'platform_admin'
  )
);

CREATE POLICY "operia_blocks_update_admin" 
ON public.operia_blocks 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.global_role = 'platform_admin'
  )
);

CREATE POLICY "operia_blocks_delete_admin" 
ON public.operia_blocks 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.global_role = 'platform_admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_operia_blocks_updated_at
BEFORE UPDATE ON public.operia_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial categories for OPERIA guide
INSERT INTO public.operia_blocks (type, title, slug, "order", icon, color_preset, show_title_on_card)
VALUES 
  ('category', 'Premiers pas', 'operia-premiers-pas', 0, 'Rocket', 'blue', true),
  ('category', 'Tableau de bord', 'operia-dashboard', 1, 'LayoutDashboard', 'blue', true),
  ('category', 'STATiA - Statistiques', 'operia-statia', 2, 'BarChart3', 'purple', true),
  ('category', 'Help! Academy', 'operia-academy', 3, 'GraduationCap', 'green', true),
  ('category', 'Portail Apporteurs', 'operia-apporteurs', 4, 'Users', 'orange', true),
  ('category', 'Gestion RH', 'operia-rh', 5, 'UserCog', 'blue', true),
  ('category', 'Support & Tickets', 'operia-support', 6, 'LifeBuoy', 'red', true),
  ('category', 'Paramètres', 'operia-parametres', 7, 'Settings', 'gray', true),
  ('category', 'Rôles et Permissions', 'operia-roles', 8, 'Shield', 'purple', true),
  ('category', 'Mon Compte', 'operia-compte', 9, 'User', 'blue', true);