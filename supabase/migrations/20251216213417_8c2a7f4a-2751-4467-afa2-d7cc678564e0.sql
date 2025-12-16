
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule monthly report generation (10th of each month at 08:00 UTC)
SELECT cron.schedule(
  'monthly-report-generation',
  '0 8 10 * *',
  $$
  SELECT net.http_post(
    url := 'https://uxcovgqhgjsuibgdvcof.supabase.co/functions/v1/trigger-monthly-reports',
    headers := '{"X-CRON-SECRET": "9f3c8a1d6e4b52a0c7f9d81e6b4a2f0c5e9d3a7b8c1f4e2a6d0b9c5f7e1a4"}'::jsonb
  );
  $$
);

-- Schedule monthly purge (1st of each month at 03:00 UTC)
SELECT cron.schedule(
  'monthly-report-purge',
  '0 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://uxcovgqhgjsuibgdvcof.supabase.co/functions/v1/purge-old-reports',
    headers := '{"X-CRON-SECRET": "9f3c8a1d6e4b52a0c7f9d81e6b4a2f0c5e9d3a7b8c1f4e2a6d0b9c5f7e1a4"}'::jsonb
  );
  $$
);
