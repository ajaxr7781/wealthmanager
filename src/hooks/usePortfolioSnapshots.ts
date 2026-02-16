import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface PortfolioSnapshot {
  id: string;
  user_id: string;
  snapshot_date: string;
  total_value: number;
  total_invested: number;
  total_liabilities: number;
  net_worth: number;
  breakdown_json: Record<string, number> | null;
  created_at: string;
}

export function usePortfolioSnapshots(range?: '1M' | '3M' | '6M' | '1Y' | 'ALL') {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['portfolio-snapshots', user?.id, range],
    queryFn: async () => {
      let query = supabase
        .from('portfolio_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: true });

      if (range && range !== 'ALL') {
        const months = { '1M': 1, '3M': 3, '6M': 6, '1Y': 12 }[range];
        const since = new Date();
        since.setMonth(since.getMonth() - months);
        query = query.gte('snapshot_date', since.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PortfolioSnapshot[];
    },
    enabled: !!user,
  });
}

export function useSaveSnapshot() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (snapshot: Omit<PortfolioSnapshot, 'id' | 'user_id' | 'created_at'>) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('portfolio_snapshots')
        .upsert({ user_id: user.id, ...snapshot }, { onConflict: 'user_id,snapshot_date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-snapshots'] });
    },
  });
}
