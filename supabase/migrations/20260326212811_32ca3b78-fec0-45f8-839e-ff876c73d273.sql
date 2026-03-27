CREATE TABLE IF NOT EXISTS public.geocode_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  postal_code text NOT NULL,
  city text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  source text DEFAULT 'ban',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_geocode_cache_key ON public.geocode_cache(cache_key);
CREATE INDEX idx_geocode_cache_postal ON public.geocode_cache(postal_code);

ALTER TABLE public.geocode_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read geocode cache" ON public.geocode_cache FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage geocode cache" ON public.geocode_cache FOR ALL TO service_role USING (true) WITH CHECK (true);