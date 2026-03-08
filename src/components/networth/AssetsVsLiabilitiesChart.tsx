import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { PortfolioSnapshot } from '@/hooks/usePortfolioSnapshots';

interface Props {
  snapshots: PortfolioSnapshot[];
}

export function AssetsVsLiabilitiesChart({ snapshots }: Props) {
  const chartConfig = {
    total_value: { label: 'Total Assets', color: 'hsl(142, 71%, 45%)' },
    total_invested: { label: 'Total Invested', color: 'hsl(217, 91%, 60%)' },
    total_liabilities: { label: 'Liabilities', color: 'hsl(0, 84%, 60%)' },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assets vs Invested vs Liabilities</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-72 w-full">
          <LineChart data={snapshots} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="snapshot_date" tickFormatter={(v) => format(parseISO(v), 'dd MMM')} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.snapshot_date ? format(parseISO(payload[0].payload.snapshot_date), 'dd MMM yyyy') : ''} />} />
            <Legend />
            <Line type="monotone" dataKey="total_value" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="Total Assets" />
            <Line type="monotone" dataKey="total_invested" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} name="Total Invested" />
            <Line type="monotone" dataKey="total_liabilities" stroke="hsl(0, 84%, 60%)" strokeWidth={2} dot={false} name="Liabilities" />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
