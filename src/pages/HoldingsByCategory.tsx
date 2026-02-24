import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAssets, useUserSettings } from '@/hooks/useAssets';
import { useLatestPrices } from '@/hooks/usePrices';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Plus, ChevronRight, ArrowLeft, Coins, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColorClass } from '@/types/assetConfig';
import { getEffectiveFDValue } from '@/lib/fdCalculations';
import { DEFAULT_INR_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';
import { differenceInDays, parseISO } from 'date-fns';
import {
  Landmark,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  Briefcase,
  BarChart3,
  PieChart,
  Package,
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
};

export default function HoldingsByCategory() {
  const { categoryCode } = useParams<{ categoryCode: string }>();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesWithTypes();
  const { data: settings } = useUserSettings();
  const { data: prices } = useLatestPrices();

  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;
  const { formatAed } = useCurrency();
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

  const category = categories?.find(c => c.code === categoryCode);
  const categoryAssets = useMemo(() => assets?.filter(a => a.category_code === categoryCode) || [], [assets, categoryCode]);

  const fmtAed = (value: number) => formatAed(value, { decimals: 0 });

  const convertToAed = (value: number, currency: string) => {
    return currency === 'INR' ? value * inrToAed : value;
  };

  // Category-level CAGR
  const categoryCagr = useMemo(() => {
    if (!category || categoryAssets.length === 0) return null;
    
    const catTotalInvested = categoryAssets.reduce((sum, a) => sum + convertToAed(Number(a.total_cost), a.currency), 0);
    const catTotalValue = categoryAssets.reduce((sum, a) => {
      const value = getAssetCurrentValue(a);
      return sum + convertToAed(value, a.currency);
    }, 0);

    if (catTotalInvested <= 0 || catTotalValue <= 0) return null;
    const dates = categoryAssets.map(a => parseISO(a.purchase_date));
    const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
    const years = differenceInDays(new Date(), earliest) / 365.25;
    if (years <= 0) return null;
    return (Math.pow(catTotalValue / catTotalInvested, 1 / years) - 1) * 100;
  }, [category, categoryAssets, inrToAed]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!category) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8">
          <p className="text-muted-foreground">Category not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const CategoryIcon = IconMap[category.icon || 'Package'] || Package;

  // Calculate category totals
  const totalInvested = categoryAssets.reduce((sum, a) => {
    const cost = Number(a.total_cost);
    return sum + convertToAed(cost, a.currency);
  }, 0);
  
  const totalValue = categoryAssets.reduce((sum, a) => {
    const value = getAssetCurrentValue(a);
    return sum + convertToAed(value, a.currency);
  }, 0);

  const totalPL = totalValue - totalInvested;
  const plPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/holdings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              getColorClass(category.color)
            )}>
              <CategoryIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">{category.name}</h1>
              <p className="text-muted-foreground">
                {categoryAssets.length} holding{categoryAssets.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Link to="/assets/new">
            <Button className="gold-gradient text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Asset
            </Button>
          </Link>
        </div>

        {/* Category Summary */}
        {categoryAssets.length > 0 && (
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtAed(totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{fmtAed(totalInvested)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total P/L</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={cn(
                  "text-2xl font-bold",
                  totalPL >= 0 ? "text-positive" : "text-negative"
                )}>
                  {totalPL >= 0 ? '+' : ''}{fmtAed(totalPL)}
                  <span className="text-sm ml-2">({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(1)}%)</span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  CAGR
                  <Tooltip>
                    <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent>Compound Annual Growth Rate for this category</TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryCagr !== null ? (
                  <p className={cn("text-2xl font-bold",
                    categoryCagr > 12 ? "text-positive" : categoryCagr > 6 ? "text-warning" : "text-destructive"
                  )}>
                    {categoryCagr >= 0 ? '+' : ''}{categoryCagr.toFixed(1)}%
                  </p>
                ) : (
                  <p className="text-lg text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Asset List */}
        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle>Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryAssets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No assets in this category</p>
                <Link to="/assets/new">
                  <Button className="gold-gradient text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Asset
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {categoryAssets.map((asset) => {
                  const currentValue = getAssetCurrentValue(asset);
                  const isINR = asset.currency === 'INR';
                  
                  const currentValueAed = convertToAed(currentValue, asset.currency);
                  const totalCostAed = convertToAed(Number(asset.total_cost), asset.currency);
                  const pl = currentValueAed - totalCostAed;
                  const plPct = totalCostAed > 0 ? (pl / totalCostAed) * 100 : 0;
                  const isProfit = pl >= 0;

                  const assetType = category.asset_types.find(t => t.code === asset.asset_type_code);
                  const TypeIcon = assetType?.icon ? IconMap[assetType.icon] || Package : Package;

                  return (
                    <Link
                      key={asset.id}
                      to={`/asset/${asset.id}`}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          getColorClass(category.color)
                        )}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{asset.asset_name}</p>
                            {assetType && (
                              <Badge variant="secondary" className="text-xs">
                                {assetType.name}
                              </Badge>
                            )}
                            {isINR && (
                              <Badge variant="outline" className="text-xs">INR</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <span>{fmtAed(totalCostAed)} invested</span>
                            {asset.quantity && asset.quantity_unit && (
                              <span className="ml-2">· {Number(asset.quantity).toLocaleString()} {asset.quantity_unit}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">{fmtAed(currentValueAed)}</p>
                          <p className={cn(
                            "text-sm",
                            isProfit ? "text-positive" : "text-negative"
                          )}>
                            {isProfit ? '+' : ''}{plPct.toFixed(1)}%
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
