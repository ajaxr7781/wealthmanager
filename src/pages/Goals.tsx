import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, Target, Trash2, Calendar, Link2, X, HelpCircle } from 'lucide-react';
import {
  useGoals, useCreateGoal, useDeleteGoal,
  useGoalMappings, useAddGoalMapping, useRemoveGoalMapping,
  type Goal, type GoalAssetMapping,
} from '@/hooks/useGoals';
import { useAssets, usePortfolioOverview, useUserSettings } from '@/hooks/useAssets';
import { formatCurrency } from '@/lib/calculations';
import { DEFAULT_INR_TO_AED } from '@/types/assets';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { LearnMoreDialog } from '@/components/shared/LearnMoreDialog';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive',
  medium: 'bg-warning/10 text-warning',
  low: 'bg-positive/10 text-positive',
};

function GoalForm({ onSubmit, onClose }: {
  onSubmit: (data: { name: string; target_amount: number; target_date?: string; priority?: string; notes?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState(0);
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [notes, setNotes] = useState('');

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ name, target_amount: target, target_date: date || undefined, priority, notes: notes || undefined }); onClose(); }} className="space-y-4">
      <div><Label>Goal Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. House Down Payment" required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Target Amount (AED)</Label><Input type="number" min={0} step="0.01" value={target || ''} onChange={e => setTarget(+e.target.value)} required /></div>
        <div><Label>Target Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
      </div>
      <div>
        <Label>Priority</Label>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
        <Button type="submit">Create Goal</Button>
      </div>
    </form>
  );
}

function MapAssetsDialog({ goal, mappings }: { goal: Goal; mappings: GoalAssetMapping[] }) {
  const { data: assets = [] } = useAssets();
  const { data: settings } = useUserSettings();
  const addMapping = useAddGoalMapping();
  const removeMapping = useRemoveGoalMapping();
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;
  const [open, setOpen] = useState(false);

  const mappedIds = new Set(mappings.map(m => m.asset_id));
  const unmappedAssets = assets.filter(a => !mappedIds.has(a.id));

  const handleToggle = (assetId: string, checked: boolean) => {
    if (checked) {
      addMapping.mutate({ goal_id: goal.id, asset_id: assetId, allocation_pct: 100 });
    } else {
      const mapping = mappings.find(m => m.asset_id === assetId);
      if (mapping) removeMapping.mutate(mapping.id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Link2 className="h-3.5 w-3.5 mr-1" />Map Assets</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Link Assets to "{goal.name}"</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {assets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No assets available</p>
          ) : assets.map(asset => {
            const isMapped = mappedIds.has(asset.id);
            const val = Number(asset.current_value || asset.total_cost || 0);
            const valAed = asset.currency === 'INR' ? val * inrToAed : val;
            return (
              <label key={asset.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                <Checkbox
                  checked={isMapped}
                  onCheckedChange={(c) => handleToggle(asset.id, !!c)}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{asset.asset_name}</p>
                  <p className="text-xs text-muted-foreground">{asset.category_code || asset.asset_type}</p>
                </div>
                <span className="text-sm font-medium text-foreground">{valAed.toLocaleString('en-US', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 })}</span>
              </label>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const { data: mappings = [] } = useGoalMappings(goal.id);
  const { data: assets = [] } = useAssets();
  const { data: settings } = useUserSettings();
  const deleteGoal = useDeleteGoal();
  const removeMapping = useRemoveGoalMapping();
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  // Calculate mapped value
  const mappedValue = useMemo(() => {
    let total = 0;
    for (const m of mappings) {
      const asset = assets.find(a => a.id === m.asset_id);
      if (!asset) continue;
      const val = Number(asset.current_value || asset.total_cost || 0);
      const valAed = asset.currency === 'INR' ? val * inrToAed : val;
      total += valAed * (m.allocation_pct / 100);
    }
    return total;
  }, [mappings, assets, inrToAed]);

  const progress = Math.min(100, (mappedValue / goal.target_amount) * 100);
  const gap = Math.max(0, goal.target_amount - mappedValue);

  // Projected completion based on 8% CAGR
  const projectedCompletion = useMemo(() => {
    if (!goal.target_date || mappedValue <= 0) return null;
    const yearsLeft = differenceInDays(parseISO(goal.target_date), new Date()) / 365.25;
    if (yearsLeft <= 0) return null;
    return mappedValue * Math.pow(1.08, yearsLeft);
  }, [goal.target_date, mappedValue]);

  const mappedAssets = mappings.map(m => ({
    ...m,
    asset: assets.find(a => a.id === m.asset_id),
  })).filter(m => m.asset);

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1" style={{
        background: `linear-gradient(90deg, hsl(var(--primary)) ${progress}%, hsl(var(--muted)) ${progress}%)`,
      }} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{goal.name}</CardTitle>
            {goal.target_date && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                {new Date(goal.target_date).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge className={cn('text-xs', PRIORITY_COLORS[goal.priority] || '')}>{goal.priority}</Badge>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => deleteGoal.mutate(goal.id)}>
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progress.toFixed(0)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Target</p>
            <p className="font-semibold">{formatCurrency(goal.target_amount)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Mapped Value</p>
            <p className="font-semibold text-primary">{formatCurrency(mappedValue)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Gap</p>
            <p className={cn("font-semibold", gap > 0 ? "text-negative" : "text-positive")}>
              {gap > 0 ? formatCurrency(gap) : 'Achieved ✓'}
            </p>
          </div>
        </div>

        {/* Mapped assets list */}
        {mappedAssets.length > 0 && (
          <div className="border-t pt-2 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Linked Assets</p>
            {mappedAssets.map(m => (
              <div key={m.id} className="flex items-center justify-between text-xs py-1">
                <span className="truncate text-foreground">{m.asset!.asset_name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">{m.allocation_pct}%</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => removeMapping.mutate(m.id)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <MapAssetsDialog goal={goal} mappings={mappings} />
          {projectedCompletion !== null && (
            <Tooltip>
              <TooltipTrigger>
                <span className="text-xs text-muted-foreground">
                  Projected: <span className="font-medium text-foreground">{formatCurrency(projectedCompletion)}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Based on 8% CAGR projection to target date</TooltipContent>
            </Tooltip>
          )}
        </div>

        {goal.notes && <p className="text-xs text-muted-foreground">{goal.notes}</p>}
      </CardContent>
    </Card>
  );
}

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const [open, setOpen] = useState(false);
  const [learnOpen, setLearnOpen] = useState(false);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              Financial Goals
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLearnOpen(true)}>
                    <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Learn about goal tracking</TooltipContent>
              </Tooltip>
            </h1>
            <p className="text-muted-foreground text-sm">Set targets, link assets, and track progress</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Goal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
              <GoalForm onSubmit={data => createGoal.mutate(data)} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <LearnMoreDialog
          open={learnOpen}
          onOpenChange={setLearnOpen}
          title="Goal Tracking"
          sections={[
            { heading: 'How it works', content: 'Create financial goals with a target amount and optional deadline. Link specific assets to each goal to track how much of your portfolio is allocated toward it.' },
            { heading: 'Mapped Value', content: 'The total current value of all assets linked to a goal, weighted by allocation percentage. For example, if you allocate 50% of a ₹10L FD to a goal, it contributes ₹5L.' },
            { heading: 'Projected Completion', content: 'Uses an 8% CAGR (Compound Annual Growth Rate) to estimate the future value of mapped assets by the target date.' },
            { heading: 'Gap Analysis', content: 'The difference between your target amount and current mapped value. When mapped value exceeds the target, the goal is marked as achieved.' },
          ]}
        />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading goals…</div>
        ) : !goals?.length ? (
          <Card className="p-12 text-center">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium text-foreground mb-1">No goals yet</p>
            <p className="text-muted-foreground text-sm mb-4">Create your first financial goal to start tracking progress</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.map(goal => <GoalCard key={goal.id} goal={goal} />)}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
