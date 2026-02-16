import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Liability {
  id: string;
  user_id: string;
  name: string;
  type: string;
  principal: number;
  outstanding: number;
  interest_rate: number | null;
  emi: number | null;
  next_due_date: string | null;
  linked_asset_id: string | null;
  currency: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LiabilityFormData {
  name: string;
  type: string;
  principal: number;
  outstanding: number;
  interest_rate?: number;
  emi?: number;
  next_due_date?: string;
  linked_asset_id?: string;
  currency?: string;
  notes?: string;
}

export function useLiabilities() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['liabilities', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liabilities')
        .select('*')
        .eq('is_active', true)
        .order('outstanding', { ascending: false });
      if (error) throw error;
      return (data || []) as Liability[];
    },
    enabled: !!user,
  });
}

export function useLiabilitySummary() {
  const { data: liabilities, isLoading } = useLiabilities();
  const totalOutstanding = liabilities?.reduce((sum, l) => sum + Number(l.outstanding || 0), 0) ?? 0;
  const totalEmi = liabilities?.reduce((sum, l) => sum + Number(l.emi || 0), 0) ?? 0;
  return { totalOutstanding, totalEmi, count: liabilities?.length ?? 0, isLoading };
}

export function useCreateLiability() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: LiabilityFormData) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('liabilities').insert({ user_id: user.id, ...data });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      toast.success('Liability added');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}

export function useUpdateLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Liability> & { id: string }) => {
      const { error } = await supabase.from('liabilities').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      toast.success('Liability updated');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteLiability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('liabilities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      toast.success('Liability deleted');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}
