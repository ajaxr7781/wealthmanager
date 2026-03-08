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
import { NetWorthSummaryCards } from '@/components/networth/NetWorthSummaryCards';
import { NetWorthTrendChart } from '@/components/networth/NetWorthTrendChart';
import { AssetsVsLiabilitiesChart } from '@/components/networth/AssetsVsLiabilitiesChart';
import { CategoryBreakdownChart } from '@/components/networth/CategoryBreakdownChart';
import { SnapshotHistoryTable } from '@/components/networth/SnapshotHistoryTable';

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
    return {
      current: last.net_worth,
      totalValue: last.total_value,
      totalInvested: last.total_invested,
      totalLiabilities: last.total_liabilities,
      change,
      changePct,
    };
  }, [snapshots]);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
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
            {stats && (
              <NetWorthSummaryCards stats={stats} period={period} fmtCurrency={fmtCurrency} />
            )}
            <NetWorthTrendChart snapshots={snapshots} />
            <AssetsVsLiabilitiesChart snapshots={snapshots} />
            <CategoryBreakdownChart snapshots={snapshots} fmtCurrency={fmtCurrency} />
            <SnapshotHistoryTable snapshots={snapshots} fmtCurrency={fmtCurrency} />
          </>
        )}
      </div>
    </AppLayout>
  );
}
