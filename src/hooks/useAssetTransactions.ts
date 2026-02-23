import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AssetTransaction {
  id: string;
  asset_id: string;
  user_id: string;
  transaction_type: string;
  transaction_date: string;
  quantity: number;
  quantity_unit: string | null;
  price_per_unit: number | null;
  amount: number;
  fees: number;
  notes: string | null;
  source_table: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useAssetTransactions(assetId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['asset-transactions', assetId],
    queryFn: async () => {
      let query = supabase
        .from('asset_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (assetId) {
        query = query.eq('asset_id', assetId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AssetTransaction[];
    },
    enabled: !!user && !!assetId,
  });
}

export function useAllAssetTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['all-asset-transactions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (error) throw error;
      return (data || []) as AssetTransaction[];
    },
    enabled: !!user,
  });
}

export function useCreateAssetTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      asset_id: string;
      transaction_type: string;
      transaction_date: string;
      quantity: number;
      quantity_unit?: string;
      price_per_unit?: number;
      amount: number;
      fees?: number;
      notes?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data: result, error } = await supabase
        .from('asset_transactions')
        .insert({ user_id: user.id, ...data })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['asset-transactions', vars.asset_id] });
      queryClient.invalidateQueries({ queryKey: ['all-asset-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      toast.success('Transaction recorded');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteAssetTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('asset_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['all-asset-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      toast.success('Transaction deleted');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}
