CREATE TABLE IF NOT EXISTS public.bank_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  external_item_id text,
  payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_webhook_events_item ON public.bank_webhook_events (external_item_id, event_type);
CREATE INDEX IF NOT EXISTS idx_bank_webhook_events_unprocessed ON public.bank_webhook_events (processed) WHERE processed = false;

ALTER TABLE public.bank_webhook_events ENABLE ROW LEVEL SECURITY;