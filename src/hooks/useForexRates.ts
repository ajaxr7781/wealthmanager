import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useUpdateSettings } from './useAssets';

export interface ForexRates {
  USD_AED: number;
  INR_AED: number;
  last_updated: string;
  source: string;
}

export function useForexRates() {
  return useQuery({
    queryKey: ['forex-rates'],
    queryFn: async (): Promise<ForexRates> => {
      try {
        const { data, error } = await supabase.functions.invoke('fetch-forex-rates');
        
        if (error) throw error;
        
        return data as ForexRates;
      } catch (error) {
        console.error('Failed to fetch forex rates:', error);
        // Return defaults on error
        return {
          USD_AED: 3.6725,
          INR_AED: 0.044,
          last_updated: new Date().toISOString(),
          source: 'default',
        };
      }
    },
    staleTime: 60 * 60 * 1000, // Consider fresh for 1 hour
    refetchOnWindowFocus: false,
  });
}

export function useRefreshForexRates() {
  const queryClient = useQueryClient();
  const updateSettings = useUpdateSettings();

  return useMutation({
    mutationFn: async () => {
      // Force refetch forex rates
      const result = await queryClient.fetchQuery({
        queryKey: ['forex-rates'],
        queryFn: async (): Promise<ForexRates> => {
          const { data, error } = await supabase.functions.invoke('fetch-forex-rates');
          if (error) throw error;
          return data as ForexRates;
        },
      });
      
      // Save to user settings
      if (result && result.source !== 'default') {
        await updateSettings.mutateAsync({
          usd_to_aed_rate: result.USD_AED,
          inr_to_aed_rate: result.INR_AED,
        });
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forex-rates'] });
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
    },
    onError: () => {
      toast.error('Failed to refresh forex rates');
    },
  });
}
