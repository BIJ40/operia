-- Phase 1 : Mettre default_level = 1 pour les scopes pilotage et support
-- Cela permet au fallback legacy de fonctionner correctement pour les users N2+
-- La protection V2 (RoleGuard) bloque déjà les users N0/N1

UPDATE scopes SET default_level = 1 WHERE slug = 'mes_indicateurs';
UPDATE scopes SET default_level = 1 WHERE slug = 'actions_a_mener';
UPDATE scopes SET default_level = 1 WHERE slug = 'diffusion';
UPDATE scopes SET default_level = 1 WHERE slug = 'support_tickets';