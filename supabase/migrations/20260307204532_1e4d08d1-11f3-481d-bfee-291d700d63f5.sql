-- Insert 5 protected users into user_modules (Philippe Massari excluded - no profile)
INSERT INTO public.user_modules (user_id, module_key, options, enabled_by)
VALUES
  ('e43de17a-ce1d-4238-aeaa-4b57f4b822e2', 'ticketing', '{"kanban": true, "create": true, "history": true}'::jsonb, NULL),
  ('46ca0725-c16e-4d95-a8df-42deecbbc61c', 'ticketing', '{"kanban": true, "create": true, "history": true}'::jsonb, NULL),
  ('acf6013b-e774-4aa0-88c7-bfe44dd82607', 'ticketing', '{"kanban": true, "create": true, "history": true}'::jsonb, NULL),
  ('4837965e-11e0-4639-8283-1808292a1c2b', 'ticketing', '{"kanban": true, "create": true, "history": true}'::jsonb, NULL),
  ('9b80c88a-546c-4329-b04a-6977c5e46fad', 'ticketing', '{"kanban": true, "create": true, "history": true}'::jsonb, NULL)
ON CONFLICT (user_id, module_key) DO NOTHING;

-- Clean protected_user_access table
DELETE FROM public.protected_user_access WHERE access_type = 'projects';