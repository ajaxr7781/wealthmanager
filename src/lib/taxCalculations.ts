/**
 * Indian Tax Calculation Engine
 * 
 * Capital Gains Tax Rules (FY 2024-25 onwards):
 * 
 * EQUITY MF / SHARES (Listed):
 *   LTCG (>12 months): 12.5% above ₹1.25L exemption
 *   STCG (≤12 months): 20%
 * 
 * DEBT MF / GOLD MF / FoF:
 *   Always taxed at slab rate (no LTCG benefit since April 2023)
 *   Treated as STCG regardless of holding period for tax purposes
 * 
 * PRECIOUS METALS (Physical Gold/Silver):
 *   LTCG (>24 months): 12.5% (no indexation from July 2024)
 *   STCG (≤24 months): Slab rate
 * 
 * REAL ESTATE:
 *   LTCG (>24 months): 12.5% (no indexation from July 2024)
 *   STCG (≤24 months): Slab rate
 * 
 * FIXED DEPOSITS:
 *   Interest taxed at slab rate (not capital gains)
 */

import type { Asset } from '@/types/assets';
import type { AssetTransaction } from '@/hooks/useAssetTransactions';
import { differenceInMonths } from 'date-fns';

// Asset class for tax purpose
export type TaxAssetClass = 'equity_mf' | 'debt_mf' | 'precious_metals' | 'real_estate' | 'fixed_deposit' | 'shares' | 'other';

export interface TaxLot {
  assetId: string;
  assetName: string;
  assetClass: TaxAssetClass;
  purchaseDate: string;
  sellDate: string | null;
  quantity: number;
  costBasis: number;       // in original currency
  saleProceeds: number;    // in original currency
  gain: number;
  holdingMonths: number;
  isLongTerm: boolean;
  taxRate: number;          // applicable rate
  taxableGain: number;      // after exemptions
  estimatedTax: number;
  currency: string;
  isRealized: boolean;      // false = unrealized
}

export interface TaxSummary {
  fy: string;
  realizedSTCG: number;
  realizedLTCG: number;
  ltcgExemptionUsed: number;
  ltcgExemptionRemaining: number;
  estimatedTaxSTCG: number;
  estimatedTaxLTCG: number;
  totalEstimatedTax: number;
  lots: TaxLot[];
}

export interface HarvestSuggestion {
  assetId: string;
  assetName: string;
  assetClass: TaxAssetClass;
  unrealizedLoss: number;
  holdingMonths: number;
  isLongTerm: boolean;
  potentialTaxSaving: number;
  currency: string;
}

const EQUITY_LTCG_EXEMPTION = 125000; // ₹1.25 lakh
const EQUITY_LTCG_RATE = 0.125;       // 12.5%
const EQUITY_STCG_RATE = 0.20;        // 20%
const PM_RE_LTCG_RATE = 0.125;        // 12.5%
const SLAB_RATE_ESTIMATE = 0.30;      // Assume 30% slab for estimation

function getAssetClass(asset: Asset): TaxAssetClass {
  const type = asset.asset_type;
  const typeCode = asset.asset_type_code;
  
  if (type === 'mutual_fund' || type === 'sip') {
    // Attempt to classify as equity or debt based on category/name
    const name = (asset.asset_name || '').toLowerCase();
    const instrument = (asset.instrument_name || '').toLowerCase();
    const combined = name + ' ' + instrument;
    
    const debtKeywords = ['debt', 'liquid', 'money market', 'gilt', 'bond', 'overnight', 'ultra short', 'low duration', 'corporate bond', 'credit risk', 'banking & psu', 'fixed maturity', 'fmp', 'gold', 'silver', 'commodity', 'international', 'fund of fund', 'fof'];
    const isDebt = debtKeywords.some(kw => combined.includes(kw));
    
    return isDebt ? 'debt_mf' : 'equity_mf';
  }
  
  if (type === 'shares') return 'shares';
  if (type === 'precious_metals') return 'precious_metals';
  if (type === 'real_estate') return 'real_estate';
  if (type === 'fixed_deposit') return 'fixed_deposit';
  
  return 'other';
}

function getLtcgThresholdMonths(assetClass: TaxAssetClass): number {
  switch (assetClass) {
    case 'equity_mf':
    case 'shares':
      return 12;
    case 'precious_metals':
    case 'real_estate':
      return 24;
    case 'debt_mf':
      return Infinity; // Always STCG post April 2023
    case 'fixed_deposit':
      return Infinity; // Interest income, not capital gains
    default:
      return 24;
  }
}

function getTaxRate(assetClass: TaxAssetClass, isLongTerm: boolean): number {
  switch (assetClass) {
    case 'equity_mf':
    case 'shares':
      return isLongTerm ? EQUITY_LTCG_RATE : EQUITY_STCG_RATE;
    case 'precious_metals':
    case 'real_estate':
      return isLongTerm ? PM_RE_LTCG_RATE : SLAB_RATE_ESTIMATE;
    case 'debt_mf':
      return SLAB_RATE_ESTIMATE;
    case 'fixed_deposit':
      return SLAB_RATE_ESTIMATE;
    default:
      return SLAB_RATE_ESTIMATE;
  }
}

export function calculateTaxLots(
  assets: Asset[],
  transactions: AssetTransaction[],
  financialYear?: string // e.g. '2025-26'
): TaxSummary {
  const fy = financialYear || getCurrentFY();
  const { start: fyStart, end: fyEnd } = getFYDates(fy);
  
  const lots: TaxLot[] = [];
  
  // Group transactions by asset
  const txByAsset = new Map<string, AssetTransaction[]>();
  for (const tx of transactions) {
    const list = txByAsset.get(tx.asset_id) || [];
    list.push(tx);
    txByAsset.set(tx.asset_id, list);
  }
  
  for (const asset of assets) {
    const assetClass = getAssetClass(asset);
    if (assetClass === 'fixed_deposit') continue; // FD income is interest, not capital gains
    
    const assetTxs = txByAsset.get(asset.id) || [];
    
    // Find sell transactions in FY
    const sellTxs = assetTxs.filter(tx => {
      const isSell = ['SELL', 'REDEMPTION', 'SWITCH_OUT'].includes(tx.transaction_type);
      const txDate = new Date(tx.transaction_date);
      return isSell && txDate >= fyStart && txDate <= fyEnd;
    });
    
    // Find buy transactions (sorted by date for FIFO)
    const buyTxs = assetTxs
      .filter(tx => ['BUY', 'PURCHASE', 'SWITCH_IN'].includes(tx.transaction_type))
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    
    // Process realized gains (FIFO matching)
    if (sellTxs.length > 0 && buyTxs.length > 0) {
      let buyIdx = 0;
      let buyQtyRemaining = buyTxs[0] ? Number(buyTxs[0].quantity) : 0;
      
      for (const sell of sellTxs) {
        let sellQty = Number(sell.quantity);
        const sellPrice = Number(sell.amount) / sellQty;
        
        while (sellQty > 0 && buyIdx < buyTxs.length) {
          const matched = Math.min(sellQty, buyQtyRemaining);
          const buyPrice = Number(buyTxs[buyIdx].amount) / Number(buyTxs[buyIdx].quantity);
          const costBasis = matched * buyPrice;
          const proceeds = matched * sellPrice;
          const gain = proceeds - costBasis;
          
          const holdingMonths = differenceInMonths(
            new Date(sell.transaction_date),
            new Date(buyTxs[buyIdx].transaction_date)
          );
          
          const threshold = getLtcgThresholdMonths(assetClass);
          const isLongTerm = holdingMonths > threshold;
          const taxRate = getTaxRate(assetClass, isLongTerm);
          
          lots.push({
            assetId: asset.id,
            assetName: asset.asset_name,
            assetClass,
            purchaseDate: buyTxs[buyIdx].transaction_date,
            sellDate: sell.transaction_date,
            quantity: matched,
            costBasis,
            saleProceeds: proceeds,
            gain,
            holdingMonths,
            isLongTerm,
            taxRate,
            taxableGain: gain, // Will adjust for exemptions below
            estimatedTax: 0,   // Will compute below
            currency: asset.currency,
            isRealized: true,
          });
          
          sellQty -= matched;
          buyQtyRemaining -= matched;
          
          if (buyQtyRemaining <= 0) {
            buyIdx++;
            buyQtyRemaining = buyIdx < buyTxs.length ? Number(buyTxs[buyIdx].quantity) : 0;
          }
        }
      }
    }
    
    // Add unrealized lots for current holdings
    const currentValue = Number(asset.current_value) || Number(asset.total_cost);
    const invested = Number(asset.total_cost);
    const unrealizedGain = currentValue - invested;
    
    if (invested > 0) {
      const holdingMonths = differenceInMonths(new Date(), new Date(asset.purchase_date));
      const threshold = getLtcgThresholdMonths(assetClass);
      const isLongTerm = holdingMonths > threshold;
      const taxRate = getTaxRate(assetClass, isLongTerm);
      
      lots.push({
        assetId: asset.id,
        assetName: asset.asset_name,
        assetClass,
        purchaseDate: asset.purchase_date,
        sellDate: null,
        quantity: Number(asset.quantity || asset.units_held || 1),
        costBasis: invested,
        saleProceeds: currentValue,
        gain: unrealizedGain,
        holdingMonths,
        isLongTerm,
        taxRate,
        taxableGain: unrealizedGain,
        estimatedTax: 0,
        currency: asset.currency,
        isRealized: false,
      });
    }
  }
  
  // Calculate tax with LTCG exemption for equity
  const realizedLots = lots.filter(l => l.isRealized);
  const equityLTCGLots = realizedLots.filter(l => 
    l.isLongTerm && (l.assetClass === 'equity_mf' || l.assetClass === 'shares')
  );
  
  let totalEquityLTCG = equityLTCGLots.reduce((sum, l) => sum + Math.max(0, l.gain), 0);
  let exemptionUsed = Math.min(totalEquityLTCG, EQUITY_LTCG_EXEMPTION);
  let taxableEquityLTCG = Math.max(0, totalEquityLTCG - EQUITY_LTCG_EXEMPTION);
  
  // Distribute exemption proportionally across lots
  for (const lot of equityLTCGLots) {
    if (lot.gain > 0 && totalEquityLTCG > 0) {
      const proportion = lot.gain / totalEquityLTCG;
      const lotExemption = exemptionUsed * proportion;
      lot.taxableGain = Math.max(0, lot.gain - lotExemption);
      lot.estimatedTax = lot.taxableGain * lot.taxRate;
    }
  }
  
  // Calculate tax for non-equity LTCG and all STCG
  for (const lot of realizedLots) {
    if (equityLTCGLots.includes(lot)) continue; // Already handled
    if (lot.gain > 0) {
      lot.taxableGain = lot.gain;
      lot.estimatedTax = lot.gain * lot.taxRate;
    } else {
      lot.taxableGain = lot.gain;
      lot.estimatedTax = 0;
    }
  }
  
  // Also compute for unrealized lots (informational)
  for (const lot of lots.filter(l => !l.isRealized)) {
    if (lot.gain > 0) {
      lot.estimatedTax = lot.gain * lot.taxRate;
    }
  }
  
  const realizedSTCG = realizedLots.filter(l => !l.isLongTerm).reduce((s, l) => s + l.gain, 0);
  const realizedLTCG = realizedLots.filter(l => l.isLongTerm).reduce((s, l) => s + l.gain, 0);
  const estimatedTaxSTCG = realizedLots.filter(l => !l.isLongTerm && l.gain > 0).reduce((s, l) => s + l.estimatedTax, 0);
  const estimatedTaxLTCG = realizedLots.filter(l => l.isLongTerm && l.gain > 0).reduce((s, l) => s + l.estimatedTax, 0);
  
  return {
    fy,
    realizedSTCG,
    realizedLTCG,
    ltcgExemptionUsed: exemptionUsed,
    ltcgExemptionRemaining: Math.max(0, EQUITY_LTCG_EXEMPTION - exemptionUsed),
    estimatedTaxSTCG,
    estimatedTaxLTCG,
    totalEstimatedTax: estimatedTaxSTCG + estimatedTaxLTCG,
    lots,
  };
}

export function getHarvestSuggestions(lots: TaxLot[]): HarvestSuggestion[] {
  return lots
    .filter(l => !l.isRealized && l.gain < 0)
    .map(l => ({
      assetId: l.assetId,
      assetName: l.assetName,
      assetClass: l.assetClass,
      unrealizedLoss: Math.abs(l.gain),
      holdingMonths: l.holdingMonths,
      isLongTerm: l.isLongTerm,
      potentialTaxSaving: Math.abs(l.gain) * l.taxRate,
      currency: l.currency,
    }))
    .sort((a, b) => b.potentialTaxSaving - a.potentialTaxSaving);
}

export function getCurrentFY(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // FY starts April
  if (month >= 3) {
    return `${year}-${(year + 1).toString().slice(-2)}`;
  }
  return `${year - 1}-${year.toString().slice(-2)}`;
}

export function getFYDates(fy: string): { start: Date; end: Date } {
  const startYear = parseInt(fy.split('-')[0]);
  return {
    start: new Date(startYear, 3, 1),     // April 1
    end: new Date(startYear + 1, 2, 31),  // March 31
  };
}

export function getFYOptions(): string[] {
  const current = getCurrentFY();
  const startYear = parseInt(current.split('-')[0]);
  const options: string[] = [];
  for (let y = startYear; y >= startYear - 3; y--) {
    options.push(`${y}-${(y + 1).toString().slice(-2)}`);
  }
  return options;
}

export function formatAssetClass(ac: TaxAssetClass): string {
  const labels: Record<TaxAssetClass, string> = {
    equity_mf: 'Equity MF',
    debt_mf: 'Debt MF',
    shares: 'Shares',
    precious_metals: 'Precious Metals',
    real_estate: 'Real Estate',
    fixed_deposit: 'Fixed Deposit',
    other: 'Other',
  };
  return labels[ac] || ac;
}

// Generate CSV export
export function generateTaxCSV(summary: TaxSummary): string {
  const headers = [
    'Asset Name', 'Asset Class', 'Buy Date', 'Sell Date', 'Holding (Months)',
    'Type', 'Quantity', 'Cost Basis', 'Sale Proceeds', 'Gain/Loss',
    'Tax Rate', 'Taxable Gain', 'Estimated Tax', 'Currency', 'Status'
  ];
  
  const rows = summary.lots.map(l => [
    `"${l.assetName}"`,
    formatAssetClass(l.assetClass),
    l.purchaseDate,
    l.sellDate || 'Holding',
    l.holdingMonths,
    l.isLongTerm ? 'LTCG' : 'STCG',
    l.quantity.toFixed(4),
    l.costBasis.toFixed(4),
    l.saleProceeds.toFixed(4),
    l.gain.toFixed(4),
    `${(l.taxRate * 100).toFixed(4)}%`,
    l.taxableGain.toFixed(4),
    l.estimatedTax.toFixed(4),
    l.currency,
    l.isRealized ? 'Realized' : 'Unrealized',
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
