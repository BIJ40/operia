-- Table pour stocker les données extraites des bulletins de paie
CREATE TABLE public.payslip_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.collaborator_documents(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  
  -- Période
  periode_mois INTEGER,
  periode_annee INTEGER,
  periode_date_debut DATE,
  periode_date_fin DATE,
  
  -- Données extraites (JSON complet)
  raw_data JSONB NOT NULL DEFAULT '{}',
  
  -- Champs clés extraits pour requêtes/stats rapides
  taux_horaire_brut NUMERIC(10,4),
  heures_base NUMERIC(10,2),
  montant_brut_base NUMERIC(12,2),
  total_brut NUMERIC(12,2),
  net_imposable NUMERIC(12,2),
  net_a_payer NUMERIC(12,2),
  montant_net_social NUMERIC(12,2),
  total_charges_salariales NUMERIC(12,2),
  total_charges_patronales NUMERIC(12,2),
  cout_global_employeur NUMERIC(12,2),
  
  -- Cumuls annuels
  brut_cumule NUMERIC(12,2),
  net_imposable_cumule NUMERIC(12,2),
  heures_cumulees NUMERIC(10,2),
  
  -- Métadonnées extraction
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'success', 'error')),
  extraction_warnings TEXT[],
  extraction_error TEXT,
  extracted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Un seul enregistrement par document
  UNIQUE(document_id)
);

-- Index pour les requêtes stats
CREATE INDEX idx_payslip_data_collaborator ON public.payslip_data(collaborator_id);
CREATE INDEX idx_payslip_data_agency ON public.payslip_data(agency_id);
CREATE INDEX idx_payslip_data_periode ON public.payslip_data(periode_annee, periode_mois);
CREATE INDEX idx_payslip_data_status ON public.payslip_data(extraction_status);

-- RLS
ALTER TABLE public.payslip_data ENABLE ROW LEVEL SECURITY;

-- Admins/RH de l'agence peuvent voir
CREATE POLICY "payslip_data_admin_select" ON public.payslip_data
  FOR SELECT USING (
    (agency_id = get_user_agency_id(auth.uid())) 
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  );

-- Admins/RH peuvent insérer/modifier
CREATE POLICY "payslip_data_admin_insert" ON public.payslip_data
  FOR INSERT WITH CHECK (
    (agency_id = get_user_agency_id(auth.uid())) 
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  );

CREATE POLICY "payslip_data_admin_update" ON public.payslip_data
  FOR UPDATE USING (
    (agency_id = get_user_agency_id(auth.uid())) 
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  );

CREATE POLICY "payslip_data_admin_delete" ON public.payslip_data
  FOR DELETE USING (
    (agency_id = get_user_agency_id(auth.uid())) 
    AND (has_min_global_role(auth.uid(), 2) OR has_agency_rh_role(auth.uid(), agency_id))
  );

-- Trigger updated_at
CREATE TRIGGER update_payslip_data_updated_at
  BEFORE UPDATE ON public.payslip_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();