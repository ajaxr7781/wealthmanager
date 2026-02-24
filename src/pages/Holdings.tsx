import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAssets, usePortfolioOverview, useUserSettings } from '@/hooks/useAssets';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';
import { useLatestPrices } from '@/hooks/usePrices';
import { useCurrency } from '@/contexts/CurrencyContext';
import { DEFAULT_INR_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Plus, ChevronRight, Package, LineChart, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getEffectiveFDValue } from '@/lib/fdCalculations';
import { cn } from '@/lib/utils';
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
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: overview } = usePortfolioOverview();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesWithTypes();
  const { data: settings } = useUserSettings();
  const { data: prices } = useLatestPrices();
  const { formatAed } = useCurrency();
  
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;
  const isLoading = assetsLoading || categoriesLoading;

  const getAssetCurrentValue = (a: any): number => {
    if (a.asset_type === 'precious_metals' && a.metal_type) {
      const priceData = a.metal_type === 'XAU' ? prices?.XAU : prices?.XAG;
      if (priceData && a.quantity) {
        const qty = Number(a.quantity);
        const unit = (a.quantity_unit || 'oz').toLowerCase();
        const qtyOz = unit === 'grams' || unit === 'gram' || unit === 'g' ? qty / OUNCE_TO_GRAM : qty;
        return qtyOz * priceData.price_aed_per_oz;
      }
    }
    if (a.asset_type === 'fixed_deposit' || a.asset_type_code === 'fixed_deposit') {
      return getEffectiveFDValue({
        principal: a.principal ? Number(a.principal) : null,
        interest_rate: a.interest_rate ? Number(a.interest_rate) : null,
        purchase_date: a.purchase_date,
        maturity_date: a.maturity_date,
        maturity_amount: a.maturity_amount ? Number(a.maturity_amount) : null,
        current_value: a.current_value ? Number(a.current_value) : null,
        is_current_value_manual: a.is_current_value_manual,
        total_cost: Number(a.total_cost),
      }).currentValue;
    }
    return Number(a.current_value) || Number(a.total_cost) || 0;
  };

  // Calculate category summaries — all asset types (PM, MF, SIP) now come from assets table
  const categorySummaries = categories?.map(category => {
    const categoryAssets = assets?.filter(a => a.category_code === category.code) || [];
    
    const totalInvested = categoryAssets.reduce((sum, a) => {
      const cost = Number(a.total_cost) || 0;
      return sum + (a.currency === 'INR' ? cost * inrToAed : cost);
    }, 0);
    
    const totalValue = categoryAssets.reduce((sum, a) => {
      const value = getAssetCurrentValue(a);
      return sum + (a.currency === 'INR' ? value * inrToAed : value);
    }, 0);
    
    return {
      ...category,
      totalInvested,
      totalValue,
      count: categoryAssets.length,
      path: `/holdings/${category.code}`,
    };
  }).filter(c => c.count > 0) || [];

  // Sort by value descending
  const sortedCategories = [...categorySummaries].sort((a, b) => {
    if (a.totalValue !== b.totalValue) return b.totalValue - a.totalValue;
    return a.name.localeCompare(b.name);
  });

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">All Holdings</h1>
            <p className="text-muted-foreground">Your complete investment portfolio</p>
          </div>
          <Link to="/assets/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </Link>
        </div>

        {/* Portfolio Summary */}
        {overview && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">
                  {formatAed(overview.total_current_value, { decimals: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">
                  {formatAed(overview.total_invested, { decimals: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Total P/L
                  {overview.total_profit_loss >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-positive" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-negative" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "text-2xl font-semibold",
                  overview.total_profit_loss >= 0 ? "text-positive" : "text-negative"
                )}>
                  {overview.total_profit_loss >= 0 ? '+' : ''}{formatAed(overview.total_profit_loss, { decimals: 0 })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Asset Count</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">
                  {overview.assets_by_type.reduce((sum, a) => sum + a.count, 0)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        ) : sortedCategories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedCategories.map((category) => {
              const Icon = IconMap[category.icon || 'Package'] || Package;
              const pl = category.totalValue - category.totalInvested;
              const plPercent = category.totalInvested > 0 ? (pl / category.totalInvested) * 100 : 0;
              const isProfit = pl >= 0;

              return (
                <Link key={category.id} to={category.path}>
                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer h-full group">
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
                            <CardTitle className="text-base font-medium">{category.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {category.count} holding{category.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Value</span>
                        <span className="font-medium text-foreground">
                          {formatAed(category.totalValue, { decimals: 0 })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">P/L</span>
                        <span className={cn(
                          "font-medium flex items-center gap-1",
                          isProfit ? "text-positive" : "text-negative"
                        )}>
                          {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {isProfit ? '+' : ''}{plPercent.toFixed(1)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No holdings yet</h3>
              <p className="text-muted-foreground mb-6">Start tracking your investments!</p>
              <Link to="/assets/new">
                <Button>
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
