
-- ============================================
-- LIABILITIES TABLE
-- ============================================
CREATE TABLE public.liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'other', -- loan, mortgage, credit_card, other
  principal numeric NOT NULL DEFAULT 0,
  outstanding numeric NOT NULL DEFAULT 0,
  interest_rate numeric,
  emi numeric,
  next_due_date date,
  linked_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  currency text NOT NULL DEFAULT 'AED',
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own liabilities" ON public.liabilities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own liabilities" ON public.liabilities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own liabilities" ON public.liabilities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own liabilities" ON public.liabilities FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- PORTFOLIO SNAPSHOTS TABLE (for trend charts)
-- ============================================
CREATE TABLE public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL,
  total_value numeric NOT NULL DEFAULT 0,
  total_invested numeric NOT NULL DEFAULT 0,
  total_liabilities numeric NOT NULL DEFAULT 0,
  net_worth numeric NOT NULL DEFAULT 0,
  breakdown_json jsonb, -- category-level breakdown
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own snapshots" ON public.portfolio_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own snapshots" ON public.portfolio_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own snapshots" ON public.portfolio_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own snapshots" ON public.portfolio_snapshots FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- GOALS TABLES
-- ============================================
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  target_date date,
  priority text NOT NULL DEFAULT 'medium', -- high, medium, low
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.goal_asset_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  allocation_pct numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(goal_id, asset_id)
);

ALTER TABLE public.goal_asset_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goal mappings" ON public.goal_asset_mapping FOR SELECT
  USING (goal_id IN (SELECT id FROM public.goals WHERE user_id = auth.uid()));
CREATE POLICY "Users can create their own goal mappings" ON public.goal_asset_mapping FOR INSERT
  WITH CHECK (goal_id IN (SELECT id FROM public.goals WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their own goal mappings" ON public.goal_asset_mapping FOR UPDATE
  USING (goal_id IN (SELECT id FROM public.goals WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their own goal mappings" ON public.goal_asset_mapping FOR DELETE
  USING (goal_id IN (SELECT id FROM public.goals WHERE user_id = auth.uid()));

-- ============================================
-- ALLOCATION TARGETS + REBALANCING
-- ============================================
CREATE TABLE public.allocation_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  base_currency text NOT NULL DEFAULT 'AED',
  rebalance_threshold_pct numeric NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.allocation_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own targets" ON public.allocation_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own targets" ON public.allocation_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own targets" ON public.allocation_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own targets" ON public.allocation_targets FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.allocation_target_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES public.allocation_targets(id) ON DELETE CASCADE,
  category_code text NOT NULL,
  target_pct numeric NOT NULL DEFAULT 0,
  min_pct numeric NOT NULL DEFAULT 0,
  max_pct numeric NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(target_id, category_code)
);

ALTER TABLE public.allocation_target_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own target lines" ON public.allocation_target_lines FOR SELECT
  USING (target_id IN (SELECT id FROM public.allocation_targets WHERE user_id = auth.uid()));
CREATE POLICY "Users can create their own target lines" ON public.allocation_target_lines FOR INSERT
  WITH CHECK (target_id IN (SELECT id FROM public.allocation_targets WHERE user_id = auth.uid()));
CREATE POLICY "Users can update their own target lines" ON public.allocation_target_lines FOR UPDATE
  USING (target_id IN (SELECT id FROM public.allocation_targets WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete their own target lines" ON public.allocation_target_lines FOR DELETE
  USING (target_id IN (SELECT id FROM public.allocation_targets WHERE user_id = auth.uid()));

CREATE TABLE public.rebalance_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_id uuid NOT NULL REFERENCES public.allocation_targets(id) ON DELETE CASCADE,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  base_currency text NOT NULL DEFAULT 'AED',
  total_drift_pct numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rebalance_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recommendations" ON public.rebalance_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own recommendations" ON public.rebalance_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recommendations" ON public.rebalance_recommendations FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.rebalance_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id uuid NOT NULL REFERENCES public.rebalance_recommendations(id) ON DELETE CASCADE,
  category_code text NOT NULL,
  action text NOT NULL, -- BUY or SELL
  amount numeric NOT NULL DEFAULT 0,
  reason text,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rebalance_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rebalance actions" ON public.rebalance_actions FOR SELECT
  USING (recommendation_id IN (SELECT id FROM public.rebalance_recommendations WHERE user_id = auth.uid()));
CREATE POLICY "Users can create their own rebalance actions" ON public.rebalance_actions FOR INSERT
  WITH CHECK (recommendation_id IN (SELECT id FROM public.rebalance_recommendations WHERE user_id = auth.uid()));

-- ============================================
-- PERFORMANCE CACHE TABLE
-- ============================================
CREATE TABLE public.performance_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  scope text NOT NULL, -- 'asset', 'category', 'portfolio'
  scope_id text, -- asset_id, category_code, or null for portfolio
  period text NOT NULL, -- '1M', '3M', '6M', '1Y', 'ALL', 'YTD'
  start_date date,
  end_date date,
  metrics_json jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, scope, scope_id, period)
);

ALTER TABLE public.performance_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own performance cache" ON public.performance_cache FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own performance cache" ON public.performance_cache FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own performance cache" ON public.performance_cache FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own performance cache" ON public.performance_cache FOR DELETE USING (auth.uid() = user_id);
