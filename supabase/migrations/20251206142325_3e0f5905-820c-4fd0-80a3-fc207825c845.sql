-- Table de cache pour les résultats de recherche IA
CREATE TABLE IF NOT EXISTS public.ai_search_cache (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ttl_seconds INTEGER NOT NULL DEFAULT 900
);

-- Index pour le nettoyage des entrées expirées
CREATE INDEX IF NOT EXISTS idx_ai_search_cache_created_at 
  ON public.ai_search_cache (created_at);

-- Index pour les requêtes par préfixe de clé (stats:*, intent:*)
CREATE INDEX IF NOT EXISTS idx_ai_search_cache_key_prefix 
  ON public.ai_search_cache (key text_pattern_ops);

-- Commentaires
COMMENT ON TABLE public.ai_search_cache IS 'Cache multi-niveau pour les résultats de recherche IA StatIA';
COMMENT ON COLUMN public.ai_search_cache.key IS 'Clé unique de cache (format: stat:{json} ou intent:{hash})';
COMMENT ON COLUMN public.ai_search_cache.value IS 'Valeur mise en cache (résultat JSON)';
COMMENT ON COLUMN public.ai_search_cache.ttl_seconds IS 'Durée de vie en secondes (300=5min, 86400=24h)';

-- RLS - accès authentifié uniquement
ALTER TABLE public.ai_search_cache ENABLE ROW LEVEL SECURITY;

-- Policy: tous les utilisateurs authentifiés peuvent lire/écrire le cache
CREATE POLICY "Authenticated users can manage cache"
  ON public.ai_search_cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fonction de nettoyage des entrées expirées
CREATE OR REPLACE FUNCTION public.cleanup_ai_search_cache()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.ai_search_cache
  WHERE created_at < now() - (ttl_seconds * INTERVAL '1 second');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_ai_search_cache IS 'Nettoie les entrées de cache expirées, retourne le nombre supprimé';