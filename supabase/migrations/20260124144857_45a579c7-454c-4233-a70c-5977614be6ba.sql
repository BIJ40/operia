-- Nettoyage legacy N1: suppression tables timesheets et dépendances
-- Table timesheets (pointages N1)
DROP TABLE IF EXISTS public.timesheets CASCADE;

-- Tables legacy N1 si encore présentes
DROP TABLE IF EXISTS public.timesheet_entries CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.expense_requests CASCADE;
DROP TABLE IF EXISTS public.planning_signatures CASCADE;
DROP TABLE IF EXISTS public.planning_notifications CASCADE;
DROP TABLE IF EXISTS public.rh_notifications CASCADE;
DROP TABLE IF EXISTS public.technician_clockings CASCADE;

-- Suppression des feature flags restants liés au portail N1/technicien
DELETE FROM public.feature_flags 
WHERE module_key IN (
  'rh.mon-equipe',
  'rh.validation-plannings',
  'rh.timesheets',
  'rh.pointages',
  't.pointage',
  't.planning',
  't.rh-parc'
);

-- Colonne deprecated preferred_home_route ajoutée par onboarding
ALTER TABLE public.profiles DROP COLUMN IF EXISTS preferred_home_route;