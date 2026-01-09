-- Normaliser toutes les valeurs reported_by en majuscules pour cohérence
UPDATE apogee_tickets
SET reported_by = UPPER(reported_by)
WHERE reported_by IS NOT NULL
  AND reported_by != UPPER(reported_by);