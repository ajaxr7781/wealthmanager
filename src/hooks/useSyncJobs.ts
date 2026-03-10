import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SyncJobLog {
  id: string;
  job_name: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  rows_processed: number;
  rows_failed: number;
  error_message: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

export function useSyncJobLogs(jobName?: string) {
  return useQuery({
    queryKey: ['sync-job-logs', jobName],
    queryFn: async () => {
      let query = supabase
        .from('sync_job_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(20);

      if (jobName) {
        query = query.eq('job_name', jobName);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as SyncJobLog[];
    },
  });
}

export function useLatestSyncStatus(jobName: string) {
  return useQuery({
    queryKey: ['sync-job-latest', jobName],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sync_job_logs')
        .select('*')
        .eq('job_name', jobName)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SyncJobLog | null;
    },
  });
}

export function useTriggerSchemeMasterSync() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('import-mf-scheme-master', {
        body: { force: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-job-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sync-job-latest'] });
      queryClient.invalidateQueries({ queryKey: ['mf-scheme-cache-status'] });
      toast({ title: 'Scheme Master Sync', description: data?.message || 'Sync completed' });
    },
    onError: (error) => {
      toast({ title: 'Sync Failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useTriggerNavUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('update-mf-nav', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sync-job-logs'] });
      queryClient.invalidateQueries({ queryKey: ['sync-job-latest'] });
      queryClient.invalidateQueries({ queryKey: ['mf-schemes'] });
      queryClient.invalidateQueries({ queryKey: ['mf-holdings'] });
      toast({ title: 'NAV Update', description: data?.message || 'Update completed' });
    },
    onError: (error) => {
      toast({ title: 'NAV Update Failed', description: error.message, variant: 'destructive' });
    },
  });
}
