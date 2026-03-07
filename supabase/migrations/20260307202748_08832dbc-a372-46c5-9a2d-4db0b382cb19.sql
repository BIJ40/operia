
-- Nettoyage des overrides redondants dans user_modules
-- Phase 2 : suppression des entrées inutiles

-- 1. aide: user:true seulement (déjà dans plan STARTER) ou agent:false (inutile)
DELETE FROM user_modules WHERE id IN (
  '2d48917f-2d22-4b4f-9f0c-e34344046d1d',  -- Eric Baligout: aide user:true (N3, déjà dans plan)
  '5579ae88-8b6f-43f5-9d86-40a526728392',  -- Sébastien CARON: aide user:true (N1, déjà dans plan)
  '3c66099b-98fa-449f-a443-5c7001480bc3',  -- Florian: aide user:true (N2, déjà dans plan)
  'cac5bd66-e659-404d-ba7e-3bfa7515f99c',  -- Clémence: aide user:true (N2, déjà dans plan)
  '7fa22a0f-77e1-431f-9998-4353587cbba1',  -- franchiseur: aide agent:false (inutile)
  '7a1df96a-a834-4100-9d2c-6596115fbb1c'   -- Gregory: aide user:true (N0, déjà dans plan)
);

-- 2. ticketing: plan = NONE, accessible par tous, overrides inutiles
DELETE FROM user_modules WHERE id IN (
  '02ca782e-be31-4e56-bef2-ed9edcea6d0f',  -- Eric ticketing
  '4543b0a8-50d6-4e5e-b2de-dc2b80148043',  -- Hugo ticketing
  'a0b4e55a-8ba9-4e7c-8183-ec50b3995161',  -- Florian ticketing
  '7f7b152d-1338-4b00-8cd4-18f21ae835ae',  -- franchiseur ticketing
  '4618f2cf-ae30-46c2-86fd-2228ced39536',  -- Gregory ticketing
  '858532d5-33d7-4bbd-9698-0985f6f234fe'   -- Valentin ticketing (attendre vérification)
);

-- 3. guides: options déjà couvertes par le plan
DELETE FROM user_modules WHERE id IN (
  '6c647e99-083c-4a40-a36d-53688d6b0fa1',  -- Sébastien: guides apogee (déjà dans plan)
  'f2b580fe-5d4d-474b-b3d8-6802b697fd5e'   -- Clémence: guides (toutes options dans plan + base_documentaire legacy)
);

-- 4. agence: options identiques au plan PRO
DELETE FROM user_modules WHERE id IN (
  '5fa72adc-73d6-4720-8ac0-e6f20a5cc2eb',  -- Florian: agence (stats_hub legacy + rest dans plan PRO)
  'e418478d-286f-48cf-9228-89ee9339a779'    -- Clémence: agence (identique au plan PRO)
);

-- 5. reseau_franchiseur: franchiseur N4 >= N3 min_role, options vides
DELETE FROM user_modules WHERE id = '6d571d4d-d9c1-4d81-aeea-3f6707af31ae';
