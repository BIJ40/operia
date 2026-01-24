-- Table pour stocker les overrides de pages individuelles par utilisateur
CREATE TABLE public.user_page_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, page_path)
);

-- Index pour performance
CREATE INDEX idx_user_page_overrides_user_id ON public.user_page_overrides(user_id);

-- Enable RLS
ALTER TABLE public.user_page_overrides ENABLE ROW LEVEL SECURITY;

-- Policies: seuls les admins peuvent voir et modifier
CREATE POLICY "Platform admins can manage all page overrides"
ON public.user_page_overrides
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.global_role IN ('platform_admin', 'superadmin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.global_role IN ('platform_admin', 'superadmin')
  )
);

-- Users can see their own overrides (for client-side permission checking)
CREATE POLICY "Users can view their own page overrides"
ON public.user_page_overrides
FOR SELECT
TO authenticated
USING (user_id = auth.uid());