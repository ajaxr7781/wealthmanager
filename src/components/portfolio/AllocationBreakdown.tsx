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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AllocationBreakdownProps {
  overview: PortfolioOverview;
}

const ASSET_COLORS: Record<string, string> = {
  precious_metals: 'hsl(43, 74%, 49%)', // Gold
  real_estate: 'hsl(142, 71%, 45%)', // Green
  fixed_deposit: 'hsl(217, 91%, 60%)', // Blue
  sip: 'hsl(280, 65%, 60%)', // Purple
  mutual_fund: 'hsl(350, 89%, 60%)', // Red
  shares: 'hsl(25, 95%, 53%)', // Orange
};

const ASSET_ICONS: Record<string, typeof Coins> = {
  precious_metals: Coins,
  real_estate: Building2,
  fixed_deposit: Landmark,
  sip: TrendingUp,
  mutual_fund: PieChartIcon,
  shares: BarChart3,
};

export function AllocationBreakdown({ overview }: AllocationBreakdownProps) {
  // Build data from assets_by_type
  const assetData = overview.assets_by_type.map((asset) => ({
    name: asset.label,
    value: asset.current_value,
    color: ASSET_COLORS[asset.type] || 'hsl(var(--muted))',
    type: asset.type,
    invested: asset.total_invested,
    profit_loss: asset.profit_loss,
    count: asset.count,
  }));

  // Add Mutual Funds if present
  if (overview.mf_summary && overview.mf_summary.holdings_count > 0) {
    const mfProfitLoss = overview.mf_summary.current_value_aed - overview.mf_summary.total_invested_aed;
    assetData.push({
      name: 'Mutual Funds',
      value: overview.mf_summary.current_value_aed,
      color: ASSET_COLORS['mutual_fund'],
      type: 'mutual_fund',
      invested: overview.mf_summary.total_invested_aed,
      profit_loss: mfProfitLoss,
      count: overview.mf_summary.holdings_count,
    });
  }

  // Add SIPs if present with current value
  if (overview.sip_summary && (overview.sip_summary.current_value_aed > 0 || overview.sip_summary.invested_aed > 0)) {
    const sipProfitLoss = overview.sip_summary.current_value_aed - overview.sip_summary.invested_aed;
    assetData.push({
      name: 'SIP',
      value: overview.sip_summary.current_value_aed,
      color: ASSET_COLORS['sip'],
      type: 'sip',
      invested: overview.sip_summary.invested_aed,
      profit_loss: sipProfitLoss,
      count: overview.sip_summary.total_count,
    });
  }

  const data = assetData.filter(d => d.value > 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
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

        {/* Detailed breakdown */}
        <div className="mt-6 space-y-3">
          {data.map((item) => {
            const Icon = ASSET_ICONS[item.type] || Coins;
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
                  <p className="font-medium text-sm">{formatCurrency(item.value)}</p>
                  <p className={cn(
                    "text-xs",
                    isProfit ? "text-positive" : "text-negative"
                  )}>
                    {isProfit ? '+' : ''}{formatCurrency(item.profit_loss)}
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
