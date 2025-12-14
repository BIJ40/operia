-- Ajouter colonnes manquantes pour gestion complète du parc auto
ALTER TABLE public.fleet_vehicles
ADD COLUMN IF NOT EXISTS insurance_company text,
ADD COLUMN IF NOT EXISTS insurance_contract_number text,
ADD COLUMN IF NOT EXISTS insurance_expiry_at date,
ADD COLUMN IF NOT EXISTS leasing_company text,
ADD COLUMN IF NOT EXISTS leasing_monthly_amount numeric,
ADD COLUMN IF NOT EXISTS leasing_end_at date,
ADD COLUMN IF NOT EXISTS ct_alert_days integer DEFAULT 14,
ADD COLUMN IF NOT EXISTS revision_alert_days integer DEFAULT 7,
ADD COLUMN IF NOT EXISTS insurance_alert_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS leasing_alert_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS fuel_type text,
ADD COLUMN IF NOT EXISTS vin text;