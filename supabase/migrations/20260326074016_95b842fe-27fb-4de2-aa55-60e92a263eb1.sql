-- Insert the DAX pilot activation flag for users in fallback mode
-- This is a data operation but needs migration since we need INSERT access
-- No schema changes, just data activation

INSERT INTO public.data_source_flags (module_key, source_mode, agency_id, is_enabled, freshness_threshold_minutes)
VALUES ('users', 'fallback', '58d8d39f-7544-4e78-86f9-c182eacf29f5', true, 480)
ON CONFLICT (module_key, agency_id) DO UPDATE SET 
  source_mode = 'fallback', 
  is_enabled = true, 
  freshness_threshold_minutes = 480,
  updated_at = now();