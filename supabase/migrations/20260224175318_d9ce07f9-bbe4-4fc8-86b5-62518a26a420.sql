-- Fix linter: function_search_path_mutable for pg_trgm compatibility wrappers

CREATE OR REPLACE FUNCTION public.set_limit(real)
RETURNS real
LANGUAGE sql
STABLE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.set_limit($1);
$$;

CREATE OR REPLACE FUNCTION public.show_limit()
RETURNS real
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.show_limit();
$$;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.show_trgm($1);
$$;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.similarity($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.word_similarity($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.similarity_op($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.word_similarity_op($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.similarity_dist($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.word_similarity_dist_op($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
RETURNS real
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.word_similarity_dist_commutator_op($1, $2);
$$;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
STRICT
SECURITY INVOKER
SET search_path TO public, extensions
AS $$
  SELECT extensions.word_similarity_commutator_op($1, $2);
$$;
