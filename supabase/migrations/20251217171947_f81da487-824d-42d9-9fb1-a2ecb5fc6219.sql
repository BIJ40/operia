-- Create apporteur_contacts table for managing contacts without portal access
CREATE TABLE public.apporteur_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  apporteur_id UUID NOT NULL REFERENCES public.apporteurs(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  fonction TEXT,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  notes TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for performance
CREATE INDEX idx_apporteur_contacts_apporteur_id ON public.apporteur_contacts(apporteur_id);
CREATE INDEX idx_apporteur_contacts_agency_id ON public.apporteur_contacts(agency_id);

-- Enable RLS
ALTER TABLE public.apporteur_contacts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: N2+ can manage contacts for their agency's apporteurs
CREATE POLICY "apporteur_contacts_select_agency"
ON public.apporteur_contacts
FOR SELECT
USING (
  has_min_global_role(auth.uid(), 2) 
  AND agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "apporteur_contacts_insert_agency"
ON public.apporteur_contacts
FOR INSERT
WITH CHECK (
  has_min_global_role(auth.uid(), 2) 
  AND agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "apporteur_contacts_update_agency"
ON public.apporteur_contacts
FOR UPDATE
USING (
  has_min_global_role(auth.uid(), 2) 
  AND agency_id = get_user_agency_id(auth.uid())
)
WITH CHECK (
  has_min_global_role(auth.uid(), 2) 
  AND agency_id = get_user_agency_id(auth.uid())
);

CREATE POLICY "apporteur_contacts_delete_agency"
ON public.apporteur_contacts
FOR DELETE
USING (
  has_min_global_role(auth.uid(), 2) 
  AND agency_id = get_user_agency_id(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_apporteur_contacts_updated_at
BEFORE UPDATE ON public.apporteur_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one primary contact per apporteur
CREATE UNIQUE INDEX idx_apporteur_contacts_primary_unique 
ON public.apporteur_contacts(apporteur_id) 
WHERE is_primary = true;