import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { NavFetchResponse } from '@/types/mutualFunds';
import { useToast } from '@/hooks/use-toast';

// Refresh NAV for specific schemes
export function useRefreshMfNav() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (schemeIds?: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }
      
      const { data, error } = await supabase.functions.invoke('fetch-mf-nav', {
        body: schemeIds 
          ? { scheme_ids: schemeIds }
          : { refresh_all: true },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      return data as NavFetchResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mf-schemes'] });
      queryClient.invalidateQueries({ queryKey: ['mf-holdings'] });
      
      if (data.failed_count > 0) {
        toast({
          title: 'NAV Refresh Partial',
          description: `Updated ${data.success_count}/${data.total} schemes. ${data.failed_count} failed.`,
          variant: 'default'
        });
      } else {
        toast({
          title: 'NAV Updated',
          description: data.message
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'NAV Refresh Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Refresh NAV for all active schemes
export function useRefreshAllNav() {
  return useRefreshMfNav();
}
