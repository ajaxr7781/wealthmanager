import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
}

export function usePortfolios() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portfolios', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as Portfolio[];
    },
    enabled: !!user,
  });
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('portfolios')
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Portfolio;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
      toast.success('Portfolio created');
    },
    onError: (error) => {
      toast.error('Failed to create portfolio: ' + error.message);
    },
  });
}

export function useDefaultPortfolio() {
  const { user } = useAuth();
  const createPortfolio = useCreatePortfolio();

  return useQuery({
    queryKey: ['default-portfolio', user?.id],
    queryFn: async () => {
      // First try to get existing portfolios
      const { data: portfolios, error } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;

      // If no portfolio exists, create a default one
      if (!portfolios || portfolios.length === 0) {
        const { data: newPortfolio, error: createError } = await supabase
          .from('portfolios')
          .insert({ name: 'Main', user_id: user!.id })
          .select()
          .single();

        if (createError) throw createError;
        return newPortfolio as Portfolio;
      }

      return portfolios[0] as Portfolio;
    },
    enabled: !!user,
  });
}
