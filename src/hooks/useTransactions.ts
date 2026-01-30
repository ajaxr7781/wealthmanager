import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  RawTransaction, 
  processTransactionHistory,
  TransactionWithPosition,
  PositionState,
} from '@/lib/calculations';

export type TransactionRow = {
  id: string;
  portfolio_id: string;
  instrument_symbol: 'XAU' | 'XAG';
  side: 'BUY' | 'SELL';
  trade_date: string;
  quantity: number;
  quantity_unit: 'OZ' | 'GRAM';
  price: number;
  price_unit: 'AED_PER_OZ' | 'AED_PER_GRAM';
  fees: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useTransactions(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['transactions', portfolioId],
    queryFn: async () => {
      if (!portfolioId) return [];

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('trade_date', { ascending: true });

      if (error) throw error;
      
      // Convert to RawTransaction format
      return (data || []).map((tx): RawTransaction => ({
        id: tx.id,
        portfolio_id: tx.portfolio_id,
        instrument_symbol: tx.instrument_symbol as 'XAU' | 'XAG',
        side: tx.side as 'BUY' | 'SELL',
        trade_date: tx.trade_date,
        quantity: Number(tx.quantity),
        quantity_unit: tx.quantity_unit as 'OZ' | 'GRAM',
        price: Number(tx.price),
        price_unit: tx.price_unit as 'AED_PER_OZ' | 'AED_PER_GRAM',
        fees: Number(tx.fees),
        notes: tx.notes || undefined,
      }));
    },
    enabled: !!portfolioId,
  });
}

export function useProcessedTransactions(portfolioId: string | undefined) {
  const { data: transactions = [], ...rest } = useTransactions(portfolioId);

  // Separate by instrument
  const goldTxs = transactions.filter(tx => tx.instrument_symbol === 'XAU');
  const silverTxs = transactions.filter(tx => tx.instrument_symbol === 'XAG');

  // Process each instrument
  const goldResult = processTransactionHistory(goldTxs);
  const silverResult = processTransactionHistory(silverTxs);

  return {
    ...rest,
    data: {
      all: transactions,
      gold: {
        transactions: goldResult.transactions,
        position: goldResult.finalPosition,
      },
      silver: {
        transactions: silverResult.transactions,
        position: silverResult.finalPosition,
      },
    },
  };
}

export interface CreateTransactionInput {
  portfolio_id: string;
  instrument_symbol: 'XAU' | 'XAG';
  side: 'BUY' | 'SELL';
  trade_date: string;
  quantity: number;
  quantity_unit: 'OZ' | 'GRAM';
  price: number;
  price_unit: 'AED_PER_OZ' | 'AED_PER_GRAM';
  fees: number;
  notes?: string;
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolio_id] });
      toast.success('Transaction added');
    },
    onError: (error) => {
      toast.error('Failed to add transaction: ' + error.message);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: CreateTransactionInput & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolio_id] });
      toast.success('Transaction updated');
    },
    onError: (error) => {
      toast.error('Failed to update transaction: ' + error.message);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, portfolioId }: { id: string; portfolioId: string }) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, portfolioId };
    },
    onSuccess: (variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', variables.portfolioId] });
      toast.success('Transaction deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete transaction: ' + error.message);
    },
  });
}
