-- Recréer la vue blocks_public avec SECURITY INVOKER (pas DEFINER)
DROP VIEW IF EXISTS public.blocks_public;

CREATE VIEW public.blocks_public
WITH (security_barrier = true, security_invoker = true)
AS SELECT 
  id,
  type,
  title,
  slug,
  content,
  parent_id,
  "order",
  icon,
  color_preset,
  hide_from_sidebar,
  hide_title,
  attachments,
  content_type,
  tips_type,
  summary,
  show_summary,
  is_in_progress,
  completed_at,
  content_updated_at,
  is_empty
FROM public.blocks;

-- Autoriser la lecture anonyme sur la VUE uniquement (pas la table)
GRANT SELECT ON public.blocks_public TO anon;
GRANT SELECT ON public.blocks_public TO authenticated;