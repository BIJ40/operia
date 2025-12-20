-- =============================================
-- EPI Management System - Complete Schema
-- =============================================

-- 1. Catalog Items (Référentiel EPI)
CREATE TABLE public.epi_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('casque', 'gants', 'lunettes', 'chaussures', 'harnais', 'masque', 'vetement', 'gilet', 'protection_auditive', 'autre')),
  requires_size BOOLEAN NOT NULL DEFAULT false,
  available_sizes TEXT[] DEFAULT NULL,
  default_renewal_days INTEGER DEFAULT 365,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Stock EPI
CREATE TABLE public.epi_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES public.epi_catalog_items(id) ON DELETE CASCADE,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_threshold INTEGER DEFAULT 5,
  location TEXT DEFAULT 'Agence',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, catalog_item_id, size)
);

-- 3. EPI Requests (Demandes)
CREATE TABLE public.epi_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  requester_user_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES public.epi_catalog_items(id) ON DELETE CASCADE,
  size TEXT,
  reason TEXT NOT NULL CHECK (reason IN ('missing', 'renewal', 'new_hire', 'size_change')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'blocking')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_info', 'fulfilled', 'cancelled')),
  reviewed_by_user_id UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. EPI Assignments (Attributions)
CREATE TABLE public.epi_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES public.epi_catalog_items(id) ON DELETE CASCADE,
  size TEXT,
  serial_number TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_by_user_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'replaced', 'lost')),
  expected_renewal_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. EPI Incidents (Signalements)
CREATE TABLE public.epi_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.epi_assignments(id) ON DELETE SET NULL,
  catalog_item_id UUID REFERENCES public.epi_catalog_items(id),
  incident_type TEXT NOT NULL CHECK (incident_type IN ('worn', 'broken', 'non_compliant', 'lost', 'stolen')),
  severity TEXT NOT NULL DEFAULT 'minor' CHECK (severity IN ('minor', 'major', 'blocking')),
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'rejected')),
  handled_by_user_id UUID REFERENCES public.profiles(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. EPI Incident Attachments
CREATE TABLE public.epi_incident_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES public.epi_incidents(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Monthly Acknowledgements (Attestations mensuelles)
CREATE TABLE public.epi_monthly_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed_by_n1', 'signed_by_n2', 'overdue')),
  signed_by_n1_at TIMESTAMPTZ,
  n1_signature_ip TEXT,
  n1_signature_ua TEXT,
  signed_by_n2_at TIMESTAMPTZ,
  n2_signer_id UUID REFERENCES public.profiles(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id, month)
);

-- 8. Monthly Ack Items (Détail attestation)
CREATE TABLE public.epi_monthly_ack_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ack_id UUID NOT NULL REFERENCES public.epi_monthly_acknowledgements(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.epi_assignments(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES public.epi_catalog_items(id),
  size TEXT,
  is_confirmed_present BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. EPI Documents
CREATE TABLE public.epi_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  ack_id UUID REFERENCES public.epi_monthly_acknowledgements(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('monthly_ack', 'delivery_note', 'incident_report', 'assignment_receipt')),
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_epi_catalog_agency ON public.epi_catalog_items(agency_id) WHERE agency_id IS NOT NULL;
CREATE INDEX idx_epi_catalog_active ON public.epi_catalog_items(is_active) WHERE is_active = true;
CREATE INDEX idx_epi_stock_agency ON public.epi_stock(agency_id);
CREATE INDEX idx_epi_requests_agency_status ON public.epi_requests(agency_id, status);
CREATE INDEX idx_epi_requests_requester ON public.epi_requests(requester_user_id);
CREATE INDEX idx_epi_assignments_agency_user ON public.epi_assignments(agency_id, user_id);
CREATE INDEX idx_epi_assignments_status ON public.epi_assignments(status) WHERE status = 'active';
CREATE INDEX idx_epi_incidents_agency_status ON public.epi_incidents(agency_id, status);
CREATE INDEX idx_epi_incidents_reporter ON public.epi_incidents(reporter_user_id);
CREATE INDEX idx_epi_acks_agency_month ON public.epi_monthly_acknowledgements(agency_id, month);
CREATE INDEX idx_epi_acks_user_status ON public.epi_monthly_acknowledgements(user_id, status);
CREATE INDEX idx_epi_documents_agency_user ON public.epi_documents(agency_id, user_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_epi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_epi_catalog_items_updated_at BEFORE UPDATE ON public.epi_catalog_items FOR EACH ROW EXECUTE FUNCTION update_epi_updated_at();
CREATE TRIGGER update_epi_stock_updated_at BEFORE UPDATE ON public.epi_stock FOR EACH ROW EXECUTE FUNCTION update_epi_updated_at();
CREATE TRIGGER update_epi_requests_updated_at BEFORE UPDATE ON public.epi_requests FOR EACH ROW EXECUTE FUNCTION update_epi_updated_at();
CREATE TRIGGER update_epi_assignments_updated_at BEFORE UPDATE ON public.epi_assignments FOR EACH ROW EXECUTE FUNCTION update_epi_updated_at();
CREATE TRIGGER update_epi_incidents_updated_at BEFORE UPDATE ON public.epi_incidents FOR EACH ROW EXECUTE FUNCTION update_epi_updated_at();
CREATE TRIGGER update_epi_acks_updated_at BEFORE UPDATE ON public.epi_monthly_acknowledgements FOR EACH ROW EXECUTE FUNCTION update_epi_updated_at();

-- Enable RLS on all tables
ALTER TABLE public.epi_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_incident_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_monthly_acknowledgements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_monthly_ack_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epi_documents ENABLE ROW LEVEL SECURITY;

-- Helper function to get collaborator's agency
CREATE OR REPLACE FUNCTION get_collaborator_for_user(p_user_id UUID)
RETURNS TABLE(collaborator_id UUID, collaborator_agency_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT c.id, c.agency_id
  FROM collaborators c
  JOIN profiles p ON c.email = p.email OR c.id = (
    SELECT col.id FROM collaborators col WHERE col.email = (SELECT pr.email FROM auth.users au JOIN profiles pr ON pr.id = au.id WHERE au.id = p_user_id)
  )
  WHERE p.id = p_user_id
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- RLS Policies

-- EPI Catalog Items: Global items (agency_id IS NULL) visible to all, agency-specific visible to agency members
CREATE POLICY "epi_catalog_select" ON public.epi_catalog_items FOR SELECT
  USING (agency_id IS NULL OR agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "epi_catalog_insert" ON public.epi_catalog_items FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 2) AND (agency_id IS NULL OR agency_id = get_user_agency_id(auth.uid())));

CREATE POLICY "epi_catalog_update" ON public.epi_catalog_items FOR UPDATE
  USING (has_min_global_role(auth.uid(), 2) AND (agency_id IS NULL OR agency_id = get_user_agency_id(auth.uid())));

CREATE POLICY "epi_catalog_delete" ON public.epi_catalog_items FOR DELETE
  USING (has_min_global_role(auth.uid(), 3) AND (agency_id IS NULL OR agency_id = get_user_agency_id(auth.uid())));

-- EPI Stock: N2+ can manage their agency's stock
CREATE POLICY "epi_stock_select" ON public.epi_stock FOR SELECT
  USING (agency_id = get_user_agency_id(auth.uid()) OR has_min_global_role(auth.uid(), 3));

CREATE POLICY "epi_stock_insert" ON public.epi_stock FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "epi_stock_update" ON public.epi_stock FOR UPDATE
  USING (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "epi_stock_delete" ON public.epi_stock FOR DELETE
  USING (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

-- EPI Requests: N1 can create/view own, N2+ can view/manage agency
CREATE POLICY "epi_requests_select_own" ON public.epi_requests FOR SELECT
  USING (
    requester_user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 3)
  );

CREATE POLICY "epi_requests_insert" ON public.epi_requests FOR INSERT
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND requester_user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "epi_requests_update_n1" ON public.epi_requests FOR UPDATE
  USING (
    requester_user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
    AND status = 'pending'
  );

CREATE POLICY "epi_requests_update_n2" ON public.epi_requests FOR UPDATE
  USING (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

-- EPI Assignments: N1 views own, N2+ manages agency
CREATE POLICY "epi_assignments_select" ON public.epi_assignments FOR SELECT
  USING (
    user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 3)
  );

CREATE POLICY "epi_assignments_insert" ON public.epi_assignments FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "epi_assignments_update" ON public.epi_assignments FOR UPDATE
  USING (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "epi_assignments_delete" ON public.epi_assignments FOR DELETE
  USING (has_min_global_role(auth.uid(), 3) AND agency_id = get_user_agency_id(auth.uid()));

-- EPI Incidents: N1 creates/views own, N2+ manages agency
CREATE POLICY "epi_incidents_select" ON public.epi_incidents FOR SELECT
  USING (
    reporter_user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 3)
  );

CREATE POLICY "epi_incidents_insert" ON public.epi_incidents FOR INSERT
  WITH CHECK (
    agency_id = get_user_agency_id(auth.uid())
    AND reporter_user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
  );

CREATE POLICY "epi_incidents_update" ON public.epi_incidents FOR UPDATE
  USING (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

-- EPI Incident Attachments
CREATE POLICY "epi_attachments_select" ON public.epi_incident_attachments FOR SELECT
  USING (
    incident_id IN (
      SELECT id FROM epi_incidents WHERE 
        reporter_user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
        OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    )
  );

CREATE POLICY "epi_attachments_insert" ON public.epi_incident_attachments FOR INSERT
  WITH CHECK (
    incident_id IN (
      SELECT id FROM epi_incidents WHERE 
        reporter_user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
    )
  );

-- Monthly Acknowledgements
CREATE POLICY "epi_acks_select" ON public.epi_monthly_acknowledgements FOR SELECT
  USING (
    user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 3)
  );

CREATE POLICY "epi_acks_insert" ON public.epi_monthly_acknowledgements FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

CREATE POLICY "epi_acks_update_n1" ON public.epi_monthly_acknowledgements FOR UPDATE
  USING (
    user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
    AND status = 'pending'
  );

CREATE POLICY "epi_acks_update_n2" ON public.epi_monthly_acknowledgements FOR UPDATE
  USING (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

-- Monthly Ack Items
CREATE POLICY "epi_ack_items_select" ON public.epi_monthly_ack_items FOR SELECT
  USING (
    ack_id IN (
      SELECT id FROM epi_monthly_acknowledgements WHERE
        user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
        OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    )
  );

CREATE POLICY "epi_ack_items_insert" ON public.epi_monthly_ack_items FOR INSERT
  WITH CHECK (
    ack_id IN (SELECT id FROM epi_monthly_acknowledgements WHERE agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
  );

CREATE POLICY "epi_ack_items_update" ON public.epi_monthly_ack_items FOR UPDATE
  USING (
    ack_id IN (
      SELECT id FROM epi_monthly_acknowledgements WHERE
        (user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid())) AND status = 'pending')
        OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    )
  );

-- EPI Documents
CREATE POLICY "epi_documents_select" ON public.epi_documents FOR SELECT
  USING (
    user_id IN (SELECT id FROM collaborators WHERE email = (SELECT email FROM profiles WHERE id = auth.uid()))
    OR (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
    OR has_min_global_role(auth.uid(), 3)
  );

CREATE POLICY "epi_documents_insert" ON public.epi_documents FOR INSERT
  WITH CHECK (has_min_global_role(auth.uid(), 2) AND agency_id = get_user_agency_id(auth.uid()));

-- Insert default global catalog items
INSERT INTO public.epi_catalog_items (agency_id, name, category, requires_size, available_sizes, default_renewal_days, description, is_active) VALUES
  (NULL, 'Casque de chantier', 'casque', false, NULL, 730, 'Casque de protection standard', true),
  (NULL, 'Gants de manutention', 'gants', true, ARRAY['7', '8', '9', '10', '11'], 90, 'Gants de travail résistants', true),
  (NULL, 'Gants nitrile', 'gants', true, ARRAY['S', 'M', 'L', 'XL'], 30, 'Gants jetables nitrile', true),
  (NULL, 'Lunettes de protection', 'lunettes', false, NULL, 365, 'Lunettes anti-projections', true),
  (NULL, 'Chaussures de sécurité', 'chaussures', true, ARRAY['39', '40', '41', '42', '43', '44', '45', '46'], 365, 'Chaussures S3 avec coque', true),
  (NULL, 'Harnais antichute', 'harnais', true, ARRAY['S/M', 'L/XL'], 365, 'Harnais complet avec longe', true),
  (NULL, 'Masque FFP2', 'masque', false, NULL, 1, 'Masque de protection respiratoire', true),
  (NULL, 'Masque à cartouche', 'masque', false, NULL, 180, 'Demi-masque avec filtres', true),
  (NULL, 'Gilet haute visibilité', 'gilet', true, ARRAY['S', 'M', 'L', 'XL', 'XXL'], 365, 'Gilet jaune classe 2', true),
  (NULL, 'Bouchons anti-bruit', 'protection_auditive', false, NULL, 7, 'Bouchons mousse jetables', true),
  (NULL, 'Casque anti-bruit', 'protection_auditive', false, NULL, 730, 'Casque antibruit 30dB', true);

-- Create storage bucket for EPI documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('epi-documents', 'epi-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for epi-documents bucket
CREATE POLICY "epi_docs_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'epi-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "epi_docs_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'epi-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "epi_docs_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'epi-documents' AND has_min_global_role(auth.uid(), 2));