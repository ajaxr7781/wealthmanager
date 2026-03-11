import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, GraduationCap, Landmark, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoalProjectionProps {
  totalCurrentValue: number;
}

function formatAED(v: number) {
  return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

const GOALS = [
  { key: 'education', label: 'Education', icon: GraduationCap, defaultYears: 10, defaultTarget: 500000 },
  { key: 'retirement', label: 'Retirement', icon: Landmark, defaultYears: 20, defaultTarget: 3000000 },
  { key: 'savings', label: 'Long-Term Savings', icon: PiggyBank, defaultYears: 15, defaultTarget: 1000000 },
];

const GROWTH_RATES = [8, 10, 12];

function projectCorpus(currentValue: number, years: number, rate: number): number {
  return currentValue * Math.pow(1 + rate / 100, years);
}

export function GoalProjection({ totalCurrentValue }: GoalProjectionProps) {
  const [customCorpus, setCustomCorpus] = useState<number>(totalCurrentValue);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" /> Portfolio Projection
          </CardTitle>
          <CardDescription>Projected value at different CAGR rates using current portfolio value</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Label htmlFor="corpus">Starting Corpus (AED)</Label>
            <Input
              id="corpus"
              type="number"
              value={customCorpus}
              onChange={e => setCustomCorpus(Number(e.target.value) || 0)}
              className="mt-1 max-w-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Years</th>
                  {GROWTH_RATES.map(r => (
                    <th key={r} className="text-right py-2 px-3 font-semibold text-muted-foreground">@ {r}% CAGR</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[5, 10, 15, 20, 25, 30].map(years => (
                  <tr key={years} className="border-b border-border hover:bg-accent/50">
                    <td className="py-2 px-3 font-medium">{years} years</td>
                    {GROWTH_RATES.map(rate => (
                      <td key={rate} className="text-right py-2 px-3">
                        {formatAED(projectCorpus(customCorpus, years, rate))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Goal Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {GOALS.map(goal => {
          const Icon = goal.icon;
          const projections = GROWTH_RATES.map(rate => ({
            rate,
            projected: projectCorpus(customCorpus, goal.defaultYears, rate),
          }));

          return (
            <Card key={goal.key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="h-5 w-5 text-primary" />
                  {goal.label}
                </CardTitle>
                <CardDescription>
                  Target: {formatAED(goal.defaultTarget)} in {goal.defaultYears} years
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {projections.map(p => {
                  const onTrack = p.projected >= goal.defaultTarget;
                  const progress = Math.min((p.projected / goal.defaultTarget) * 100, 100);
                  return (
                    <div key={p.rate} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">@ {p.rate}%</span>
                        <span className={cn("font-medium", onTrack ? "text-positive" : "text-negative")}>
                          {formatAED(p.projected)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", onTrack ? "bg-positive" : "bg-primary")}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
