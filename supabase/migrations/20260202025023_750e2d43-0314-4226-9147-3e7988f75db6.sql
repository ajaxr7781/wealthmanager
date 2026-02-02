-- Create enum for valuation methods
CREATE TYPE public.valuation_method AS ENUM (
  'live_price',      -- For stocks, precious metals with live feeds
  'nav_based',       -- For mutual funds, SIPs
  'maturity_based',  -- For FDs, bonds with maturity
  'manual',          -- For real estate, manual entry
  'cost_based'       -- Simple cost tracking (loans given, etc.)
);

-- Create enum for unit types
CREATE TYPE public.unit_type AS ENUM (
  'currency',        -- Pure monetary value (FDs, savings)
  'weight',          -- For precious metals (oz, grams)
  'units',           -- For stocks, MF units
  'area',            -- For real estate (sqft, sqm)
  'quantity'         -- Generic quantity
);

-- Create asset_categories table
CREATE TABLE public.asset_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create asset_types table (configuration-driven)
CREATE TABLE public.asset_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.asset_categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  icon TEXT,
  color TEXT,
  
  -- Capabilities
  supports_price_feed BOOLEAN NOT NULL DEFAULT false,
  supports_transactions BOOLEAN NOT NULL DEFAULT false,
  
  -- Valuation
  valuation_method public.valuation_method NOT NULL DEFAULT 'manual',
  unit_type public.unit_type NOT NULL DEFAULT 'currency',
  
  -- Optional metadata schema (JSON for flexibility)
  metadata_schema JSONB,
  
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_system BOOLEAN NOT NULL DEFAULT true,  -- System types can't be deleted
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_types ENABLE ROW LEVEL SECURITY;

-- RLS policies - categories and types are viewable by all authenticated users
CREATE POLICY "Anyone can view asset categories" ON public.asset_categories
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view asset types" ON public.asset_types
  FOR SELECT USING (true);

-- Admin-only insert/update/delete (or we can allow all authenticated users to manage)
CREATE POLICY "Authenticated users can manage categories" ON public.asset_categories
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage asset types" ON public.asset_types
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_asset_categories_updated_at
  BEFORE UPDATE ON public.asset_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_types_updated_at
  BEFORE UPDATE ON public.asset_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data for categories
INSERT INTO public.asset_categories (code, name, display_order, icon, color) VALUES
  ('precious_metals', 'Precious Metals', 1, 'Coins', 'gold'),
  ('banking', 'Banking & Fixed Income', 2, 'Landmark', 'blue'),
  ('equity', 'Equity & Market-linked', 3, 'TrendingUp', 'green'),
  ('real_assets', 'Real Assets', 4, 'Building2', 'emerald'),
  ('digital', 'Digital Assets', 5, 'Bitcoin', 'orange'),
  ('retirement', 'Retirement & Long-term', 6, 'Wallet', 'purple'),
  ('other', 'Other Investments', 7, 'Briefcase', 'gray');

-- Insert seed data for asset types
INSERT INTO public.asset_types (category_id, code, name, display_order, icon, supports_price_feed, supports_transactions, valuation_method, unit_type, metadata_schema) VALUES
  -- Precious Metals
  ((SELECT id FROM public.asset_categories WHERE code = 'precious_metals'), 'gold', 'Gold', 1, 'Coins', true, true, 'live_price', 'weight', '{"fields": ["metal_purity", "form"]}'),
  ((SELECT id FROM public.asset_categories WHERE code = 'precious_metals'), 'silver', 'Silver', 2, 'Coins', true, true, 'live_price', 'weight', '{"fields": ["metal_purity", "form"]}'),
  
  -- Banking & Fixed Income
  ((SELECT id FROM public.asset_categories WHERE code = 'banking'), 'fixed_deposit', 'Fixed Deposit', 1, 'Landmark', false, false, 'maturity_based', 'currency', '{"fields": ["bank_name", "interest_rate", "maturity_date", "maturity_amount"]}'),
  ((SELECT id FROM public.asset_categories WHERE code = 'banking'), 'savings_account', 'Savings Account', 2, 'Wallet', false, false, 'manual', 'currency', '{"fields": ["bank_name", "interest_rate"]}'),
  ((SELECT id FROM public.asset_categories WHERE code = 'banking'), 'bonds', 'Bonds', 3, 'FileText', false, false, 'maturity_based', 'currency', '{"fields": ["issuer", "coupon_rate", "maturity_date"]}'),
  
  -- Equity & Market-linked
  ((SELECT id FROM public.asset_categories WHERE code = 'equity'), 'stocks', 'Stocks', 1, 'BarChart3', true, true, 'live_price', 'units', '{"fields": ["broker_platform", "ticker_symbol"]}'),
  ((SELECT id FROM public.asset_categories WHERE code = 'equity'), 'mutual_fund', 'Mutual Funds', 2, 'PieChart', true, false, 'nav_based', 'units', '{"fields": ["fund_house", "scheme_name", "folio_number"]}'),
  ((SELECT id FROM public.asset_categories WHERE code = 'equity'), 'sip', 'SIP', 3, 'TrendingUp', true, false, 'nav_based', 'units', '{"fields": ["fund_house", "scheme_name", "sip_frequency", "sip_amount"]}'),
  
  -- Real Assets
  ((SELECT id FROM public.asset_categories WHERE code = 'real_assets'), 'real_estate', 'Real Estate', 1, 'Building2', false, false, 'manual', 'area', '{"fields": ["location", "area_sqft", "rental_income_monthly"]}'),
  ((SELECT id FROM public.asset_categories WHERE code = 'real_assets'), 'land', 'Land', 2, 'MapPin', false, false, 'manual', 'area', '{"fields": ["location", "area_sqft"]}'),
  
  -- Digital Assets
  ((SELECT id FROM public.asset_categories WHERE code = 'digital'), 'crypto', 'Cryptocurrency', 1, 'Bitcoin', true, true, 'live_price', 'units', '{"fields": ["coin_symbol", "wallet_address"]}'),
  
  -- Retirement & Long-term
  ((SELECT id FROM public.asset_categories WHERE code = 'retirement'), 'nps', 'NPS / Pension', 1, 'Wallet', false, false, 'nav_based', 'units', '{"fields": ["pran_number", "fund_manager"]}'),
  
  -- Other Investments
  ((SELECT id FROM public.asset_categories WHERE code = 'other'), 'business', 'Business Investment', 1, 'Briefcase', false, false, 'manual', 'currency', '{"fields": ["business_name", "ownership_percent"]}'),
  ((SELECT id FROM public.asset_categories WHERE code = 'other'), 'loans_given', 'Loans Given', 2, 'HandCoins', false, false, 'cost_based', 'currency', '{"fields": ["borrower_name", "interest_rate", "due_date"]}');

-- Add new asset_type_code column to assets table to link to new asset_types
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS asset_type_code TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS category_code TEXT;

-- Update existing assets to use new codes
UPDATE public.assets SET 
  asset_type_code = CASE 
    WHEN asset_type = 'precious_metals' AND metal_type = 'XAU' THEN 'gold'
    WHEN asset_type = 'precious_metals' AND metal_type = 'XAG' THEN 'silver'
    WHEN asset_type = 'precious_metals' THEN 'gold'  -- default to gold if no metal_type
    WHEN asset_type = 'fixed_deposit' THEN 'fixed_deposit'
    WHEN asset_type = 'real_estate' THEN 'real_estate'
    WHEN asset_type = 'sip' THEN 'sip'
    WHEN asset_type = 'mutual_fund' THEN 'mutual_fund'
    WHEN asset_type = 'shares' THEN 'stocks'
    ELSE asset_type::text
  END,
  category_code = CASE 
    WHEN asset_type = 'precious_metals' THEN 'precious_metals'
    WHEN asset_type = 'fixed_deposit' THEN 'banking'
    WHEN asset_type = 'real_estate' THEN 'real_assets'
    WHEN asset_type = 'sip' THEN 'equity'
    WHEN asset_type = 'mutual_fund' THEN 'equity'
    WHEN asset_type = 'shares' THEN 'equity'
    ELSE 'other'
  END;