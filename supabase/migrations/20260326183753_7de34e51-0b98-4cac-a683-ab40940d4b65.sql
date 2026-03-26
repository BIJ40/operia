
CREATE TABLE IF NOT EXISTS public.bank_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'bridge',
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_ready BOOLEAN NOT NULL DEFAULT false,
  config_status TEXT NOT NULL DEFAULT 'not_configured' CHECK (config_status IN ('not_configured', 'partial', 'ready', 'error')),
  has_client_id BOOLEAN NOT NULL DEFAULT false,
  has_secret_key BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'bridge',
  external_connection_id TEXT,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connecting', 'active', 'syncing', 'requires_reauth', 'expired', 'error', 'disconnected')),
  consent_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_success_sync_at TIMESTAMPTZ,
  last_error_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  external_account_id TEXT,
  bank_name TEXT NOT NULL,
  account_label TEXT NOT NULL,
  iban_masked TEXT,
  currency TEXT NOT NULL DEFAULT 'EUR',
  account_type TEXT NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking', 'savings', 'card', 'loan', 'other')),
  balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(15,2),
  balance_updated_at TIMESTAMPTZ,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'stale')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  external_transaction_id TEXT,
  booking_date DATE NOT NULL,
  value_date DATE,
  label TEXT NOT NULL,
  raw_label TEXT,
  amount NUMERIC(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  transaction_type TEXT NOT NULL DEFAULT 'other' CHECK (transaction_type IN ('debit', 'credit', 'other')),
  provider_category TEXT,
  internal_category TEXT,
  reconciliation_status TEXT NOT NULL DEFAULT 'unmatched' CHECK (reconciliation_status IN ('unmatched', 'suggested', 'matched', 'manual_match', 'ignored')),
  reconciliation_confidence NUMERIC(3,2),
  matched_invoice_id UUID,
  matched_facture_id UUID,
  matched_project_id UUID,
  pointed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bank_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_connection_id UUID NOT NULL REFERENCES public.bank_connections(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL DEFAULT 'full' CHECK (sync_type IN ('full', 'incremental', 'accounts_only', 'transactions_only')),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'success', 'partial', 'error')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  items_received INTEGER NOT NULL DEFAULT 0,
  items_created INTEGER NOT NULL DEFAULT 0,
  items_updated INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

ALTER TABLE public.bank_provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_sync_logs ENABLE ROW LEVEL SECURITY;

-- bank_provider_configs
CREATE POLICY "bpc_select" ON public.bank_provider_configs FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "bpc_insert" ON public.bank_provider_configs FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "bpc_update" ON public.bank_provider_configs FOR UPDATE TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid())) WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()));

-- bank_connections
CREATE POLICY "bc_select" ON public.bank_connections FOR SELECT TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "bc_insert" ON public.bank_connections FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()) AND user_id = auth.uid());
CREATE POLICY "bc_update" ON public.bank_connections FOR UPDATE TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid())) WITH CHECK (agency_id = public.get_user_agency_id(auth.uid()));
CREATE POLICY "bc_delete" ON public.bank_connections FOR DELETE TO authenticated
  USING (agency_id = public.get_user_agency_id(auth.uid()) AND user_id = auth.uid());

-- bank_accounts (via join)
CREATE POLICY "ba_select" ON public.bank_accounts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bank_connections bc WHERE bc.id = bank_accounts.bank_connection_id AND bc.agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "ba_insert" ON public.bank_accounts FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.bank_connections bc WHERE bc.id = bank_accounts.bank_connection_id AND bc.agency_id = public.get_user_agency_id(auth.uid())));
CREATE POLICY "ba_update" ON public.bank_accounts FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bank_connections bc WHERE bc.id = bank_accounts.bank_connection_id AND bc.agency_id = public.get_user_agency_id(auth.uid())));

-- bank_transactions: SELECT only client-side
CREATE POLICY "bt_select" ON public.bank_transactions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bank_accounts ba JOIN public.bank_connections bc ON bc.id = ba.bank_connection_id
    WHERE ba.id = bank_transactions.bank_account_id AND bc.agency_id = public.get_user_agency_id(auth.uid())
  ));

-- bank_sync_logs: SELECT only
CREATE POLICY "bsl_select" ON public.bank_sync_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bank_connections bc WHERE bc.id = bank_sync_logs.bank_connection_id AND bc.agency_id = public.get_user_agency_id(auth.uid())));

-- Service role for backend writes
CREATE POLICY "bt_service_all" ON public.bank_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "bsl_service_all" ON public.bank_sync_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bank_connections_agency ON public.bank_connections(agency_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON public.bank_connections(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON public.bank_accounts(bank_connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON public.bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions(booking_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_reconciliation ON public.bank_transactions(reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_bank_sync_logs_connection ON public.bank_sync_logs(bank_connection_id);

INSERT INTO public.plan_tier_modules (tier_key, module_key)
VALUES ('PRO', 'pilotage.tresorerie')
ON CONFLICT DO NOTHING;
