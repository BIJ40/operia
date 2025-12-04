-- Table des demandes de congés/absences
CREATE TABLE public.leave_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collaborator_id uuid NOT NULL REFERENCES public.collaborators(id) ON DELETE CASCADE,
    agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
    
    -- Type d'absence
    type text NOT NULL CHECK (type IN ('CP', 'SANS_SOLDE', 'EVENT', 'MALADIE')),
    event_subtype text CHECK (event_subtype IN ('MARIAGE', 'NAISSANCE', 'DECES') OR event_subtype IS NULL),
    
    -- Dates
    start_date date NOT NULL,
    end_date date, -- Nullable pour MALADIE (renseigné par N2)
    days_count numeric(5,2), -- Calculé avec gestion samedi/fériés
    
    -- Workflow status
    status text NOT NULL DEFAULT 'PENDING_MANAGER' CHECK (status IN (
        'DRAFT',
        'PENDING_MANAGER',      -- En attente validation N2
        'PENDING_JUSTIFICATIVE', -- Retour N1 pour justificatif (maladie)
        'ACKNOWLEDGED',          -- Pris connaissance (maladie)
        'APPROVED',
        'REFUSED',
        'CLOSED'
    )),
    
    -- Justificatifs
    requires_justification boolean DEFAULT false,
    justification_document_id uuid REFERENCES public.collaborator_documents(id),
    
    -- Décision N2
    manager_comment text,
    refusal_reason text,
    validated_by uuid REFERENCES public.profiles(id),
    validated_at timestamptz,
    
    -- Métadonnées
    created_by uuid REFERENCES public.profiles(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ajouter leave_request_id à collaborator_documents pour lier les PDF générés
ALTER TABLE public.collaborator_documents 
ADD COLUMN IF NOT EXISTS leave_request_id uuid REFERENCES public.leave_requests(id) ON DELETE SET NULL;

-- Index pour performances
CREATE INDEX idx_leave_requests_collaborator ON public.leave_requests(collaborator_id);
CREATE INDEX idx_leave_requests_agency ON public.leave_requests(agency_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_leave_requests_type ON public.leave_requests(type);
CREATE INDEX idx_collaborator_documents_leave_request ON public.collaborator_documents(leave_request_id);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- N1 (salarié) peut voir ses propres demandes
CREATE POLICY "leave_requests_employee_select" ON public.leave_requests
FOR SELECT USING (
    collaborator_id = get_current_collaborator_id()
);

-- N1 peut créer ses propres demandes
CREATE POLICY "leave_requests_employee_insert" ON public.leave_requests
FOR INSERT WITH CHECK (
    collaborator_id = get_current_collaborator_id()
);

-- N1 peut modifier ses demandes en attente (ajout justificatif)
CREATE POLICY "leave_requests_employee_update" ON public.leave_requests
FOR UPDATE USING (
    collaborator_id = get_current_collaborator_id() 
    AND status IN ('PENDING_JUSTIFICATIVE', 'DRAFT')
);

-- N2+ (managers agence) peuvent voir toutes les demandes de leur agence
CREATE POLICY "leave_requests_manager_select" ON public.leave_requests
FOR SELECT USING (
    has_min_global_role(auth.uid(), 6) OR
    (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
);

-- N2+ peuvent modifier les demandes de leur agence
CREATE POLICY "leave_requests_manager_update" ON public.leave_requests
FOR UPDATE USING (
    has_min_global_role(auth.uid(), 6) OR
    (agency_id = get_user_agency_id(auth.uid()) AND has_min_global_role(auth.uid(), 2))
);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_leave_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leave_requests_updated_at
    BEFORE UPDATE ON public.leave_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_leave_requests_updated_at();

-- Table des jours fériés français (pour calcul)
CREATE TABLE IF NOT EXISTS public.french_holidays (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date date NOT NULL UNIQUE,
    name text NOT NULL,
    year integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM date)) STORED
);

-- Index pour recherche par année
CREATE INDEX idx_french_holidays_year ON public.french_holidays(year);
CREATE INDEX idx_french_holidays_date ON public.french_holidays(date);

-- Jours fériés fixes 2024-2026
INSERT INTO public.french_holidays (date, name) VALUES
-- 2024
('2024-01-01', 'Jour de l''An'),
('2024-04-01', 'Lundi de Pâques'),
('2024-05-01', 'Fête du Travail'),
('2024-05-08', 'Victoire 1945'),
('2024-05-09', 'Ascension'),
('2024-05-20', 'Lundi de Pentecôte'),
('2024-07-14', 'Fête Nationale'),
('2024-08-15', 'Assomption'),
('2024-11-01', 'Toussaint'),
('2024-11-11', 'Armistice'),
('2024-12-25', 'Noël'),
-- 2025
('2025-01-01', 'Jour de l''An'),
('2025-04-21', 'Lundi de Pâques'),
('2025-05-01', 'Fête du Travail'),
('2025-05-08', 'Victoire 1945'),
('2025-05-29', 'Ascension'),
('2025-06-09', 'Lundi de Pentecôte'),
('2025-07-14', 'Fête Nationale'),
('2025-08-15', 'Assomption'),
('2025-11-01', 'Toussaint'),
('2025-11-11', 'Armistice'),
('2025-12-25', 'Noël'),
-- 2026
('2026-01-01', 'Jour de l''An'),
('2026-04-06', 'Lundi de Pâques'),
('2026-05-01', 'Fête du Travail'),
('2026-05-08', 'Victoire 1945'),
('2026-05-14', 'Ascension'),
('2026-05-25', 'Lundi de Pentecôte'),
('2026-07-14', 'Fête Nationale'),
('2026-08-15', 'Assomption'),
('2026-11-01', 'Toussaint'),
('2026-11-11', 'Armistice'),
('2026-12-25', 'Noël')
ON CONFLICT (date) DO NOTHING;

-- RLS pour french_holidays (lecture seule pour tous)
ALTER TABLE public.french_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "french_holidays_select" ON public.french_holidays
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Fonction pour calculer les jours ouvrés (avec samedi si vendredi posé, excl. fériés)
CREATE OR REPLACE FUNCTION calculate_leave_days(
    p_start_date date,
    p_end_date date,
    p_type text
) RETURNS numeric AS $$
DECLARE
    v_days numeric := 0;
    v_current date := p_start_date;
    v_prev_was_friday boolean := false;
BEGIN
    IF p_end_date IS NULL OR p_start_date > p_end_date THEN
        RETURN 0;
    END IF;
    
    WHILE v_current <= p_end_date LOOP
        -- Vérifier si c'est un jour férié
        IF NOT EXISTS (SELECT 1 FROM public.french_holidays WHERE date = v_current) THEN
            -- Pour CP: lun-ven + samedi si vendredi posé
            IF p_type = 'CP' THEN
                IF EXTRACT(DOW FROM v_current) BETWEEN 1 AND 5 THEN
                    -- Lundi à Vendredi
                    v_days := v_days + 1;
                    v_prev_was_friday := (EXTRACT(DOW FROM v_current) = 5);
                ELSIF EXTRACT(DOW FROM v_current) = 6 AND v_prev_was_friday THEN
                    -- Samedi après un vendredi posé
                    v_days := v_days + 1;
                    v_prev_was_friday := false;
                ELSE
                    v_prev_was_friday := false;
                END IF;
            ELSE
                -- Pour autres types: jours calendaires (lun-sam)
                IF EXTRACT(DOW FROM v_current) BETWEEN 1 AND 6 THEN
                    v_days := v_days + 1;
                END IF;
            END IF;
        END IF;
        
        v_current := v_current + 1;
    END LOOP;
    
    RETURN v_days;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable realtime for leave_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.leave_requests;