/**
 * 3-Tier Liquidity Classification
 * 
 * Liquid: Cash, savings, listed stocks, ETFs, market-traded instruments
 * Semi-Liquid: FDs, RDs, mutual funds, gold, silver, precious metals, bonds, govt savings
 * Illiquid: Real estate, land, private equity, locked investments
 */

import type { Asset } from '@/types/assets';
import { DEFAULT_INR_TO_AED } from '@/types/assets';

export type LiquidityTier = 'liquid' | 'semi_liquid' | 'illiquid';

export interface LiquidityItem {
  tier: LiquidityTier;
  label: string;
  color: string;
  cssVar: string;
}

export const LIQUIDITY_TIERS: Record<LiquidityTier, LiquidityItem> = {
  liquid: {
    tier: 'liquid',
    label: 'Liquid',
    color: 'hsl(142, 71%, 45%)',
    cssVar: '--liquidity-liquid',
  },
  semi_liquid: {
    tier: 'semi_liquid',
    label: 'Semi-Liquid',
    color: 'hsl(38, 92%, 50%)',
    cssVar: '--liquidity-semi-liquid',
  },
  illiquid: {
    tier: 'illiquid',
    label: 'Illiquid',
    color: 'hsl(350, 89%, 60%)',
    cssVar: '--liquidity-illiquid',
  },
};

export const LIQUIDITY_ORDER: LiquidityTier[] = ['liquid', 'semi_liquid', 'illiquid'];

// Category code / asset_type → liquidity tier mapping
const LIQUID_CATEGORIES = new Set([
  'cash', 'savings', 'current_account', 'wallet',
  'shares', 'stocks', 'etf', 'equity',
  'listed_equity', 'digital',
]);

const SEMI_LIQUID_CATEGORIES = new Set([
  'precious_metals', 'fixed_deposit', 'recurring_deposit',
  'mutual_fund', 'sip', 'gold', 'silver',
  'bonds', 'government_savings', 'banking', 'fixed_income',
  'insurance', 'retirement', 'crypto',
]);

const ILLIQUID_CATEGORIES = new Set([
  'real_estate', 'real_assets', 'land',
  'private_equity', 'locked_investment',
]);

/**
 * Classify a single asset into a liquidity tier
 */
export function classifyAssetLiquidity(asset: Asset): LiquidityTier {
  const cat = asset.category_code || asset.asset_type_code || asset.asset_type;
  
  if (LIQUID_CATEGORIES.has(cat)) return 'liquid';
  if (SEMI_LIQUID_CATEGORIES.has(cat)) return 'semi_liquid';
  if (ILLIQUID_CATEGORIES.has(cat)) return 'illiquid';

  // Fallback by asset_type enum
  switch (asset.asset_type) {
    case 'shares':
      return 'liquid';
    case 'precious_metals':
    case 'fixed_deposit':
    case 'sip':
    case 'mutual_fund':
      return 'semi_liquid';
    case 'real_estate':
      return 'illiquid';
    default:
      return 'semi_liquid';
  }
}

export interface LiquidityBreakdownResult {
  liquid: number;
  semi_liquid: number;
  illiquid: number;
  total: number;
  byTier: {
    tier: LiquidityTier;
    label: string;
    value: number;
    percent: number;
    color: string;
    assets: Asset[];
  }[];
}

/**
 * Classify all assets into 3-tier liquidity breakdown.
 * By default converts INR values to AED using the provided rate.
 * Pass a custom getValueAed to override (e.g. for live metal prices).
 */
export function calculateLiquidityBreakdown(
  assets: Asset[],
  getValueAed?: (asset: Asset) => number,
  inrToAed: number = DEFAULT_INR_TO_AED
): LiquidityBreakdownResult {
  const buckets: Record<LiquidityTier, { value: number; assets: Asset[] }> = {
    liquid: { value: 0, assets: [] },
    semi_liquid: { value: 0, assets: [] },
    illiquid: { value: 0, assets: [] },
  };

  for (const asset of assets) {
    const tier = classifyAssetLiquidity(asset);
    let value: number;
    if (getValueAed) {
      value = getValueAed(asset);
    } else {
      const raw = Number(asset.current_value) || Number(asset.total_cost) || 0;
      value = asset.currency === 'INR' ? raw * inrToAed : raw;
    }
    
    buckets[tier].value += value;
    buckets[tier].assets.push(asset);
  }

  const total = buckets.liquid.value + buckets.semi_liquid.value + buckets.illiquid.value;

  const byTier = LIQUIDITY_ORDER.map(tier => ({
    tier,
    label: LIQUIDITY_TIERS[tier].label,
    value: buckets[tier].value,
    percent: total > 0 ? (buckets[tier].value / total) * 100 : 0,
    color: LIQUIDITY_TIERS[tier].color,
    assets: buckets[tier].assets,
  }));

  return {
    liquid: buckets.liquid.value,
    semi_liquid: buckets.semi_liquid.value,
    illiquid: buckets.illiquid.value,
    total,
    byTier,
  };
}

/**
 * Generate portfolio insights based on liquidity distribution
 */
export interface LiquidityInsight {
  type: 'info' | 'warning' | 'success';
  title: string;
  message: string;
}

export function getLiquidityInsights(breakdown: LiquidityBreakdownResult): LiquidityInsight[] {
  const insights: LiquidityInsight[] = [];
  if (breakdown.total === 0) return insights;

  const liquidPct = breakdown.byTier[0].percent;
  const semiLiquidPct = breakdown.byTier[1].percent;
  const illiquidPct = breakdown.byTier[2].percent;

  if (liquidPct < 10 && breakdown.total > 0) {
    insights.push({
      type: 'warning',
      title: 'Low Liquid Assets',
      message: `Only ${liquidPct.toFixed(4)}% of your portfolio is instantly accessible. Consider keeping at least 10-15% in liquid assets for short-term needs.`,
    });
  } else if (liquidPct >= 10 && liquidPct <= 30) {
    insights.push({
      type: 'success',
      title: 'Healthy Liquidity',
      message: `${liquidPct.toFixed(4)}% of your portfolio is liquid — a well-balanced position for flexibility.`,
    });
  }

  if (illiquidPct > 60) {
    insights.push({
      type: 'warning',
      title: 'High Illiquid Concentration',
      message: `${illiquidPct.toFixed(1)}% of your portfolio is in illiquid assets. This may limit your ability to access funds quickly if needed.`,
    });
  }

  if (semiLiquidPct > 70) {
    insights.push({
      type: 'info',
      title: 'Large Semi-Liquid Allocation',
      message: `${semiLiquidPct.toFixed(1)}% of your portfolio is in semi-liquid instruments. These can typically be redeemed in a few days but may involve penalties or delays.`,
    });
  }

  if (liquidPct > 50) {
    insights.push({
      type: 'info',
      title: 'High Cash Position',
      message: `${liquidPct.toFixed(1)}% is in liquid assets. Consider deploying some into growth-oriented investments for better returns.`,
    });
  }

  return insights;
}

/**
 * Calculate emergency coverage in months.
 * Assumes monthly expenses = totalLiabilitiesEmi or a reasonable estimate.
 */
export function calculateEmergencyCoverage(
  liquidValue: number,
  monthlyExpenses: number
): { months: number; status: 'critical' | 'low' | 'adequate' | 'strong' } {
  if (monthlyExpenses <= 0) {
    return { months: liquidValue > 0 ? 99 : 0, status: liquidValue > 0 ? 'strong' : 'critical' };
  }

  const months = liquidValue / monthlyExpenses;

  let status: 'critical' | 'low' | 'adequate' | 'strong';
  if (months < 1) status = 'critical';
  else if (months < 3) status = 'low';
  else if (months < 6) status = 'adequate';
  else status = 'strong';

  return { months, status };
}
