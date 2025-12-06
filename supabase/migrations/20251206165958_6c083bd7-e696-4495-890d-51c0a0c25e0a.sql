-- =============================================
-- HELPI: Normalisation guide_chunks + match_knowledge
-- =============================================

-- 1) Normalisation des block_type existants
UPDATE public.guide_chunks SET block_type = 'apogee' 
WHERE block_type IN ('apogee_guide', 'section/apogee');

UPDATE public.guide_chunks SET block_type = 'helpconfort' 
WHERE block_type IN ('helpconfort_guide', 'section/helpconfort', 'section');

UPDATE public.guide_chunks SET block_type = 'document' 
WHERE block_type IN ('documents', 'doc');

UPDATE public.guide_chunks SET block_type = 'faq' 
WHERE block_type IN ('faq_items');

-- 2) Ajouter colonnes manquantes
ALTER TABLE public.guide_chunks ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE public.guide_chunks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.guide_chunks ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.guide_chunks ADD COLUMN IF NOT EXISTS tokens INTEGER;

-- 3) Migrer les données vers les nouvelles colonnes
UPDATE public.guide_chunks SET 
  source_id = COALESCE(block_id, id::text),
  title = block_title,
  content = chunk_text,
  tokens = COALESCE(LENGTH(chunk_text), 0)
WHERE source_id IS NULL OR title IS NULL OR content IS NULL;

-- 4) Trigger de mise à jour updated_at
CREATE OR REPLACE FUNCTION public.set_guide_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guide_chunks_updated_at ON public.guide_chunks;

CREATE TRIGGER trg_guide_chunks_updated_at
BEFORE UPDATE ON public.guide_chunks
FOR EACH ROW
EXECUTE FUNCTION public.set_guide_chunks_updated_at();

-- 5) Fonction match_knowledge pour recherche filtrée
CREATE OR REPLACE FUNCTION public.match_knowledge(
  p_match_count INT DEFAULT 20,
  p_allowed_block_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  source_id TEXT,
  block_type TEXT,
  title TEXT,
  content TEXT,
  embedding JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    COALESCE(g.source_id, g.block_id) as source_id,
    g.block_type,
    COALESCE(g.title, g.block_title) as title,
    COALESCE(g.content, g.chunk_text) as content,
    g.embedding
  FROM public.guide_chunks g
  WHERE g.embedding IS NOT NULL
    AND (p_allowed_block_types IS NULL OR g.block_type = ANY(p_allowed_block_types))
  LIMIT p_match_count;
END;
$$;

-- 6) Fonction pour stats Helpi dashboard
CREATE OR REPLACE FUNCTION public.get_helpi_stats()
RETURNS TABLE (
  total_chunks BIGINT,
  chunks_with_embedding BIGINT,
  by_block_type JSONB,
  last_indexed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_chunks,
    COUNT(*) FILTER (WHERE g.embedding IS NOT NULL)::BIGINT as chunks_with_embedding,
    (
      SELECT jsonb_agg(jsonb_build_object('block_type', bt.block_type, 'count', bt.cnt))
      FROM (
        SELECT g2.block_type, COUNT(*)::INTEGER as cnt 
        FROM public.guide_chunks g2 
        GROUP BY g2.block_type
      ) bt
    ) as by_block_type,
    MAX(g.updated_at) as last_indexed_at
  FROM public.guide_chunks g;
END;
$$;