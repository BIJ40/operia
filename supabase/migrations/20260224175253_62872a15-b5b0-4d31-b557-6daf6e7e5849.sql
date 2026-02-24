-- Security linter fixes (retry without pg_net SET SCHEMA)

-- 1) Fix permissive RLS policy on ai_search_cache
DROP POLICY IF EXISTS "Authenticated users can manage cache" ON public.ai_search_cache;

CREATE POLICY "Admins can manage ai_search_cache"
ON public.ai_search_cache
FOR ALL
TO authenticated
USING (public.has_min_global_role(auth.uid(), 5))
WITH CHECK (public.has_min_global_role(auth.uid(), 5));

-- 2) Move pg_trgm out of public schema (pg_net cannot be moved: extension limitation)
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Compatibility wrappers (public.*) -> (extensions.*)
CREATE OR REPLACE FUNCTION public.set_limit(real)
RETURNS real
LANGUAGE sql
STABLE
STRICT
AS $$
  SELECT extensions.set_limit($1);
$$;

CREATE OR REPLACE FUNCTION public.show_limit()
RETURNS real
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.show_limit();
$$;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.show_trgm($1);
$$;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.similarity($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.word_similarity($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.similarity_op($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.word_similarity_op($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.similarity_dist($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.word_similarity_dist_op($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.word_similarity_dist_commutator_op($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
AS $$
  SELECT extensions.word_similarity_commutator_op($1, $2);
$$;
