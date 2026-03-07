-- Convert text columns storing dates (DD/MM/YYYY format) to proper date type

-- 1. agency_commercial_profile.date_creation text → date
ALTER TABLE agency_commercial_profile 
  ALTER COLUMN date_creation TYPE date USING (
    CASE 
      WHEN date_creation IS NULL OR date_creation = '' THEN NULL
      WHEN date_creation ~ '^\d{2}/\d{2}/\d{4}$' THEN to_date(date_creation, 'DD/MM/YYYY')
      WHEN date_creation ~ '^\d{4}-\d{2}-\d{2}' THEN date_creation::date
      ELSE NULL
    END
  );

-- 2. prospect_pool.date_creation_etablissement text → date  
ALTER TABLE prospect_pool 
  ALTER COLUMN date_creation_etablissement TYPE date USING (
    CASE 
      WHEN date_creation_etablissement IS NULL OR date_creation_etablissement = '' THEN NULL
      WHEN date_creation_etablissement ~ '^\d{2}/\d{2}/\d{4}$' THEN to_date(date_creation_etablissement, 'DD/MM/YYYY')
      WHEN date_creation_etablissement ~ '^\d{4}-\d{2}-\d{2}' THEN date_creation_etablissement::date
      ELSE NULL
    END
  );

-- 3. prospect_pool.date_cloture_exercice text → date
ALTER TABLE prospect_pool 
  ALTER COLUMN date_cloture_exercice TYPE date USING (
    CASE 
      WHEN date_cloture_exercice IS NULL OR date_cloture_exercice = '' THEN NULL
      WHEN date_cloture_exercice ~ '^\d{2}/\d{2}/\d{4}$' THEN to_date(date_cloture_exercice, 'DD/MM/YYYY')
      WHEN date_cloture_exercice ~ '^\d{4}-\d{2}-\d{2}' THEN date_cloture_exercice::date
      ELSE NULL
    END
  );
