-- Add size customization columns to page_metadata
ALTER TABLE public.page_metadata 
ADD COLUMN header_title_size text DEFAULT 'lg',
ADD COLUMN header_icon_size text DEFAULT 'md';

-- Add comment for documentation
COMMENT ON COLUMN public.page_metadata.header_title_size IS 'Title size: sm, base, lg, xl, 2xl';
COMMENT ON COLUMN public.page_metadata.header_icon_size IS 'Icon size: sm, md, lg, xl';