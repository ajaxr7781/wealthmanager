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

    // Now add other asset types' totals
    let otherInvested = 0;
    let otherCurrentValue = 0;

    for (const asset of assets) {
      if (asset.asset_type === 'precious_metals') continue; // Already handled

      const invested = Number(asset.total_cost) || 0;
      let currentVal: number;

      if (asset.asset_type === 'fixed_deposit' || asset.asset_type_code === 'fixed_deposit') {
        // Use FD calculation for fixed deposits
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
      otherInvested += invested * factor;
      otherCurrentValue += currentVal * factor;
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
