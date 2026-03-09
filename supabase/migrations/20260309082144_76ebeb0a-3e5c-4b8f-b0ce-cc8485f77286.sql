
-- Schedule hourly metal price fetch + save to price_snapshots
SELECT cron.schedule(
  'fetch-metal-prices-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lhbnrywzljjtawoufmmb.supabase.co/functions/v1/fetch-metal-prices',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYm5yeXd6bGpqdGF3b3VmbW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI4MTgsImV4cCI6MjA4NzUyODgxOH0.CgZOkOk3gCaIvotgxIHsidZwsZq-WlyMpw248puWkXc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule hourly metal alert evaluation
SELECT cron.schedule(
  'evaluate-metal-alerts-hourly',
  '5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lhbnrywzljjtawoufmmb.supabase.co/functions/v1/evaluate-metal-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYm5yeXd6bGpqdGF3b3VmbW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI4MTgsImV4cCI6MjA4NzUyODgxOH0.CgZOkOk3gCaIvotgxIHsidZwsZq-WlyMpw248puWkXc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
