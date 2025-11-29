-- Add icon color customization column to page_metadata
ALTER TABLE public.page_metadata 
ADD COLUMN header_icon_color text DEFAULT NULL;

COMMENT ON COLUMN public.page_metadata.header_icon_color IS 'Custom icon color (hex or tailwind class)';