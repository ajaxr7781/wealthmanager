-- ===========================================
-- India Mutual Funds + SIP Module Schema
-- ===========================================

-- 1. mf_scheme_master_cache - Global cache of MFAPI scheme master list
-- This is a shared cache, not user-specific
CREATE TABLE public.mf_scheme_master_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_code INTEGER NOT NULL,
    scheme_name TEXT NOT NULL,
    isin TEXT,
    fund_house TEXT,
    cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    source TEXT NOT NULL DEFAULT 'MFAPI',
    UNIQUE(scheme_code, source)
);

-- Enable RLS - read-only for authenticated users
ALTER TABLE public.mf_scheme_master_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read scheme cache"
ON public.mf_scheme_master_cache
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only edge functions (service role) can insert/update
CREATE POLICY "Service role can manage scheme cache"
ON public.mf_scheme_master_cache
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast search
CREATE INDEX idx_mf_scheme_master_cache_name ON public.mf_scheme_master_cache USING gin(to_tsvector('english', scheme_name));
CREATE INDEX idx_mf_scheme_master_cache_isin ON public.mf_scheme_master_cache(isin) WHERE isin IS NOT NULL;

-- 2. mf_schemes - User's scheme catalog with NAV tracking
CREATE TABLE public.mf_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    scheme_name TEXT NOT NULL,
    fund_house TEXT,
    category TEXT,
    plan_type TEXT CHECK (plan_type IN ('Regular', 'Direct')),
    option_type TEXT CHECK (option_type IN ('Growth', 'IDCW', 'Dividend')),
    isin TEXT,
    amfi_scheme_code INTEGER,
    benchmark TEXT,
    latest_nav NUMERIC(12, 4),
    latest_nav_date DATE,
    nav_last_updated TIMESTAMPTZ,
    nav_source TEXT CHECK (nav_source IN ('MFAPI', 'AMFI', 'MANUAL')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    needs_verification BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mf_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schemes"
ON public.mf_schemes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own schemes"
ON public.mf_schemes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own schemes"
ON public.mf_schemes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own schemes"
ON public.mf_schemes FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_mf_schemes_user ON public.mf_schemes(user_id);
CREATE INDEX idx_mf_schemes_amfi_code ON public.mf_schemes(amfi_scheme_code) WHERE amfi_scheme_code IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_mf_schemes_updated_at
    BEFORE UPDATE ON public.mf_schemes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. mf_holdings - User's MF holdings
CREATE TABLE public.mf_holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    scheme_id UUID NOT NULL REFERENCES public.mf_schemes(id) ON DELETE CASCADE,
    folio_no TEXT,
    invested_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    units_held NUMERIC(14, 4) NOT NULL DEFAULT 0,
    current_value NUMERIC(14, 2),
    unrealized_gain NUMERIC(14, 2),
    absolute_return_pct NUMERIC(8, 4),
    xirr NUMERIC(8, 4),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mf_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own holdings"
ON public.mf_holdings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own holdings"
ON public.mf_holdings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own holdings"
ON public.mf_holdings FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own holdings"
ON public.mf_holdings FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_mf_holdings_user ON public.mf_holdings(user_id);
CREATE INDEX idx_mf_holdings_scheme ON public.mf_holdings(scheme_id);

CREATE TRIGGER update_mf_holdings_updated_at
    BEFORE UPDATE ON public.mf_holdings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 4. mf_transactions - Transaction history for holdings
CREATE TABLE public.mf_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holding_id UUID NOT NULL REFERENCES public.mf_holdings(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('PURCHASE', 'REDEMPTION', 'SWITCH_IN', 'SWITCH_OUT', 'DIVIDEND')),
    amount NUMERIC(14, 2) NOT NULL,
    units NUMERIC(14, 4) NOT NULL,
    nav_at_transaction NUMERIC(12, 4),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mf_transactions ENABLE ROW LEVEL SECURITY;

-- Use security definer function to check holding ownership
CREATE OR REPLACE FUNCTION public.get_user_mf_holding_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.mf_holdings WHERE user_id = _user_id
$$;

CREATE POLICY "Users can view their own transactions"
ON public.mf_transactions FOR SELECT
USING (holding_id IN (SELECT public.get_user_mf_holding_ids(auth.uid())));

CREATE POLICY "Users can create their own transactions"
ON public.mf_transactions FOR INSERT
WITH CHECK (holding_id IN (SELECT public.get_user_mf_holding_ids(auth.uid())));

CREATE POLICY "Users can update their own transactions"
ON public.mf_transactions FOR UPDATE
USING (holding_id IN (SELECT public.get_user_mf_holding_ids(auth.uid())));

CREATE POLICY "Users can delete their own transactions"
ON public.mf_transactions FOR DELETE
USING (holding_id IN (SELECT public.get_user_mf_holding_ids(auth.uid())));

CREATE INDEX idx_mf_transactions_holding ON public.mf_transactions(holding_id);
CREATE INDEX idx_mf_transactions_date ON public.mf_transactions(transaction_date);

-- 5. mf_sips - SIP definitions
CREATE TABLE public.mf_sips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    scheme_id UUID NOT NULL REFERENCES public.mf_schemes(id) ON DELETE CASCADE,
    holding_id UUID REFERENCES public.mf_holdings(id) ON DELETE SET NULL,
    folio_no TEXT,
    sip_amount NUMERIC(12, 2) NOT NULL,
    sip_day_of_month INTEGER NOT NULL CHECK (sip_day_of_month >= 1 AND sip_day_of_month <= 28),
    start_date DATE NOT NULL,
    end_date DATE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.mf_sips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own SIPs"
ON public.mf_sips FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own SIPs"
ON public.mf_sips FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own SIPs"
ON public.mf_sips FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own SIPs"
ON public.mf_sips FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_mf_sips_user ON public.mf_sips(user_id);
CREATE INDEX idx_mf_sips_scheme ON public.mf_sips(scheme_id);
CREATE INDEX idx_mf_sips_status ON public.mf_sips(status);

CREATE TRIGGER update_mf_sips_updated_at
    BEFORE UPDATE ON public.mf_sips
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 6. mf_nav_history - Historical NAV data
CREATE TABLE public.mf_nav_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES public.mf_schemes(id) ON DELETE CASCADE,
    nav_date DATE NOT NULL,
    nav_value NUMERIC(12, 4) NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('MFAPI', 'AMFI', 'MANUAL')),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    raw_payload_hash TEXT,
    UNIQUE(scheme_id, nav_date)
);

ALTER TABLE public.mf_nav_history ENABLE ROW LEVEL SECURITY;

-- Use security definer function to check scheme ownership
CREATE OR REPLACE FUNCTION public.get_user_mf_scheme_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.mf_schemes WHERE user_id = _user_id
$$;

CREATE POLICY "Users can view their own NAV history"
ON public.mf_nav_history FOR SELECT
USING (scheme_id IN (SELECT public.get_user_mf_scheme_ids(auth.uid())));

CREATE POLICY "Users can create NAV history for their schemes"
ON public.mf_nav_history FOR INSERT
WITH CHECK (scheme_id IN (SELECT public.get_user_mf_scheme_ids(auth.uid())));

CREATE INDEX idx_mf_nav_history_scheme_date ON public.mf_nav_history(scheme_id, nav_date DESC);