-- Création des tables pour stocker le contenu du site

-- Table pour les cartes de la page d'accueil
CREATE TABLE public.home_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  color_preset TEXT NOT NULL DEFAULT 'blue',
  link TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table pour les catégories (guide apogée, apporteurs nationaux, informations utiles)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'BookOpen',
  color_preset TEXT NOT NULL DEFAULT 'blue',
  scope TEXT NOT NULL, -- 'guide-apogee', 'apporteurs-nationaux', 'informations-utiles'
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_scope CHECK (scope IN ('guide-apogee', 'apporteurs-nationaux', 'informations-utiles'))
);

-- Table pour les sections (contenu détaillé de chaque catégorie)
CREATE TABLE public.sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '[]'::jsonb, -- Stocke le contenu riche (blocks TipTap)
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX idx_categories_scope ON public.categories(scope);
CREATE INDEX idx_sections_category_id ON public.sections(category_id);
CREATE INDEX idx_home_cards_order ON public.home_cards(display_order);
CREATE INDEX idx_categories_order ON public.categories(scope, display_order);
CREATE INDEX idx_sections_order ON public.sections(category_id, display_order);

-- Activer RLS sur toutes les tables
ALTER TABLE public.home_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Politiques RLS : Tout le monde peut lire
CREATE POLICY "Tout le monde peut lire les cartes d'accueil"
  ON public.home_cards FOR SELECT
  USING (true);

CREATE POLICY "Tout le monde peut lire les catégories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Tout le monde peut lire les sections"
  ON public.sections FOR SELECT
  USING (true);

-- Politiques RLS : Seuls les admins peuvent modifier
CREATE POLICY "Seuls les admins peuvent insérer des cartes d'accueil"
  ON public.home_cards FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Seuls les admins peuvent modifier des cartes d'accueil"
  ON public.home_cards FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Seuls les admins peuvent supprimer des cartes d'accueil"
  ON public.home_cards FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Seuls les admins peuvent insérer des catégories"
  ON public.categories FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Seuls les admins peuvent modifier des catégories"
  ON public.categories FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Seuls les admins peuvent supprimer des catégories"
  ON public.categories FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Seuls les admins peuvent insérer des sections"
  ON public.sections FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Seuls les admins peuvent modifier des sections"
  ON public.sections FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Seuls les admins peuvent supprimer des sections"
  ON public.sections FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers pour updated_at
CREATE TRIGGER update_home_cards_updated_at
  BEFORE UPDATE ON public.home_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sections_updated_at
  BEFORE UPDATE ON public.sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();