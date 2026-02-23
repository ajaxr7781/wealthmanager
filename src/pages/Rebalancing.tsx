import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Plus, AlertTriangle, ArrowUpRight, ArrowDownRight, Scale, Trash2 } from 'lucide-react';
import { useAllocationTargets, useAllocationTargetLines, useCreateAllocationTarget, useDeleteAllocationTarget, type AllocationTargetLine } from '@/hooks/useAllocationTargets';
import { usePortfolioOverview } from '@/hooks/useAssets';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DriftRow {
  category_code: string;
  label: string;
  current_pct: number;
  target_pct: number;
  drift: number;
  current_value: number;
  target_value: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  amount: number;
  min_pct: number;
  max_pct: number;
  breached: boolean;
}

function CreateTargetForm({ categories, onSubmit, onClose }: {
  categories: { code: string; name: string }[];
  onSubmit: (data: { name: string; rebalance_threshold_pct: number; lines: { category_code: string; target_pct: number; min_pct: number; max_pct: number }[] }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(5);
  const [lines, setLines] = useState<Record<string, { target: number; min: number; max: number }>>(
    Object.fromEntries(categories.map(c => [c.code, { target: 0, min: 0, max: 100 }]))
  );

  const total = Object.values(lines).reduce((s, l) => s + l.target, 0);

  return (
    <form onSubmit={e => {
      e.preventDefault();
      onSubmit({
        name,
        rebalance_threshold_pct: threshold,
        lines: Object.entries(lines).filter(([, v]) => v.target > 0).map(([code, v]) => ({
          category_code: code,
          target_pct: v.target,
          min_pct: v.min,
          max_pct: v.max,
        })),
      });
      onClose();
    }} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Profile Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Balanced" required /></div>
        <div><Label>Drift Threshold (%)</Label><Input type="number" min={1} max={50} value={threshold} onChange={e => setThreshold(+e.target.value)} /></div>
      </div>

      <div>
        <Label className="mb-2 block">Category Allocations (Total: {total}%)</Label>
        {total !== 100 && <p className="text-xs text-destructive mb-2">Total must equal 100%</p>}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.map(cat => (
            <div key={cat.code} className="grid grid-cols-4 gap-2 items-center text-sm">
              <span className="font-medium">{cat.name}</span>
              <Input
                type="number" min={0} max={100} placeholder="Target %"
                value={lines[cat.code]?.target || ''}
                onChange={e => setLines(p => ({ ...p, [cat.code]: { ...p[cat.code], target: +e.target.value } }))}
              />
              <Input
                type="number" min={0} max={100} placeholder="Min %"
                value={lines[cat.code]?.min || ''}
                onChange={e => setLines(p => ({ ...p, [cat.code]: { ...p[cat.code], min: +e.target.value } }))}
              />
              <Input
                type="number" min={0} max={100} placeholder="Max %"
                value={lines[cat.code]?.max || ''}
                onChange={e => setLines(p => ({ ...p, [cat.code]: { ...p[cat.code], max: +e.target.value } }))}
              />
            </div>
          ))}
          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
            <span></span><span>Target %</span><span>Min %</span><span>Max %</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit" disabled={total !== 100}>Create Profile</Button>
      </div>
    </form>
  );
}

export default function RebalancingPage() {
  const { data: targets } = useAllocationTargets();
  const { data: overview } = usePortfolioOverview();
  const { data: categoriesWithTypes } = useCategoriesWithTypes();
  const createTarget = useCreateAllocationTarget();
  const deleteTarget = useDeleteAllocationTarget();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const { data: targetLines } = useAllocationTargetLines(selectedTargetId ?? undefined);

  // Auto-select first target
  const activeTarget = selectedTargetId || targets?.[0]?.id;
  const activeLines = selectedTargetId ? targetLines : undefined;

  // Load lines for auto-selected target
  const { data: autoLines } = useAllocationTargetLines(activeTarget ?? undefined);
  const lines = activeLines || autoLines || [];

  const categories = useMemo(() =>
    categoriesWithTypes?.map(c => ({ code: c.code, name: c.name })) || [],
    [categoriesWithTypes]
  );

  const totalPortfolioValue = overview?.total_current_value ?? 0;

  // Calculate drift
  const driftData = useMemo((): DriftRow[] => {
    if (!overview?.assets_by_type || !lines.length || totalPortfolioValue <= 0) return [];

    const currentByCategory = new Map<string, number>();
    for (const a of overview.assets_by_type) {
      currentByCategory.set(a.type, (currentByCategory.get(a.type) || 0) + a.current_value);
    }

    // MF/SIP are now in assets_by_type — no separate addition needed

    const threshold = targets?.find(t => t.id === activeTarget)?.rebalance_threshold_pct ?? 5;

    return lines.map(line => {
      const currentValue = currentByCategory.get(line.category_code) || 0;
      const currentPct = (currentValue / totalPortfolioValue) * 100;
      const targetValue = (line.target_pct / 100) * totalPortfolioValue;
      const drift = currentPct - line.target_pct;
      const breached = Math.abs(drift) > threshold || currentPct < line.min_pct || currentPct > line.max_pct;
      const amount = Math.abs(currentValue - targetValue);
      const action: 'BUY' | 'SELL' | 'HOLD' = drift > threshold ? 'SELL' : drift < -threshold ? 'BUY' : 'HOLD';

      return {
        category_code: line.category_code,
        label: categories.find(c => c.code === line.category_code)?.name || line.category_code,
        current_pct: currentPct,
        target_pct: line.target_pct,
        drift,
        current_value: currentValue,
        target_value: targetValue,
        action,
        amount,
        min_pct: line.min_pct,
        max_pct: line.max_pct,
        breached,
      };
    });
  }, [overview, lines, totalPortfolioValue, targets, activeTarget, categories]);

  const totalDrift = driftData.reduce((s, d) => s + Math.abs(d.drift), 0);
  const breachCount = driftData.filter(d => d.breached).length;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Rebalancing Engine</h1>
            <p className="text-muted-foreground text-sm">Monitor allocation drift and get rebalancing recommendations</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Target Profile</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Create Allocation Target</DialogTitle></DialogHeader>
              <CreateTargetForm
                categories={categories}
                onSubmit={data => createTarget.mutate(data)}
                onClose={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Target profiles */}
        {targets && targets.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {targets.map(t => (
              <div key={t.id} className="flex items-center gap-1">
                <Button
                  variant={activeTarget === t.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTargetId(t.id)}
                >
                  <Scale className="h-3.5 w-3.5 mr-1.5" />
                  {t.name}
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteTarget.mutate(t.id)}>
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {!targets?.length ? (
          <Card className="p-12 text-center">
            <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium mb-1">No allocation targets yet</p>
            <p className="text-muted-foreground text-sm mb-4">Create a target profile to see drift analysis and rebalancing suggestions</p>
          </Card>
        ) : driftData.length > 0 ? (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {/* Drift summary */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Drift</CardTitle></CardHeader>
                  <CardContent><span className={cn("text-2xl font-semibold", totalDrift > 10 ? "text-negative" : "text-foreground")}>{totalDrift.toFixed(1)}%</span></CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Breached Categories</CardTitle></CardHeader>
                  <CardContent>
                    <span className={cn("text-2xl font-semibold", breachCount > 0 ? "text-warning" : "text-positive")}>
                      {breachCount} / {driftData.length}
                    </span>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Portfolio Value</CardTitle></CardHeader>
                  <CardContent><span className="text-2xl font-semibold">{formatCurrency(totalPortfolioValue)}</span></CardContent>
                </Card>
              </div>

              {/* Allocation comparison */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Current vs Target Allocation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {driftData.map(row => (
                    <div key={row.category_code} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium flex items-center gap-2">
                          {row.label}
                          {row.breached && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                        </span>
                        <span className="text-muted-foreground">
                          {row.current_pct.toFixed(1)}% → {row.target_pct.toFixed(1)}%
                          <span className={cn("ml-2 font-medium", row.drift > 0 ? "text-positive" : row.drift < 0 ? "text-negative" : "text-muted-foreground")}>
                            ({row.drift > 0 ? '+' : ''}{row.drift.toFixed(1)}%)
                          </span>
                        </span>
                      </div>
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div className="absolute inset-0 bg-primary/20 rounded-full" style={{ width: `${row.target_pct}%` }} />
                        <div
                          className={cn("absolute inset-y-0 left-0 rounded-full", row.breached ? "bg-warning" : "bg-primary")}
                          style={{ width: `${Math.min(100, row.current_pct)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Min: {row.min_pct}%</span>
                        <span>Max: {row.max_pct}%</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Rebalancing Actions (Preview)</CardTitle>
                  <CardDescription>These are simulated recommendations — no transactions will be created</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead className="text-right">Amount (AED)</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Drift</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driftData.filter(d => d.action !== 'HOLD').map(row => (
                        <TableRow key={row.category_code}>
                          <TableCell className="font-medium">{row.label}</TableCell>
                          <TableCell>
                            <Badge variant={row.action === 'BUY' ? 'default' : 'destructive'} className="gap-1">
                              {row.action === 'BUY' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                              {row.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(row.amount)}</TableCell>
                          <TableCell className="text-right">{row.current_pct.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">{row.target_pct.toFixed(1)}%</TableCell>
                          <TableCell className={cn("text-right font-medium", row.drift > 0 ? "text-positive" : "text-negative")}>
                            {row.drift > 0 ? '+' : ''}{row.drift.toFixed(1)}%
                          </TableCell>
                        </TableRow>
                      ))}
                      {driftData.filter(d => d.action !== 'HOLD').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Portfolio is within tolerance — no rebalancing needed ✓
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            Select a target profile to view drift analysis
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
