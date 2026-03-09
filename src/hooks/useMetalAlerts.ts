import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface MetalAlertRule {
  id: string;
  user_id: string;
  metal_type: string;
  rule_name: string;
  rule_type: string;
  operator: string;
  threshold_value: number;
  reference_window_days: number;
  suggested_action: string;
  suggested_amount_type: string;
  suggested_amount_value: number;
  cooldown_hours: number;
  is_active: boolean;
  send_email: boolean;
  notes: string | null;
  last_triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetalAlertEvent {
  id: string;
  rule_id: string | null;
  user_id: string;
  metal_type: string;
  trigger_reason: string;
  market_price_aed: number | null;
  portfolio_value_aed: number | null;
  total_invested_aed: number | null;
  unrealized_pl_aed: number | null;
  unrealized_pl_pct: number | null;
  email_sent: boolean;
  email_subject: string | null;
  email_body: string | null;
  sent_at: string | null;
  status: string;
  created_at: string;
}

export type MetalAlertRuleInput = Omit<MetalAlertRule, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_triggered_at'>;

export interface NotificationPreferences {
  id: string;
  user_id: string;
  email_enabled: boolean;
  digest_mode: string;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  recipient_email: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Rules ─────────────────────────────────────────────

export function useMetalAlertRules(metalType?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['metal-alert-rules', user?.id, metalType],
    queryFn: async () => {
      let query = supabase
        .from('metal_alert_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (metalType) query = query.eq('metal_type', metalType);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MetalAlertRule[];
    },
    enabled: !!user,
  });
}

export function useCreateMetalAlertRule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MetalAlertRuleInput) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('metal_alert_rules')
        .insert({ ...input, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metal-alert-rules'] });
      toast.success('Alert rule created');
    },
    onError: (e) => toast.error('Failed to create rule: ' + e.message),
  });
}

export function useUpdateMetalAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MetalAlertRule> & { id: string }) => {
      const { error } = await supabase
        .from('metal_alert_rules')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metal-alert-rules'] });
      toast.success('Rule updated');
    },
    onError: (e) => toast.error('Failed to update rule: ' + e.message),
  });
}

export function useDeleteMetalAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metal_alert_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metal-alert-rules'] });
      toast.success('Rule deleted');
    },
    onError: (e) => toast.error('Failed to delete rule: ' + e.message),
  });
}

export function useDuplicateMetalAlertRule() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: MetalAlertRule) => {
      if (!user) throw new Error('Not authenticated');
      const { id, user_id, created_at, updated_at, last_triggered_at, ...rest } = rule;
      const { error } = await supabase
        .from('metal_alert_rules')
        .insert({ ...rest, user_id: user.id, rule_name: `${rest.rule_name} (copy)` });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metal-alert-rules'] });
      toast.success('Rule duplicated');
    },
    onError: (e) => toast.error('Failed to duplicate rule: ' + e.message),
  });
}

// ─── Events ────────────────────────────────────────────

export function useMetalAlertEvents(metalType?: string, limit = 50) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['metal-alert-events', user?.id, metalType, limit],
    queryFn: async () => {
      let query = supabase
        .from('metal_alert_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (metalType) query = query.eq('metal_type', metalType);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as MetalAlertEvent[];
    },
    enabled: !!user,
  });
}

// ─── Manual Evaluate ───────────────────────────────────

export function useEvaluateMetalAlerts() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('evaluate-metal-alerts', {
        body: { user_id: user.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['metal-alert-events'] });
      qc.invalidateQueries({ queryKey: ['metal-alert-rules'] });
      if (data?.triggered > 0) {
        toast.info(`${data.triggered} alert${data.triggered !== 1 ? 's' : ''} triggered`);
      } else {
        toast.success(`Evaluated ${data?.evaluated || 0} rules — no alerts triggered`);
      }
    },
    onError: (e) => toast.error('Failed to evaluate alerts: ' + e.message),
  });
}

// ─── Notification Preferences ──────────────────────────

export function useNotificationPreferences() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return (data || null) as NotificationPreferences | null;
    },
    enabled: !!user,
  });
}

export function useUpdateNotificationPreferences() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: Partial<Omit<NotificationPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
      if (!user) throw new Error('Not authenticated');
      const { data: existing } = await supabase
        .from('notification_preferences')
        .select('id')
        .single();
      if (existing) {
        const { error } = await supabase
          .from('notification_preferences')
          .update({ ...prefs, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id, ...prefs });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Notification preferences saved');
    },
    onError: (e) => toast.error('Failed to save preferences: ' + e.message),
  });
}

// ─── Seed Default Rules ────────────────────────────────

export function useSeedDefaultMetalRules() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      const { data: existing } = await supabase
        .from('metal_alert_rules')
        .select('id')
        .limit(1);
      if (existing && existing.length > 0) return; // Already has rules

      const defaults = [
        { metal_type: 'XAU', rule_name: 'Gold buy zone — below 18,400', rule_type: 'price_below', operator: 'lte', threshold_value: 18400, suggested_action: 'buy', suggested_amount_type: 'aed', suggested_amount_value: 3000, cooldown_hours: 24 },
        { metal_type: 'XAU', rule_name: 'Gold strong buy — below 18,000', rule_type: 'price_below', operator: 'lte', threshold_value: 18000, suggested_action: 'buy', suggested_amount_type: 'aed', suggested_amount_value: 4000, cooldown_hours: 24 },
        { metal_type: 'XAU', rule_name: 'Gold sell target — above 20,500', rule_type: 'price_above', operator: 'gte', threshold_value: 20500, suggested_action: 'sell', suggested_amount_type: 'oz', suggested_amount_value: 0.20, cooldown_hours: 48 },
        { metal_type: 'XAG', rule_name: 'Silver buy zone — below 300', rule_type: 'price_below', operator: 'lte', threshold_value: 300, suggested_action: 'buy', suggested_amount_type: 'aed', suggested_amount_value: 2000, cooldown_hours: 24 },
        { metal_type: 'XAG', rule_name: 'Silver strong buy — below 280', rule_type: 'price_below', operator: 'lte', threshold_value: 280, suggested_action: 'buy', suggested_amount_type: 'aed', suggested_amount_value: 3000, cooldown_hours: 24 },
        { metal_type: 'XAG', rule_name: 'Silver sell target — above 380', rule_type: 'price_above', operator: 'gte', threshold_value: 380, suggested_action: 'sell', suggested_amount_type: 'oz', suggested_amount_value: 5, cooldown_hours: 48 },
      ];

      const { error } = await supabase
        .from('metal_alert_rules')
        .insert(defaults.map(d => ({
          ...d,
          user_id: user.id,
          reference_window_days: 30,
          is_active: true,
          send_email: true,
        })));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['metal-alert-rules'] });
      toast.success('Default alert rules created');
    },
  });
}

// ─── Helpers ───────────────────────────────────────────

export const RULE_TYPE_LABELS: Record<string, string> = {
  price_below: 'Price below threshold',
  price_above: 'Price above threshold',
  price_drop_pct: 'Price dropped X% from high',
  price_rise_pct: 'Price rose X% from low',
  portfolio_profit_above: 'Portfolio profit above AED',
  portfolio_loss_above: 'Portfolio loss above AED',
  position_pl_pct: 'Position P/L % above',
  allocation_pct_above: 'Allocation % above',
};

export const OPERATOR_LABELS: Record<string, string> = {
  lt: '<',
  lte: '≤',
  gt: '>',
  gte: '≥',
  eq: '=',
};

export function getRuleConditionSummary(rule: MetalAlertRule): string {
  const metal = rule.metal_type === 'XAU' ? 'Gold' : 'Silver';
  const op = OPERATOR_LABELS[rule.operator] || rule.operator;
  switch (rule.rule_type) {
    case 'price_below':
    case 'price_above':
      return `${metal} price ${op} AED ${rule.threshold_value.toLocaleString()}/oz`;
    case 'price_drop_pct':
      return `${metal} drops ${op} ${rule.threshold_value}% from ${rule.reference_window_days}d high`;
    case 'price_rise_pct':
      return `${metal} rises ${op} ${rule.threshold_value}% from ${rule.reference_window_days}d low`;
    case 'portfolio_profit_above':
      return `${metal} profit ${op} AED ${rule.threshold_value.toLocaleString()}`;
    case 'portfolio_loss_above':
      return `${metal} loss ${op} AED ${rule.threshold_value.toLocaleString()}`;
    case 'position_pl_pct':
      return `${metal} P/L ${op} ${rule.threshold_value}%`;
    case 'allocation_pct_above':
      return `${metal} allocation ${op} ${rule.threshold_value}%`;
    default:
      return `${rule.rule_type} ${op} ${rule.threshold_value}`;
  }
}
