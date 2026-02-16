import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AllocationTarget {
  id: string;
  user_id: string;
  name: string;
  is_default: boolean;
  base_currency: string;
  rebalance_threshold_pct: number;
  created_at: string;
  updated_at: string;
}

export interface AllocationTargetLine {
  id: string;
  target_id: string;
  category_code: string;
  target_pct: number;
  min_pct: number;
  max_pct: number;
  created_at: string;
}

export function useAllocationTargets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['allocation-targets', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('allocation_targets')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as AllocationTarget[];
    },
    enabled: !!user,
  });
}

export function useAllocationTargetLines(targetId?: string) {
  return useQuery({
    queryKey: ['allocation-target-lines', targetId],
    queryFn: async () => {
      if (!targetId) return [];
      const { data, error } = await supabase
        .from('allocation_target_lines')
        .select('*')
        .eq('target_id', targetId);
      if (error) throw error;
      return (data || []) as AllocationTargetLine[];
    },
    enabled: !!targetId,
  });
}

export function useCreateAllocationTarget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { name: string; rebalance_threshold_pct?: number; is_default?: boolean; lines: { category_code: string; target_pct: number; min_pct: number; max_pct: number }[] }) => {
      if (!user) throw new Error('Not authenticated');
      const { lines, ...targetData } = data;
      const { data: target, error } = await supabase
        .from('allocation_targets')
        .insert({ user_id: user.id, ...targetData })
        .select()
        .single();
      if (error) throw error;

      if (lines.length > 0) {
        const { error: linesError } = await supabase
          .from('allocation_target_lines')
          .insert(lines.map(l => ({ target_id: target.id, ...l })));
        if (linesError) throw linesError;
      }
      return target;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocation-targets'] });
      toast.success('Target profile created');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteAllocationTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('allocation_targets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allocation-targets'] });
      toast.success('Target deleted');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}
