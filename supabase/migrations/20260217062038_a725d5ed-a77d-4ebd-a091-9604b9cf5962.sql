
-- Alert Rules: user-defined alert configurations
CREATE TABLE public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- overexposure, underallocation, drawdown, fd_maturity, sip_missed, concentration
  enabled boolean NOT NULL DEFAULT true,
  severity text NOT NULL DEFAULT 'warning', -- info, warning, critical
  config_json jsonb NOT NULL DEFAULT '{}'::jsonb, -- threshold values, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alert rules" ON public.alert_rules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alerts: triggered notifications
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rule_id uuid REFERENCES public.alert_rules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open', -- open, acknowledged, resolved
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  message text NOT NULL,
  context_json jsonb,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  resolve_notes text
);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alerts" ON public.alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Add unique constraint for portfolio_snapshots upsert
ALTER TABLE public.portfolio_snapshots ADD CONSTRAINT portfolio_snapshots_user_date_unique UNIQUE (user_id, snapshot_date);
