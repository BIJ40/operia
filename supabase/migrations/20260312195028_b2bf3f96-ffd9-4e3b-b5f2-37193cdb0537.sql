-- Seed test user profiles for QA testing
INSERT INTO profiles (id, email, first_name, last_name, global_role, is_active)
VALUES 
  ('0f9df9fe-36c0-47b2-af60-6430da50680c', 'test-n1@helpconfort.test', 'Test', 'N1-Agence', 'franchisee_user', true),
  ('2a9402f2-6590-4ec4-b3ac-dc9b973f0958', 'test-n2@helpconfort.test', 'Test', 'N2-Franchisee', 'franchisee_admin', true),
  ('76d340b2-bc81-4055-bb51-47cef6b0ae59', 'test-n3@helpconfort.test', 'Test', 'N3-Franchisor', 'franchisor_user', true),
  ('384280d0-80a0-413a-9834-55996e8f6e5e', 'test-n5@helpconfort.test', 'Test', 'N5-PlatformAdmin', 'platform_admin', true)
ON CONFLICT (id) DO NOTHING;