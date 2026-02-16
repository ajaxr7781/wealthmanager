import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  target_date: string | null;
  priority: string;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoalAssetMapping {
  id: string;
  goal_id: string;
  asset_id: string;
  allocation_pct: number;
  created_at: string;
}

export function useGoals() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true });
      if (error) throw error;
      return (data || []) as Goal[];
    },
    enabled: !!user,
  });
}

export function useGoalMappings(goalId?: string) {
  return useQuery({
    queryKey: ['goal-mappings', goalId],
    queryFn: async () => {
      const query = supabase.from('goal_asset_mapping').select('*');
      if (goalId) query.eq('goal_id', goalId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GoalAssetMapping[];
    },
    enabled: !!goalId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: { name: string; target_amount: number; target_date?: string; priority?: string; notes?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: result, error } = await supabase
        .from('goals')
        .insert({ user_id: user.id, ...data })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Goal> & { id: string }) => {
      const { error } = await supabase.from('goals').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal updated');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal deleted');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}

export function useAddGoalMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { goal_id: string; asset_id: string; allocation_pct: number }) => {
      const { error } = await supabase.from('goal_asset_mapping').insert(data);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['goal-mappings', vars.goal_id] });
      toast.success('Asset mapped to goal');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}

export function useRemoveGoalMapping() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goal_asset_mapping').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goal-mappings'] });
      toast.success('Asset removed from goal');
    },
    onError: (e) => toast.error('Failed: ' + e.message),
  });
}
