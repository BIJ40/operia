-- Nettoyer le champ user_pseudo des tables
-- Note: Le code sera mis à jour pour utiliser first_name + last_name à la place

-- Supprimer la colonne user_pseudo de chatbot_queries
ALTER TABLE public.chatbot_queries DROP COLUMN IF EXISTS user_pseudo;

-- Supprimer la colonne user_pseudo de support_tickets  
ALTER TABLE public.support_tickets DROP COLUMN IF EXISTS user_pseudo;