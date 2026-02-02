/**
 * Asset Configuration Types - Configuration-driven asset framework
 */

export type ValuationMethod = 'live_price' | 'nav_based' | 'maturity_based' | 'manual' | 'cost_based';
export type UnitType = 'currency' | 'weight' | 'units' | 'area' | 'quantity';

export interface AssetCategory {
  id: string;
  code: string;
  name: string;
  display_order: number;
  icon: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssetTypeConfig {
  id: string;
  category_id: string;
  code: string;
  name: string;
  display_order: number;
  icon: string | null;
  color: string | null;
  supports_price_feed: boolean;
  supports_transactions: boolean;
  valuation_method: ValuationMethod;
  unit_type: UnitType;
  metadata_schema: Record<string, unknown> | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  // Joined field
  category?: AssetCategory;
}

export interface AssetCategoryWithTypes extends AssetCategory {
  asset_types: AssetTypeConfig[];
}

// Map icon strings to Lucide icons
export const ICON_MAP: Record<string, string> = {
  Coins: 'Coins',
  Landmark: 'Landmark',
  TrendingUp: 'TrendingUp',
  Building2: 'Building2',
  Bitcoin: 'Bitcoin',
  Wallet: 'Wallet',
  Briefcase: 'Briefcase',
  BarChart3: 'BarChart3',
  PieChart: 'PieChart',
  FileText: 'FileText',
  MapPin: 'MapPin',
  HandCoins: 'HandCoins',
};

// Color mappings for categories
export const COLOR_MAP: Record<string, string> = {
  gold: 'bg-gold/20 text-gold',
  blue: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  green: 'bg-green-500/20 text-green-600 dark:text-green-400',
  emerald: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  orange: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  purple: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  gray: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  rose: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
};

export function getColorClass(color: string | null): string {
  if (!color) return COLOR_MAP.gray;
  return COLOR_MAP[color] || COLOR_MAP.gray;
}

// Unit display labels
export const UNIT_TYPE_LABELS: Record<UnitType, string> = {
  currency: 'Amount',
  weight: 'Weight',
  units: 'Units',
  area: 'Area',
  quantity: 'Quantity',
};

// Valuation method labels
export const VALUATION_METHOD_LABELS: Record<ValuationMethod, string> = {
  live_price: 'Live Price',
  nav_based: 'NAV Based',
  maturity_based: 'Maturity Based',
  manual: 'Manual',
  cost_based: 'Cost Based',
};
