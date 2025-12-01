-- =====================================================
-- AUDIT FIX: Restreindre accès public aux tables sensibles
-- Toutes les tables doivent requérir authentification
-- =====================================================

-- 1. KNOWLEDGE_BASE: Supprimer policy publique et créer policy authentifiée
DROP POLICY IF EXISTS "Tout le monde peut lire la knowledge base" ON public.knowledge_base;

-- Note: Policies "Authenticated users can read knowledge_base" déjà créée précédemment

-- 2. CATEGORIES: Restreindre à utilisateurs authentifiés
DROP POLICY IF EXISTS "Tout le monde peut lire les catégories" ON public.categories;
CREATE POLICY "Authenticated users can read categories"
ON public.categories FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. SECTIONS: Restreindre à utilisateurs authentifiés  
DROP POLICY IF EXISTS "Tout le monde peut lire les sections" ON public.sections;
CREATE POLICY "Authenticated users can read sections"
ON public.sections FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. HOME_CARDS: Restreindre à utilisateurs authentifiés
DROP POLICY IF EXISTS "Tout le monde peut lire les cartes d'accueil" ON public.home_cards;
DROP POLICY IF EXISTS "Authenticated can view home cards" ON public.home_cards;
CREATE POLICY "Authenticated users can read home_cards"
ON public.home_cards FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 5. DOCUMENTS: Restreindre à utilisateurs authentifiés
DROP POLICY IF EXISTS "Anyone can view documents" ON public.documents;
CREATE POLICY "Authenticated users can read documents"
ON public.documents FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 6. FAQ_CATEGORIES: Restreindre à utilisateurs authentifiés
DROP POLICY IF EXISTS "Everyone can read faq categories" ON public.faq_categories;
CREATE POLICY "Authenticated users can read faq_categories"
ON public.faq_categories FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 7. FAQ_ITEMS: Restreindre à utilisateurs authentifiés
DROP POLICY IF EXISTS "Everyone can read published faq items" ON public.faq_items;
CREATE POLICY "Authenticated users can read published faq_items"
ON public.faq_items FOR SELECT
USING (auth.uid() IS NOT NULL AND (is_published = true OR has_min_global_role(auth.uid(), 5)));

-- 8. DIFFUSION_SETTINGS: Restreindre à utilisateurs authentifiés
DROP POLICY IF EXISTS "Everyone can read diffusion settings" ON public.diffusion_settings;
CREATE POLICY "Authenticated users can read diffusion_settings"
ON public.diffusion_settings FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 9. BLOCKS: Restreindre à utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated users can view blocks" ON public.blocks;
CREATE POLICY "Authenticated users can view blocks"
ON public.blocks FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 10. APPORTEUR_BLOCKS: Restreindre à utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated users can view apporteur blocks" ON public.apporteur_blocks;
CREATE POLICY "Authenticated users can view apporteur_blocks"
ON public.apporteur_blocks FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 11. PAGE_METADATA: Restreindre à utilisateurs authentifiés si table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'page_metadata') THEN
    DROP POLICY IF EXISTS "Public read page metadata" ON public.page_metadata;
    EXECUTE 'CREATE POLICY "Authenticated users can read page_metadata" ON public.page_metadata FOR SELECT USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;