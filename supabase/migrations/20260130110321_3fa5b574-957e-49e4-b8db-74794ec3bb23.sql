-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for secure role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table for user information
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create instruments table (XAU/XAG reference data)
CREATE TABLE public.instruments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT UNIQUE NOT NULL CHECK (symbol IN ('XAU', 'XAG')),
    name TEXT NOT NULL,
    ounce_to_gram NUMERIC NOT NULL DEFAULT 31.1035,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolios table
CREATE TABLE public.portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    base_currency TEXT NOT NULL DEFAULT 'AED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quantity_unit enum
CREATE TYPE public.quantity_unit AS ENUM ('OZ', 'GRAM');

-- Create price_unit enum
CREATE TYPE public.price_unit AS ENUM ('AED_PER_OZ', 'AED_PER_GRAM');

-- Create transaction_side enum
CREATE TYPE public.transaction_side AS ENUM ('BUY', 'SELL');

-- Create transactions table
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE NOT NULL,
    instrument_symbol TEXT REFERENCES public.instruments(symbol) ON DELETE RESTRICT NOT NULL,
    side transaction_side NOT NULL,
    trade_date DATE NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    quantity_unit quantity_unit NOT NULL,
    price NUMERIC NOT NULL CHECK (price > 0),
    price_unit price_unit NOT NULL,
    fees NUMERIC NOT NULL DEFAULT 0 CHECK (fees >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_snapshots table
CREATE TABLE public.price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instrument_symbol TEXT REFERENCES public.instruments(symbol) ON DELETE RESTRICT NOT NULL,
    as_of TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    source TEXT DEFAULT 'manual',
    price_aed_per_oz NUMERIC NOT NULL CHECK (price_aed_per_oz > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for price lookups
CREATE INDEX idx_price_snapshots_symbol_as_of ON public.price_snapshots (instrument_symbol, as_of DESC);

-- Create index for transactions by portfolio
CREATE INDEX idx_transactions_portfolio ON public.transactions (portfolio_id, trade_date);

-- Create index for portfolios by user
CREATE INDEX idx_portfolios_user ON public.portfolios (user_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's portfolio IDs
CREATE OR REPLACE FUNCTION public.get_user_portfolio_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.portfolios WHERE user_id = _user_id
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for instruments (public read)
CREATE POLICY "Anyone can view instruments" ON public.instruments
    FOR SELECT USING (true);

-- RLS Policies for portfolios
CREATE POLICY "Users can view their own portfolios" ON public.portfolios
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios" ON public.portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios" ON public.portfolios
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolios" ON public.portfolios
    FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (portfolio_id IN (SELECT public.get_user_portfolio_ids(auth.uid())));

CREATE POLICY "Users can create transactions in their portfolios" ON public.transactions
    FOR INSERT WITH CHECK (portfolio_id IN (SELECT public.get_user_portfolio_ids(auth.uid())));

CREATE POLICY "Users can update their own transactions" ON public.transactions
    FOR UPDATE USING (portfolio_id IN (SELECT public.get_user_portfolio_ids(auth.uid())));

CREATE POLICY "Users can delete their own transactions" ON public.transactions
    FOR DELETE USING (portfolio_id IN (SELECT public.get_user_portfolio_ids(auth.uid())));

-- RLS Policies for price_snapshots (public read, authenticated write)
CREATE POLICY "Anyone can view price snapshots" ON public.price_snapshots
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create price snapshots" ON public.price_snapshots
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
    BEFORE UPDATE ON public.portfolios
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile and user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Seed instruments data
INSERT INTO public.instruments (symbol, name, ounce_to_gram) VALUES
    ('XAU', 'Gold', 31.1035),
    ('XAG', 'Silver', 31.1035);