-- Fix corrupted loaded_hourly_cost values
-- Recalculate from stored component values
UPDATE employee_cost_profiles
SET loaded_hourly_cost = ROUND(
  (COALESCE(employer_monthly_cost, 0) + COALESCE(vehicle_monthly_cost, 0) + COALESCE(fuel_monthly_cost, 0) + COALESCE(equipment_monthly_cost, 0) + COALESCE(other_monthly_costs, 0))
  / GREATEST(COALESCE(monthly_productive_hours, 1), 1)
  ::numeric, 2)
WHERE loaded_hourly_cost > 1000
  AND monthly_productive_hours > 0;