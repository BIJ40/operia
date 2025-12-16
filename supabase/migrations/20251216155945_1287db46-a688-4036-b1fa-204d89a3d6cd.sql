-- ============================================
-- PHASE 1 — ESPACE APPORTEUR (DB + RLS)
-- No changes to global_role
-- No FOR ALL policies
-- ============================================

-- =========================
-- 1) TABLES
-- =========================

-- 1.1 apporteurs (organisations)
CREATE TABLE IF NOT EXISTS public.apporteurs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'agence_immo',
  apogee_client_id INTEGER,
  logo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT apporteurs_type_check CHECK (type IN ('agence_immo','syndic','assurance','courtier'))
);

CREATE INDEX IF NOT EXISTS idx_apporteurs_agency_id ON public.apporteurs(agency_id);
CREATE INDEX IF NOT EXISTS idx_apporteurs_apogee_client_id ON public.apporteurs(apogee_client_id);

DROP TRIGGER IF EXISTS trg_apporteurs_updated_at ON public.apporteurs;
CREATE TRIGGER trg_apporteurs_updated_at
BEFORE UPDATE ON public.apporteurs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.2 apporteur_users (liaison auth.users)
CREATE TABLE IF NOT EXISTS public.apporteur_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apporteur_id UUID NOT NULL REFERENCES public.apporteurs(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'reader',
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ DEFAULT now(),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT apporteur_users_role_check CHECK (role IN ('reader','manager')),
  CONSTRAINT apporteur_users_unique_user_per_apporteur UNIQUE (apporteur_id, user_id),
  CONSTRAINT apporteur_users_unique_user_per_agency UNIQUE (agency_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_apporteur_users_user_id ON public.apporteur_users(user_id);
CREATE INDEX IF NOT EXISTS idx_apporteur_users_apporteur_id ON public.apporteur_users(apporteur_id);
CREATE INDEX IF NOT EXISTS idx_apporteur_users_agency_id ON public.apporteur_users(agency_id);

DROP TRIGGER IF EXISTS trg_apporteur_users_updated_at ON public.apporteur_users;
CREATE TRIGGER trg_apporteur_users_updated_at
BEFORE UPDATE ON public.apporteur_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.3 apporteur_project_links (liaison projets Apogée)
CREATE TABLE IF NOT EXISTS public.apporteur_project_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apporteur_id UUID NOT NULL REFERENCES public.apporteurs(id) ON DELETE CASCADE,
  apogee_project_id INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT apporteur_project_links_one_apporteur_per_project UNIQUE (agency_id, apogee_project_id)
);

CREATE INDEX IF NOT EXISTS idx_apporteur_project_links_apporteur_id ON public.apporteur_project_links(apporteur_id);
CREATE INDEX IF NOT EXISTS idx_apporteur_project_links_agency_id ON public.apporteur_project_links(agency_id);
CREATE INDEX IF NOT EXISTS idx_apporteur_project_links_apogee_project_id ON public.apporteur_project_links(apogee_project_id);

-- 1.4 apporteur_intervention_requests
CREATE TABLE IF NOT EXISTS public.apporteur_intervention_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apporteur_id UUID NOT NULL REFERENCES public.apporteurs(id) ON DELETE CASCADE,
  apporteur_user_id UUID NOT NULL REFERENCES public.apporteur_users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL,
  tenant_name TEXT NOT NULL,
  tenant_phone TEXT,
  tenant_email TEXT,
  owner_name TEXT,
  address TEXT NOT NULL,
  postal_code TEXT,
  city TEXT,
  description TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'normal',
  availability TEXT,
  comments TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  internal_ticket_id UUID,
  apogee_project_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT apporteur_requests_urgency_check CHECK (urgency IN ('normal','urgent')),
  CONSTRAINT apporteur_requests_status_check CHECK (status IN ('pending','received','assigned','completed'))
);

CREATE INDEX IF NOT EXISTS idx_apporteur_requests_apporteur_created ON public.apporteur_intervention_requests(apporteur_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apporteur_requests_agency_created ON public.apporteur_intervention_requests(agency_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_apporteur_requests_updated_at ON public.apporteur_intervention_requests;
CREATE TRIGGER trg_apporteur_requests_updated_at
BEFORE UPDATE ON public.apporteur_intervention_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1.5 apporteur_access_logs
CREATE TABLE IF NOT EXISTS public.apporteur_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  apporteur_user_id UUID NOT NULL REFERENCES public.apporteur_users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apporteur_access_logs_user_created ON public.apporteur_access_logs(apporteur_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apporteur_access_logs_agency_created ON public.apporteur_access_logs(agency_id, created_at DESC);

-- =========================
-- 2) COHERENCE TRIGGERS
-- =========================

CREATE OR REPLACE FUNCTION public.check_apporteur_user_agency_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.agency_id != (SELECT a.agency_id FROM public.apporteurs a WHERE a.id = NEW.apporteur_id) THEN
    RAISE EXCEPTION 'agency_id mismatch: apporteur_users.agency_id must match apporteurs.agency_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_apporteur_user_agency ON public.apporteur_users;
CREATE TRIGGER trg_check_apporteur_user_agency
BEFORE INSERT OR UPDATE ON public.apporteur_users
FOR EACH ROW EXECUTE FUNCTION public.check_apporteur_user_agency_consistency();

CREATE OR REPLACE FUNCTION public.check_project_link_agency_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.agency_id != (SELECT a.agency_id FROM public.apporteurs a WHERE a.id = NEW.apporteur_id) THEN
    RAISE EXCEPTION 'agency_id mismatch: apporteur_project_links.agency_id must match apporteurs.agency_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_project_link_agency ON public.apporteur_project_links;
CREATE TRIGGER trg_check_project_link_agency
BEFORE INSERT OR UPDATE ON public.apporteur_project_links
FOR EACH ROW EXECUTE FUNCTION public.check_project_link_agency_consistency();

-- =========================
-- 3) HELPERS (SECURITY DEFINER)
-- =========================

CREATE OR REPLACE FUNCTION public.is_apporteur_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.apporteur_users au
    WHERE au.user_id = auth.uid()
      AND au.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_my_apporteur_user_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT au.id
  FROM public.apporteur_users au
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_apporteur_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT au.apporteur_id
  FROM public.apporteur_users au
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_my_apporteur_agency_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT au.agency_id
  FROM public.apporteur_users au
  WHERE au.user_id = auth.uid()
    AND au.is_active = true
  LIMIT 1;
$$;

-- =========================
-- 4) RLS ENABLE
-- =========================

ALTER TABLE public.apporteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apporteur_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apporteur_project_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apporteur_intervention_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apporteur_access_logs ENABLE ROW LEVEL SECURITY;

-- =========================
-- 5) POLICIES (NO FOR ALL)
-- =========================

-- apporteurs
DROP POLICY IF EXISTS "apporteur_select_own_org" ON public.apporteurs;
CREATE POLICY "apporteur_select_own_org"
ON public.apporteurs FOR SELECT
USING (id = public.get_my_apporteur_id());

DROP POLICY IF EXISTS "apporteurs_admin_insert" ON public.apporteurs;
CREATE POLICY "apporteurs_admin_insert"
ON public.apporteurs FOR INSERT
WITH CHECK (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteurs_admin_update" ON public.apporteurs;
CREATE POLICY "apporteurs_admin_update"
ON public.apporteurs FOR UPDATE
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
)
WITH CHECK (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteurs_admin_delete" ON public.apporteurs;
CREATE POLICY "apporteurs_admin_delete"
ON public.apporteurs FOR DELETE
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- apporteur_users
DROP POLICY IF EXISTS "apporteur_users_select_self" ON public.apporteur_users;
CREATE POLICY "apporteur_users_select_self"
ON public.apporteur_users FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "apporteur_users_select_admin" ON public.apporteur_users;
CREATE POLICY "apporteur_users_select_admin"
ON public.apporteur_users FOR SELECT
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteur_users_admin_insert" ON public.apporteur_users;
CREATE POLICY "apporteur_users_admin_insert"
ON public.apporteur_users FOR INSERT
WITH CHECK (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteur_users_admin_update" ON public.apporteur_users;
CREATE POLICY "apporteur_users_admin_update"
ON public.apporteur_users FOR UPDATE
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
)
WITH CHECK (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteur_users_admin_delete" ON public.apporteur_users;
CREATE POLICY "apporteur_users_admin_delete"
ON public.apporteur_users FOR DELETE
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- apporteur_project_links
DROP POLICY IF EXISTS "apporteur_links_select_own" ON public.apporteur_project_links;
CREATE POLICY "apporteur_links_select_own"
ON public.apporteur_project_links FOR SELECT
USING (apporteur_id = public.get_my_apporteur_id());

DROP POLICY IF EXISTS "apporteur_links_admin_insert" ON public.apporteur_project_links;
CREATE POLICY "apporteur_links_admin_insert"
ON public.apporteur_project_links FOR INSERT
WITH CHECK (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteur_links_admin_update" ON public.apporteur_project_links;
CREATE POLICY "apporteur_links_admin_update"
ON public.apporteur_project_links FOR UPDATE
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
)
WITH CHECK (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteur_links_admin_delete" ON public.apporteur_project_links;
CREATE POLICY "apporteur_links_admin_delete"
ON public.apporteur_project_links FOR DELETE
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- apporteur_intervention_requests
DROP POLICY IF EXISTS "apporteur_requests_select_own" ON public.apporteur_intervention_requests;
CREATE POLICY "apporteur_requests_select_own"
ON public.apporteur_intervention_requests FOR SELECT
USING (apporteur_id = public.get_my_apporteur_id());

DROP POLICY IF EXISTS "apporteur_requests_select_admin" ON public.apporteur_intervention_requests;
CREATE POLICY "apporteur_requests_select_admin"
ON public.apporteur_intervention_requests FOR SELECT
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteur_requests_insert_own" ON public.apporteur_intervention_requests;
CREATE POLICY "apporteur_requests_insert_own"
ON public.apporteur_intervention_requests FOR INSERT
WITH CHECK (
  apporteur_id = public.get_my_apporteur_id()
  AND apporteur_user_id = public.get_my_apporteur_user_id()
  AND agency_id = public.get_my_apporteur_agency_id()
);

DROP POLICY IF EXISTS "apporteur_requests_admin_update" ON public.apporteur_intervention_requests;
CREATE POLICY "apporteur_requests_admin_update"
ON public.apporteur_intervention_requests FOR UPDATE
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
)
WITH CHECK (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

DROP POLICY IF EXISTS "apporteur_requests_admin_delete" ON public.apporteur_intervention_requests;
CREATE POLICY "apporteur_requests_admin_delete"
ON public.apporteur_intervention_requests FOR DELETE
USING (
  public.has_min_global_role(auth.uid(), 2)
  AND agency_id = public.get_user_agency_id(auth.uid())
);

-- apporteur_access_logs (client insert forbidden; select audit N5+)
DROP POLICY IF EXISTS "apporteur_logs_select_admin_audit" ON public.apporteur_access_logs;
CREATE POLICY "apporteur_logs_select_admin_audit"
ON public.apporteur_access_logs FOR SELECT
USING (public.has_min_global_role(auth.uid(), 5));