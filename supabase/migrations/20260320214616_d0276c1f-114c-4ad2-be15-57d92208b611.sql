-- Fix BD Story schema: add extracted columns, enrich batch table

-- 1. Rename misleading coupling_score to real extracted fields
ALTER TABLE public.bd_story_stories
  DROP COLUMN IF EXISTS coupling_score;

ALTER TABLE public.bd_story_stories
  ADD COLUMN IF NOT EXISTS validation_is_valid boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS validation_issue_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cta_mode text,
  ADD COLUMN IF NOT EXISTS coupling_score_total real DEFAULT 0;

-- 2. Enrich batch table
ALTER TABLE public.bd_story_batches
  ADD COLUMN IF NOT EXISTS generated_size integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'completed',
  ADD COLUMN IF NOT EXISTS coverage_percent real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS diversity_score_avg real DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bible_ok_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Rename batch_size to requested_size for clarity  
ALTER TABLE public.bd_story_batches RENAME COLUMN batch_size TO requested_size;