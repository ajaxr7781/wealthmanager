import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDefaultPortfolio } from '@/hooks/usePortfolios';
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { useAssets, usePortfolioOverview, useUserSettings } from '@/hooks/useAssets';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';
import { useActiveMfHoldings } from '@/hooks/useMfHoldings';
import { useActiveMfSips } from '@/hooks/useMfSips';
import { DEFAULT_INR_TO_AED } from '@/types/assets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Circle, Info, Plus, ChevronRight, Package, LineChart, Calendar } from 'lucide-react';
import { formatOz, formatGrams, formatCurrency, formatPercent, formatPL } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getColorClass } from '@/types/assetConfig';
import {
  Landmark,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  Briefcase,
  BarChart3,
  PieChart,
} from 'lucide-react';

const IconMap: Record<string, typeof Coins> = {
  Coins,
  Landmark,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  Briefcase,
  BarChart3,
  PieChart,
  Package,
  LineChart,
  Calendar,
};

export default function Holdings() {
  const { data: portfolio, isLoading: portfolioLoading } = useDefaultPortfolio();
  const { data: metalsSummary, isLoading: metalsLoading } = usePortfolioSummary(portfolio?.id);
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: overview } = usePortfolioOverview();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesWithTypes();
  const { data: mfHoldings, isLoading: mfLoading } = useActiveMfHoldings();
  const { data: sips, isLoading: sipsLoading } = useActiveMfSips();
  const { data: settings } = useUserSettings();
  
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  const isLoading = portfolioLoading || metalsLoading || assetsLoading || categoriesLoading || mfLoading || sipsLoading;

  // Calculate category summaries with proper currency conversion
  const categorySummaries = categories?.map(category => {
    const categoryAssets = assets?.filter(a => a.category_code === category.code) || [];
    
    // Apply currency conversion for INR assets
    const totalInvested = categoryAssets.reduce((sum, a) => {
      const cost = Number(a.total_cost) || 0;
      return sum + (a.currency === 'INR' ? cost * inrToAed : cost);
    }, 0);
    
    const totalValue = categoryAssets.reduce((sum, a) => {
      const value = Number(a.current_value) || Number(a.total_cost) || 0;
      return sum + (a.currency === 'INR' ? value * inrToAed : value);
    }, 0);
    
    const count = categoryAssets.length;
    
    // For precious metals, also include legacy transaction-based holdings
    if (category.code === 'precious_metals' && metalsSummary) {
      const metalsValue = metalsSummary.current_value_aed ?? metalsSummary.net_cash_invested_aed;
      const metalsInvested = metalsSummary.net_cash_invested_aed;
      const metalsCount = metalsSummary.instruments.filter(i => i.holding_oz > 0).length;
      
      return {
        ...category,
        totalInvested: totalInvested + metalsInvested,
        totalValue: totalValue + metalsValue,
        count: count + metalsCount,
        hasMetalsTransactions: metalsCount > 0,
        metalsSummary,
      };
    }
    
    return {
      ...category,
      totalInvested,
      totalValue,
      count,
      hasMetalsTransactions: false,
      metalsSummary: null,
    };
  }).filter(c => c.count > 0) || [];

  // Calculate MF Holdings summary (INR -> AED)
  const mfSummary = mfHoldings && mfHoldings.length > 0 ? {
    totalInvested: mfHoldings.reduce((sum, h) => sum + (Number(h.invested_amount) * inrToAed), 0),
    totalValue: mfHoldings.reduce((sum, h) => sum + ((Number(h.current_value) || Number(h.invested_amount)) * inrToAed), 0),
    count: mfHoldings.length,
  } : null;

  // Calculate SIPs summary (monthly commitment in INR -> AED)
  const sipSummary = sips && sips.length > 0 ? {
    monthlyCommitment: sips.reduce((sum, s) => sum + (Number(s.sip_amount) * inrToAed), 0),
    count: sips.length,
  } : null;

  // Combine all summaries for sorting
  type CategoryItem = {
    id: string;
    code: string;
    name: string;
    icon: string;
    color: string | null;
    totalValue: number;
    totalInvested: number;
    count: number;
    path: string;
    type: 'category' | 'mf' | 'sip';
    hasMetalsTransactions?: boolean;
    metalsSummary?: typeof metalsSummary;
  };

  const allCategories: CategoryItem[] = [
    ...categorySummaries.map(c => ({
      ...c,
      path: `/holdings/${c.code}`,
      type: 'category' as const,
    })),
    ...(mfSummary ? [{
      id: 'mutual_funds',
      code: 'mutual_funds',
      name: 'Mutual Funds',
      icon: 'LineChart',
      color: 'purple',
      totalValue: mfSummary.totalValue,
      totalInvested: mfSummary.totalInvested,
      count: mfSummary.count,
      path: '/mf/holdings',
      type: 'mf' as const,
    }] : []),
    ...(sipSummary ? [{
      id: 'sips',
      code: 'sips',
      name: 'Active SIPs',
      icon: 'Calendar',
      color: 'blue',
      totalValue: sipSummary.monthlyCommitment,
      totalInvested: sipSummary.monthlyCommitment,
      count: sipSummary.count,
      path: '/mf/sips',
      type: 'sip' as const,
    }] : []),
  ];

  // Sort by value descending, then alphabetically for zero-value
  const sortedCategories = allCategories.sort((a, b) => {
    if (a.totalValue !== b.totalValue) {
      return b.totalValue - a.totalValue;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">All Holdings</h1>
            <p className="text-muted-foreground">Your complete investment portfolio</p>
          </div>
          <Link to="/assets/new">
            <Button className="gold-gradient text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </Link>
        </div>

        {/* Portfolio Summary */}
        {overview && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">AED {overview.total_current_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">AED {overview.total_invested.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total P/L</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "text-2xl font-bold",
                  overview.total_profit_loss >= 0 ? "text-positive" : "text-negative"
                )}>
                  {overview.total_profit_loss >= 0 ? '+' : ''}AED {overview.total_profit_loss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Asset Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{overview.assets_by_type.reduce((sum, a) => sum + a.count, 0)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
          </div>
        ) : sortedCategories.length > 0 ? (
          <div className="space-y-6">
            {/* Category Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedCategories.map((category) => {
                const Icon = IconMap[category.icon || 'Package'] || Package;
                const pl = category.totalValue - category.totalInvested;
                const plPercent = category.totalInvested > 0 ? (pl / category.totalInvested) * 100 : 0;
                const isProfit = pl >= 0;
                const isSip = category.type === 'sip';

                return (
                  <Link key={category.id} to={category.path}>
                    <Card className="shadow-luxury hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center",
                              getColorClass(category.color)
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <CardTitle className="text-base">{category.name}</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {category.count} {isSip ? 'active' : 'holding'}{category.count !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">
                            {isSip ? 'Monthly' : 'Value'}
                          </span>
                          <span className="font-medium">
                            AED {category.totalValue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        {!isSip && (
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">P/L</span>
                            <span className={cn("font-medium", isProfit ? "text-positive" : "text-negative")}>
                              {isProfit ? '+' : ''}{plPercent.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>

            {/* Precious Metals Detail Section (if exists) */}
            {metalsSummary && metalsSummary.instruments.some(i => i.holding_oz > 0) && (
              <Card className="shadow-luxury">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-gold" />
                    Precious Metals Detail
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    {metalsSummary.instruments.filter(i => i.holding_oz > 0).map((inst) => {
                      const pl = formatPL(inst.unrealized_pl_aed);
                      const isGold = inst.symbol === 'XAU';
                      
                      return (
                        <div key={inst.symbol} className="p-4 rounded-lg border space-y-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", isGold ? "gold-gradient" : "bg-silver")}>
                              {isGold ? <Coins className="h-5 w-5 text-white" /> : <Circle className="h-5 w-5 text-white fill-white" />}
                            </div>
                            <span className="font-medium">{inst.name} ({inst.symbol})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <MetricRow label="Holdings (oz)" value={formatOz(inst.holding_oz)} />
                            <MetricRow label="Holdings (g)" value={formatGrams(inst.holding_grams)} />
                            <MetricRow label="Avg Cost (AED/oz)" value={formatCurrency(inst.average_cost_aed_per_oz, false)} />
                            <MetricRow label="Current Value" value={inst.current_value_aed !== null ? formatCurrency(inst.current_value_aed) : 'N/A'} />
                          </div>
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-muted-foreground">Unrealized P/L</span>
                            <span className={cn("font-bold", pl.colorClass)}>
                              {pl.text} {inst.unrealized_pl_pct !== null && `(${formatPercent(inst.unrealized_pl_pct)})`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No holdings yet. Start tracking your investments!</p>
              <Link to="/assets/new">
                <Button className="gold-gradient text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Asset
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function MetricRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tooltip && (
          <Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>
        )}
      </div>
      <p className="font-mono font-medium">{value}</p>
    </div>
  );
}
