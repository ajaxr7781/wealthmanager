import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { TrendingUp } from 'lucide-react';
import type { Asset } from '@/types/assets';
import type { PortfolioOverview } from '@/types/assets';

interface GrowthTimelineProps {
  assets: Asset[];
  overview: PortfolioOverview;
}

function formatAED(v: number) {
  return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function GrowthTimeline({ assets, overview }: GrowthTimelineProps) {
  // Build yearly growth data from assets' purchase dates
  const yearlyData = useMemo(() => {
    if (!assets?.length) return [];

    // Get unique years from purchase dates
    const yearsSet = new Set<number>();
    for (const a of assets) {
      yearsSet.add(new Date(a.purchase_date).getFullYear());
    }
    yearsSet.add(new Date().getFullYear());

    const sortedYears = Array.from(yearsSet).sort();

    // Compute cumulative invested and approximate current value per year
    return sortedYears.map(year => {
      const assetsUpToYear = assets.filter(a => new Date(a.purchase_date).getFullYear() <= year);
      const invested = assetsUpToYear.reduce((s, a) => s + Number(a.total_cost || 0), 0);
      // For current value, only use latest year's actual current value, rest approximate from cost
      const isCurrentYear = year === new Date().getFullYear();
      const currentValue = isCurrentYear
        ? assetsUpToYear.reduce((s, a) => s + Number(a.current_value || a.total_cost || 0), 0)
        : invested; // Approximate for historical years (actual market value not tracked historically)

      return {
        year: year.toString(),
        invested,
        currentValue: isCurrentYear ? currentValue : undefined,
      };
    });
  }, [assets]);

  // Add MF/SIP to latest year
  const enrichedData = useMemo(() => {
    if (!yearlyData.length) return [];
    const data = [...yearlyData];
    const lastIdx = data.length - 1;
    const last = { ...data[lastIdx] };

    // MF/SIP are now in assets — totals already included in snapshots

    data[lastIdx] = last;
    return data;
  }, [yearlyData, overview]);

  if (enrichedData.length < 2) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Add assets across multiple years to see the growth timeline
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" /> Portfolio Growth Timeline
        </CardTitle>
        <CardDescription>Invested vs Current Value over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={enrichedData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(v: number, name: string) => [formatAED(v), name === 'invested' ? 'Invested' : 'Current Value']}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
              />
              <Legend />
              <Area type="monotone" dataKey="invested" name="Invested" stroke="hsl(217, 91%, 60%)" fill="url(#investedGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="currentValue" name="Current Value" stroke="hsl(142, 71%, 45%)" fill="url(#currentGrad)" strokeWidth={2} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
