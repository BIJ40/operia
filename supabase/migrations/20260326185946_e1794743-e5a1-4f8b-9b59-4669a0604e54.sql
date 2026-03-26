-- Bridge-specific columns on bank_connections
ALTER TABLE public.bank_connections 
  ADD COLUMN IF NOT EXISTS external_user_id TEXT,
  ADD COLUMN IF NOT EXISTS external_item_id TEXT,
  ADD COLUMN IF NOT EXISTS redirect_session_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_status TEXT,
  ADD COLUMN IF NOT EXISTS provider_last_payload JSONB DEFAULT '{}'::jsonb;

-- Bridge-specific columns on bank_accounts
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS provider_account_type TEXT,
  ADD COLUMN IF NOT EXISTS instant_balance NUMERIC(15,2);

-- Bridge-specific columns on bank_transactions
ALTER TABLE public.bank_transactions
  ADD COLUMN IF NOT EXISTS raw_payload JSONB DEFAULT '{}'::jsonb;

-- Bridge user mapping table (durable relationship)
CREATE TABLE IF NOT EXISTS public.bridge_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  bridge_user_uuid TEXT NOT NULL,
  bridge_user_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, agency_id)
);

ALTER TABLE public.bridge_user_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bum_select" ON public.bridge_user_mappings FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "bum_service_all" ON public.bridge_user_mappings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Add service_role policy for bank_accounts writes (backend sync)
CREATE POLICY "ba_service_all" ON public.bank_accounts FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Add service_role policy for bank_connections writes (backend updates)
CREATE POLICY "bc_service_all" ON public.bank_connections FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Index for dedup
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_transactions_external_dedup 
  ON public.bank_transactions(external_transaction_id) WHERE external_transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_external_dedup 
  ON public.bank_accounts(external_account_id, bank_connection_id) WHERE external_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bridge_user_mappings_user ON public.bridge_user_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_ext_user ON public.bank_connections(external_user_id);