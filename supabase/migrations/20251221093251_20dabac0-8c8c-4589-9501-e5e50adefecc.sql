-- ===========================================
-- NOUVEAU SYSTÈME: MATÉRIEL (inventaire simple)
-- ===========================================

-- Catégories de matériel
CREATE TYPE public.equipment_category AS ENUM (
  'electroportatif',
  'gros_outillage',
  'outillage_main',
  'mesure',
  'securite',
  'autre'
);

-- Statut du matériel
CREATE TYPE public.equipment_status AS ENUM (
  'fonctionnel',
  'en_reparation',
  'hs',
  'perdu'
);

-- Table matériel/outillage
CREATE TABLE public.equipment_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.equipment_category NOT NULL DEFAULT 'autre',
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  status public.equipment_status NOT NULL DEFAULT 'fonctionnel',
  location TEXT,
  notes TEXT,
  assigned_to_collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour la recherche
CREATE INDEX idx_equipment_agency ON public.equipment_inventory(agency_id);
CREATE INDEX idx_equipment_status ON public.equipment_inventory(status);
CREATE INDEX idx_equipment_category ON public.equipment_inventory(category);

-- Trigger updated_at
CREATE TRIGGER update_equipment_inventory_updated_at
  BEFORE UPDATE ON public.equipment_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view equipment"
  ON public.equipment_inventory FOR SELECT
  USING (agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "N2+ can insert equipment"
  ON public.equipment_inventory FOR INSERT
  WITH CHECK (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2));

CREATE POLICY "N2+ can update equipment"
  ON public.equipment_inventory FOR UPDATE
  USING (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2));

CREATE POLICY "N2+ can delete equipment"
  ON public.equipment_inventory FOR DELETE
  USING (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2));


-- ===========================================
-- AMÉLIORATION: Notifications EPI bidirectionnelles
-- ===========================================

-- Table de notifications EPI (N1 <-> N2)
CREATE TABLE public.epi_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'ack_signed',           -- N1 -> N2: attestation signée
    'ack_with_issues',      -- N1 -> N2: attestation signée avec problèmes
    'request_created',      -- N1 -> N2: nouvelle demande EPI
    'request_seen',         -- N2 -> N1: demande vue
    'request_approved',     -- N2 -> N1: demande approuvée/traitée
    'request_rejected',     -- N2 -> N1: demande refusée
    'epi_assigned',         -- N2 -> N1: EPI attribué
    'renewal_reminder',     -- Système -> N1: rappel renouvellement
    'ack_reminder'          -- Système -> N1: rappel signature mensuelle
  )),
  related_request_id UUID REFERENCES public.epi_requests(id) ON DELETE SET NULL,
  related_ack_id UUID REFERENCES public.epi_monthly_acknowledgements(id) ON DELETE SET NULL,
  related_assignment_id UUID REFERENCES public.epi_assignments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  seen_by_recipient BOOLEAN NOT NULL DEFAULT false,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_epi_notifications_recipient ON public.epi_notifications(recipient_id, is_read);
CREATE INDEX idx_epi_notifications_agency ON public.epi_notifications(agency_id);

-- RLS notifications EPI
ALTER TABLE public.epi_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
  ON public.epi_notifications FOR SELECT
  USING (
    recipient_id = get_current_collaborator_id() 
    OR sender_id = get_current_collaborator_id()
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
  );

CREATE POLICY "System and N2 can insert notifications"
  ON public.epi_notifications FOR INSERT
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid()) 
    OR sender_id = get_current_collaborator_id()
  );

CREATE POLICY "Recipients can update their notifications"
  ON public.epi_notifications FOR UPDATE
  USING (recipient_id = get_current_collaborator_id() OR has_min_global_role(auth.uid(), 2));


-- ===========================================
-- AMÉLIORATION: Statut demandes EPI plus détaillé
-- ===========================================

-- Ajouter un statut "seen" aux demandes EPI
ALTER TABLE public.epi_requests ADD COLUMN IF NOT EXISTS seen_by_manager_at TIMESTAMPTZ;
ALTER TABLE public.epi_requests ADD COLUMN IF NOT EXISTS seen_by_manager_id UUID REFERENCES public.profiles(id);


-- ===========================================
-- AMÉLIORATION: Ajout du type d'item au catalogue (epi vs materiel)
-- ===========================================

-- Ajouter un type pour distinguer EPI du matériel dans le catalogue
ALTER TABLE public.epi_catalog_items ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'epi' CHECK (item_type IN ('epi', 'materiel'));

-- Index
CREATE INDEX IF NOT EXISTS idx_catalog_item_type ON public.epi_catalog_items(item_type);


-- ===========================================
-- FONCTION: Générer les attestations mensuelles automatiquement
-- ===========================================

CREATE OR REPLACE FUNCTION public.auto_generate_monthly_epi_acks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_current_month TEXT;
  v_count INTEGER := 0;
  v_agency RECORD;
  v_collab RECORD;
  v_ack_id UUID;
  v_assignment RECORD;
BEGIN
  v_current_month := to_char(date_trunc('month', CURRENT_DATE), 'YYYY-MM-DD');
  
  -- Pour chaque agence active
  FOR v_agency IN 
    SELECT id FROM apogee_agencies WHERE is_active = true
  LOOP
    -- Pour chaque collaborateur actif avec des EPI
    FOR v_collab IN
      SELECT DISTINCT c.id, c.agency_id
      FROM collaborators c
      INNER JOIN epi_assignments ea ON ea.user_id = c.id AND ea.status = 'active'
      WHERE c.agency_id = v_agency.id
        AND c.leaving_date IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM epi_monthly_acknowledgements ema
          WHERE ema.user_id = c.id AND ema.month = v_current_month::DATE
        )
    LOOP
      -- Créer l'attestation
      INSERT INTO epi_monthly_acknowledgements (agency_id, user_id, month, status)
      VALUES (v_collab.agency_id, v_collab.id, v_current_month::DATE, 'pending')
      RETURNING id INTO v_ack_id;
      
      -- Créer les items de l'attestation
      FOR v_assignment IN
        SELECT id, catalog_item_id FROM epi_assignments
        WHERE user_id = v_collab.id AND status = 'active'
      LOOP
        INSERT INTO epi_monthly_ack_items (ack_id, assignment_id, is_confirmed)
        VALUES (v_ack_id, v_assignment.id, false);
      END LOOP;
      
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;