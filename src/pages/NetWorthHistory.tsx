import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Line, LineChart, Legend, Bar, BarChart } from 'recharts';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { useCurrency } from '@/contexts/CurrencyContext';
import { format, parseISO } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Landmark, PiggyBank, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

const PERIODS = [
  { label: '1M', value: '1M' as const },
  { label: '3M', value: '3M' as const },
  { label: '6M', value: '6M' as const },
  { label: '1Y', value: '1Y' as const },
  { label: 'All', value: 'ALL' as const },
];

export default function NetWorthHistory() {
  const [period, setPeriod] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('ALL');
  const { data: snapshots, isLoading } = usePortfolioSnapshots(period);
  const { format: fmtCurrency } = useCurrency();

  const stats = useMemo(() => {
    if (!snapshots?.length) return null;
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const change = last.net_worth - first.net_worth;
    const changePct = first.net_worth > 0 ? (change / first.net_worth) * 100 : 0;
    const maxNW = Math.max(...snapshots.map(s => s.net_worth));
    const minNW = Math.min(...snapshots.map(s => s.net_worth));
    return {
      current: last.net_worth,
      totalValue: last.total_value,
      totalInvested: last.total_invested,
      totalLiabilities: last.total_liabilities,
      change,
      changePct,
      maxNW,
      minNW,
      dataPoints: snapshots.length,
      firstDate: first.snapshot_date,
      lastDate: last.snapshot_date,
    };
  }, [snapshots]);

  const chartConfig = {
    net_worth: { label: 'Net Worth', color: 'hsl(var(--primary))' },
    total_value: { label: 'Total Assets', color: 'hsl(142, 71%, 45%)' },
    total_invested: { label: 'Total Invested', color: 'hsl(217, 91%, 60%)' },
    total_liabilities: { label: 'Liabilities', color: 'hsl(0, 84%, 60%)' },
  };

  const stackedConfig = {
    total_value: { label: 'Assets', color: 'hsl(142, 71%, 45%)' },
    total_liabilities: { label: 'Liabilities', color: 'hsl(0, 84%, 60%)' },
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Net Worth History</h1>
            <p className="text-muted-foreground text-sm">Track your wealth growth over time</p>
          </div>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Button
                key={p.label}
                variant={period === p.value ? 'default' : 'outline'}
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={() => setPeriod(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-80" />
          </div>
        ) : !snapshots?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <PiggyBank className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No snapshot data yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Portfolio snapshots are captured daily. Check back after a day.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <DollarSign className="h-4 w-4" />
                      Net Worth
                    </div>
                    <p className="text-2xl font-bold">{fmtCurrency(stats.current)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <Landmark className="h-4 w-4" />
                      Total Assets
                    </div>
                    <p className="text-2xl font-bold">{fmtCurrency(stats.totalValue)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <CreditCard className="h-4 w-4" />
                      Liabilities
                    </div>
                    <p className="text-2xl font-bold text-destructive">{fmtCurrency(stats.totalLiabilities)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      {stats.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      Change ({period})
                    </div>
                    <p className={cn("text-2xl font-bold", stats.change >= 0 ? 'text-positive' : 'text-negative')}>
                      {stats.change >= 0 ? '+' : ''}{fmtCurrency(stats.change)}
                    </p>
                    <p className={cn("text-sm", stats.change >= 0 ? 'text-positive' : 'text-negative')}>
                      {stats.changePct >= 0 ? '+' : ''}{stats.changePct.toFixed(2)}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Net Worth Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Net Worth Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <AreaChart data={snapshots} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="snapshot_date"
                      tickFormatter={(v) => format(parseISO(v), 'dd MMM')}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={40}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            if (payload?.[0]?.payload?.snapshot_date) {
                              return format(parseISO(payload[0].payload.snapshot_date), 'dd MMM yyyy');
                            }
                            return '';
                          }}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="net_worth"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#nwGrad)"
                      name="Net Worth"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Assets vs Liabilities */}
            <Card>
              <CardHeader>
                <CardTitle>Assets vs Invested vs Liabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-72 w-full">
                  <LineChart data={snapshots} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                    <XAxis
                      dataKey="snapshot_date"
                      tickFormatter={(v) => format(parseISO(v), 'dd MMM')}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={40}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={55}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            if (payload?.[0]?.payload?.snapshot_date) {
                              return format(parseISO(payload[0].payload.snapshot_date), 'dd MMM yyyy');
                            }
                            return '';
                          }}
                        />
                      }
                    />
                    <Legend />
                    <Line type="monotone" dataKey="total_value" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="Total Assets" />
                    <Line type="monotone" dataKey="total_invested" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} name="Total Invested" />
                    <Line type="monotone" dataKey="total_liabilities" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} name="Liabilities" />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Data table */}
            <Card>
              <CardHeader>
                <CardTitle>Snapshot History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-3 font-medium text-muted-foreground">Date</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Total Assets</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Invested</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Liabilities</th>
                        <th className="text-right py-2 px-3 font-medium text-muted-foreground">Net Worth</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...snapshots].reverse().map((s) => (
                        <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 px-3">{format(parseISO(s.snapshot_date), 'dd MMM yyyy')}</td>
                          <td className="text-right py-2 px-3">{fmtCurrency(s.total_value)}</td>
                          <td className="text-right py-2 px-3">{fmtCurrency(s.total_invested)}</td>
                          <td className="text-right py-2 px-3 text-destructive">{fmtCurrency(s.total_liabilities)}</td>
                          <td className="text-right py-2 px-3 font-medium">{fmtCurrency(s.net_worth)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
