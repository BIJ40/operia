-- Rate limiting table for persistent rate limiting across Edge Function cold starts
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created ON public.rate_limits(key, created_at DESC);

-- Auto-cleanup old entries (older than 1 hour)
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON public.rate_limits(created_at);

-- RLS: Only service role can access (Edge Functions use service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- No policies needed - only service role key has access