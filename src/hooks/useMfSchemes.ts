import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  MfScheme, 
  MfSchemeInsert, 
  MfSchemeMasterCache,
  SchemeMasterImportResponse 
} from '@/types/mutualFunds';
import { useToast } from '@/hooks/use-toast';

// Fetch user's schemes
export function useMfSchemes() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mf-schemes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_schemes')
        .select('*')
        .eq('user_id', user!.id)
        .order('scheme_name');
      
      if (error) throw error;
      return data as MfScheme[];
    },
    enabled: !!user
  });
}

// Fetch active schemes only
export function useActiveMfSchemes() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['mf-schemes-active', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_schemes')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .order('scheme_name');
      
      if (error) throw error;
      return data as MfScheme[];
    },
    enabled: !!user
  });
}

// Search scheme master cache
export function useSchemeSearch(searchTerm: string) {
  return useQuery({
    queryKey: ['mf-scheme-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 3) return [];
      
      const { data, error } = await supabase
        .from('mf_scheme_master_cache')
        .select('*')
        .ilike('scheme_name', `%${searchTerm}%`)
        .order('scheme_name')
        .limit(50);
      
      if (error) throw error;
      return data as MfSchemeMasterCache[];
    },
    enabled: searchTerm.length >= 3
  });
}

// Check if cache exists and is fresh
export function useSchemeCache() {
  return useQuery({
    queryKey: ['mf-scheme-cache-status'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mf_scheme_master_cache')
        .select('cached_at, source')
        .order('cached_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return { exists: false, age_days: null, source: null };
      }
      
      const ageMs = Date.now() - new Date(data[0].cached_at).getTime();
      const ageDays = Math.round(ageMs / (1000 * 60 * 60 * 24) * 10) / 10;
      
      return {
        exists: true,
        age_days: ageDays,
        source: data[0].source,
        cached_at: data[0].cached_at
      };
    }
  });
}

// Import scheme master from MFAPI
export function useImportSchemeMaster() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (options: { force?: boolean; search?: string } = {}) => {
      const { data, error } = await supabase.functions.invoke('import-mf-scheme-master', {
        body: options
      });
      
      if (error) throw error;
      return data as SchemeMasterImportResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mf-scheme-cache-status'] });
      queryClient.invalidateQueries({ queryKey: ['mf-scheme-search'] });
      toast({
        title: 'Scheme Master Imported',
        description: data.message
      });
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Import AMFI scheme data (for ISIN mapping)
export function useImportAmfiData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (options: { force?: boolean; auto_map?: boolean } = {}) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('import-amfi-scheme-data', {
        body: options,
        headers: session ? {
          Authorization: `Bearer ${session.access_token}`
        } : undefined
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mf-scheme-cache-status'] });
      queryClient.invalidateQueries({ queryKey: ['mf-scheme-search'] });
      queryClient.invalidateQueries({ queryKey: ['mf-schemes'] });
      toast({
        title: 'AMFI Data Imported',
        description: data.message
      });
    },
    onError: (error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Add new scheme
export function useAddMfScheme() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (scheme: Omit<MfSchemeInsert, 'user_id'>) => {
      const { data, error } = await supabase
        .from('mf_schemes')
        .insert({
          ...scheme,
          user_id: user!.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as MfScheme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-schemes'] });
      toast({
        title: 'Scheme Added',
        description: 'Mutual fund scheme has been added to your catalog'
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to Add Scheme',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

// Update scheme
export function useUpdateMfScheme() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MfScheme> & { id: string }) => {
      const { data, error } = await supabase
        .from('mf_schemes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as MfScheme;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-schemes'] });
      toast({
        title: 'Scheme Updated',
        description: 'Scheme details have been updated'
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

// Delete scheme
export function useDeleteMfScheme() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mf_schemes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mf-schemes'] });
      toast({
        title: 'Scheme Deleted',
        description: 'Scheme has been removed from your catalog'
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
