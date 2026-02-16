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
import { Plus, Target, Trash2, Calendar } from 'lucide-react';
import { useGoals, useCreateGoal, useDeleteGoal, type Goal } from '@/hooks/useGoals';
import { usePortfolioOverview } from '@/hooks/useAssets';
import { formatCurrency } from '@/lib/calculations';
import { cn } from '@/lib/utils';

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

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals();
  const { data: overview } = usePortfolioOverview();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const [open, setOpen] = useState(false);

  const totalPortfolioValue = overview?.total_current_value ?? 0;

  // Simple projected completion using 8% CAGR
  const projectCompletion = (goal: Goal) => {
    if (!goal.target_date || totalPortfolioValue <= 0) return null;
    const targetDate = new Date(goal.target_date);
    const now = new Date();
    const yearsLeft = (targetDate.getTime() - now.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (yearsLeft <= 0) return null;
    const projectedValue = totalPortfolioValue * Math.pow(1.08, yearsLeft);
    return projectedValue;
  };

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Financial Goals</h1>
            <p className="text-muted-foreground text-sm">Set and track your investment targets</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Goal</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Goal</DialogTitle></DialogHeader>
              <GoalForm onSubmit={data => createGoal.mutate(data)} onClose={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

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
            {goals.map(goal => {
              const currentValue = totalPortfolioValue; // simplified: full portfolio vs goal
              const progress = Math.min(100, (currentValue / goal.target_amount) * 100);
              const gap = Math.max(0, goal.target_amount - currentValue);
              const projected = projectCompletion(goal);

              return (
                <Card key={goal.id} className="relative overflow-hidden">
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
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Target</p>
                        <p className="font-semibold">{formatCurrency(goal.target_amount)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Gap</p>
                        <p className={cn("font-semibold", gap > 0 ? "text-negative" : "text-positive")}>
                          {gap > 0 ? formatCurrency(gap) : 'Achieved ✓'}
                        </p>
                      </div>
                    </div>
                    {projected !== null && (
                      <div className="text-xs text-muted-foreground border-t pt-2">
                        Projected at 8% CAGR: <span className="font-medium text-foreground">{formatCurrency(projected)}</span>
                      </div>
                    )}
                    {goal.notes && <p className="text-xs text-muted-foreground">{goal.notes}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
