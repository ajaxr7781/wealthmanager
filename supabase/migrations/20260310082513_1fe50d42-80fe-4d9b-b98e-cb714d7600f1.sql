
-- 1. Create sync_job_logs table for job monitoring
CREATE TABLE IF NOT EXISTS public.sync_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
  rows_processed integer DEFAULT 0,
  rows_failed integer DEFAULT 0,
  error_message text,
  metadata_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: allow authenticated users to view logs (admin controls in UI)
ALTER TABLE public.sync_job_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sync logs"
  ON public.sync_job_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage sync logs"
  ON public.sync_job_logs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. Add indexes for MF performance
CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_cache_scheme_code 
  ON public.mf_scheme_master_cache (scheme_code);

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_cache_scheme_name_trgm 
  ON public.mf_scheme_master_cache USING btree (scheme_name);

CREATE INDEX IF NOT EXISTS idx_mf_scheme_master_cache_fund_house 
  ON public.mf_scheme_master_cache (fund_house);

CREATE INDEX IF NOT EXISTS idx_mf_nav_history_scheme_date 
  ON public.mf_nav_history (scheme_id, nav_date);

CREATE INDEX IF NOT EXISTS idx_mf_transactions_holding_date 
  ON public.mf_transactions (holding_id, transaction_date);

CREATE INDEX IF NOT EXISTS idx_mf_schemes_user_active 
  ON public.mf_schemes (user_id, is_active);

CREATE INDEX IF NOT EXISTS idx_mf_holdings_scheme 
  ON public.mf_holdings (scheme_id);

CREATE INDEX IF NOT EXISTS idx_mf_sips_scheme 
  ON public.mf_sips (scheme_id);

-- 3. Add unique constraint on nav_history to prevent duplicates (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mf_nav_history_scheme_id_nav_date_key'
  ) THEN
    ALTER TABLE public.mf_nav_history 
      ADD CONSTRAINT mf_nav_history_scheme_id_nav_date_key 
      UNIQUE (scheme_id, nav_date);
  END IF;
END $$;

-- 4. Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
