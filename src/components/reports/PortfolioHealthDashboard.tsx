import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { PortfolioOverview } from '@/types/assets';
import type { PortfolioSummary } from '@/lib/calculations';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, PiggyBank, BarChart3, Droplets, Shield, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/assets';

interface PortfolioHealthDashboardProps {
  overview: PortfolioOverview;
  preciousMetalsSummary: PortfolioSummary | null;
  assets: Asset[];
}

const DONUT_COLORS = [
  'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(43, 74%, 49%)',
  'hsl(280, 65%, 60%)', 'hsl(350, 89%, 60%)', 'hsl(25, 95%, 53%)',
  'hsl(190, 80%, 45%)', 'hsl(330, 70%, 55%)',
];

function formatAED(v: number) {
  return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function getPerformanceStatus(returnPct: number) {
  if (returnPct >= 12) return { label: 'Strong', color: 'bg-positive text-positive-foreground', icon: TrendingUp };
  if (returnPct >= 6) return { label: 'Moderate', color: 'bg-warning text-warning-foreground', icon: Activity };
  return { label: 'Needs Review', color: 'bg-negative text-negative-foreground', icon: ArrowDownRight };
}

function classifyLiquidity(assets: Asset[]) {
  let liquid = 0, semiLiquid = 0, illiquid = 0;
  for (const a of assets) {
    const val = Number(a.current_value) || Number(a.total_cost) || 0;
    const cat = a.category_code || a.asset_type;
    if (['precious_metals', 'shares', 'mutual_fund'].includes(cat)) {
      liquid += val;
    } else if (['fixed_deposit', 'sip'].includes(cat)) {
      semiLiquid += val;
    } else {
      illiquid += val;
    }
  }
  return { liquid, semiLiquid, illiquid };
}

export function PortfolioHealthDashboard({ overview, preciousMetalsSummary, assets }: PortfolioHealthDashboardProps) {
  const totalPL = overview.total_profit_loss;
  const totalPLPct = overview.total_profit_loss_percent;
  const isProfit = totalPL >= 0;
  const status = getPerformanceStatus(totalPLPct);
  const StatusIcon = status.icon;
  const realizedPL = preciousMetalsSummary?.total_realized_pl_aed ?? 0;
  const liquidity = classifyLiquidity(assets);
  const liquidityTotal = liquidity.liquid + liquidity.semiLiquid + liquidity.illiquid;

  const donutData = overview.assets_by_type
    .filter(a => a.current_value > 0)
    .map((a, i) => ({
      name: a.label,
      value: a.current_value,
      color: a.color || DONUT_COLORS[i % DONUT_COLORS.length],
    }));

  // Add MF/SIP to donut
  if (overview.mf_summary && overview.mf_summary.current_value_aed > 0) {
    donutData.push({ name: 'Mutual Funds', value: overview.mf_summary.current_value_aed, color: 'hsl(350, 89%, 60%)' });
  }
  if (overview.sip_summary && overview.sip_summary.current_value_aed > 0) {
    donutData.push({ name: 'SIP', value: overview.sip_summary.current_value_aed, color: 'hsl(280, 65%, 60%)' });
  }

  const liquidityData = [
    { name: 'Liquid', value: liquidity.liquid, color: 'hsl(142, 71%, 45%)' },
    { name: 'Semi-Liquid', value: liquidity.semiLiquid, color: 'hsl(38, 92%, 50%)' },
    { name: 'Illiquid', value: liquidity.illiquid, color: 'hsl(350, 89%, 60%)' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Wallet className="h-4 w-4" /> Net Worth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatAED(overview.total_current_value)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatAED(overview.total_invested)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Unrealized P&L
              {isProfit ? <ArrowUpRight className="h-4 w-4 text-positive" /> : <ArrowDownRight className="h-4 w-4 text-negative" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", isProfit ? "text-positive" : "text-negative")}>
              {isProfit ? '+' : ''}{formatAED(totalPL)}
              <span className="text-sm ml-1">({totalPLPct >= 0 ? '+' : ''}{totalPLPct.toFixed(1)}%)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <PiggyBank className="h-4 w-4" /> Realized Gains
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", realizedPL >= 0 ? "text-positive" : "text-negative")}>
              {realizedPL >= 0 ? '+' : ''}{formatAED(realizedPL)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <StatusIcon className="h-4 w-4" /> Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={status.color}>{status.label}</Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {totalPLPct >= 12 ? '>12%' : totalPLPct >= 6 ? '6-12%' : '<6%'} return
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Allocation Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent>
            {donutData.length > 0 ? (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                        {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatAED(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="truncate text-muted-foreground">{d.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">No assets yet</p>
            )}
          </CardContent>
        </Card>

        {/* Liquidity Split */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-primary" /> Liquidity Split
            </CardTitle>
          </CardHeader>
          <CardContent>
            {liquidityTotal > 0 ? (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={liquidityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                        {liquidityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatAED(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {liquidityData.map(d => {
                    const pct = ((d.value / liquidityTotal) * 100).toFixed(1);
                    return (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                          <span className="text-sm">{d.name}</span>
                        </div>
                        <span className="text-sm font-medium">{formatAED(d.value)} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">No assets yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
