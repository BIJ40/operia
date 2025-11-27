-- =============================================
-- MIGRATION SYSTÈME DE DROITS V2
-- =============================================

-- 1. Ajouter role_id à profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role_id uuid NULL;

-- 2. Créer la table user_capabilities
CREATE TABLE IF NOT EXISTS public.user_capabilities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    capability text NOT NULL,
    is_active boolean DEFAULT true,
    granted_at timestamp with time zone DEFAULT now(),
    granted_by uuid NULL,
    metadata jsonb NULL
);

CREATE INDEX IF NOT EXISTS user_capabilities_user_idx ON public.user_capabilities (user_id);

-- 3. Créer la table roles (rôles métier)
CREATE TABLE IF NOT EXISTS public.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    label text NOT NULL,
    category text NOT NULL CHECK (category IN ('franchise', 'franchiseur', 'externe')),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Créer la table scopes
CREATE TABLE IF NOT EXISTS public.scopes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    label text NOT NULL,
    area text NOT NULL CHECK (area IN ('help_academy', 'pilotage_agence', 'pilotage_franchiseur', 'support', 'administration', 'externes')),
    description text,
    default_level integer DEFAULT 0 CHECK (default_level >= 0 AND default_level <= 3),
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 5. Modifier role_permissions pour le nouveau système
ALTER TABLE public.role_permissions
ADD COLUMN IF NOT EXISTS scope_id uuid NULL,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_view boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_edit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete boolean DEFAULT false;

-- 6. Modifier user_permissions pour le nouveau système
ALTER TABLE public.user_permissions
ADD COLUMN IF NOT EXISTS scope_id uuid NULL,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_view boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS can_edit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_create boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS can_delete boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deny boolean DEFAULT false;

-- 7. RLS pour user_capabilities
ALTER TABLE public.user_capabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own capabilities" 
ON public.user_capabilities FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all capabilities" 
ON public.user_capabilities FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 8. RLS pour roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view roles" 
ON public.roles FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage roles" 
ON public.roles FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 9. RLS pour scopes
ALTER TABLE public.scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view scopes" 
ON public.scopes FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage scopes" 
ON public.scopes FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 10. Insérer les scopes par défaut
INSERT INTO public.scopes (slug, label, area, default_level, display_order) VALUES
('apogee', 'Guide Apogée', 'help_academy', 1, 1),
('apporteurs', 'Guide Apporteurs', 'help_academy', 1, 2),
('helpconfort', 'Guide HelpConfort', 'help_academy', 1, 3),
('documents', 'Documents', 'help_academy', 1, 4),
('mes_indicateurs', 'Mes Indicateurs', 'pilotage_agence', 0, 10),
('actions_a_mener', 'Actions à mener', 'pilotage_agence', 0, 11),
('diffusion', 'Mode Diffusion', 'pilotage_agence', 0, 12),
('mes_demandes', 'Mes Demandes', 'support', 1, 20),
('support_tickets', 'Tickets Support', 'support', 0, 21),
('franchiseur_dashboard', 'Dashboard Franchiseur', 'pilotage_franchiseur', 0, 30),
('franchiseur_kpi', 'KPI Réseau', 'pilotage_franchiseur', 0, 31),
('franchiseur_agencies', 'Gestion Agences', 'pilotage_franchiseur', 0, 32),
('franchiseur_royalties', 'Redevances', 'pilotage_franchiseur', 0, 33),
('admin_users', 'Gestion Utilisateurs', 'administration', 0, 40),
('admin_roles', 'Gestion Rôles', 'administration', 0, 41),
('admin_backup', 'Sauvegarde', 'administration', 0, 42),
('admin_settings', 'Paramètres', 'administration', 0, 43)
ON CONFLICT (slug) DO NOTHING;