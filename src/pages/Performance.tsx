import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAssets, useUserSettings, usePortfolioOverview } from '@/hooks/useAssets';
import { usePortfolioSnapshots } from '@/hooks/usePortfolioSnapshots';
import { DEFAULT_INR_TO_AED } from '@/types/assets';
import {
  TrendingUp, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight,
  HelpCircle, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts';
import { format, subMonths, differenceInDays, parseISO } from 'date-fns';

type PeriodFilter = '3M' | '6M' | '1Y' | 'ALL';

export default function PerformancePage() {
  const [period, setPeriod] = useState<PeriodFilter>('1Y');
  const { data: assets = [] } = useAssets();
  const { data: settings } = useUserSettings();
  const { data: overview } = usePortfolioOverview();
  const { data: snapshots = [] } = usePortfolioSnapshots(period === 'ALL' ? 'ALL' : period as any);
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  // Calculate CAGR per asset
  const assetPerformance = useMemo(() => {
    return assets.map(asset => {
      const invested = Number(asset.total_cost) || 0;
      const current = Number(asset.current_value) || invested;
      let investedAed = invested;
      let currentAed = current;
      if (asset.currency === 'INR') {
        investedAed = invested * inrToAed;
        currentAed = current * inrToAed;
      }
      const gain = currentAed - investedAed;
      const gainPct = investedAed > 0 ? (gain / investedAed) * 100 : 0;
      
      // CAGR
      const days = differenceInDays(new Date(), parseISO(asset.purchase_date));
      const years = days / 365.25;
      let cagr = 0;
      if (years > 0 && investedAed > 0 && currentAed > 0) {
        cagr = (Math.pow(currentAed / investedAed, 1 / years) - 1) * 100;
      }

      return {
        id: asset.id,
        name: asset.asset_name,
        category: asset.category_code || asset.asset_type,
        invested: investedAed,
        current: currentAed,
        gain,
        gainPct,
        cagr,
        days,
      };
    }).filter(a => a.invested > 0);
  }, [assets, inrToAed]);

  const sorted = [...assetPerformance].sort((a, b) => b.gainPct - a.gainPct);
  const topGainers = sorted.slice(0, 5);
  const topLosers = [...sorted].reverse().slice(0, 5);

  // Category heatmap data
  const categoryHeatmap = useMemo(() => {
    const byCategory = new Map<string, { invested: number; current: number; gain: number }>();
    for (const a of assetPerformance) {
      const cat = a.category || 'other';
      const existing = byCategory.get(cat) || { invested: 0, current: 0, gain: 0 };
      byCategory.set(cat, {
        invested: existing.invested + a.invested,
        current: existing.current + a.current,
        gain: existing.gain + a.gain,
      });
    }
    return Array.from(byCategory.entries()).map(([cat, data]) => ({
      category: cat,
      gain: data.gain,
      gainPct: data.invested > 0 ? (data.gain / data.invested) * 100 : 0,
    })).sort((a, b) => b.gainPct - a.gainPct);
  }, [assetPerformance]);

  // Rolling returns from snapshots
  const rollingReturns = useMemo(() => {
    if (snapshots.length < 2) return [];
    const periods = [
      { label: '1M', months: 1 },
      { label: '3M', months: 3 },
      { label: '6M', months: 6 },
      { label: '1Y', months: 12 },
    ];
    const latest = snapshots[snapshots.length - 1];
    return periods.map(p => {
      const cutoff = subMonths(new Date(), p.months);
      const pastSnapshot = snapshots.find(s => new Date(s.snapshot_date) >= cutoff);
      if (!pastSnapshot) return { period: p.label, returnPct: null };
      const pastVal = Number(pastSnapshot.net_worth);
      const currentVal = Number(latest.net_worth);
      if (pastVal <= 0) return { period: p.label, returnPct: null };
      return {
        period: p.label,
        returnPct: ((currentVal - pastVal) / pastVal) * 100,
      };
    });
  }, [snapshots]);

  // Max drawdown
  const { maxDrawdown, recoveryDays } = useMemo(() => {
    if (snapshots.length < 2) return { maxDrawdown: 0, recoveryDays: null };
    let peak = 0;
    let maxDd = 0;
    let peakDate = '';
    let troughDate = '';
    let recoveredDate = '';
    
    for (const s of snapshots) {
      const nw = Number(s.net_worth);
      if (nw > peak) {
        peak = nw;
        peakDate = s.snapshot_date;
      }
      const dd = peak > 0 ? ((peak - nw) / peak) * 100 : 0;
      if (dd > maxDd) {
        maxDd = dd;
        troughDate = s.snapshot_date;
      }
    }

    let recDays: number | null = null;
    if (troughDate && peakDate) {
      const afterTrough = snapshots.filter(s => s.snapshot_date > troughDate);
      const recovered = afterTrough.find(s => Number(s.net_worth) >= peak);
      if (recovered) {
        recDays = differenceInDays(parseISO(recovered.snapshot_date), parseISO(troughDate));
      }
    }

    return { maxDrawdown: maxDd, recoveryDays: recDays };
  }, [snapshots]);

  // Contribution vs Market return
  const contributionSplit = useMemo(() => {
    if (snapshots.length < 2) return null;
    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const totalChange = Number(last.net_worth) - Number(first.net_worth);
    const investedChange = Number(last.total_invested) - Number(first.total_invested);
    const marketReturn = totalChange - investedChange;
    return { contributions: investedChange, marketReturn, total: totalChange };
  }, [snapshots]);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" />
              Pro Performance
            </h1>
            <p className="text-muted-foreground">Deep portfolio analytics & insights</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3M">3 Months</SelectItem>
              <SelectItem value="6M">6 Months</SelectItem>
              <SelectItem value="1Y">1 Year</SelectItem>
              <SelectItem value="ALL">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rolling Returns & Drawdown Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {rollingReturns.map(r => (
            <Card key={r.period}>
              <CardContent className="pt-6">
                <p className="text-xs text-muted-foreground mb-1">{r.period} Return</p>
                {r.returnPct !== null ? (
                  <p className={cn("text-2xl font-bold", r.returnPct >= 0 ? "text-positive" : "text-destructive")}>
                    {r.returnPct >= 0 ? '+' : ''}{r.returnPct.toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-lg text-muted-foreground">N/A</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Drawdown + Contribution */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Max Drawdown
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">Maximum peak-to-trough decline in portfolio value during the selected period.</TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-3xl font-bold", maxDrawdown > 0 ? "text-destructive" : "text-positive")}>
                -{maxDrawdown.toFixed(1)}%
              </p>
              {recoveryDays !== null ? (
                <p className="text-sm text-muted-foreground mt-1">Recovered in {recoveryDays} days</p>
              ) : maxDrawdown > 0 ? (
                <p className="text-sm text-muted-foreground mt-1">Not yet recovered</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Contribution vs Market Return
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-3.5 w-3.5 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-[250px]">Split between new money invested vs. investment gains/losses.</TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contributionSplit ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">New Contributions</span>
                    <span className="font-medium text-foreground">AED {contributionSplit.contributions.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Market Return</span>
                    <span className={cn("font-medium", contributionSplit.marketReturn >= 0 ? "text-positive" : "text-destructive")}>
                      AED {contributionSplit.marketReturn.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {/* Visual bar */}
                  {contributionSplit.total !== 0 && (
                    <div className="flex h-3 rounded-full overflow-hidden bg-muted mt-2">
                      <div
                        className="bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, (contributionSplit.contributions / Math.abs(contributionSplit.total)) * 100))}%` }}
                      />
                      <div
                        className={cn(contributionSplit.marketReturn >= 0 ? "bg-positive" : "bg-destructive")}
                        style={{ width: `${Math.max(0, Math.min(100, (Math.abs(contributionSplit.marketReturn) / Math.abs(contributionSplit.total)) * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Need snapshot history to calculate</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="gainers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="gainers" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Top Gainers</TabsTrigger>
            <TabsTrigger value="losers" className="gap-1.5"><TrendingDown className="h-3.5 w-3.5" /> Top Losers</TabsTrigger>
            <TabsTrigger value="heatmap" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Category Heatmap</TabsTrigger>
          </TabsList>

          <TabsContent value="gainers" className="space-y-2">
            {topGainers.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No assets to analyze</CardContent></Card>
            ) : (
              topGainers.map((a, i) => (
                <Card key={a.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                        <div>
                          <p className="font-medium text-sm text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.category} • CAGR: {a.cagr.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-positive">
                          <ArrowUpRight className="h-4 w-4" />
                          <span className="font-bold">{a.gainPct.toFixed(1)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">AED {a.gain.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="losers" className="space-y-2">
            {topLosers.filter(a => a.gainPct < 0).length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">No losing assets 🎉</CardContent></Card>
            ) : (
              topLosers.filter(a => a.gainPct < 0).map((a, i) => (
                <Card key={a.id}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                        <div>
                          <p className="font-medium text-sm text-foreground">{a.name}</p>
                          <p className="text-xs text-muted-foreground">{a.category} • CAGR: {a.cagr.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-destructive">
                          <ArrowDownRight className="h-4 w-4" />
                          <span className="font-bold">{a.gainPct.toFixed(1)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">AED {a.gain.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="heatmap">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Category Performance Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryHeatmap.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={categoryHeatmap} layout="vertical" margin={{ left: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tickFormatter={(v) => `${v.toFixed(0)}%`} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={75} />
                      <RTooltip
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Return']}
                      />
                      <Bar dataKey="gainPct" radius={[0, 4, 4, 0]}>
                        {categoryHeatmap.map((entry, i) => (
                          <Cell key={i} fill={entry.gainPct >= 0 ? 'hsl(var(--positive))' : 'hsl(var(--destructive))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-8">No data available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Net Worth Trend (from snapshots) */}
        {snapshots.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Net Worth Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={snapshots.map(s => ({
                  date: format(parseISO(s.snapshot_date), 'MMM dd'),
                  netWorth: Number(s.net_worth),
                  invested: Number(s.total_invested),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                  <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                  <Legend />
                  <Line type="monotone" dataKey="netWorth" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Net Worth" />
                  <Line type="monotone" dataKey="invested" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="5 5" dot={false} name="Invested" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
