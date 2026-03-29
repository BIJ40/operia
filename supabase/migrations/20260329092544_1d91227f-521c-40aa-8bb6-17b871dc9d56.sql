-- BLOC 1: job_profile_presets
CREATE TABLE job_profile_presets (
  role_agence     TEXT PRIMARY KEY,
  label           TEXT NOT NULL,
  default_modules TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  sort_order      INT NOT NULL DEFAULT 0
);

ALTER TABLE job_profile_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY jpp_select ON job_profile_presets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY jpp_write ON job_profile_presets
  FOR ALL TO authenticated
  USING (has_min_global_role(auth.uid(), 5));

-- BLOC 2: Seed des 3 postes
INSERT INTO job_profile_presets (role_agence, label, default_modules, sort_order)
VALUES
  ('technicien', 'Technicien', ARRAY['support.guides','support.aide_en_ligne'], 1),
  ('administratif', 'Administratif', ARRAY['organisation.salaries','organisation.plannings','organisation.documents_legaux','mediatheque.consulter','support.guides','support.aide_en_ligne'], 2),
  ('commercial', 'Commercial', ARRAY['commercial.suivi_client','commercial.comparateur','commercial.prospects','support.guides','support.aide_en_ligne'], 3);