import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GainLossBreakdownProps {
  invested: number;
  currentValue: number;
  fmtINR: (v: number) => string;
}

export function GainLossBreakdown({ invested, currentValue, fmtINR }: GainLossBreakdownProps) {
  const unrealizedGain = currentValue - invested;
  const absoluteReturn = invested > 0 ? (unrealizedGain / invested) * 100 : 0;

  const rows = [
    { label: 'Total Invested', value: invested, color: false },
    { label: 'Current Value', value: currentValue, color: false },
    { label: 'Unrealized Gain/Loss', value: unrealizedGain, color: true },
    { label: 'Absolute Return', value: absoluteReturn, color: true, isPct: true },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Gain / Loss Breakdown</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between py-2 border-b last:border-0">
            <span className="text-sm text-muted-foreground">{row.label}</span>
            <span className={cn(
              "font-semibold flex items-center gap-1",
              row.color && (row.value >= 0 ? 'text-positive' : 'text-negative')
            )}>
              {row.color && row.value !== 0 && (
                row.value > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />
              )}
              {row.isPct
                ? `${row.value >= 0 ? '+' : ''}${row.value.toFixed(2)}%`
                : fmtINR(row.color ? Math.abs(row.value) : row.value)
              }
              {row.color && !row.isPct && row.value < 0 && ' loss'}
            </span>
          </div>
        ))}

        {/* Visual bar */}
        <div className="mt-4 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Invested</span>
            <span>Current Value</span>
          </div>
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            {currentValue > 0 && invested > 0 && (
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-all",
                  unrealizedGain >= 0 ? 'bg-positive/70' : 'bg-negative/70'
                )}
                style={{ width: `${Math.min((currentValue / Math.max(invested, currentValue)) * 100, 100)}%` }}
              />
            )}
            <div
              className="absolute inset-y-0 left-0 border-r-2 border-foreground/50"
              style={{ width: `${Math.min((invested / Math.max(invested, currentValue)) * 100, 100)}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
