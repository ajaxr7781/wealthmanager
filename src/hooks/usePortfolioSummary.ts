import { useMemo } from 'react';
import { useProcessedTransactions } from './useTransactions';
import { useLatestPrices } from './usePrices';
import { 
  calculateInstrumentSummary, 
  calculatePortfolioSummary,
  PortfolioSummary,
  InstrumentSummary,
} from '@/lib/calculations';

export function usePortfolioSummary(portfolioId: string | undefined) {
  const { data: txData, isLoading: txLoading, error: txError } = useProcessedTransactions(portfolioId);
  const { data: prices, isLoading: pricesLoading, error: pricesError } = useLatestPrices();

  const summary = useMemo((): PortfolioSummary | null => {
    if (!txData || !prices) return null;

    const goldSummary = calculateInstrumentSummary(
      'XAU',
      'Gold',
      txData.gold.position,
      prices.XAU?.price_aed_per_oz ?? null
    );

    const silverSummary = calculateInstrumentSummary(
      'XAG',
      'Silver',
      txData.silver.position,
      prices.XAG?.price_aed_per_oz ?? null
    );

    return calculatePortfolioSummary([goldSummary, silverSummary]);
  }, [txData, prices]);

  return {
    data: summary,
    isLoading: txLoading || pricesLoading,
    error: txError || pricesError,
    prices,
    transactions: txData,
  };
}
