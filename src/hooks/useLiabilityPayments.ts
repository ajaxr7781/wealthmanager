import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LiabilityPayment {
  id: string;
  user_id: string;
  liability_id: string;
  payment_date: string;
  amount: number;
  principal_component: number | null;
  interest_component: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LiabilityPaymentFormData {
  liability_id: string;
  payment_date: string;
  amount: number;
  principal_component?: number;
  interest_component?: number;
  notes?: string;
}

export function useLiabilityPayments(liabilityId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['liability-payments', user?.id, liabilityId ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('liability_payments').select('*').order('payment_date', { ascending: false });
      if (liabilityId) q = q.eq('liability_id', liabilityId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as LiabilityPayment[];
    },
    enabled: !!user,
  });
}

export function useCreateLiabilityPayment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: LiabilityPaymentFormData) => {
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('liability_payments').insert({ user_id: user.id, ...data });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liability-payments'] });
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      toast.success('Payment recorded');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useUpdateLiabilityPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<LiabilityPaymentFormData> & { id: string }) => {
      const { error } = await supabase.from('liability_payments').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liability-payments'] });
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      toast.success('Payment updated');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteLiabilityPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('liability_payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['liability-payments'] });
      queryClient.invalidateQueries({ queryKey: ['liabilities'] });
      toast.success('Payment deleted');
    },
    onError: (e: Error) => toast.error('Failed: ' + e.message),
  });
}
