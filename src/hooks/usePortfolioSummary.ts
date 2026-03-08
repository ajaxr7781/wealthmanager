import { useMemo } from 'react';
import { useAssets, useUserSettings } from './useAssets';
import { useLatestPrices } from './usePrices';
import { useAllAssetTransactions } from './useAssetTransactions';
import { 
  calculateInstrumentSummary, 
  calculatePortfolioSummary,
  processTransactionHistory,
  PortfolioSummary,
  RawTransaction,
} from '@/lib/calculations';

export interface CategoryBreakdown {
  category_code: string;
  label: string;
  value_aed: number;
}
import { DEFAULT_INR_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';
import { getEffectiveFDValue } from '@/lib/fdCalculations';

/**
 * Unified portfolio summary hook.
 * Now reads from the unified `assets` and `asset_transactions` tables.
 * The optional portfolioId is kept for backward compatibility but ignored
 * since all data now lives in the assets table.
 */
export function usePortfolioSummary(_portfolioId?: string | undefined) {
  const { data: assets, isLoading: assetsLoading, error: assetsError } = useAssets();
  const { data: prices, isLoading: pricesLoading, error: pricesError } = useLatestPrices();
  const { data: allTxs, isLoading: txLoading } = useAllAssetTransactions();
  const { data: settings } = useUserSettings();

  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  const summary = useMemo((): PortfolioSummary | null => {
    if (!assets || !prices) return null;

    // Build PM instrument summaries from asset_transactions (for WAC calculations)
    const goldTxs: RawTransaction[] = [];
    // silverTxs pushed into goldTxs array below then filtered

    // Extract PM transactions from asset_transactions
    if (allTxs) {
      const pmAssets = assets.filter(a => a.asset_type === 'precious_metals');
      const goldAsset = pmAssets.find(a => a.metal_type === 'XAU');
      const silverAsset = pmAssets.find(a => a.metal_type === 'XAG');

      for (const tx of allTxs) {
        const isGold = goldAsset && tx.asset_id === goldAsset.id;
        const isSilver = silverAsset && tx.asset_id === silverAsset.id;

        if (isGold || isSilver) {
          goldTxs.push({
            id: tx.id,
            instrument_symbol: isGold ? 'XAU' : 'XAG',
            side: tx.transaction_type as 'BUY' | 'SELL',
            trade_date: tx.transaction_date,
            quantity: Number(tx.quantity),
            quantity_unit: (tx.quantity_unit || 'OZ') as 'OZ' | 'GRAM',
            price: Number(tx.price_per_unit || 0),
            price_unit: 'AED_PER_OZ' as const,
            fees: Number(tx.fees),
            portfolio_id: '',
          });
        }
      }
    }

    // Separate gold and silver
    const goldRawTxs = goldTxs.filter(t => t.instrument_symbol === 'XAU');
    const silverRawTxs = goldTxs.filter(t => t.instrument_symbol === 'XAG');

    const goldResult = processTransactionHistory(goldRawTxs);
    const silverResult = processTransactionHistory(silverRawTxs);

    const goldSummary = calculateInstrumentSummary(
      'XAU', 'Gold',
      goldResult.finalPosition,
      prices.XAU?.price_aed_per_oz ?? null
    );

    const silverSummary = calculateInstrumentSummary(
      'XAG', 'Silver',
      silverResult.finalPosition,
      prices.XAG?.price_aed_per_oz ?? null
    );

    // Start with PM summary
    const pmSummary = calculatePortfolioSummary([goldSummary, silverSummary]);

    // Now add other asset types' totals and build category breakdown
    let otherInvested = 0;
    let otherCurrentValue = 0;

    const categoryMap: Record<string, { label: string; value_aed: number }> = {};

    // Add PM values to category map
    const goldVal = goldSummary.current_value_aed ?? goldSummary.cost_basis_aed;
    const silverVal = silverSummary.current_value_aed ?? silverSummary.cost_basis_aed;
    if (goldVal > 0 || silverVal > 0) {
      categoryMap['precious_metals'] = {
        label: 'Precious Metals',
        value_aed: goldVal + silverVal,
      };
    }

    const CATEGORY_LABELS: Record<string, string> = {
      precious_metals: 'Precious Metals',
      equity: 'Equity / MF',
      real_estate: 'Real Estate',
      fixed_income: 'Fixed Income',
      cash: 'Cash',
      crypto: 'Crypto',
      other: 'Other',
    };

    for (const asset of assets) {
      if (asset.asset_type === 'precious_metals') continue; // Already handled

      const invested = Number(asset.total_cost) || 0;
      let currentVal: number;

      if (asset.asset_type === 'fixed_deposit' || asset.asset_type_code === 'fixed_deposit') {
        const fdResult = getEffectiveFDValue({
          principal: asset.principal ? Number(asset.principal) : null,
          interest_rate: asset.interest_rate ? Number(asset.interest_rate) : null,
          purchase_date: asset.purchase_date,
          maturity_date: asset.maturity_date,
          maturity_amount: asset.maturity_amount ? Number(asset.maturity_amount) : null,
          current_value: asset.current_value ? Number(asset.current_value) : null,
          is_current_value_manual: asset.is_current_value_manual,
          total_cost: invested,
        });
        currentVal = fdResult.currentValue;
      } else {
        currentVal = Number(asset.current_value) || invested;
      }

      // Convert to AED
      const factor = asset.currency === 'INR' ? inrToAed : 1;
      const investedAed = invested * factor;
      const currentValAed = currentVal * factor;

      otherInvested += investedAed;
      otherCurrentValue += currentValAed;

      // Category breakdown
      const catCode = asset.category_code || asset.asset_type || 'other';
      if (!categoryMap[catCode]) {
        categoryMap[catCode] = {
          label: CATEGORY_LABELS[catCode] || catCode.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          value_aed: 0,
        };
      }
      categoryMap[catCode].value_aed += currentValAed;
    }

    // Merge PM and other asset summaries
    const totalBuys = pmSummary.total_buys_aed + otherInvested;
    const totalSells = pmSummary.total_sells_aed;
    const netCashInvested = totalBuys - totalSells;
    const totalCurrentValue = (pmSummary.current_value_aed ?? 0) + otherCurrentValue;
    const totalUnrealizedPL = totalCurrentValue - netCashInvested;
    const totalRealizedPL = pmSummary.total_realized_pl_aed;
    const totalPL = totalRealizedPL + totalUnrealizedPL;
    const totalReturnPct = netCashInvested > 0 ? (totalPL / netCashInvested) * 100 : null;

    // Build category breakdown array
    const categoryBreakdown: CategoryBreakdown[] = Object.entries(categoryMap)
      .filter(([, v]) => v.value_aed > 0)
      .map(([code, v]) => ({ category_code: code, label: v.label, value_aed: v.value_aed }))
      .sort((a, b) => b.value_aed - a.value_aed);

    return {
      total_buys_aed: totalBuys,
      total_sells_aed: totalSells,
      net_cash_invested_aed: netCashInvested,
      current_value_aed: totalCurrentValue,
      total_realized_pl_aed: totalRealizedPL,
      total_unrealized_pl_aed: totalUnrealizedPL,
      total_pl_aed: totalPL,
      total_return_pct: totalReturnPct,
      instruments: [goldSummary, silverSummary],
      categoryBreakdown,
    };
  }, [assets, prices, allTxs, inrToAed]);

  return {
    data: summary,
    isLoading: assetsLoading || pricesLoading || txLoading,
    error: assetsError || pricesError,
    prices,
    transactions: null, // Legacy field - no longer used
  };
}
