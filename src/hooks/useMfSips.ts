import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { MfSip, MfSipInsert } from '@/types/mutualFunds';
import { getNextSipDueDate } from '@/types/mutualFunds';
import { useToast } from '@/hooks/use-toast';

// Fetch user's SIPs with scheme data
export function useMfSips() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mf-sips', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_sips')
        .select(`
          *,
          scheme:mf_schemes(*)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MfSip[];
    },
    enabled: !!user
  });
}

// Fetch active SIPs only
export function useActiveMfSips() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mf-sips-active', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_sips')
        .select(`
          *,
          scheme:mf_schemes(*)
        `)
        .eq('user_id', user!.id)
        .eq('status', 'ACTIVE')
        .order('sip_day_of_month');
      
      if (error) throw error;
      return data as MfSip[];
    },
    enabled: !!user
  });
}

// Fetch single SIP
export function useMfSip(sipId: string | undefined) {
  return useQuery({
    queryKey: ['mf-sip', sipId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_sips')
        .select(`
          *,
          scheme:mf_schemes(*)
        `)
        .eq('id', sipId!)
        .single();
      
      if (error) throw error;
      return data as MfSip;
    },
    enabled: !!sipId
  });
}

// Add new SIP
export function useAddMfSip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (sip: Omit<MfSipInsert, 'user_id'>) => {
      const { data, error } = await supabase
        .from('mf_sips')
        .insert({
          ...sip,
          user_id: user!.id
        })
        .select(`*, scheme:mf_schemes(*)`)
        .single();
      
      if (error) throw error;
      return data as MfSip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-sips'] });
      toast({
        title: 'SIP Created',
        description: 'Your SIP has been set up successfully'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Create SIP',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Update SIP
export function useUpdateMfSip() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MfSip> & { id: string }) => {
      const { data, error } = await supabase
        .from('mf_sips')
        .update(updates)
        .eq('id', id)
        .select(`*, scheme:mf_schemes(*)`)
        .single();
      
      if (error) throw error;
      return data as MfSip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-sips'] });
      queryClient.invalidateQueries({ queryKey: ['mf-sip'] });
      toast({
        title: 'SIP Updated',
        description: 'Your SIP details have been updated'
      });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Delete SIP
export function useDeleteMfSip() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mf_sips')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-sips'] });
      toast({
        title: 'SIP Deleted',
        description: 'Your SIP has been removed'
      });
    },
    onError: (error) => {
      toast({
        title: 'Delete Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Pause SIP
export function usePauseMfSip() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mf_sips')
        .update({ status: 'PAUSED' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MfSip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-sips'] });
      toast({
        title: 'SIP Paused',
        description: 'Your SIP has been paused'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Pause SIP',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Resume SIP
export function useResumeMfSip() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mf_sips')
        .update({ status: 'ACTIVE' })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MfSip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-sips'] });
      toast({
        title: 'SIP Resumed',
        description: 'Your SIP is now active'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Resume SIP',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Stop SIP (mark as completed)
export function useStopMfSip() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('mf_sips')
        .update({ 
          status: 'COMPLETED',
          end_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MfSip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-sips'] });
      toast({
        title: 'SIP Stopped',
        description: 'Your SIP has been stopped'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Stop SIP',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Get SIP summary
export function useSipSummary() {
  const { data: sips } = useMfSips();
  
  if (!sips) {
    return {
      total_sips: 0,
      active_sips: 0,
      monthly_commitment: 0,
      upcoming_this_month: []
    };
  }
  
  const activeSips = sips.filter(s => s.status === 'ACTIVE');
  const monthlyCommitment = activeSips.reduce((sum, s) => sum + s.sip_amount, 0);
  
  // Get SIPs with due dates this month
  const today = new Date();
  const upcoming = activeSips
    .map(sip => ({
      ...sip,
      next_due: getNextSipDueDate(sip)
    }))
    .filter(sip => {
      if (!sip.next_due) return false;
      return sip.next_due.getMonth() === today.getMonth() && 
             sip.next_due.getFullYear() === today.getFullYear();
    })
    .sort((a, b) => (a.next_due?.getTime() || 0) - (b.next_due?.getTime() || 0));
  
  return {
    total_sips: sips.length,
    active_sips: activeSips.length,
    monthly_commitment: monthlyCommitment,
    upcoming_this_month: upcoming
  };
}
