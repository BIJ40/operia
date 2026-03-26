CREATE OR REPLACE FUNCTION public.get_agency_performance_weekly_hours(target_agency_id uuid)
RETURNS TABLE (
  apogee_user_id bigint,
  weekly_hours numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF target_agency_id IS NULL THEN
    RAISE EXCEPTION 'Agency id required';
  END IF;

  IF NOT (
    has_min_global_role(auth.uid(), 6)
    OR has_min_global_role(auth.uid(), 3)
    OR target_agency_id = get_user_agency_id(auth.uid())
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  RETURN QUERY
  WITH collabs AS (
    SELECT
      c.id,
      c.apogee_user_id,
      CASE
        WHEN c.work_start IS NOT NULL AND c.work_end IS NOT NULL THEN
          ROUND(
            (
              GREATEST(
                0,
                EXTRACT(EPOCH FROM (c.work_end::time - c.work_start::time)) / 3600.0
              ) * GREATEST(
                CASE
                  WHEN c.work_days IS NOT NULL AND array_length(c.work_days, 1) > 0
                    THEN (SELECT COUNT(*)::numeric FROM unnest(c.work_days) AS d WHERE d BETWEEN 1 AND 5)
                  ELSE 5::numeric
                END,
                0
              )
            )::numeric,
            1
          )
        ELSE NULL
      END AS schedule_hours
    FROM public.collaborators c
    WHERE c.agency_id = target_agency_id
      AND c.apogee_user_id IS NOT NULL
  ),
  latest_contracts AS (
    SELECT DISTINCT ON (ec.collaborator_id)
      ec.collaborator_id,
      ec.weekly_hours
    FROM public.employment_contracts ec
    JOIN collabs c ON c.id = ec.collaborator_id
    WHERE ec.weekly_hours IS NOT NULL
    ORDER BY ec.collaborator_id, ec.start_date DESC NULLS LAST, ec.created_at DESC
  )
  SELECT
    c.apogee_user_id::bigint,
    COALESCE(latest_contracts.weekly_hours, c.schedule_hours)::numeric AS weekly_hours
  FROM collabs c
  LEFT JOIN latest_contracts ON latest_contracts.collaborator_id = c.id
  WHERE COALESCE(latest_contracts.weekly_hours, c.schedule_hours) IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_agency_performance_weekly_hours(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_agency_performance_weekly_hours(uuid) TO authenticated;