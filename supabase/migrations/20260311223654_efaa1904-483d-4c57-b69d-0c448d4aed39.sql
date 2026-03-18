-- Cleanup: remove existing modules for test user
DELETE FROM user_modules WHERE user_id = '295f6b74-4ac4-4252-afb4-7816463d21ea';

-- Add only ticketing
INSERT INTO user_modules (user_id, module_key, options, enabled_by)
VALUES (
  '295f6b74-4ac4-4252-afb4-7816463d21ea',
  'ticketing',
  '{}'::jsonb,
  '295f6b74-4ac4-4252-afb4-7816463d21ea'
);

-- Ensure global_role is base_user (no bypass)
UPDATE profiles
SET global_role = 'base_user', enabled_modules = NULL
WHERE id = '295f6b74-4ac4-4252-afb4-7816463d21ea';