/**
 * Multi-Asset Investment Tracker Types
 */

export type AssetType = 
  | 'precious_metals'
  | 'real_estate'
  | 'fixed_deposit'
  | 'sip'
  | 'mutual_fund'
  | 'shares';

export type Currency = 'AED' | 'INR';

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  precious_metals: 'Precious Metals',
  real_estate: 'Real Estate',
  fixed_deposit: 'Fixed Deposit',
  sip: 'SIP',
  mutual_fund: 'Mutual Fund',
  shares: 'Shares/Stocks',
};

export const ASSET_TYPE_ICONS: Record<AssetType, string> = {
  precious_metals: 'Coins',
  real_estate: 'Building2',
  fixed_deposit: 'Landmark',
  sip: 'TrendingUp',
  mutual_fund: 'PieChart',
  shares: 'BarChart3',
};

export const QUANTITY_UNITS: Record<AssetType, string[]> = {
  precious_metals: ['grams', 'oz'],
  real_estate: ['sqft', 'sqm', 'units'],
  fixed_deposit: ['units'],
  sip: ['units'],
  mutual_fund: ['units'],
  shares: ['shares'],
};

export const DEFAULT_QUANTITY_UNIT: Record<AssetType, string> = {
  precious_metals: 'grams',
  real_estate: 'sqft',
  fixed_deposit: 'units',
  sip: 'units',
  mutual_fund: 'units',
  shares: 'shares',
};

export interface Asset {
  id: string;
  user_id: string;
  portfolio_id: string | null;
  
  // Common fields
  asset_type: AssetType;
  asset_type_code: string | null; // New normalized type code
  category_code: string | null;   // New category code
  asset_name: string;
  currency: Currency;
  purchase_date: string;
  notes: string | null;
  
  // Quantity/Units
  quantity: number | null;
  quantity_unit: string | null;
  
  // Cost basis
  purchase_price_per_unit: number | null;
  total_cost: number;
  
  // Current valuation
  current_price_per_unit: number | null;
  current_value: number | null;
  is_current_value_manual: boolean;
  
  // Type-specific: Precious Metals
  metal_type: string | null; // 'XAU', 'XAG'
  
  // Type-specific: Real Estate
  location: string | null;
  area_sqft: number | null;
  rental_income_monthly: number | null;
  
  // Type-specific: Fixed Deposit
  bank_name: string | null;
  principal: number | null;
  interest_rate: number | null;
  maturity_date: string | null;
  maturity_amount: number | null;
  
  // Type-specific: SIP/MF/Shares
  instrument_name: string | null;
  broker_platform: string | null;
  nav_or_price: number | null;
  sip_frequency: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface AssetFormData {
  asset_type: AssetType;
  asset_type_code?: string;
  category_code?: string;
  asset_name: string;
  currency: Currency;
  purchase_date: string;
  notes?: string;
  quantity?: number;
  quantity_unit?: string;
  purchase_price_per_unit?: number;
  total_cost: number;
  current_price_per_unit?: number;
  current_value?: number;
  is_current_value_manual?: boolean;
  metal_type?: string;
  location?: string;
  area_sqft?: number;
  rental_income_monthly?: number;
  bank_name?: string;
  principal?: number;
  interest_rate?: number;
  maturity_date?: string;
  maturity_amount?: number;
  instrument_name?: string;
  broker_platform?: string;
  nav_or_price?: number;
  sip_frequency?: string;
}

export interface PortfolioOverview {
  total_invested: number;
  total_current_value: number;
  total_profit_loss: number;
  total_profit_loss_percent: number;
  assets_by_type: {
    type: string;
    label: string;
    total_invested: number;
    current_value: number;
    profit_loss: number;
    count: number;
    color?: string | null;
    icon?: string | null;
  }[];
  currency_breakdown: {
    currency: Currency;
    total_invested: number;
    current_value: number;
  }[];
  // Mutual Fund summary (INR, converted to AED for totals)
  mf_summary?: {
    total_invested_inr: number;
    current_value_inr: number;
    total_invested_aed: number;
    current_value_aed: number;
    unrealized_gain_inr: number;
    return_pct: number;
    holdings_count: number;
  };
  // SIP summary (INR, converted to AED for totals)
  sip_summary?: {
    invested_inr: number;
    invested_aed: number;
    current_value_inr: number;
    current_value_aed: number;
    monthly_commitment_inr: number;
    monthly_commitment_aed: number;
    active_count: number;
    total_count: number;
  };
}

export interface MetalPrices {
  XAU: {
    usd_per_oz: number;
    aed_per_oz: number;
    aed_per_gram: number;
  } | null;
  XAG: {
    usd_per_oz: number;
    aed_per_oz: number;
    aed_per_gram: number;
  } | null;
  last_updated: string | null;
  source: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  usd_to_aed_rate: number;
  inr_to_aed_rate: number;
  auto_refresh_prices: boolean;
  created_at: string;
  updated_at: string;
}

// FX conversion rates
export const DEFAULT_USD_TO_AED = 3.6725;
export const DEFAULT_INR_TO_AED = 0.044;
export const OUNCE_TO_GRAM = 31.1035;
