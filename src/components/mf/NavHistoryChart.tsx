import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useNavHistory } from '@/hooks/useNavHistory';
import { format, subMonths, subYears, parseISO } from 'date-fns';
import { TrendingUp } from 'lucide-react';

const PERIODS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: 'All', months: 0 },
] as const;

interface NavHistoryChartProps {
  schemeId: string | null | undefined;
  schemeName?: string;
}

export function NavHistoryChart({ schemeId, schemeName }: NavHistoryChartProps) {
  const { data: navHistory, isLoading } = useNavHistory(schemeId);
  const [period, setPeriod] = useState<number>(12);

  const filteredData = useMemo(() => {
    if (!navHistory?.length) return [];
    if (period === 0) return navHistory;
    const cutoff = subMonths(new Date(), period);
    return navHistory.filter(p => parseISO(p.nav_date) >= cutoff);
  }, [navHistory, period]);

  const chartConfig = {
    nav_value: {
      label: 'NAV',
      color: 'hsl(var(--primary))',
    },
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>NAV Trend</CardTitle></CardHeader>
        <CardContent><Skeleton className="h-64 w-full" /></CardContent>
      </Card>
    );
  }

  if (!navHistory?.length) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> NAV Trend</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No NAV history available for this scheme. NAV data is recorded when you refresh NAVs.
          </p>
        </CardContent>
      </Card>
    );
  }

  const minNav = Math.min(...filteredData.map(d => d.nav_value));
  const maxNav = Math.max(...filteredData.map(d => d.nav_value));
  const padding = (maxNav - minNav) * 0.1 || 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            NAV Trend
          </CardTitle>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Button
                key={p.label}
                variant={period === p.months ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setPeriod(p.months)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart data={filteredData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="navGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="nav_date"
              tickFormatter={(v) => format(parseISO(v), 'dd MMM')}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
            />
            <YAxis
              domain={[minNav - padding, maxNav + padding]}
              tickFormatter={(v) => `₹${v.toFixed(0)}`}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={55}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    if (payload?.[0]?.payload?.nav_date) {
                      return format(parseISO(payload[0].payload.nav_date), 'dd MMM yyyy');
                    }
                    return '';
                  }}
                  formatter={(value) => [`₹${Number(value).toFixed(4)}`, 'NAV']}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="nav_value"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#navGradient)"
            />
          </AreaChart>
        </ChartContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {filteredData.length} data points
          {filteredData.length > 0 && ` · ${format(parseISO(filteredData[0].nav_date), 'dd MMM yyyy')} – ${format(parseISO(filteredData[filteredData.length - 1].nav_date), 'dd MMM yyyy')}`}
        </p>
      </CardContent>
    </Card>
  );
}
