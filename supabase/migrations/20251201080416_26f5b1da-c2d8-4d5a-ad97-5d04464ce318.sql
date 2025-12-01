-- Migration : Suppression de la colonne priority_normalized
-- Raison : Unification du système de priorité sur heat_priority (0-12) uniquement
-- La colonne priority_normalized (P0-P4) n'est plus utilisée par le module ticketing

-- Note : heat_priority (entier 0-12) est désormais la SEULE source de vérité pour la priorité
-- 0-3 : Froid (backlog, mineur)
-- 4-7 : Tiède à chaud (important, planifié)
-- 8-10 : Brûlant (urgent)
-- 11-12 : Critique (blocage)

ALTER TABLE public.apogee_tickets DROP COLUMN IF EXISTS priority_normalized;