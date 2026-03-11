import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { calculateXIRR } from '@/lib/xirrCalc';
import type { AssetTransaction } from './useAssetTransactions';
import { toast } from 'sonner';

const BUY_TYPES = ['BUY', 'PURCHASE', 'SWITCH_IN', 'SIP', 'SIP_INSTALLMENT', 'DEPOSIT'];
const SELL_TYPES = ['SELL', 'REDEEM', 'SWITCH_OUT'];

/**
 * Compute XIRR from asset transactions + current value.
 * Investments are negative cash flows, current value is a positive terminal cash flow.
 */
export function useComputedXirr(
  transactions: AssetTransaction[] | undefined,
  currentValue: number | null | undefined
) {
  return useMemo(() => {
    if (!transactions || transactions.length === 0 || !currentValue || currentValue <= 0) {
      return null;
    }

    const cashflows = transactions
      .filter(tx => BUY_TYPES.includes(tx.transaction_type) || SELL_TYPES.includes(tx.transaction_type))
      .map(tx => {
        const isBuy = BUY_TYPES.includes(tx.transaction_type);
        return {
          date: new Date(tx.transaction_date),
          amount: isBuy ? -(Number(tx.amount) + Number(tx.fees || 0)) : Number(tx.amount) - Number(tx.fees || 0),
        };
      });

    if (cashflows.length === 0) return null;

    // Add terminal cash flow (current value as of today)
    cashflows.push({ date: new Date(), amount: currentValue });

    return calculateXIRR(cashflows);
  }, [transactions, currentValue]);
}

/**
 * Persist computed XIRR value to the assets table.
 */
export function useSaveXirr() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ assetId, xirr }: { assetId: string; xirr: number | null }) => {
      const { error } = await supabase
        .from('assets')
        .update({ xirr_value: xirr })
        .eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset', vars.assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
    },
    onError: (e) => toast.error('Failed to save XIRR: ' + e.message),
  });
}
