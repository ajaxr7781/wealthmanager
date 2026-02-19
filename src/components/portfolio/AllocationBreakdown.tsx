import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PortfolioOverview } from '@/types/assets';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { 
  Coins, 
  Building2, 
  Landmark, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  BarChart3,
  Wallet,
  Bitcoin,
  Briefcase,
  MapPin,
  Package,
  LineChart,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';

interface AllocationBreakdownProps {
  overview: PortfolioOverview;
}

const FALLBACK_COLORS = [
  'hsl(43, 74%, 49%)',
  'hsl(142, 71%, 45%)',
  'hsl(217, 91%, 60%)',
  'hsl(280, 65%, 60%)',
  'hsl(350, 89%, 60%)',
  'hsl(25, 95%, 53%)',
  'hsl(190, 80%, 45%)',
  'hsl(330, 70%, 55%)',
  'hsl(60, 70%, 50%)',
  'hsl(160, 60%, 45%)',
];

const IconMap: Record<string, typeof Coins> = {
  Coins,
  Landmark,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  Briefcase,
  BarChart3,
  PieChart: PieChartIcon,
  MapPin,
  Package,
  LineChart,
  Calendar,
};

export function AllocationBreakdown({ overview }: AllocationBreakdownProps) {
  const { formatAed, convertAed } = useCurrency();

  const assetData = overview.assets_by_type.map((asset, index) => ({
    name: asset.label,
    value: asset.current_value,
    displayValue: convertAed(asset.current_value),
    color: asset.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
    type: asset.type,
    icon: asset.icon || null,
    invested: asset.total_invested,
    profit_loss: asset.profit_loss,
    count: asset.count,
  }));

  if (overview.mf_summary && overview.mf_summary.holdings_count > 0) {
    const mfProfitLoss = overview.mf_summary.current_value_aed - overview.mf_summary.total_invested_aed;
    assetData.push({
      name: 'Mutual Funds',
      value: overview.mf_summary.current_value_aed,
      displayValue: convertAed(overview.mf_summary.current_value_aed),
      color: 'hsl(350, 89%, 60%)',
      type: 'mutual_fund',
      icon: 'LineChart',
      invested: overview.mf_summary.total_invested_aed,
      profit_loss: mfProfitLoss,
      count: overview.mf_summary.holdings_count,
    });
  }

  if (overview.sip_summary && (overview.sip_summary.current_value_aed > 0 || overview.sip_summary.invested_aed > 0)) {
    const sipProfitLoss = overview.sip_summary.current_value_aed - overview.sip_summary.invested_aed;
    assetData.push({
      name: 'SIP',
      value: overview.sip_summary.current_value_aed,
      displayValue: convertAed(overview.sip_summary.current_value_aed),
      color: 'hsl(280, 65%, 60%)',
      type: 'sip',
      icon: 'Calendar',
      invested: overview.sip_summary.invested_aed,
      profit_loss: sipProfitLoss,
      count: overview.sip_summary.total_count,
    });
  }

  const data = assetData.filter(d => d.value > 0);

  const fmt = (value: number) => formatAed(value, { decimals: 0 });

  if (data.length === 0) {
    return (
      <Card className="shadow-luxury">
        <CardHeader>
          <CardTitle>Asset Allocation</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          No assets to display
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-luxury">
      <CardHeader>
        <CardTitle>Asset Allocation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="displayValue"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => fmt(value)}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-foreground text-sm">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-6 space-y-3">
          {data.map((item) => {
            const Icon = (item.icon && IconMap[item.icon]) || Coins;
            const isProfit = item.profit_loss >= 0;
            const pct = overview.total_current_value > 0 
              ? (item.value / overview.total_current_value * 100).toFixed(1) 
              : '0';
            
            return (
              <div 
                key={item.type} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: item.color }}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.count} asset{item.count > 1 ? 's' : ''} · {pct}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm">{fmt(item.value)}</p>
                  <p className={cn(
                    "text-xs",
                    isProfit ? "text-positive" : "text-negative"
                  )}>
                    {isProfit ? '+' : ''}{fmt(item.profit_loss)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
