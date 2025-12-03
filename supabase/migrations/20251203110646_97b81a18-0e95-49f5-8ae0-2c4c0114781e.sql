-- Phase 2: Contrats & Salaires

-- 1) Table employment_contracts
CREATE TABLE IF NOT EXISTS employment_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collaborator_id uuid NOT NULL REFERENCES collaborators(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES apogee_agencies(id) ON DELETE CASCADE,
  contract_type text NOT NULL, -- 'CDI' | 'CDD' | 'APPRENTISSAGE' | 'STAGE' | 'INTERIM'
  start_date date NOT NULL,
  end_date date,
  weekly_hours numeric,
  job_title text,
  job_category text, -- TECHNICIEN, ASSISTANTE, DIRIGEANT, COMMERCIAL, AUTRE
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Un seul contrat courant par collaborateur
CREATE UNIQUE INDEX IF NOT EXISTS employment_contracts_unique_current
  ON employment_contracts (collaborator_id)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS employment_contracts_collab_idx
  ON employment_contracts (collaborator_id);

CREATE INDEX IF NOT EXISTS employment_contracts_agency_idx
  ON employment_contracts (agency_id);

-- 2) Table salary_history
CREATE TABLE IF NOT EXISTS salary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES employment_contracts(id) ON DELETE CASCADE,
  effective_date date NOT NULL,
  hourly_rate numeric,
  monthly_salary numeric,
  reason_type text, -- 'EMBAUCHE' | 'AUGMENTATION' | 'AVENANT' | 'PRIME'
  comment text,
  decided_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salary_history_contract_idx
  ON salary_history (contract_id);

CREATE INDEX IF NOT EXISTS salary_history_effective_date_idx
  ON salary_history (effective_date DESC);

CREATE UNIQUE INDEX IF NOT EXISTS salary_history_unique_per_date
  ON salary_history (contract_id, effective_date);

-- 3) RLS pour employment_contracts
ALTER TABLE employment_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY employment_contracts_select
ON employment_contracts FOR SELECT
USING (
  has_min_global_role(auth.uid(), 3)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2)
      OR has_agency_rh_role(auth.uid(), agency_id)
    )
  )
);

CREATE POLICY employment_contracts_insert
ON employment_contracts FOR INSERT
WITH CHECK (
  has_min_global_role(auth.uid(), 3)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2)
      OR has_agency_rh_role(auth.uid(), agency_id)
    )
  )
);

CREATE POLICY employment_contracts_update
ON employment_contracts FOR UPDATE
USING (
  has_min_global_role(auth.uid(), 3)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND (
      has_min_global_role(auth.uid(), 2)
      OR has_agency_rh_role(auth.uid(), agency_id)
    )
  )
);

CREATE POLICY employment_contracts_delete
ON employment_contracts FOR DELETE
USING (
  has_min_global_role(auth.uid(), 3)
  OR (
    agency_id = get_user_agency_id(auth.uid())
    AND has_min_global_role(auth.uid(), 2)
  )
);

-- 4) RLS pour salary_history
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY salary_history_select
ON salary_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employment_contracts ec
    WHERE ec.id = contract_id
    AND (
      has_min_global_role(auth.uid(), 3)
      OR (
        ec.agency_id = get_user_agency_id(auth.uid())
        AND (
          has_min_global_role(auth.uid(), 2)
          OR has_agency_rh_role(auth.uid(), ec.agency_id)
        )
      )
    )
  )
);

CREATE POLICY salary_history_insert
ON salary_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employment_contracts ec
    WHERE ec.id = contract_id
    AND (
      has_min_global_role(auth.uid(), 3)
      OR (
        ec.agency_id = get_user_agency_id(auth.uid())
        AND (
          has_min_global_role(auth.uid(), 2)
          OR has_agency_rh_role(auth.uid(), ec.agency_id)
        )
      )
    )
  )
);

CREATE POLICY salary_history_update
ON salary_history FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employment_contracts ec
    WHERE ec.id = contract_id
    AND (
      has_min_global_role(auth.uid(), 3)
      OR (
        ec.agency_id = get_user_agency_id(auth.uid())
        AND (
          has_min_global_role(auth.uid(), 2)
          OR has_agency_rh_role(auth.uid(), ec.agency_id)
        )
      )
    )
  )
);

CREATE POLICY salary_history_delete
ON salary_history FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM employment_contracts ec
    WHERE ec.id = contract_id
    AND (
      has_min_global_role(auth.uid(), 3)
      OR (
        ec.agency_id = get_user_agency_id(auth.uid())
        AND has_min_global_role(auth.uid(), 2)
      )
    )
  )
);