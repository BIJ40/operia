
-- =============================================
-- Module Résultat : Tables financières
-- =============================================

-- 1. agency_financial_months
CREATE TABLE public.agency_financial_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  year integer NOT NULL,
  month integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  nb_interventions integer DEFAULT 0,
  nb_factures integer DEFAULT 0,
  heures_facturees numeric(10,2) DEFAULT 0,
  ca_total numeric(12,2) DEFAULT 0,
  achats numeric(12,2) DEFAULT 0,
  sous_traitance numeric(12,2) DEFAULT 0,
  synced_at timestamptz,
  sync_version integer DEFAULT 0,
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agency_id, year, month)
);

-- 2. agency_financial_charges
CREATE TABLE public.agency_financial_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  charge_type text NOT NULL,
  category text NOT NULL CHECK (category IN ('FIXE','VARIABLE')),
  label text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  start_month date NOT NULL,
  end_month date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Indexes
CREATE INDEX idx_afm_agency_year ON public.agency_financial_months(agency_id, year);
CREATE INDEX idx_afc_agency_period ON public.agency_financial_charges(agency_id, start_month);
CREATE INDEX idx_afc_charge_type ON public.agency_financial_charges(charge_type);

-- 4. updated_at triggers
CREATE OR REPLACE FUNCTION public.trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_financial_months
  BEFORE UPDATE ON public.agency_financial_months
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

CREATE TRIGGER set_updated_at_financial_charges
  BEFORE UPDATE ON public.agency_financial_charges
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_updated_at();

-- 5. Lock protection trigger
CREATE OR REPLACE FUNCTION public.trg_prevent_locked_month_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.locked_at IS NOT NULL AND NEW.locked_at IS NOT NULL THEN
    RAISE EXCEPTION 'Ce mois est verrouillé et ne peut pas être modifié';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_locked_month_update
  BEFORE UPDATE ON public.agency_financial_months
  FOR EACH ROW EXECUTE FUNCTION public.trg_prevent_locked_month_update();

-- 6. View agency_financial_summary
CREATE OR REPLACE VIEW public.agency_financial_summary AS
SELECT
  m.id, m.agency_id, m.year, m.month,
  make_date(m.year, m.month, 1)::text AS month_date,
  m.locked_at, m.synced_at, m.sync_version,
  m.nb_interventions, m.nb_factures, m.heures_facturees,
  m.ca_total, m.achats, m.sous_traitance,
  (m.ca_total - m.sous_traitance) AS ca_net,
  (m.ca_total - m.sous_traitance - m.achats) AS marge_brute,
  COALESCE(cv.total, 0) AS charges_variables,
  (m.ca_total - m.sous_traitance - m.achats - COALESCE(cv.total, 0)) AS marge_contributive,
  COALESCE(cf.total, 0) AS charges_fixes,
  (m.ca_total - m.sous_traitance - m.achats - COALESCE(cv.total, 0) - COALESCE(cf.total, 0)) AS resultat_exploitation
FROM public.agency_financial_months m
LEFT JOIN LATERAL (
  SELECT SUM(c.amount) AS total FROM public.agency_financial_charges c
  WHERE c.agency_id = m.agency_id AND c.category = 'VARIABLE'
    AND c.start_month <= make_date(m.year, m.month, 1)
    AND (c.end_month IS NULL OR c.end_month >= make_date(m.year, m.month, 1))
) cv ON true
LEFT JOIN LATERAL (
  SELECT SUM(c.amount) AS total FROM public.agency_financial_charges c
  WHERE c.agency_id = m.agency_id AND c.category = 'FIXE'
    AND c.start_month <= make_date(m.year, m.month, 1)
    AND (c.end_month IS NULL OR c.end_month >= make_date(m.year, m.month, 1))
) cf ON true;

-- 7. RPC update_financial_charge (versionnement temporel)
CREATE OR REPLACE FUNCTION public.update_financial_charge(
  p_charge_id uuid,
  p_new_amount numeric,
  p_new_start_month date,
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_new_id uuid;
  v_locked boolean;
BEGIN
  -- Check if the target month is locked
  SELECT EXISTS(
    SELECT 1 FROM agency_financial_months
    WHERE agency_id = (SELECT agency_id FROM agency_financial_charges WHERE id = p_charge_id)
      AND make_date(year, month, 1) = p_new_start_month
      AND locked_at IS NOT NULL
  ) INTO v_locked;
  
  IF v_locked THEN
    RAISE EXCEPTION 'Le mois cible est verrouillé';
  END IF;

  -- Close current version
  UPDATE agency_financial_charges
  SET end_month = p_new_start_month - interval '1 day'
  WHERE id = p_charge_id AND end_month IS NULL;

  -- Create new version
  INSERT INTO agency_financial_charges (agency_id, charge_type, category, label, amount, start_month, notes)
    SELECT agency_id, charge_type, category, label, p_new_amount, p_new_start_month, COALESCE(p_notes, notes)
    FROM agency_financial_charges WHERE id = p_charge_id
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- 8. RLS
ALTER TABLE public.agency_financial_months ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_financial_charges ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read their agency's data
CREATE POLICY "Users can read own agency financial months"
  ON public.agency_financial_months FOR SELECT TO authenticated
  USING (agency_id IN (
    SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can insert own agency financial months"
  ON public.agency_financial_months FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (
    SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can update own agency financial months"
  ON public.agency_financial_months FOR UPDATE TO authenticated
  USING (agency_id IN (
    SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can read own agency financial charges"
  ON public.agency_financial_charges FOR SELECT TO authenticated
  USING (agency_id IN (
    SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can insert own agency financial charges"
  ON public.agency_financial_charges FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (
    SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
  ));

CREATE POLICY "Users can update own agency financial charges"
  ON public.agency_financial_charges FOR UPDATE TO authenticated
  USING (agency_id IN (
    SELECT p.agency_id FROM public.profiles p WHERE p.id = auth.uid()
  ));
