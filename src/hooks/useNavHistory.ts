import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NavHistoryPoint {
  nav_date: string;
  nav_value: number;
}

export function useNavHistory(schemeId: string | null | undefined) {
  return useQuery({
    queryKey: ['nav-history', schemeId],
    enabled: !!schemeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_nav_history')
        .select('nav_date, nav_value')
        .eq('scheme_id', schemeId!)
        .order('nav_date', { ascending: true });

      if (error) throw error;
      return (data || []) as NavHistoryPoint[];
    },
  });
}
