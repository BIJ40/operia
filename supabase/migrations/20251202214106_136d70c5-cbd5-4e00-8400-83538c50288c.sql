-- Insert a template agency for storing global royalty model templates
INSERT INTO public.apogee_agencies (id, slug, label, is_active)
VALUES ('00000000-0000-0000-0000-000000000000', '_template_models', 'Modèles de barèmes (système)', false)
ON CONFLICT (id) DO NOTHING;