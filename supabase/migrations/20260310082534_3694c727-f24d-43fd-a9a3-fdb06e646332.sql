
-- Fix sync_job_logs: remove overly permissive ALL policy (edge functions use service role which bypasses RLS)
DROP POLICY IF EXISTS "Service role can manage sync logs" ON public.sync_job_logs;
