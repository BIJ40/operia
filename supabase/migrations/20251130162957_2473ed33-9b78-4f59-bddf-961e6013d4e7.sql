-- P2#3: Extension chatbot_queries + FAQ system

-- 1) Extend chatbot_queries with new columns
ALTER TABLE public.chatbot_queries 
ADD COLUMN IF NOT EXISTS answer_raw text,
ADD COLUMN IF NOT EXISTS context_type_used text,
ADD COLUMN IF NOT EXISTS apporteur_code_used text,
ADD COLUMN IF NOT EXISTS univers_code_used text,
ADD COLUMN IF NOT EXISTS role_cible_used text,
ADD COLUMN IF NOT EXISTS source_block_ids text[],
ADD COLUMN IF NOT EXISTS improvement_block_id uuid,
ADD COLUMN IF NOT EXISTS answer_quality integer CHECK (answer_quality IS NULL OR (answer_quality >= 1 AND answer_quality <= 5));

-- 2) Create faq_categories table
CREATE TABLE IF NOT EXISTS public.faq_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  slug text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3) Create faq_items table
CREATE TABLE IF NOT EXISTS public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  context_type text NOT NULL DEFAULT 'apogee',
  category_id uuid REFERENCES public.faq_categories(id) ON DELETE SET NULL,
  apporteur_code text,
  univers_code text,
  role_cible text,
  linked_block_ids text[],
  created_from_query_id uuid REFERENCES public.chatbot_queries(id) ON DELETE SET NULL,
  is_published boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4) Enable RLS
ALTER TABLE public.faq_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- 5) RLS policies for faq_categories
CREATE POLICY "Everyone can read faq categories" ON public.faq_categories
FOR SELECT USING (true);

CREATE POLICY "Only admins can manage faq categories" ON public.faq_categories
FOR ALL USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- 6) RLS policies for faq_items
CREATE POLICY "Everyone can read published faq items" ON public.faq_items
FOR SELECT USING (is_published = true OR has_min_global_role(auth.uid(), 5));

CREATE POLICY "Only admins can manage faq items" ON public.faq_items
FOR ALL USING (has_min_global_role(auth.uid(), 5))
WITH CHECK (has_min_global_role(auth.uid(), 5));

-- 7) Triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_faq_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_faq_categories_updated_at
BEFORE UPDATE ON public.faq_categories
FOR EACH ROW EXECUTE FUNCTION public.update_faq_updated_at();

CREATE TRIGGER update_faq_items_updated_at
BEFORE UPDATE ON public.faq_items
FOR EACH ROW EXECUTE FUNCTION public.update_faq_updated_at();

-- 8) Insert default FAQ categories
INSERT INTO public.faq_categories (label, slug, display_order) VALUES
('Apogée - Général', 'apogee-general', 1),
('Apogée - Dossiers', 'apogee-dossiers', 2),
('Apogée - Facturation', 'apogee-facturation', 3),
('Apporteurs', 'apporteurs', 10),
('HelpConfort - Procédures', 'helpconfort-procedures', 20),
('HelpConfort - Réseau', 'helpconfort-reseau', 21)
ON CONFLICT (slug) DO NOTHING;