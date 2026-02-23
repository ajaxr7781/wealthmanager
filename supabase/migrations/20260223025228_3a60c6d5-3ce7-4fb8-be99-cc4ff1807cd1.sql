
-- ============================================================
-- UNIFIED ASSET MODEL - COMPLETE SCHEMA + DATA MIGRATION
-- ============================================================

-- 1. Add MF/SIP columns to assets table
ALTER TABLE public.assets 
ADD COLUMN IF NOT EXISTS scheme_id uuid REFERENCES public.mf_schemes(id),
ADD COLUMN IF NOT EXISTS folio_no text,
ADD COLUMN IF NOT EXISTS sip_amount numeric,
ADD COLUMN IF NOT EXISTS sip_day_of_month integer,
ADD COLUMN IF NOT EXISTS sip_start_date date,
ADD COLUMN IF NOT EXISTS sip_end_date date,
ADD COLUMN IF NOT EXISTS sip_status text,
ADD COLUMN IF NOT EXISTS units_held numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS xirr_value numeric;

-- 2. Create unified asset_transactions table
CREATE TABLE IF NOT EXISTS public.asset_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  transaction_type text NOT NULL,
  transaction_date date NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  quantity_unit text,
  price_per_unit numeric,
  amount numeric NOT NULL DEFAULT 0,
  fees numeric NOT NULL DEFAULT 0,
  notes text,
  source_table text,
  source_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_transactions ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist (from partial previous runs)
DROP POLICY IF EXISTS "Users can view own asset transactions" ON public.asset_transactions;
DROP POLICY IF EXISTS "Users can create own asset transactions" ON public.asset_transactions;
DROP POLICY IF EXISTS "Users can update own asset transactions" ON public.asset_transactions;
DROP POLICY IF EXISTS "Users can delete own asset transactions" ON public.asset_transactions;

CREATE POLICY "Users can view own asset transactions"
ON public.asset_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own asset transactions"
ON public.asset_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own asset transactions"
ON public.asset_transactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own asset transactions"
ON public.asset_transactions FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_asset_tx_asset_id ON public.asset_transactions(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_tx_user_id ON public.asset_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_tx_date ON public.asset_transactions(transaction_date);

-- 3. Migration function
DROP FUNCTION IF EXISTS public.migrate_to_unified_assets();

CREATE OR REPLACE FUNCTION public.migrate_to_unified_assets()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
  new_asset_id uuid;
  calc_qty numeric;
  calc_cost numeric;
  pm_count int := 0;
  mf_count int := 0;
  sip_count int := 0;
BEGIN
  -- MIGRATE PRECIOUS METALS
  FOR r IN (
    SELECT p.user_id, t.instrument_symbol, t.portfolio_id,
           MIN(t.trade_date) AS first_date
    FROM public.transactions t
    JOIN public.portfolios p ON p.id = t.portfolio_id
    GROUP BY p.user_id, t.instrument_symbol, t.portfolio_id
  ) LOOP
    SELECT a.id INTO new_asset_id
    FROM public.assets a
    WHERE a.user_id = r.user_id 
      AND a.asset_type = 'precious_metals'
      AND a.metal_type = r.instrument_symbol
    LIMIT 1;

    IF new_asset_id IS NULL THEN
      INSERT INTO public.assets (
        user_id, asset_type, asset_type_code, category_code, asset_name,
        currency, purchase_date, quantity, quantity_unit, total_cost,
        metal_type, instrument_name, portfolio_id
      ) VALUES (
        r.user_id, 'precious_metals',
        CASE r.instrument_symbol WHEN 'XAU' THEN 'gold' WHEN 'XAG' THEN 'silver' ELSE lower(r.instrument_symbol) END,
        'precious_metals',
        CASE r.instrument_symbol WHEN 'XAU' THEN 'Gold' WHEN 'XAG' THEN 'Silver' ELSE r.instrument_symbol END,
        'AED', r.first_date, 0, 'oz', 0,
        r.instrument_symbol, r.instrument_symbol, r.portfolio_id
      ) RETURNING id INTO new_asset_id;
      pm_count := pm_count + 1;
    END IF;

    INSERT INTO public.asset_transactions (
      asset_id, user_id, transaction_type, transaction_date,
      quantity, quantity_unit, price_per_unit, amount, fees, notes,
      source_table, source_id
    )
    SELECT 
      new_asset_id, r.user_id,
      t.side::text, t.trade_date,
      t.quantity, t.quantity_unit::text, t.price,
      t.quantity * t.price, t.fees, t.notes,
      'transactions', t.id
    FROM public.transactions t
    JOIN public.portfolios p ON p.id = t.portfolio_id
    WHERE p.user_id = r.user_id
      AND t.instrument_symbol = r.instrument_symbol
      AND NOT EXISTS (
        SELECT 1 FROM public.asset_transactions at2 
        WHERE at2.source_table = 'transactions' AND at2.source_id = t.id
      );

    SELECT 
      COALESCE(SUM(CASE WHEN at3.transaction_type = 'BUY' THEN at3.quantity ELSE -at3.quantity END), 0),
      COALESCE(SUM(CASE WHEN at3.transaction_type = 'BUY' THEN at3.amount + at3.fees ELSE 0 END), 0)
    INTO calc_qty, calc_cost
    FROM public.asset_transactions at3
    WHERE at3.asset_id = new_asset_id;

    UPDATE public.assets a2 SET
      quantity = calc_qty,
      total_cost = calc_cost,
      units_held = calc_qty
    WHERE a2.id = new_asset_id;
  END LOOP;

  -- MIGRATE MF HOLDINGS
  FOR r IN (
    SELECT h.*, s.scheme_name, s.latest_nav
    FROM public.mf_holdings h
    JOIN public.mf_schemes s ON s.id = h.scheme_id
  ) LOOP
    SELECT a.id INTO new_asset_id
    FROM public.assets a
    WHERE a.user_id = r.user_id 
      AND a.asset_type = 'mutual_fund'
      AND a.scheme_id = r.scheme_id
    LIMIT 1;

    IF new_asset_id IS NULL THEN
      INSERT INTO public.assets (
        user_id, asset_type, asset_type_code, category_code, asset_name,
        currency, purchase_date, quantity, quantity_unit, total_cost,
        current_value, instrument_name, scheme_id, folio_no,
        units_held, nav_or_price, xirr_value
      ) VALUES (
        r.user_id, 'mutual_fund', 'mutual_fund', 'equity',
        r.scheme_name, 'INR',
        r.created_at::date, r.units_held, 'units', r.invested_amount,
        r.current_value, r.scheme_name, r.scheme_id, r.folio_no,
        r.units_held, r.latest_nav, r.xirr
      ) RETURNING id INTO new_asset_id;
      mf_count := mf_count + 1;
    END IF;

    INSERT INTO public.asset_transactions (
      asset_id, user_id, transaction_type, transaction_date,
      quantity, quantity_unit, price_per_unit, amount, notes,
      source_table, source_id
    )
    SELECT
      new_asset_id, r.user_id,
      mt.transaction_type, mt.transaction_date,
      mt.units, 'units', mt.nav_at_transaction, mt.amount, mt.notes,
      'mf_transactions', mt.id
    FROM public.mf_transactions mt
    WHERE mt.holding_id = r.id
      AND NOT EXISTS (
        SELECT 1 FROM public.asset_transactions at2 
        WHERE at2.source_table = 'mf_transactions' AND at2.source_id = mt.id
      );
  END LOOP;

  -- MIGRATE SIPs
  FOR r IN (
    SELECT s.*, ms.scheme_name, ms.latest_nav
    FROM public.mf_sips s
    JOIN public.mf_schemes ms ON ms.id = s.scheme_id
  ) LOOP
    SELECT a.id INTO new_asset_id
    FROM public.assets a
    WHERE a.user_id = r.user_id 
      AND a.asset_type = 'sip'
      AND a.scheme_id = r.scheme_id
      AND a.sip_amount = r.sip_amount
    LIMIT 1;

    IF new_asset_id IS NULL THEN
      INSERT INTO public.assets (
        user_id, asset_type, asset_type_code, category_code, asset_name,
        currency, purchase_date, quantity, quantity_unit, total_cost,
        current_value, instrument_name, scheme_id, folio_no,
        units_held, nav_or_price, sip_amount, sip_day_of_month,
        sip_start_date, sip_end_date, sip_status, sip_frequency
      ) VALUES (
        r.user_id, 'sip', 'sip', 'equity',
        'SIP - ' || r.scheme_name, 'INR',
        r.start_date, COALESCE(r.current_units, 0), 'units',
        COALESCE(r.invested_amount, 0),
        COALESCE(r.current_units, 0) * COALESCE(r.latest_nav, 0),
        r.scheme_name, r.scheme_id, r.folio_no,
        COALESCE(r.current_units, 0), r.latest_nav,
        r.sip_amount, r.sip_day_of_month,
        r.start_date, r.end_date, r.status, 'monthly'
      ) RETURNING id INTO new_asset_id;
      sip_count := sip_count + 1;
    END IF;
  END LOOP;

  RETURN format('Migrated: %s PM assets, %s MF holdings, %s SIPs', pm_count, mf_count, sip_count);
END;
$$;

-- 4. Execute migration
SELECT public.migrate_to_unified_assets();

-- 5. Trigger for updated_at
DROP TRIGGER IF EXISTS update_asset_transactions_updated_at ON public.asset_transactions;
CREATE TRIGGER update_asset_transactions_updated_at
BEFORE UPDATE ON public.asset_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
