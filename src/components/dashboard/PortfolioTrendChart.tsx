import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { formatCurrency } from '@/lib/calculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Area, AreaChart } from 'recharts';

const RANGES = ['1M', '3M', '6M', '1Y', 'ALL'] as const;

export function PortfolioTrendChart() {
  const [range, setRange] = useState<typeof RANGES[number]>('6M');
  const { data: snapshots, isLoading } = usePortfolioSnapshots(range);

  const chartData = useMemo(() => {
    if (!snapshots?.length) return [];
    return snapshots.map(s => ({
      date: new Date(s.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Number(s.total_value),
      invested: Number(s.total_invested),
      netWorth: Number(s.net_worth),
    }));
  }, [snapshots]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Portfolio Trend</CardTitle>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'default' : 'ghost'}
              className="h-7 text-xs px-2"
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>
        ) : !chartData.length ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
            No snapshot data yet. Snapshots are captured daily.
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(220 9% 46%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(220 9% 46%)" tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <RechartsTooltip
                  contentStyle={{ background: 'hsl(0 0% 100%)', border: '1px solid hsl(220 13% 91%)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [formatCurrency(value), '']}
                />
                <Area type="monotone" dataKey="netWorth" stroke="hsl(217 91% 60%)" fill="url(#netWorthGrad)" strokeWidth={2} name="Net Worth" />
                <Line type="monotone" dataKey="invested" stroke="hsl(220 9% 46%)" strokeWidth={1} strokeDasharray="4 4" dot={false} name="Invested" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
