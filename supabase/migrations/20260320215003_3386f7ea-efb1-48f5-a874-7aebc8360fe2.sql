-- Remove misleading coupling_score_total, add missing analytical columns
ALTER TABLE bd_story_stories DROP COLUMN IF EXISTS coupling_score_total;
ALTER TABLE bd_story_stories ADD COLUMN IF NOT EXISTS bible_violation_count integer NOT NULL DEFAULT 0;
ALTER TABLE bd_story_stories ADD COLUMN IF NOT EXISTS narrative_distance_score real DEFAULT 0;

-- Index for batch lookups
CREATE INDEX IF NOT EXISTS idx_bd_story_stories_batch_id ON bd_story_stories(batch_id) WHERE batch_id IS NOT NULL;