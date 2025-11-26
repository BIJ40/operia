-- Phase 1.1 : Ajouter le rôle franchiseur à l'enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'franchiseur';