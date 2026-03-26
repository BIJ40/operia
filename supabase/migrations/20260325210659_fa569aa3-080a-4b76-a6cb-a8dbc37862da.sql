
-- Table absences techniciens structurée
CREATE TABLE public.technician_absences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  technician_apogee_id TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  absence_type TEXT NOT NULL DEFAULT 'autre',
  is_full_day BOOLEAN NOT NULL DEFAULT true,
  hours NUMERIC(4,1),
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_technician_absences_agency ON public.technician_absences(agency_id);
CREATE INDEX idx_technician_absences_tech_dates ON public.technician_absences(technician_apogee_id, start_date, end_date);

-- RLS
ALTER TABLE public.technician_absences ENABLE ROW LEVEL SECURITY;

-- Politique lecture par agence (authenticated)
CREATE POLICY "Users can read absences for their agency"
  ON public.technician_absences
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT aa.id FROM public.apogee_agencies aa
      INNER JOIN public.profiles p ON p.agency_id = aa.id
      WHERE p.id = auth.uid()
    )
  );

-- Politique insertion par agence
CREATE POLICY "Users can insert absences for their agency"
  ON public.technician_absences
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT aa.id FROM public.apogee_agencies aa
      INNER JOIN public.profiles p ON p.agency_id = aa.id
      WHERE p.id = auth.uid()
    )
  );

-- Politique update par agence
CREATE POLICY "Users can update absences for their agency"
  ON public.technician_absences
  FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT aa.id FROM public.apogee_agencies aa
      INNER JOIN public.profiles p ON p.agency_id = aa.id
      WHERE p.id = auth.uid()
    )
  );

-- Politique delete par agence
CREATE POLICY "Users can delete absences for their agency"
  ON public.technician_absences
  FOR DELETE
  TO authenticated
  USING (
    agency_id IN (
      SELECT aa.id FROM public.apogee_agencies aa
      INNER JOIN public.profiles p ON p.agency_id = aa.id
      WHERE p.id = auth.uid()
    )
  );
