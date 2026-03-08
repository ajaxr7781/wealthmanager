import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { PortfolioSnapshot } from '@/hooks/usePortfolioSnapshots';

interface Props {
  snapshots: PortfolioSnapshot[];
}

export function NetWorthTrendChart({ snapshots }: Props) {
  const chartConfig = {
    net_worth: { label: 'Net Worth', color: 'hsl(var(--primary))' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Net Worth Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-56 sm:h-72 w-full">
          <AreaChart data={snapshots} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="snapshot_date" tickFormatter={(v) => format(parseISO(v), 'dd MMM')} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.snapshot_date ? format(parseISO(payload[0].payload.snapshot_date), 'dd MMM yyyy') : ''} />} />
            <Area type="monotone" dataKey="net_worth" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#nwGrad)" name="Net Worth" />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
