-- BD Story module tables

-- Stories table: stores generated story JSON + metadata
CREATE TABLE public.bd_story_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  story_key text NOT NULL,
  title text NOT NULL,
  summary text,
  universe text NOT NULL,
  story_family text NOT NULL,
  template_key text NOT NULL,
  problem_slug text NOT NULL,
  technician_slug text NOT NULL,
  client_profile_slug text,
  tone text,
  panels jsonb NOT NULL DEFAULT '[]'::jsonb,
  story_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  board_prompt_master text,
  diversity_score real DEFAULT 0,
  coupling_score real DEFAULT 0,
  is_favorite boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  campaign_mode text,
  batch_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Batches table: groups of stories generated together
CREATE TABLE public.bd_story_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.apogee_agencies(id) ON DELETE CASCADE,
  batch_size integer NOT NULL,
  campaign_mode text,
  input_params jsonb DEFAULT '{}'::jsonb,
  report jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key from stories to batches
ALTER TABLE public.bd_story_stories
  ADD CONSTRAINT bd_story_stories_batch_id_fkey
  FOREIGN KEY (batch_id) REFERENCES public.bd_story_batches(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX idx_bd_story_stories_agency ON public.bd_story_stories(agency_id);
CREATE INDEX idx_bd_story_stories_universe ON public.bd_story_stories(universe);
CREATE INDEX idx_bd_story_stories_status ON public.bd_story_stories(status);
CREATE INDEX idx_bd_story_stories_batch ON public.bd_story_stories(batch_id);
CREATE INDEX idx_bd_story_batches_agency ON public.bd_story_batches(agency_id);

-- RLS
ALTER TABLE public.bd_story_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bd_story_batches ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage stories for their agency
CREATE POLICY "Users can view their agency bd stories"
  ON public.bd_story_stories FOR SELECT TO authenticated
  USING (agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert bd stories for their agency"
  ON public.bd_story_stories FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their agency bd stories"
  ON public.bd_story_stories FOR UPDATE TO authenticated
  USING (agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their agency bd stories"
  ON public.bd_story_stories FOR DELETE TO authenticated
  USING (agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can view their agency bd batches"
  ON public.bd_story_batches FOR SELECT TO authenticated
  USING (agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert bd batches for their agency"
  ON public.bd_story_batches FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (
    SELECT agency_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.bd_story_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bd_story_stories_updated_at
  BEFORE UPDATE ON public.bd_story_stories
  FOR EACH ROW EXECUTE FUNCTION public.bd_story_updated_at();