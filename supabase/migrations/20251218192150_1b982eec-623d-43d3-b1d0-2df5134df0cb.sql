-- Table pour stocker les réunions RH passées
CREATE TABLE public.rh_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  description TEXT,
  presentation_url TEXT,
  presentation_file_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Index pour les requêtes par agence et date
CREATE INDEX idx_rh_meetings_agency_date ON public.rh_meetings(agency_id, meeting_date DESC);

-- Enable RLS
ALTER TABLE public.rh_meetings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view meetings from their agency"
ON public.rh_meetings FOR SELECT
USING (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create meetings for their agency"
ON public.rh_meetings FOR INSERT
WITH CHECK (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update meetings from their agency"
ON public.rh_meetings FOR UPDATE
USING (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete meetings from their agency"
ON public.rh_meetings FOR DELETE
USING (
  agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Trigger pour updated_at
CREATE TRIGGER update_rh_meetings_updated_at
BEFORE UPDATE ON public.rh_meetings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();