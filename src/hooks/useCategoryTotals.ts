import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from './useAssets';
import { DEFAULT_INR_TO_AED } from '@/types/assets';

interface CategoryTotals {
  [categoryCode: string]: {
    totalValue: number;
    count: number;
  };
}

/**
 * Fetch total values by category for sorting sidebar.
 * Now all asset types (PM, MF, SIP) are in the assets table — no separate MF query needed.
 */
export function useCategoryTotals() {
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  return useQuery({
    queryKey: ['category-totals', user?.id, inrToAed],
    queryFn: async (): Promise<CategoryTotals> => {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('category_code, current_value, total_cost, currency');

      if (error) throw error;

      const totals: CategoryTotals = {};

      for (const asset of assets || []) {
        const categoryCode = asset.category_code || 'other';
        const value = Number(asset.current_value) || Number(asset.total_cost) || 0;
        
        let valueAed = value;
        if (asset.currency === 'INR') {
          valueAed = value * inrToAed;
        }

        if (!totals[categoryCode]) {
          totals[categoryCode] = { totalValue: 0, count: 0 };
        }
        totals[categoryCode].totalValue += valueAed;
        totals[categoryCode].count += 1;
      }

      return totals;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
}
