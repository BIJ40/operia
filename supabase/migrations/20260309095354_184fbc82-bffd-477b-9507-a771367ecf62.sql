-- Step 1: Delete the Apogée-only duplicates FIRST (no user_id, no related data)
DELETE FROM collaborators WHERE id = '35218fc6-7270-4c17-b019-a5b81c74635c';
DELETE FROM collaborators WHERE id = 'ac237dac-ba9c-4ef6-a814-fe15c22bd2f7';

-- Step 2: Now safely update Jérôme's platform entry with his apogee_user_id
-- Disable sync triggers temporarily to avoid circular trigger issue
SET LOCAL session_replication_role = 'replica';
UPDATE collaborators SET apogee_user_id = 7, updated_at = now() WHERE id = '1abd5c2c-409e-4e89-9349-46b7478483ff';
SET LOCAL session_replication_role = 'origin';