-- Créer la table home_cards si elle n'existe pas déjà
-- Cette table stockera les cartes de la page d'accueil

-- Vérifier si la table existe déjà, sinon la créer
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'home_cards') THEN
    -- Créer la table home_cards
    CREATE TABLE public.home_cards (
      id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
      title text NOT NULL,
      description text NOT NULL,
      link text NOT NULL,
      icon text NOT NULL DEFAULT 'BookOpen'::text,
      color_preset text NOT NULL DEFAULT 'blue'::text,
      display_order integer NOT NULL DEFAULT 0,
      created_at timestamp with time zone NOT NULL DEFAULT now(),
      updated_at timestamp with time zone NOT NULL DEFAULT now()
    );

    -- Activer RLS
    ALTER TABLE public.home_cards ENABLE ROW LEVEL SECURITY;

    -- Politiques RLS
    CREATE POLICY "Tout le monde peut lire les cartes d'accueil" 
      ON public.home_cards 
      FOR SELECT 
      USING (true);

    CREATE POLICY "Seuls les admins peuvent insérer des cartes d'accueil" 
      ON public.home_cards 
      FOR INSERT 
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

    CREATE POLICY "Seuls les admins peuvent modifier des cartes d'accueil" 
      ON public.home_cards 
      FOR UPDATE 
      USING (has_role(auth.uid(), 'admin'::app_role));

    CREATE POLICY "Seuls les admins peuvent supprimer des cartes d'accueil" 
      ON public.home_cards 
      FOR DELETE 
      USING (has_role(auth.uid(), 'admin'::app_role));

    -- Trigger pour updated_at
    CREATE TRIGGER update_home_cards_updated_at
      BEFORE UPDATE ON public.home_cards
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    -- Insérer les cartes par défaut
    INSERT INTO public.home_cards (title, description, link, icon, color_preset, display_order) VALUES
      ('Guide Apogée', 'Tout ce que vous devez savoir sur l''utilisation d''Apogée', '/apogee', 'BookOpen', 'blue', 0),
      ('Guide des apporteurs', 'Guide complet pour les apporteurs d''affaires', '/guide-apporteurs', 'Users', 'green', 1),
      ('Help Confort', 'Centre d''aide et ressources Help Confort Services', '/help-confort', 'HelpCircle', 'orange', 2);
  END IF;
END $$;