-- Add subtitle bar customization columns to page_metadata
ALTER TABLE public.page_metadata 
ADD COLUMN header_subtitle_bg_color text DEFAULT NULL,
ADD COLUMN header_subtitle_text_size text DEFAULT 'xs';

COMMENT ON COLUMN public.page_metadata.header_subtitle_bg_color IS 'Subtitle bar background color (hex)';
COMMENT ON COLUMN public.page_metadata.header_subtitle_text_size IS 'Subtitle text size: xs, sm, base';