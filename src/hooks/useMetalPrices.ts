import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { MetalPrices } from '@/types/assets';
import { DEFAULT_USD_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';
import { useUserSettings } from './useAssets';

interface GoldApiItem {
  symbol: string;
  name: string;
  price: number;
  updatedAt: string;
}

interface GoldApiResponse {
  baseCurrency: string;
  items: GoldApiItem[];
}

export function useMetalPrices() {
  const { data: settings } = useUserSettings();
  const usdToAed = settings?.usd_to_aed_rate || DEFAULT_USD_TO_AED;

  return useQuery({
    queryKey: ['metal-prices-live'],
    queryFn: async (): Promise<MetalPrices> => {
      try {
        // Fetch from edge function (which proxies to goldprice.org API)
        const { data, error } = await supabase.functions.invoke('fetch-metal-prices');
        
        if (error) throw error;
        
        const response = data as GoldApiResponse;
        const xauItem = response.items?.find(item => item.symbol === 'XAU');
        const xagItem = response.items?.find(item => item.symbol === 'XAG');

        return {
          XAU: xauItem ? {
            usd_per_oz: xauItem.price,
            aed_per_oz: xauItem.price * usdToAed,
            aed_per_gram: (xauItem.price * usdToAed) / OUNCE_TO_GRAM,
          } : null,
          XAG: xagItem ? {
            usd_per_oz: xagItem.price,
            aed_per_oz: xagItem.price * usdToAed,
            aed_per_gram: (xagItem.price * usdToAed) / OUNCE_TO_GRAM,
          } : null,
          last_updated: xauItem?.updatedAt || xagItem?.updatedAt || new Date().toISOString(),
          source: 'gold-api.com',
        };
      } catch (error) {
        console.error('Failed to fetch live metal prices:', error);
        // Return null values if fetch fails
        return {
          XAU: null,
          XAG: null,
          last_updated: null,
          source: 'failed',
        };
      }
    },
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    refetchOnWindowFocus: false,
  });
}

export function useRefreshMetalPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Force refetch
      await queryClient.refetchQueries({ queryKey: ['metal-prices-live'] });
    },
    onSuccess: () => {
      toast.success('Metal prices refreshed');
    },
    onError: () => {
      toast.error('Failed to refresh metal prices');
    },
  });
}

export function useSaveMetalPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ xauPrice, xagPrice, source = 'api' }: {
      xauPrice: number;
      xagPrice: number;
      source?: string;
    }) => {
      const now = new Date().toISOString();
      
      // Save both prices to price_snapshots
      const { error: xauError } = await supabase
        .from('price_snapshots')
        .insert({
          instrument_symbol: 'XAU',
          price_aed_per_oz: xauPrice,
          source,
          as_of: now,
        });
      
      if (xauError) throw xauError;

      const { error: xagError } = await supabase
        .from('price_snapshots')
        .insert({
          instrument_symbol: 'XAG',
          price_aed_per_oz: xagPrice,
          source,
          as_of: now,
        });
      
      if (xagError) throw xagError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latest-prices'] });
      queryClient.invalidateQueries({ queryKey: ['price-history'] });
      toast.success('Prices saved to history');
    },
    onError: (error) => {
      toast.error('Failed to save prices: ' + error.message);
    },
  });
}
