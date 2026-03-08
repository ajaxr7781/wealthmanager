import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { format, parseISO } from 'date-fns';
import type { PortfolioSnapshot } from '@/hooks/usePortfolioSnapshots';

const CATEGORY_COLORS: Record<string, string> = {
  precious_metals: 'hsl(45, 93%, 47%)',
  real_estate: 'hsl(262, 52%, 47%)',
  fixed_deposit: 'hsl(199, 89%, 48%)',
  equity: 'hsl(142, 71%, 45%)',
  mutual_funds: 'hsl(340, 82%, 52%)',
  shares: 'hsl(217, 91%, 60%)',
  debt: 'hsl(25, 95%, 53%)',
  other: 'hsl(220, 9%, 46%)',
};

const CATEGORY_LABELS: Record<string, string> = {
  precious_metals: 'Precious Metals',
  real_estate: 'Real Estate',
  fixed_deposit: 'Fixed Deposits',
  equity: 'Equity',
  mutual_funds: 'Mutual Funds',
  shares: 'Shares',
  debt: 'Debt',
  other: 'Other',
};

interface Props {
  snapshots: PortfolioSnapshot[];
  fmtCurrency: (v: number) => string;
}

export function CategoryBreakdownChart({ snapshots, fmtCurrency }: Props) {
  const { categories, chartData, chartConfig } = useMemo(() => {
    // Collect all categories across all snapshots
    const catSet = new Set<string>();
    for (const s of snapshots) {
      const bj = s.breakdown_json as Record<string, number> | null;
      if (bj) {
        Object.keys(bj).forEach(k => {
          if (k !== 'liabilities') catSet.add(k);
        });
      }
    }
    const categories = [...catSet].sort();

    const chartData = snapshots.map(s => {
      const bj = (s.breakdown_json || {}) as Record<string, number>;
      const row: Record<string, string | number> = {
        snapshot_date: s.snapshot_date,
      };
      for (const cat of categories) {
        row[cat] = bj[cat] || 0;
      }
      return row;
    });

    const chartConfig: Record<string, { label: string; color: string }> = {};
    for (const cat of categories) {
      chartConfig[cat] = {
        label: CATEGORY_LABELS[cat] || cat.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        color: CATEGORY_COLORS[cat] || `hsl(${Math.abs(cat.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 360}, 60%, 50%)`,
      };
    }

    return { categories, chartData, chartConfig };
  }, [snapshots]);

  if (!categories.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Category breakdown data will appear after the next daily snapshot runs.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Breakdown Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              {categories.map(cat => (
                <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartConfig[cat].color} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={chartConfig[cat].color} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis dataKey="snapshot_date" tickFormatter={(v) => format(parseISO(v), 'dd MMM')} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={55} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(_, payload) => payload?.[0]?.payload?.snapshot_date ? format(parseISO(payload[0].payload.snapshot_date), 'dd MMM yyyy') : ''} />} />
            <Legend />
            {categories.map(cat => (
              <Area
                key={cat}
                type="monotone"
                dataKey={cat}
                stackId="1"
                stroke={chartConfig[cat].color}
                fill={`url(#grad-${cat})`}
                strokeWidth={1.5}
                name={chartConfig[cat].label}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
