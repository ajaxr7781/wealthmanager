
-- Schedule monthly scheme master sync (1st of month, 02:00 UTC)
SELECT cron.schedule(
  'monthly-scheme-master-sync',
  '0 2 1 * *',
  $$
  SELECT net.http_post(
    url:='https://lhbnrywzljjtawoufmmb.supabase.co/functions/v1/import-mf-scheme-master',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYm5yeXd6bGpqdGF3b3VmbW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI4MTgsImV4cCI6MjA4NzUyODgxOH0.CgZOkOk3gCaIvotgxIHsidZwsZq-WlyMpw248puWkXc"}'::jsonb,
    body:='{"force": true}'::jsonb
  ) AS request_id;
  $$
);

-- Schedule daily NAV update (21:00 UTC, after Indian market close)
SELECT cron.schedule(
  'daily-mf-nav-update',
  '0 21 * * *',
  $$
  SELECT net.http_post(
    url:='https://lhbnrywzljjtawoufmmb.supabase.co/functions/v1/update-mf-nav',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoYm5yeXd6bGpqdGF3b3VmbW1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTI4MTgsImV4cCI6MjA4NzUyODgxOH0.CgZOkOk3gCaIvotgxIHsidZwsZq-WlyMpw248puWkXc"}'::jsonb,
    body:='{}'::jsonb
  ) AS request_id;
  $$
);
