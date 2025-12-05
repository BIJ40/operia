-- Add unique constraint on source_block_id for upsert to work
ALTER TABLE formation_content ADD CONSTRAINT formation_content_source_block_id_key UNIQUE (source_block_id);