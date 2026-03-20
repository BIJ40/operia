
-- Delete visual assets first (no FK deps)
DELETE FROM public.social_visual_assets;

-- Delete calendar entries
DELETE FROM public.social_calendar_entries;

-- Delete post variants
DELETE FROM public.social_post_variants;

-- Delete all suggestions
DELETE FROM public.social_content_suggestions;
