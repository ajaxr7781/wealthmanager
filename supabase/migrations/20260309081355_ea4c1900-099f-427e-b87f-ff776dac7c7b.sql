
-- ============================================================
-- 1. metal_alert_rules — Editable rules for Gold/Silver alerts
-- ============================================================
CREATE TABLE public.metal_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  metal_type text NOT NULL CHECK (metal_type IN ('XAU', 'XAG')),
  rule_name text NOT NULL,
  rule_type text NOT NULL CHECK (rule_type IN (
    'price_below', 'price_above',
    'price_drop_pct', 'price_rise_pct',
    'portfolio_profit_above', 'portfolio_loss_above',
    'position_pl_pct', 'allocation_pct_above'
  )),
  operator text NOT NULL DEFAULT 'lte' CHECK (operator IN ('lt', 'lte', 'gt', 'gte', 'eq')),
  threshold_value numeric NOT NULL,
  reference_window_days integer DEFAULT 30,
  suggested_action text NOT NULL DEFAULT 'buy' CHECK (suggested_action IN ('buy', 'sell', 'hold')),
  suggested_amount_type text NOT NULL DEFAULT 'aed' CHECK (suggested_amount_type IN ('aed', 'oz', 'grams', 'percentage')),
  suggested_amount_value numeric NOT NULL DEFAULT 0,
  cooldown_hours integer NOT NULL DEFAULT 24,
  is_active boolean NOT NULL DEFAULT true,
  send_email boolean NOT NULL DEFAULT true,
  notes text,
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metal_alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own metal alert rules"
  ON public.metal_alert_rules FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_metal_alert_rules_user_active
  ON public.metal_alert_rules (user_id, is_active)
  WHERE is_active = true;

CREATE INDEX idx_metal_alert_rules_metal
  ON public.metal_alert_rules (metal_type);

-- ============================================================
-- 2. metal_alert_events — Trigger history with email tracking
-- ============================================================
CREATE TABLE public.metal_alert_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid REFERENCES public.metal_alert_rules(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  metal_type text NOT NULL,
  trigger_reason text NOT NULL,
  market_price_aed numeric,
  portfolio_value_aed numeric,
  total_invested_aed numeric,
  unrealized_pl_aed numeric,
  unrealized_pl_pct numeric,
  email_sent boolean NOT NULL DEFAULT false,
  email_subject text,
  email_body text,
  sent_at timestamptz,
  status text NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'email_sent', 'email_failed', 'suppressed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metal_alert_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own metal alert events"
  ON public.metal_alert_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own metal alert events"
  ON public.metal_alert_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_metal_alert_events_user
  ON public.metal_alert_events (user_id, created_at DESC);

CREATE INDEX idx_metal_alert_events_rule
  ON public.metal_alert_events (rule_id, created_at DESC);

-- ============================================================
-- 3. notification_preferences — Email and digest preferences
-- ============================================================
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email_enabled boolean NOT NULL DEFAULT true,
  digest_mode text NOT NULL DEFAULT 'instant' CHECK (digest_mode IN ('instant', 'daily', 'weekly')),
  quiet_hours_start integer CHECK (quiet_hours_start >= 0 AND quiet_hours_start <= 23),
  quiet_hours_end integer CHECK (quiet_hours_end >= 0 AND quiet_hours_end <= 23),
  recipient_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notification preferences"
  ON public.notification_preferences FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
