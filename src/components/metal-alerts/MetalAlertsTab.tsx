import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, Plus, RefreshCw, Copy, Trash2, Edit2, Zap, Mail,
  TrendingUp, TrendingDown, Shield, Clock, Eye, AlertTriangle, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  useMetalAlertRules,
  useCreateMetalAlertRule,
  useUpdateMetalAlertRule,
  useDeleteMetalAlertRule,
  useDuplicateMetalAlertRule,
  useMetalAlertEvents,
  useEvaluateMetalAlerts,
  useSeedDefaultMetalRules,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  RULE_TYPE_LABELS,
  getRuleConditionSummary,
  type MetalAlertRule,
  type MetalAlertRuleInput,
} from '@/hooks/useMetalAlerts';
import { useLatestPrices } from '@/hooks/usePrices';
import { useCurrency } from '@/contexts/CurrencyContext';

interface MetalAlertsTabProps {
  metalType: string;
  metalLabel: string;
  totals: {
    totalInvested: number;
    totalValue: number;
    pl: number;
    plPct: number;
    totalQtyOz: number;
  };
}

const EMPTY_RULE: MetalAlertRuleInput = {
  metal_type: 'XAU',
  rule_name: '',
  rule_type: 'price_below',
  operator: 'lte',
  threshold_value: 0,
  reference_window_days: 30,
  suggested_action: 'buy',
  suggested_amount_type: 'aed',
  suggested_amount_value: 0,
  cooldown_hours: 24,
  is_active: true,
  send_email: true,
  notes: null,
};

export function MetalAlertsTab({ metalType, metalLabel, totals }: MetalAlertsTabProps) {
  const { data: rules = [], isLoading: rulesLoading } = useMetalAlertRules(metalType);
  const { data: events = [], isLoading: eventsLoading } = useMetalAlertEvents(metalType);
  const { data: prices } = useLatestPrices();
  const { data: notifPrefs } = useNotificationPreferences();
  const updateNotifPrefs = useUpdateNotificationPreferences();
  const createRule = useCreateMetalAlertRule();
  const updateRule = useUpdateMetalAlertRule();
  const deleteRule = useDeleteMetalAlertRule();
  const duplicateRule = useDuplicateMetalAlertRule();
  const evaluateAlerts = useEvaluateMetalAlerts();
  const seedDefaults = useSeedDefaultMetalRules();
  const { formatAed } = useCurrency();

  const [editOpen, setEditOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<(MetalAlertRule & { _isNew?: boolean }) | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  const currentPrice = prices?.[metalType as 'XAU' | 'XAG']?.price_aed_per_oz || 0;
  const avgCost = totals.totalQtyOz > 0 ? totals.totalInvested / totals.totalQtyOz : 0;

  const activeRules = rules.filter(r => r.is_active);
  const nextBuyRule = activeRules.find(r => r.suggested_action === 'buy');
  const nextSellRule = activeRules.find(r => r.suggested_action === 'sell');

  useEffect(() => {
    if (!rulesLoading && rules.length === 0) {
      // No rules exist yet — offer to seed defaults
    }
  }, [rulesLoading, rules.length]);

  const handleOpenNew = () => {
    setEditingRule({
      ...EMPTY_RULE,
      metal_type: metalType,
      id: '',
      user_id: '',
      created_at: '',
      updated_at: '',
      last_triggered_at: null,
      _isNew: true,
    } as any);
    setEditOpen(true);
  };

  const handleOpenEdit = (rule: MetalAlertRule) => {
    setEditingRule({ ...rule });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editingRule) return;
    if ((editingRule as any)._isNew) {
      const { id, user_id, created_at, updated_at, last_triggered_at, _isNew, ...input } = editingRule as any;
      await createRule.mutateAsync(input);
    } else {
      const { _isNew, ...data } = editingRule as any;
      await updateRule.mutateAsync(data);
    }
    setEditOpen(false);
    setEditingRule(null);
  };

  const handlePreviewEmail = (event: any) => {
    if (event.email_body) {
      setPreviewHtml(event.email_body);
      setPreviewOpen(true);
    }
  };

  if (rulesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* How Alerts Work */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">How Metal Alerts Work</p>
              <p>Create rules that monitor {metalLabel} prices and your portfolio. When conditions are met, the system triggers an alert and optionally sends you an email via Resend. Rules respect cooldown periods to prevent spam. Use the "Evaluate Now" button to manually check, or let the scheduled job run automatically.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {metalLabel} Alert Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            <div>
              <p className="text-xs text-muted-foreground">Current Price</p>
              <p className="text-sm font-semibold">{formatAed(currentPrice, { decimals: 2 })}/oz</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Cost</p>
              <p className="text-sm font-semibold">{formatAed(avgCost, { decimals: 2 })}/oz</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Invested</p>
              <p className="text-sm font-semibold">{formatAed(totals.totalInvested, { decimals: 0 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Value</p>
              <p className="text-sm font-semibold">{formatAed(totals.totalValue, { decimals: 0 })}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">P/L</p>
              <p className={cn("text-sm font-semibold", totals.pl >= 0 ? "text-positive" : "text-negative")}>
                {totals.pl >= 0 ? '+' : ''}{formatAed(totals.pl, { decimals: 0 })} ({totals.plPct >= 0 ? '+' : ''}{totals.plPct.toFixed(1)}%)
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active Rules</p>
              <p className="text-sm font-semibold">{activeRules.length}</p>
            </div>
          </div>

          {/* Next buy/sell rules */}
          {(nextBuyRule || nextSellRule) && (
            <div className="mt-4 pt-4 border-t flex flex-wrap gap-3">
              {nextBuyRule && (
                <Badge variant="outline" className="text-positive border-positive/30 bg-positive/5">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Next Buy: {getRuleConditionSummary(nextBuyRule)}
                </Badge>
              )}
              {nextSellRule && (
                <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Next Sell: {getRuleConditionSummary(nextSellRule)}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={handleOpenNew} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Rule
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => evaluateAlerts.mutate()}
          disabled={evaluateAlerts.isPending}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", evaluateAlerts.isPending && "animate-spin")} />
          Evaluate Now
        </Button>
        {rules.length === 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => seedDefaults.mutate()}
            disabled={seedDefaults.isPending}
          >
            <Zap className="h-4 w-4 mr-2" /> Seed Default Rules
          </Button>
        )}
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules ({rules.length})</TabsTrigger>
          <TabsTrigger value="history">History ({events.length})</TabsTrigger>
          <TabsTrigger value="settings">
            <Mail className="h-3.5 w-3.5 mr-1" /> Email Settings
          </TabsTrigger>
        </TabsList>

        {/* ─── Rules Tab ─── */}
        <TabsContent value="rules" className="space-y-3 mt-4">
          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p>No alert rules yet. Click "Add Rule" or "Seed Default Rules" to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">On</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Cooldown</TableHead>
                    <TableHead>Last Triggered</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map(rule => (
                    <TableRow key={rule.id} className={cn(!rule.is_active && "opacity-50")}>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(is_active) => updateRule.mutate({ id: rule.id, is_active })}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{rule.rule_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="outline" className="text-[10px]">
                              {rule.metal_type === 'XAU' ? 'Gold' : 'Silver'}
                            </Badge>
                            {rule.send_email && (
                              <Mail className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {getRuleConditionSummary(rule)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rule.suggested_action === 'buy' ? 'default' : rule.suggested_action === 'sell' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {rule.suggested_action.toUpperCase()}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {rule.suggested_amount_value} {rule.suggested_amount_type}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.cooldown_hours}h
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rule.last_triggered_at
                          ? format(new Date(rule.last_triggered_at), 'dd MMM HH:mm')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(rule)}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateRule.mutate(rule)}>
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Duplicate</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── History Tab ─── */}
        <TabsContent value="history" className="mt-4">
          {eventsLoading ? (
            <Skeleton className="h-32" />
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p>No alerts triggered yet. Rules will be evaluated automatically or click "Evaluate Now".</p>
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Market Price</TableHead>
                    <TableHead className="text-right">Portfolio Value</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(event => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">
                        {format(new Date(event.created_at), 'dd MMM yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate" title={event.trigger_reason}>
                        {event.trigger_reason}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {event.market_price_aed ? formatAed(event.market_price_aed, { decimals: 2 }) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {event.portfolio_value_aed ? formatAed(event.portfolio_value_aed, { decimals: 0 }) : '—'}
                      </TableCell>
                      <TableCell className={cn("text-sm text-right",
                        (event.unrealized_pl_aed || 0) >= 0 ? "text-positive" : "text-negative"
                      )}>
                        {event.unrealized_pl_aed != null
                          ? `${event.unrealized_pl_aed >= 0 ? '+' : ''}${formatAed(event.unrealized_pl_aed, { decimals: 0 })}`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={event.status === 'email_sent' ? 'default' : event.status === 'email_failed' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {event.status === 'email_sent' ? '✉ Sent' : event.status === 'email_failed' ? '✗ Failed' : event.status === 'suppressed' ? 'Quiet hrs' : 'No email'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.email_body && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePreviewEmail(event)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview email</TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* ─── Email Settings Tab ─── */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Notification Preferences</CardTitle>
              <CardDescription>Emails are sent only when a rule condition is satisfied, the rule is active, email is enabled, and cooldown allows it. No digests or periodic emails.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Alerts</Label>
                  <p className="text-xs text-muted-foreground">Master toggle — disable to stop all metal alert emails</p>
                </div>
                <Switch
                  checked={notifPrefs?.email_enabled !== false}
                  onCheckedChange={(email_enabled) => updateNotifPrefs.mutate({ email_enabled })}
                />
              </div>
              <div className="space-y-2">
                <Label>Recipient Email (optional override)</Label>
                <Input
                  placeholder="Uses your account email if blank"
                  defaultValue={notifPrefs?.recipient_email || ''}
                  onBlur={(e) => {
                    if (e.target.value !== (notifPrefs?.recipient_email || '')) {
                      updateNotifPrefs.mutate({ recipient_email: e.target.value || null });
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Market Session Awareness
              </CardTitle>
              <CardDescription>The system evaluates rules on schedule with awareness of Dubai market windows. Emails are sent only on actual rule triggers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="text-[10px] w-28 justify-center">Priority</Badge>
                  <span className="text-muted-foreground">16:00 – 00:00 Asia/Dubai — peak international overlap</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-[10px] w-28 justify-center">Standard</Badge>
                  <span className="text-muted-foreground">06:00 – 16:00 Asia/Dubai — standard business hours</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] w-28 justify-center">Low Activity</Badge>
                  <span className="text-muted-foreground">00:00 – 06:00 Asia/Dubai — minimal market movement</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── Edit/Add Rule Dialog ─── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {(editingRule as any)?._isNew ? 'Add Alert Rule' : 'Edit Alert Rule'}
            </DialogTitle>
          </DialogHeader>
          {editingRule && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metal</Label>
                  <Select
                    value={editingRule.metal_type}
                    onValueChange={(v) => setEditingRule({ ...editingRule, metal_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="XAU">Gold (XAU)</SelectItem>
                      <SelectItem value="XAG">Silver (XAG)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Rule Name</Label>
                  <Input
                    value={editingRule.rule_name}
                    onChange={(e) => setEditingRule({ ...editingRule, rule_name: e.target.value })}
                    placeholder="e.g. Gold buy zone"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Rule Type</Label>
                <Select
                  value={editingRule.rule_type}
                  onValueChange={(v) => setEditingRule({ ...editingRule, rule_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(RULE_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Select
                    value={editingRule.operator}
                    onValueChange={(v) => setEditingRule({ ...editingRule, operator: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lt">&lt; Less than</SelectItem>
                      <SelectItem value="lte">≤ Less or equal</SelectItem>
                      <SelectItem value="gt">&gt; Greater than</SelectItem>
                      <SelectItem value="gte">≥ Greater or equal</SelectItem>
                      <SelectItem value="eq">= Equal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Threshold</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editingRule.threshold_value}
                    onChange={(e) => setEditingRule({ ...editingRule, threshold_value: Number(e.target.value) })}
                  />
                </div>
              </div>

              {(editingRule.rule_type === 'price_drop_pct' || editingRule.rule_type === 'price_rise_pct') && (
                <div className="space-y-2">
                  <Label>Lookback Window (days)</Label>
                  <Input
                    type="number"
                    value={editingRule.reference_window_days}
                    onChange={(e) => setEditingRule({ ...editingRule, reference_window_days: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Suggested Action</Label>
                  <Select
                    value={editingRule.suggested_action}
                    onValueChange={(v) => setEditingRule({ ...editingRule, suggested_action: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Buy</SelectItem>
                      <SelectItem value="sell">Sell</SelectItem>
                      <SelectItem value="hold">Hold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount Type</Label>
                  <Select
                    value={editingRule.suggested_amount_type}
                    onValueChange={(v) => setEditingRule({ ...editingRule, suggested_amount_type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aed">AED</SelectItem>
                      <SelectItem value="oz">Ounces</SelectItem>
                      <SelectItem value="grams">Grams</SelectItem>
                      <SelectItem value="percentage">%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    step="any"
                    value={editingRule.suggested_amount_value}
                    onChange={(e) => setEditingRule({ ...editingRule, suggested_amount_value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cooldown (hours)</Label>
                  <Input
                    type="number"
                    value={editingRule.cooldown_hours}
                    onChange={(e) => setEditingRule({ ...editingRule, cooldown_hours: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2 flex items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.send_email}
                      onCheckedChange={(send_email) => setEditingRule({ ...editingRule, send_email })}
                    />
                    <Label>Email</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={editingRule.is_active}
                      onCheckedChange={(is_active) => setEditingRule({ ...editingRule, is_active })}
                    />
                    <Label>Active</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={editingRule.notes || ''}
                  onChange={(e) => setEditingRule({ ...editingRule, notes: e.target.value || null })}
                  placeholder="Internal notes about this rule..."
                  rows={2}
                />
              </div>

              <Button
                onClick={handleSave}
                disabled={createRule.isPending || updateRule.isPending || !editingRule.rule_name || !editingRule.threshold_value}
                className="w-full"
              >
                {(createRule.isPending || updateRule.isPending) ? 'Saving...' : (editingRule as any)?._isNew ? 'Create Rule' : 'Save Changes'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── Email Preview Dialog ─── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
          </DialogHeader>
          <div
            className="border rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
