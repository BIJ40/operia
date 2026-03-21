-- Clean up: delete the bd-story-assets bucket via proper method
-- First empty the bucket objects, then delete the bucket
-- Use a DO block to handle this safely
DO $$
BEGIN
  -- Delete all objects first
  DELETE FROM storage.objects WHERE bucket_id = 'bd-story-assets';
EXCEPTION WHEN OTHERS THEN
  -- Ignore if bucket doesn't exist or protected
  NULL;
END $$;

-- Try to delete the bucket
DO $$
BEGIN
  DELETE FROM storage.buckets WHERE id = 'bd-story-assets';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;