-- Créer la table pour gérer les permissions d'accès par rôle
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_agence TEXT NOT NULL,
  block_id TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role_agence, block_id)
);

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Seuls les admins peuvent gérer les permissions
CREATE POLICY "Only admins can view role permissions"
ON public.role_permissions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert role permissions"
ON public.role_permissions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update role permissions"
ON public.role_permissions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete role permissions"
ON public.role_permissions
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Créer un index pour améliorer les performances
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role_agence);
CREATE INDEX idx_role_permissions_block ON public.role_permissions(block_id);