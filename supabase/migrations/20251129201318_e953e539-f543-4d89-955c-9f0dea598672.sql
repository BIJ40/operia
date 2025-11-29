-- ============================================
-- MODULE TICKETING APOGÉE - DÉVELOPPEMENT
-- ============================================

-- 1. Tables de configuration

-- Statuts Kanban
CREATE TABLE public.apogee_ticket_statuses (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_final BOOLEAN NOT NULL DEFAULT false,
  color TEXT DEFAULT 'gray',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Modules Apogée
CREATE TABLE public.apogee_modules (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  color TEXT DEFAULT 'blue',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Priorités
CREATE TABLE public.apogee_priorities (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT 'gray',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Table principale des tickets
CREATE TABLE public.apogee_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source Excel
  source_sheet TEXT,
  source_row_index INTEGER,
  external_key TEXT UNIQUE, -- sheetName + '#' + rowIndex pour dédoublonnage
  
  -- Données métier
  element_concerne TEXT NOT NULL,
  module TEXT REFERENCES public.apogee_modules(id),
  priority TEXT REFERENCES public.apogee_priorities(id),
  action_type TEXT, -- A FAIRE, A ECHANGER, ATT MAJ, etc.
  kanban_status TEXT NOT NULL DEFAULT 'BACKLOG' REFERENCES public.apogee_ticket_statuses(id),
  owner_side TEXT CHECK (owner_side IN ('HC', 'APOGEE', 'PARTAGE')),
  
  -- Estimations
  h_min NUMERIC,
  h_max NUMERIC,
  hca_code TEXT,
  
  -- Contenu
  description TEXT,
  apogee_status_raw TEXT,
  hc_status_raw TEXT,
  
  -- Méta
  module_area TEXT,
  severity TEXT CHECK (severity IN ('CRITIQUE', 'MAJEUR', 'CONFORT')),
  needs_completion BOOLEAN DEFAULT false,
  
  -- Audit
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_from TEXT NOT NULL DEFAULT 'MANUAL' CHECK (created_from IN ('IMPORT', 'MANUAL')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Table des commentaires
CREATE TABLE public.apogee_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.apogee_tickets(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('HC', 'APOGEE', 'DYN', 'AUTRE')),
  author_name TEXT,
  source_field TEXT, -- COMMENTAIRE_APOGEE, COMMENTAIRE_FLORIAN, etc.
  body TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_by_user_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Trigger updated_at
CREATE TRIGGER update_apogee_tickets_updated_at
  BEFORE UPDATE ON public.apogee_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Indexes
CREATE INDEX idx_apogee_tickets_status ON public.apogee_tickets(kanban_status);
CREATE INDEX idx_apogee_tickets_module ON public.apogee_tickets(module);
CREATE INDEX idx_apogee_tickets_priority ON public.apogee_tickets(priority);
CREATE INDEX idx_apogee_tickets_owner ON public.apogee_tickets(owner_side);
CREATE INDEX idx_apogee_tickets_needs_completion ON public.apogee_tickets(needs_completion) WHERE needs_completion = true;
CREATE INDEX idx_apogee_ticket_comments_ticket ON public.apogee_ticket_comments(ticket_id);

-- 6. RLS Policies
ALTER TABLE public.apogee_ticket_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apogee_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apogee_priorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apogee_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apogee_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Lecture pour utilisateurs avec module apogee_tickets activé
CREATE POLICY "Users with apogee_tickets module can read statuses"
  ON public.apogee_ticket_statuses FOR SELECT
  USING (
    (SELECT (enabled_modules->'apogee_tickets'->>'enabled')::boolean FROM profiles WHERE id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Users with apogee_tickets module can read modules"
  ON public.apogee_modules FOR SELECT
  USING (
    (SELECT (enabled_modules->'apogee_tickets'->>'enabled')::boolean FROM profiles WHERE id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Users with apogee_tickets module can read priorities"
  ON public.apogee_priorities FOR SELECT
  USING (
    (SELECT (enabled_modules->'apogee_tickets'->>'enabled')::boolean FROM profiles WHERE id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Users with apogee_tickets module can read tickets"
  ON public.apogee_tickets FOR SELECT
  USING (
    (SELECT (enabled_modules->'apogee_tickets'->>'enabled')::boolean FROM profiles WHERE id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Users with apogee_tickets module can insert tickets"
  ON public.apogee_tickets FOR INSERT
  WITH CHECK (
    (SELECT (enabled_modules->'apogee_tickets'->>'enabled')::boolean FROM profiles WHERE id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Users with apogee_tickets module can update tickets"
  ON public.apogee_tickets FOR UPDATE
  USING (
    (SELECT (enabled_modules->'apogee_tickets'->>'enabled')::boolean FROM profiles WHERE id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Users with apogee_tickets module can delete tickets"
  ON public.apogee_tickets FOR DELETE
  USING (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Users with apogee_tickets module can read comments"
  ON public.apogee_ticket_comments FOR SELECT
  USING (
    (SELECT (enabled_modules->'apogee_tickets'->>'enabled')::boolean FROM profiles WHERE id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

CREATE POLICY "Users with apogee_tickets module can insert comments"
  ON public.apogee_ticket_comments FOR INSERT
  WITH CHECK (
    (SELECT (enabled_modules->'apogee_tickets'->>'enabled')::boolean FROM profiles WHERE id = auth.uid()) = true
    OR has_min_global_role(auth.uid(), 5)
  );

-- Admins can manage config tables
CREATE POLICY "Admins can manage statuses"
  ON public.apogee_ticket_statuses FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can manage modules"
  ON public.apogee_modules FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

CREATE POLICY "Admins can manage priorities"
  ON public.apogee_priorities FOR ALL
  USING (has_min_global_role(auth.uid(), 5))
  WITH CHECK (has_min_global_role(auth.uid(), 5));

-- 7. Données initiales

-- Statuts Kanban
INSERT INTO public.apogee_ticket_statuses (id, label, display_order, is_final, color) VALUES
  ('BACKLOG', 'Backlog', 1, false, 'gray'),
  ('SPEC_A_FAIRE', 'À spécifier', 2, false, 'blue'),
  ('EN_DEV_APOGEE', 'En dev Apogée', 3, false, 'purple'),
  ('EN_TEST_HC', 'En test HC', 4, false, 'orange'),
  ('EN_PROD', 'En prod', 5, false, 'green'),
  ('CLOTURE', 'Clôturé', 6, true, 'gray');

-- Modules Apogée
INSERT INTO public.apogee_modules (id, label, display_order, color) VALUES
  ('RDV', 'RDV', 1, 'blue'),
  ('DEVIS', 'Devis', 2, 'green'),
  ('FACTURES', 'Factures', 3, 'purple'),
  ('PLANNING', 'Planning', 4, 'orange'),
  ('DOSSIERS', 'Dossiers', 5, 'cyan'),
  ('CLIENTS', 'Clients', 6, 'pink'),
  ('APPORTEURS', 'Apporteurs', 7, 'yellow'),
  ('STATS', 'Statistiques', 8, 'red'),
  ('AUTRE', 'Autre', 99, 'gray');

-- Priorités
INSERT INTO public.apogee_priorities (id, label, display_order, color) VALUES
  ('A', 'A - Critique', 1, 'red'),
  ('B', 'B - Important', 2, 'orange'),
  ('V1', 'V1 - Standard', 3, 'blue'),
  ('PLUS_TARD', 'Plus tard', 4, 'gray');