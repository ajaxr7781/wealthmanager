import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Asset } from '@/types/assets';

/**
 * Fetch all assets belonging to the same renewal chain (FD rollovers).
 * Returned in chronological order by purchase_date.
 */
export function useRenewalChain(chainId: string | null | undefined) {
  return useQuery({
    queryKey: ['renewal-chain', chainId],
    queryFn: async () => {
      if (!chainId) return [] as Asset[];
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('renewal_chain_id', chainId)
        .order('purchase_date', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Asset[];
    },
    enabled: !!chainId,
  });
}
