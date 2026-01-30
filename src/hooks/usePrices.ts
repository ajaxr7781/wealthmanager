import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { pricePerOzToPerGram } from '@/lib/calculations';

export interface PriceSnapshot {
  id: string;
  instrument_symbol: 'XAU' | 'XAG';
  as_of: string;
  source: string;
  price_aed_per_oz: number;
  created_at: string;
}

export function useLatestPrices() {
  return useQuery({
    queryKey: ['latest-prices'],
    queryFn: async () => {
      // Get latest price for each instrument
      const { data: xauData, error: xauError } = await supabase
        .from('price_snapshots')
        .select('*')
        .eq('instrument_symbol', 'XAU')
        .order('as_of', { ascending: false })
        .limit(1);

      const { data: xagData, error: xagError } = await supabase
        .from('price_snapshots')
        .select('*')
        .eq('instrument_symbol', 'XAG')
        .order('as_of', { ascending: false })
        .limit(1);

      if (xauError) throw xauError;
      if (xagError) throw xagError;

      const xau = xauData?.[0] ? {
        ...xauData[0],
        price_aed_per_oz: Number(xauData[0].price_aed_per_oz),
        price_aed_per_gram: pricePerOzToPerGram(Number(xauData[0].price_aed_per_oz)),
      } : null;

      const xag = xagData?.[0] ? {
        ...xagData[0],
        price_aed_per_oz: Number(xagData[0].price_aed_per_oz),
        price_aed_per_gram: pricePerOzToPerGram(Number(xagData[0].price_aed_per_oz)),
      } : null;

      return { XAU: xau, XAG: xag };
    },
  });
}

export function usePriceHistory(instrumentSymbol: 'XAU' | 'XAG') {
  return useQuery({
    queryKey: ['price-history', instrumentSymbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_snapshots')
        .select('*')
        .eq('instrument_symbol', instrumentSymbol)
        .order('as_of', { ascending: true });

      if (error) throw error;
      return (data || []).map(p => ({
        ...p,
        price_aed_per_oz: Number(p.price_aed_per_oz),
      })) as PriceSnapshot[];
    },
  });
}

export interface CreatePriceInput {
  instrument_symbol: 'XAU' | 'XAG';
  price_aed_per_oz: number;
  source?: string;
}

export function useCreatePrice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePriceInput) => {
      const { data, error } = await supabase
        .from('price_snapshots')
        .insert({
          instrument_symbol: input.instrument_symbol,
          price_aed_per_oz: input.price_aed_per_oz,
          source: input.source || 'manual',
          as_of: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latest-prices'] });
      queryClient.invalidateQueries({ queryKey: ['price-history'] });
      toast.success('Price updated');
    },
    onError: (error) => {
      toast.error('Failed to update price: ' + error.message);
    },
  });
}
