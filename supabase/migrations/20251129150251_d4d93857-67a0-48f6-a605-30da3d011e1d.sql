-- Table pour stocker les métadonnées personnalisables des pages
CREATE TABLE public.page_metadata (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_key TEXT NOT NULL UNIQUE,
  header_title TEXT,
  header_subtitle TEXT,
  menu_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_metadata ENABLE ROW LEVEL SECURITY;

-- Politique de lecture: tous les utilisateurs authentifiés peuvent lire
CREATE POLICY "Authenticated users can read page metadata"
ON public.page_metadata
FOR SELECT
TO authenticated
USING (true);

-- Politique d'écriture: seulement N5/N6 (platform_admin, superadmin)
CREATE POLICY "Platform admins can insert page metadata"
ON public.page_metadata
FOR INSERT
TO authenticated
WITH CHECK (public.get_user_global_role_level(auth.uid()) >= 5);

CREATE POLICY "Platform admins can update page metadata"
ON public.page_metadata
FOR UPDATE
TO authenticated
USING (public.get_user_global_role_level(auth.uid()) >= 5)
WITH CHECK (public.get_user_global_role_level(auth.uid()) >= 5);

CREATE POLICY "Platform admins can delete page metadata"
ON public.page_metadata
FOR DELETE
TO authenticated
USING (public.get_user_global_role_level(auth.uid()) >= 5);

-- Trigger pour updated_at
CREATE TRIGGER update_page_metadata_updated_at
BEFORE UPDATE ON public.page_metadata
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();