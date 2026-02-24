import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  useAlerts,
  useAlertRules,
  useEnsureDefaultRules,
  useUpdateAlertRule,
  useAcknowledgeAlert,
  useResolveAlert,
  useEvaluateAlerts,
} from '@/hooks/useAlerts';
import { usePortfolioOverview, useAssets } from '@/hooks/useAssets';

import {
  Bell, Shield, AlertTriangle, Info, CheckCircle2, RefreshCw, Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const SEVERITY_CONFIG: Record<string, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  warning: { icon: Shield, color: 'text-warning', bg: 'bg-warning/10' },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/10' },
};

export default function AlertsPage() {
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: rules = [] } = useAlertRules();
  const ensureDefaults = useEnsureDefaultRules();
  const updateRule = useUpdateAlertRule();
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();
  const evaluateAlerts = useEvaluateAlerts();
  const { data: overview } = usePortfolioOverview();
  const { data: assets } = useAssets();
  const sipAssets = (assets || []).filter(a => a.asset_type === 'sip');

  useEffect(() => {
    ensureDefaults.mutate();
  }, []);

  const openAlerts = alerts.filter(a => a.status === 'open');
  const ackedAlerts = alerts.filter(a => a.status === 'acknowledged');
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved');

  const handleEvaluate = () => {
    if (overview && assets) {
      evaluateAlerts.mutate({ overview, assets, sips: sipAssets });
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Bell className="h-7 w-7 text-primary" />
              Alerts & Smart Insights
            </h1>
            <p className="text-muted-foreground">Automated portfolio monitoring & notifications</p>
          </div>
          <Button onClick={handleEvaluate} disabled={evaluateAlerts.isPending} size="sm">
            <RefreshCw className={cn("h-4 w-4 mr-2", evaluateAlerts.isPending && "animate-spin")} />
            Scan Now
          </Button>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{openAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Open Alerts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Shield className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{ackedAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Acknowledged</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-positive/10">
                  <CheckCircle2 className="h-5 w-5 text-positive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{resolvedAlerts.length}</p>
                  <p className="text-xs text-muted-foreground">Resolved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active">Active ({openAlerts.length + ackedAlerts.length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({resolvedAlerts.length})</TabsTrigger>
            <TabsTrigger value="rules">
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Rules ({rules.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {[...openAlerts, ...ackedAlerts].length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No active alerts. Click "Scan Now" to evaluate your portfolio.</CardContent></Card>
            ) : (
              [...openAlerts, ...ackedAlerts].map(alert => {
                const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
                const Icon = sev.icon;
                return (
                  <Card key={alert.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg shrink-0", sev.bg)}>
                          <Icon className={cn("h-4 w-4", sev.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm text-foreground">{alert.title}</p>
                            <Badge variant={alert.status === 'open' ? 'destructive' : 'secondary'} className="text-[10px]">
                              {alert.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(alert.triggered_at), 'dd MMM yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {alert.status === 'open' && (
                            <Button size="sm" variant="outline" onClick={() => acknowledgeAlert.mutate(alert.id)}>
                              Ack
                            </Button>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => resolveAlert.mutate({ id: alert.id })}>
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="resolved" className="space-y-3">
            {resolvedAlerts.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No resolved alerts yet.</CardContent></Card>
            ) : (
              resolvedAlerts.slice(0, 20).map(alert => (
                <Card key={alert.id} className="opacity-70">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-positive shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0">
                        {alert.resolved_at ? format(new Date(alert.resolved_at), 'dd MMM') : ''}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="rules" className="space-y-3">
            {rules.map(rule => (
              <Card key={rule.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{rule.name}</p>
                        <Badge variant="outline" className="text-[10px]">{rule.type}</Badge>
                        <Badge variant={rule.severity === 'critical' ? 'destructive' : rule.severity === 'warning' ? 'secondary' : 'outline'} className="text-[10px]">
                          {rule.severity}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {JSON.stringify(rule.config_json)}
                      </p>
                    </div>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(enabled) => updateRule.mutate({ id: rule.id, enabled })}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
