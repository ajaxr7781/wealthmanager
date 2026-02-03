import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  MfHolding, 
  MfHoldingInsert,
  MfTransaction,
  MfTransactionInsert 
} from '@/types/mutualFunds';
import { useToast } from '@/hooks/use-toast';

// Fetch user's holdings with scheme data
export function useMfHoldings() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mf-holdings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_holdings')
        .select(`
          *,
          scheme:mf_schemes(*)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MfHolding[];
    },
    enabled: !!user
  });
}

// Fetch active holdings only
export function useActiveMfHoldings() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mf-holdings-active', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_holdings')
        .select(`
          *,
          scheme:mf_schemes(*)
        `)
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('current_value', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data as MfHolding[];
    },
    enabled: !!user
  });
}

// Fetch single holding with transactions
export function useMfHolding(holdingId: string | undefined) {
  return useQuery({
    queryKey: ['mf-holding', holdingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_holdings')
        .select(`
          *,
          scheme:mf_schemes(*),
          transactions:mf_transactions(*)
        `)
        .eq('id', holdingId!)
        .single();
      
      if (error) throw error;
      return data as MfHolding & { transactions: MfTransaction[] };
    },
    enabled: !!holdingId
  });
}

// Add new holding
export function useAddMfHolding() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (holding: Omit<MfHoldingInsert, 'user_id'>) => {
      const { data, error } = await supabase
        .from('mf_holdings')
        .insert({
          ...holding,
          user_id: user!.id
        })
        .select(`*, scheme:mf_schemes(*)`)
        .single();
      
      if (error) throw error;
      return data as MfHolding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-holdings'] });
      toast({
        title: 'Holding Added',
        description: 'Your mutual fund holding has been recorded'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Holding',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Update holding
export function useUpdateMfHolding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MfHolding> & { id: string }) => {
      const { data, error } = await supabase
        .from('mf_holdings')
        .update(updates)
        .eq('id', id)
        .select(`*, scheme:mf_schemes(*)`)
        .single();
      
      if (error) throw error;
      return data as MfHolding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['mf-holding'] });
      toast({
        title: 'Holding Updated',
        description: 'Your holding details have been updated'
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Delete holding
export function useDeleteMfHolding() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mf_holdings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-holdings'] });
      toast({
        title: 'Holding Deleted',
        description: 'Your holding has been removed'
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Fetch transactions for a holding
export function useMfTransactions(holdingId: string | undefined) {
  return useQuery({
    queryKey: ['mf-transactions', holdingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_transactions')
        .select('*')
        .eq('holding_id', holdingId!)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      return data as MfTransaction[];
    },
    enabled: !!holdingId
  });
}

// Add transaction
export function useAddMfTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (transaction: MfTransactionInsert) => {
      const { data, error } = await supabase
        .from('mf_transactions')
        .insert(transaction)
        .select()
        .single();
      
      if (error) throw error;
      
      // Recalculate holding totals
      await recalculateHoldingTotals(transaction.holding_id);
      
      return data as MfTransaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mf-transactions', data.holding_id] });
      queryClient.invalidateQueries({ queryKey: ['mf-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['mf-holding'] });
      toast({
        title: 'Transaction Added',
        description: 'Transaction has been recorded'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Transaction',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Delete transaction
export function useDeleteMfTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, holding_id }: { id: string; holding_id: string }) => {
      const { error } = await supabase
        .from('mf_transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Recalculate holding totals
      await recalculateHoldingTotals(holding_id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mf-transactions', variables.holding_id] });
      queryClient.invalidateQueries({ queryKey: ['mf-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['mf-holding'] });
      toast({
        title: 'Transaction Deleted',
        description: 'Transaction has been removed'
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Helper to recalculate holding totals from transactions
async function recalculateHoldingTotals(holdingId: string) {
  const { data: transactions } = await supabase
    .from('mf_transactions')
    .select('*')
    .eq('holding_id', holdingId);
  
  if (!transactions) return;
  
  let totalInvested = 0;
  let totalUnits = 0;
  
  for (const tx of transactions) {
    if (tx.transaction_type === 'PURCHASE' || tx.transaction_type === 'SWITCH_IN') {
      totalInvested += tx.amount;
      totalUnits += tx.units;
    } else if (tx.transaction_type === 'REDEMPTION' || tx.transaction_type === 'SWITCH_OUT') {
      // For redemptions, reduce units but track the proportional cost reduction
      const avgCost = totalUnits > 0 ? totalInvested / totalUnits : 0;
      totalInvested -= avgCost * tx.units;
      totalUnits -= tx.units;
    }
  }
  
  await supabase
    .from('mf_holdings')
    .update({
      invested_amount: Math.max(0, Math.round(totalInvested * 100) / 100),
      units_held: Math.max(0, Math.round(totalUnits * 10000) / 10000)
    })
    .eq('id', holdingId);
}

// Calculate portfolio summary
export function useMfPortfolioSummary() {
  const { data: holdings } = useActiveMfHoldings();
  
  if (!holdings || holdings.length === 0) {
    return {
      total_invested: 0,
      current_value: 0,
      unrealized_gain: 0,
      return_pct: 0,
      holdings_count: 0
    };
  }
  
  const total_invested = holdings.reduce((sum, h) => sum + h.invested_amount, 0);
  const current_value = holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
  const unrealized_gain = current_value - total_invested;
  const return_pct = total_invested > 0 ? (unrealized_gain / total_invested) * 100 : 0;
  
  return {
    total_invested,
    current_value,
    unrealized_gain,
    return_pct,
    holdings_count: holdings.length
  };
}
