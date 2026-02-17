import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface AlertRule {
  id: string;
  user_id: string;
  name: string;
  type: string;
  enabled: boolean;
  severity: string;
  config_json: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  user_id: string;
  rule_id: string | null;
  status: string;
  severity: string;
  title: string;
  message: string;
  context_json: Record<string, any> | null;
  triggered_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolve_notes: string | null;
}

const DEFAULT_RULES = [
  { name: 'Overexposure', type: 'overexposure', severity: 'warning', config_json: { threshold_pct: 40 } },
  { name: 'Underallocation', type: 'underallocation', severity: 'info', config_json: { threshold_pct: 5 } },
  { name: 'Drawdown Alert', type: 'drawdown', severity: 'critical', config_json: { threshold_pct: 10 } },
  { name: 'FD Maturity Due', type: 'fd_maturity', severity: 'warning', config_json: { days_before: 30 } },
  { name: 'SIP Missed/Overdue', type: 'sip_missed', severity: 'warning', config_json: { days_overdue: 5 } },
  { name: 'Concentration Risk', type: 'concentration', severity: 'critical', config_json: { single_asset_pct: 25 } },
];

export function useAlertRules() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['alert-rules', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .order('created_at');
      if (error) throw error;
      return (data || []) as AlertRule[];
    },
    enabled: !!user,
  });
}

export function useEnsureDefaultRules() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: existing } = await supabase.from('alert_rules').select('type');
      const existingTypes = new Set((existing || []).map(r => r.type));
      const missing = DEFAULT_RULES.filter(r => !existingTypes.has(r.type));
      if (missing.length === 0) return;
      const { error } = await supabase.from('alert_rules').insert(
        missing.map(r => ({ user_id: user.id, ...r }))
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-rules'] }),
  });
}

export function useUpdateAlertRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AlertRule> & { id: string }) => {
      const { error } = await supabase.from('alert_rules').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Rule updated');
    },
  });
}

export function useAlerts(status?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['alerts', user?.id, status],
    queryFn: async () => {
      let query = supabase.from('alerts').select('*').order('triggered_at', { ascending: false });
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Alert[];
    },
    enabled: !!user,
  });
}

export function useOpenAlertsCount() {
  const { data: alerts } = useAlerts('open');
  return alerts?.length || 0;
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alerts').update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { error } = await supabase.from('alerts').update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolve_notes: notes || null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert resolved');
    },
  });
}

export function useEvaluateAlerts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (context: {
      overview: any;
      assets: any[];
      sips?: any[];
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Fetch rules
      const { data: rules } = await supabase.from('alert_rules').select('*').eq('enabled', true);
      if (!rules || rules.length === 0) return [];

      const newAlerts: Omit<Alert, 'id' | 'acknowledged_at' | 'resolved_at' | 'resolve_notes'>[] = [];
      const { overview, assets, sips } = context;

      for (const rule of rules as AlertRule[]) {
        const config = rule.config_json || {};

        if (rule.type === 'overexposure' && overview?.assets_by_type) {
          const threshold = config.threshold_pct || 40;
          const total = overview.total_current_value || 0;
          if (total > 0) {
            for (const cat of overview.assets_by_type) {
              const pct = (cat.current_value / total) * 100;
              if (pct > threshold) {
                newAlerts.push({
                  user_id: user.id,
                  rule_id: rule.id,
                  status: 'open',
                  severity: rule.severity,
                  title: `Overexposure: ${cat.label}`,
                  message: `${cat.label} is ${pct.toFixed(1)}% of portfolio (threshold: ${threshold}%)`,
                  context_json: { category: cat.type, pct, threshold },
                  triggered_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        if (rule.type === 'concentration' && assets) {
          const threshold = config.single_asset_pct || 25;
          const total = overview?.total_current_value || 0;
          if (total > 0) {
            for (const asset of assets) {
              const val = Number(asset.current_value || asset.total_cost || 0);
              const pct = (val / total) * 100;
              if (pct > threshold) {
                newAlerts.push({
                  user_id: user.id,
                  rule_id: rule.id,
                  status: 'open',
                  severity: rule.severity,
                  title: `Concentration Risk: ${asset.asset_name}`,
                  message: `${asset.asset_name} is ${pct.toFixed(1)}% of portfolio (threshold: ${threshold}%)`,
                  context_json: { asset_id: asset.id, pct, threshold },
                  triggered_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        if (rule.type === 'fd_maturity' && assets) {
          const daysBefore = config.days_before || 30;
          const now = new Date();
          for (const asset of assets) {
            if ((asset.asset_type === 'fixed_deposit' || asset.asset_type_code === 'fixed_deposit') && asset.maturity_date) {
              const matDate = new Date(asset.maturity_date);
              const daysLeft = Math.ceil((matDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysLeft >= 0 && daysLeft <= daysBefore) {
                newAlerts.push({
                  user_id: user.id,
                  rule_id: rule.id,
                  status: 'open',
                  severity: daysLeft <= 7 ? 'critical' : rule.severity,
                  title: `FD Maturing: ${asset.asset_name}`,
                  message: `${asset.asset_name} matures in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`,
                  context_json: { asset_id: asset.id, days_left: daysLeft },
                  triggered_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        if (rule.type === 'sip_missed' && sips) {
          const daysOverdue = config.days_overdue || 5;
          const now = new Date();
          for (const sip of sips) {
            if (sip.status !== 'ACTIVE') continue;
            const sipDay = sip.sip_day_of_month;
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), sipDay);
            if (now > thisMonth) {
              const daysPast = Math.ceil((now.getTime() - thisMonth.getTime()) / (1000 * 60 * 60 * 24));
              if (daysPast > daysOverdue) {
                newAlerts.push({
                  user_id: user.id,
                  rule_id: rule.id,
                  status: 'open',
                  severity: rule.severity,
                  title: `SIP Possibly Missed`,
                  message: `SIP of ₹${sip.sip_amount} was due on day ${sipDay} (${daysPast} days ago)`,
                  context_json: { sip_id: sip.id, days_past: daysPast },
                  triggered_at: new Date().toISOString(),
                });
              }
            }
          }
        }

        if (rule.type === 'drawdown' && overview) {
          // Simple drawdown check using snapshots
          const threshold = config.threshold_pct || 10;
          const { data: snapshots } = await supabase
            .from('portfolio_snapshots')
            .select('net_worth')
            .order('snapshot_date', { ascending: false })
            .limit(90);
          if (snapshots && snapshots.length > 1) {
            const peak = Math.max(...snapshots.map(s => Number(s.net_worth)));
            const current = Number(snapshots[0].net_worth);
            if (peak > 0) {
              const drawdownPct = ((peak - current) / peak) * 100;
              if (drawdownPct > threshold) {
                newAlerts.push({
                  user_id: user.id,
                  rule_id: rule.id,
                  status: 'open',
                  severity: rule.severity,
                  title: `Portfolio Drawdown`,
                  message: `Portfolio is down ${drawdownPct.toFixed(1)}% from peak (threshold: ${threshold}%)`,
                  context_json: { peak, current, drawdown_pct: drawdownPct },
                  triggered_at: new Date().toISOString(),
                });
              }
            }
          }
        }
      }

      // Clear old open alerts before inserting new ones
      await supabase.from('alerts').delete().eq('status', 'open').eq('user_id', user.id);

      if (newAlerts.length > 0) {
        const { error } = await supabase.from('alerts').insert(newAlerts);
        if (error) throw error;
      }

      return newAlerts;
    },
    onSuccess: (alerts) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      if (alerts && alerts.length > 0) {
        toast.info(`${alerts.length} alert${alerts.length !== 1 ? 's' : ''} detected`);
      }
    },
  });
}
