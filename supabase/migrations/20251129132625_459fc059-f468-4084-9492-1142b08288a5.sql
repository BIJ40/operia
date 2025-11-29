-- 1. Ajouter agency_id (uuid) dans profiles pour lien direct avec apogee_agencies
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.apogee_agencies(id) ON DELETE SET NULL;

-- 2. Créer le type enum pour les rôles collaborateurs (unifié avec role_agence existant)
DO $$ BEGIN
  CREATE TYPE public.collaborator_role AS ENUM (
    'dirigeant',
    'assistant',
    'technicien',
    'commercial',
    'associe',
    'tete_de_reseau',
    'externe',
    'autre'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. Table collaborateurs d'agence
CREATE TABLE IF NOT EXISTS public.agency_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  role text NOT NULL DEFAULT 'autre',
  is_registered_user boolean NOT NULL DEFAULT false,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  CONSTRAINT agency_collaborators_role_check CHECK (
    role IN ('dirigeant', 'assistant', 'technicien', 'commercial', 'associe', 'tete_de_reseau', 'externe', 'autre')
  )
);

-- 4. Index pour performance
CREATE INDEX IF NOT EXISTS idx_agency_collaborators_agency_id ON public.agency_collaborators(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_collaborators_user_id ON public.agency_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_agency_collaborators_is_registered ON public.agency_collaborators(is_registered_user);
CREATE INDEX IF NOT EXISTS idx_profiles_agency_id ON public.profiles(agency_id);

-- 5. Trigger updated_at (réutilise la fonction existante)
DROP TRIGGER IF EXISTS trg_agency_collaborators_updated_at ON public.agency_collaborators;
CREATE TRIGGER trg_agency_collaborators_updated_at
BEFORE UPDATE ON public.agency_collaborators
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 6. RLS
ALTER TABLE public.agency_collaborators ENABLE ROW LEVEL SECURITY;

-- Lecture : utilisateurs de la même agence OU N3+ OU admin
CREATE POLICY "read_agency_collaborators"
ON public.agency_collaborators
FOR SELECT
USING (
  has_min_global_role(auth.uid(), 3) -- N3+ voit tout
  OR agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
  OR agency_id IN (
    SELECT aa.id FROM public.apogee_agencies aa 
    WHERE aa.slug = (SELECT agence FROM public.profiles WHERE id = auth.uid())
  )
);

-- Insert : N2+ de leur agence OU N3+
CREATE POLICY "insert_agency_collaborators"
ON public.agency_collaborators
FOR INSERT
WITH CHECK (
  has_min_global_role(auth.uid(), 3)
  OR (
    has_min_global_role(auth.uid(), 2)
    AND (
      agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
      OR agency_id IN (
        SELECT aa.id FROM public.apogee_agencies aa 
        WHERE aa.slug = (SELECT agence FROM public.profiles WHERE id = auth.uid())
      )
    )
  )
);

-- Update : N2+ de leur agence OU N3+
CREATE POLICY "update_agency_collaborators"
ON public.agency_collaborators
FOR UPDATE
USING (
  has_min_global_role(auth.uid(), 3)
  OR (
    has_min_global_role(auth.uid(), 2)
    AND (
      agency_id = (SELECT agency_id FROM public.profiles WHERE id = auth.uid())
      OR agency_id IN (
        SELECT aa.id FROM public.apogee_agencies aa 
        WHERE aa.slug = (SELECT agence FROM public.profiles WHERE id = auth.uid())
      )
    )
  )
);

-- Delete : N3+ uniquement (protection)
CREATE POLICY "delete_agency_collaborators"
ON public.agency_collaborators
FOR DELETE
USING (has_min_global_role(auth.uid(), 3));