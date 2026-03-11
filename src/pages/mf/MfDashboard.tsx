import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssets } from '@/hooks/useAssets';
import { RecordSwitchDialog } from '@/components/mf/RecordSwitchDialog';
import { useRefreshMfNav } from '@/hooks/useMfNav';
import { useLatestSyncStatus } from '@/hooks/useSyncJobs';
import { cn } from '@/lib/utils';
import {
  TrendingUp, TrendingDown, RefreshCw, Briefcase, BarChart3,
  Calendar, ArrowRight, Wallet, PieChart, Eye, Activity,
} from 'lucide-react';
import {
  PieChart as RePie, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const CHART_COLORS = [
  'hsl(217, 91%, 60%)', 'hsl(142, 71%, 45%)', 'hsl(25, 95%, 53%)',
  'hsl(262, 83%, 65%)', 'hsl(172, 66%, 50%)', 'hsl(45, 93%, 58%)',
  'hsl(339, 90%, 60%)', 'hsl(199, 89%, 48%)',
];

const fmtINR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 4 }).format(v);

interface HoldingCalc {
  id: string;
  name: string;
  invested: number;
  value: number;
  gain: number;
  gainPct: number;
  units: number;
  nav: number;
  fundHouse: string;
  category: string;
  type: 'mutual_fund' | 'sip';
}

export default function MfDashboard() {
  const { data: allAssets, isLoading } = useAssets();
  const refreshNav = useRefreshMfNav();
  const { data: navSyncStatus } = useLatestSyncStatus('update-mf-nav');

  const { holdings, sips, summary, allocationByFundHouse, allocationByCategory, topGainers, topLosers } = useMemo(() => {
    const mfAssets = allAssets?.filter(a => a.asset_type === 'mutual_fund' || a.asset_type === 'sip') || [];

    const calcList: HoldingCalc[] = mfAssets.map(a => {
      const invested = Number(a.total_cost) || 0;
      const navPrice = Number(a.nav_or_price) || 0;
      const units = Number(a.units_held) || 0;
      const value = Number(a.current_value) || (navPrice && units ? navPrice * units : invested);
      const gain = value - invested;
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
      // Extract fund house from asset name heuristic
      const nameParts = (a.asset_name || '').split(' - ');
      const fundHouse = nameParts.length > 1 ? nameParts[0].trim() : 'Other';
      return {
        id: a.id,
        name: a.asset_name,
        invested,
        value,
        gain,
        gainPct,
        units: Number(a.units_held) || 0,
        nav: Number(a.nav_or_price) || 0,
        fundHouse,
        category: a.category_code || 'equity',
        type: a.asset_type as 'mutual_fund' | 'sip',
      };
    });

    const holdingsList = calcList.filter(h => h.type === 'mutual_fund');
    const sipsList = calcList.filter(h => h.type === 'sip');
    const sipAssets = allAssets?.filter(a => a.asset_type === 'sip') || [];

    const totalInvested = calcList.reduce((s, h) => s + h.invested, 0);
    const totalValue = calcList.reduce((s, h) => s + h.value, 0);
    const totalGain = totalValue - totalInvested;
    const returnPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
    const activeSchemes = holdingsList.length;
    const activeSipCount = sipAssets.filter(s => s.sip_status === 'ACTIVE').length;
    const monthlyCommitment = sipAssets
      .filter(s => s.sip_status === 'ACTIVE')
      .reduce((s, a) => s + (Number(a.sip_amount) || 0), 0);

    // Top gainer/loser
    const sorted = [...calcList].sort((a, b) => b.gainPct - a.gainPct);
    const topGainer = sorted[0] || null;
    const worstPerformer = sorted[sorted.length - 1] || null;

    // Allocation by fund house
    const fhMap = new Map<string, number>();
    calcList.forEach(h => fhMap.set(h.fundHouse, (fhMap.get(h.fundHouse) || 0) + h.value));
    const byFH = Array.from(fhMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Allocation by category
    const CATEGORY_LABELS: Record<string, string> = {
      equity: 'Equity', debt: 'Debt', hybrid: 'Hybrid', gold_funds: 'Gold',
      international: 'International', elss: 'ELSS', index: 'Index',
      liquid: 'Liquid', government_savings: 'Govt Savings',
    };
    const catMap = new Map<string, number>();
    calcList.forEach(h => {
      const label = CATEGORY_LABELS[h.category] || h.category || 'Other';
      catMap.set(label, (catMap.get(label) || 0) + h.value);
    });
    const byCat = Array.from(catMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Top 5 gainers and losers
    const gainers = sorted.filter(h => h.gain > 0).slice(0, 5);
    const losers = sorted.filter(h => h.gain < 0).slice(-5).reverse();

    return {
      holdings: holdingsList,
      sips: sipsList,
      summary: {
        totalInvested, totalValue, totalGain, returnPct,
        activeSchemes, activeSipCount, monthlyCommitment,
        topGainer, worstPerformer,
      },
      allocationByFundHouse: byFH,
      allocationByCategory: byCat,
      topGainers: gainers,
      topLosers: losers,
    };
  }, [allAssets]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const allMfAssets = [...holdings, ...sips];
  const isEmpty = allMfAssets.length === 0;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              Mutual Funds
            </h1>
            <p className="text-muted-foreground">
              {summary.activeSchemes} holding{summary.activeSchemes !== 1 ? 's' : ''} · {summary.activeSipCount} active SIP{summary.activeSipCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {navSyncStatus && (
              <span className="text-xs text-muted-foreground">
                NAV updated {formatDistanceToNow(new Date(navSyncStatus.started_at), { addSuffix: true })}
              </span>
            )}
            {allMfAssets.length >= 2 && (
              <RecordSwitchDialog mfAssets={allAssets?.filter(a => a.asset_type === 'mutual_fund' || a.asset_type === 'sip') || []} />
            )}
            <Button variant="outline" size="sm" onClick={() => refreshNav.mutate(undefined)} disabled={refreshNav.isPending}>
              <RefreshCw className={cn("h-4 w-4 mr-1", refreshNav.isPending && 'animate-spin')} />
              Refresh NAVs
            </Button>
          </div>
        </div>

        {isEmpty ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Mutual Fund Holdings</h3>
              <p className="text-muted-foreground mb-6">Start by adding your first mutual fund or SIP.</p>
              <div className="flex justify-center gap-3">
                <Button asChild><Link to="/assets/new">Add Holding</Link></Button>
                <Button variant="outline" asChild><Link to="/assets/new">Start SIP</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Invested"
                value={fmtINR(summary.totalInvested)}
                icon={<Wallet className="h-5 w-5 text-primary" />}
              />
              <SummaryCard
                label="Current Value"
                value={fmtINR(summary.totalValue)}
                icon={<BarChart3 className="h-5 w-5 text-primary" />}
              />
              <SummaryCard
                label="Gain / Loss"
                value={fmtINR(Math.abs(summary.totalGain))}
                valueClass={summary.totalGain >= 0 ? 'text-positive' : 'text-negative'}
                prefix={summary.totalGain >= 0 ? '+' : '-'}
                suffix={` (${summary.returnPct >= 0 ? '+' : ''}${summary.returnPct.toFixed(4)}%)`}
                icon={summary.totalGain >= 0 
                  ? <TrendingUp className="h-5 w-5 text-positive" /> 
                  : <TrendingDown className="h-5 w-5 text-negative" />
                }
              />
              <SummaryCard
                label="Monthly SIP"
                value={fmtINR(summary.monthlyCommitment)}
                icon={<Calendar className="h-5 w-5 text-primary" />}
                suffix={` · ${summary.activeSipCount} SIPs`}
              />
            </div>

            {/* Top & Worst */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.topGainer && (
                <Card>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-positive/10 flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-positive" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Top Gainer</p>
                        <p className="font-medium text-sm line-clamp-1">{summary.topGainer.name}</p>
                      </div>
                    </div>
                    <span className="text-positive font-bold">
                      +{summary.topGainer.gainPct.toFixed(1)}%
                    </span>
                  </CardContent>
                </Card>
              )}
              {summary.worstPerformer && summary.worstPerformer.gain < 0 && (
                <Card>
                  <CardContent className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-negative/10 flex items-center justify-center">
                        <TrendingDown className="h-5 w-5 text-negative" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Worst Performer</p>
                        <p className="font-medium text-sm line-clamp-1">{summary.worstPerformer.name}</p>
                      </div>
                    </div>
                    <span className="text-negative font-bold">
                      {summary.worstPerformer.gainPct.toFixed(1)}%
                    </span>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Allocation Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* By Fund House */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-primary" />
                    By Fund House
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allocationByFundHouse.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePie>
                            <Pie
                              data={allocationByFundHouse}
                              dataKey="value"
                              nameKey="name"
                              cx="50%" cy="50%"
                              innerRadius={40} outerRadius={70}
                              paddingAngle={2}
                            >
                              {allocationByFundHouse.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <ReTooltip formatter={(v: number) => fmtINR(v)} />
                          </RePie>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1.5 text-sm">
                        {allocationByFundHouse.map((item, i) => {
                          const total = allocationByFundHouse.reduce((s, x) => s + x.value, 0);
                          const pct = total > 0 ? (item.value / total * 100).toFixed(1) : '0';
                          return (
                            <div key={item.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                                <span className="text-muted-foreground line-clamp-1">{item.name}</span>
                              </div>
                              <span className="font-medium">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              {/* By Category */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    By Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {allocationByCategory.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={allocationByCategory} layout="vertical" margin={{ left: 0, right: 16 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                          <ReTooltip formatter={(v: number) => fmtINR(v)} />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {allocationByCategory.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Gainers & Losers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceList title="Top Gainers" items={topGainers} positive />
              <PerformanceList title="Top Losers" items={topLosers} positive={false} />
            </div>

            {/* SIP Summary */}
            {sips.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      SIP Summary
                    </CardTitle>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/mf/sips" className="text-xs">
                        View All <ArrowRight className="h-3 w-3 ml-1" />
                      </Link>
                    </Button>
                  </div>
                  <CardDescription>
                    {summary.activeSipCount} active · {fmtINR(summary.monthlyCommitment)}/month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sips.slice(0, 5).map(sip => {
                      const sipAsset = allAssets?.find(a => a.id === sip.id);
                      const status = sipAsset?.sip_status || 'ACTIVE';
                      return (
                        <div key={sip.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{sip.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {sipAsset?.sip_amount && <span>{fmtINR(Number(sipAsset.sip_amount))}/mo</span>}
                              <Badge variant={status === 'ACTIVE' ? 'default' : 'secondary'} className={cn("text-[10px] px-1.5 py-0", status === 'ACTIVE' && 'bg-positive/20 text-positive')}>
                                {status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{fmtINR(sip.value)}</p>
                            <p className={cn("text-xs", sip.gain >= 0 ? 'text-positive' : 'text-negative')}>
                              {sip.gain >= 0 ? '+' : ''}{sip.gainPct.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickLink to="/mf/holdings" icon={<Eye className="h-4 w-4" />} label="All Holdings" />
              <QuickLink to="/mf/sips" icon={<Calendar className="h-4 w-4" />} label="SIP Management" />
              <QuickLink to="/transactions" icon={<Activity className="h-4 w-4" />} label="Transactions" />
              <QuickLink to="/settings/data-management" icon={<RefreshCw className="h-4 w-4" />} label="Data Sync" />
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function SummaryCard({ label, value, icon, valueClass, prefix, suffix }: {
  label: string; value: string; icon: React.ReactNode;
  valueClass?: string; prefix?: string; suffix?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">{label}</span>
          {icon}
        </div>
        <p className={cn("text-xl lg:text-2xl font-bold", valueClass)}>
          {prefix}{value}
        </p>
        {suffix && <p className={cn("text-xs mt-0.5", valueClass || 'text-muted-foreground')}>{suffix}</p>}
      </CardContent>
    </Card>
  );
}

function PerformanceList({ title, items, positive }: { title: string; items: HoldingCalc[]; positive: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {positive ? <TrendingUp className="h-4 w-4 text-positive" /> : <TrendingDown className="h-4 w-4 text-negative" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-2">
            {items.map((item, i) => (
              <Link key={item.id} to={`/asset/${item.id}`} className="flex items-center justify-between py-1.5 hover:bg-accent/50 rounded px-2 -mx-2 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-sm line-clamp-1">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{fmtINR(item.value)}</span>
                  <Badge variant="outline" className={cn("text-xs min-w-[60px] justify-center", positive ? 'text-positive border-positive/30' : 'text-negative border-negative/30')}>
                    {item.gainPct >= 0 ? '+' : ''}{item.gainPct.toFixed(1)}%
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            {positive ? 'No gains yet' : 'No losses — great!'}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Button variant="outline" asChild className="h-auto py-3 flex flex-col items-center gap-1.5">
      <Link to={to}>
        {icon}
        <span className="text-xs">{label}</span>
      </Link>
    </Button>
  );
}
