SELECT cron.schedule(
  'purge-rate-limits-daily',
  '0 3 * * *',
  $$SELECT public.purge_expired_rate_limits()$$
);

SELECT cron.schedule(
  'purge-ai-cache-daily',
  '15 3 * * *',
  $$SELECT public.purge_expired_ai_cache()$$
);