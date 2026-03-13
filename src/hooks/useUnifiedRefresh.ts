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
          const xauItem = data.items?.find((item: { symbol: string }) => item.symbol === 'XAU');
          const xagItem = data.items?.find((item: { symbol: string }) => item.symbol === 'XAG');
          
          if (xauItem || xagItem) {
            const usdToAed = settings?.usd_to_aed_rate || DEFAULT_USD_TO_AED;
            const now = new Date().toISOString();
            const inserts = [];
            
            if (xauItem) {
              inserts.push(supabase.from('price_snapshots').insert({
                instrument_symbol: 'XAU',
                price_aed_per_oz: xauItem.price * usdToAed,
                source: 'gold-api.com',
                as_of: now,
              }));
            }
            if (xagItem) {
              inserts.push(supabase.from('price_snapshots').insert({
                instrument_symbol: 'XAG',
                price_aed_per_oz: xagItem.price * usdToAed,
                source: 'gold-api.com',
                as_of: now,
              }));
            }
            await Promise.all(inserts);
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

      // Trigger daily snapshot to capture current portfolio state
      try {
        await supabase.functions.invoke('daily-snapshot');
      } catch (e) {
        console.error('Snapshot trigger failed:', e);
      }

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
