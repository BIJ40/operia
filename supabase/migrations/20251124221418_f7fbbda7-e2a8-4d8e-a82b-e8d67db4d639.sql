-- Ajouter le rôle 'support' à l'enum app_role existant
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';