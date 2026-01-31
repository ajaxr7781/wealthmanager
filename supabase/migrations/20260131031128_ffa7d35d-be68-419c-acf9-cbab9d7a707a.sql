-- Create asset type enum
CREATE TYPE public.asset_type AS ENUM (
  'precious_metals',
  'real_estate',
  'fixed_deposit',
  'sip',
  'mutual_fund',
  'shares'
);

-- Create currency enum
CREATE TYPE public.currency AS ENUM ('AED', 'INR');

-- Core assets table for multi-asset tracking
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  
  -- Common fields
  asset_type public.asset_type NOT NULL,
  asset_name TEXT NOT NULL,
  currency public.currency NOT NULL DEFAULT 'AED',
  purchase_date DATE NOT NULL,
  notes TEXT,
  
  -- Quantity/Units (interpretation varies by type)
  quantity NUMERIC,
  quantity_unit TEXT, -- 'grams', 'oz', 'units', 'shares', 'sqft', etc.
  
  -- Cost basis
  purchase_price_per_unit NUMERIC,
  total_cost NUMERIC NOT NULL,
  
  -- Current valuation
  current_price_per_unit NUMERIC,
  current_value NUMERIC,
  is_current_value_manual BOOLEAN DEFAULT false,
  
  -- Type-specific: Precious Metals
  metal_type TEXT, -- 'XAU', 'XAG'
  
  -- Type-specific: Real Estate
  location TEXT,
  area_sqft NUMERIC,
  rental_income_monthly NUMERIC,
  
  -- Type-specific: Fixed Deposit
  bank_name TEXT,
  principal NUMERIC,
  interest_rate NUMERIC, -- annual percentage
  maturity_date DATE,
  maturity_amount NUMERIC,
  
  -- Type-specific: SIP/MF/Shares
  instrument_name TEXT,
  broker_platform TEXT,
  nav_or_price NUMERIC,
  sip_frequency TEXT, -- 'monthly', 'quarterly', etc.
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- RLS policies for assets
CREATE POLICY "Users can view their own assets"
ON public.assets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own assets"
ON public.assets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets"
ON public.assets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets"
ON public.assets FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_assets_updated_at
BEFORE UPDATE ON public.assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Settings table for storing app-wide user preferences (like FX rates)
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  usd_to_aed_rate NUMERIC DEFAULT 3.6725,
  inr_to_aed_rate NUMERIC DEFAULT 0.044,
  auto_refresh_prices BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
ON public.user_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings"
ON public.user_settings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
ON public.user_settings FOR UPDATE
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();