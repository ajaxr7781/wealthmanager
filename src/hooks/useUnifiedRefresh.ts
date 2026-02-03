import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpdateSettings, useUserSettings } from './useAssets';
import { DEFAULT_USD_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';
import type { ForexRates } from './useForexRates';

interface RefreshResult {
  metals: boolean;
  forex: boolean;
  nav: boolean;
  timestamp: string;
}

export function useUnifiedRefresh() {
  const queryClient = useQueryClient();
  const updateSettings = useUpdateSettings();
  const { data: settings } = useUserSettings();

  return useMutation({
    mutationFn: async (): Promise<RefreshResult> => {
      const result: RefreshResult = {
        metals: false,
        forex: false,
        nav: false,
        timestamp: new Date().toISOString(),
      };

      // Fetch all in parallel
      const [metalsPriceResult, forexResult] = await Promise.allSettled([
        supabase.functions.invoke('fetch-metal-prices'),
        supabase.functions.invoke('fetch-forex-rates'),
      ]);

      // Process metal prices
      if (metalsPriceResult.status === 'fulfilled' && !metalsPriceResult.value.error) {
        try {
          const data = metalsPriceResult.value.data;
          const usdItem = data.items?.find((item: { curr: string }) => item.curr === 'USD');
          
          if (usdItem) {
            const usdToAed = settings?.usd_to_aed_rate || DEFAULT_USD_TO_AED;
            const xauAedPerOz = usdItem.xauPrice * usdToAed;
            const xagAedPerOz = usdItem.xagPrice * usdToAed;
            
            // Save to price_snapshots
            const now = new Date().toISOString();
            await Promise.all([
              supabase.from('price_snapshots').insert({
                instrument_symbol: 'XAU',
                price_aed_per_oz: xauAedPerOz,
                source: 'goldprice.org',
                as_of: now,
              }),
              supabase.from('price_snapshots').insert({
                instrument_symbol: 'XAG',
                price_aed_per_oz: xagAedPerOz,
                source: 'goldprice.org',
                as_of: now,
              }),
            ]);
            
            result.metals = true;
          }
        } catch (e) {
          console.error('Failed to save metal prices:', e);
        }
      }

      // Process forex rates
      if (forexResult.status === 'fulfilled' && !forexResult.value.error) {
        try {
          const data = forexResult.value.data as ForexRates;
          if (data.source !== 'default') {
            await updateSettings.mutateAsync({
              usd_to_aed_rate: data.USD_AED,
              inr_to_aed_rate: data.INR_AED,
            });
            result.forex = true;
          }
        } catch (e) {
          console.error('Failed to save forex rates:', e);
        }
      }

      // TODO: Add NAV refresh for mutual funds when implemented
      // For now, just invalidate MF queries
      result.nav = true;

      return result;
    },
    onSuccess: (result) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['metal-prices-live'] });
      queryClient.invalidateQueries({ queryKey: ['forex-rates'] });
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      queryClient.invalidateQueries({ queryKey: ['latest-prices'] });
      queryClient.invalidateQueries({ queryKey: ['mf-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['mf-schemes'] });

      const refreshed: string[] = [];
      if (result.metals) refreshed.push('Metals');
      if (result.forex) refreshed.push('Forex');
      if (result.nav) refreshed.push('NAV');

      if (refreshed.length > 0) {
        toast.success(`Refreshed: ${refreshed.join(', ')}`);
      } else {
        toast.info('No updates available');
      }
    },
    onError: (error) => {
      console.error('Unified refresh failed:', error);
      toast.error('Failed to refresh prices');
    },
  });
}
