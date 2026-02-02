import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAssets } from '@/hooks/useAssets';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColorClass } from '@/types/assetConfig';
import {
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

  const isLoading = assetsLoading || categoriesLoading;

  const category = categories?.find(c => c.code === categoryCode);
  const categoryAssets = assets?.filter(a => a.category_code === categoryCode) || [];

  const formatCurrency = (value: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
          <Link to="/holdings">
            <Button variant="ghost" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to All Holdings
            </Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const CategoryIcon = IconMap[category.icon || 'Package'] || Package;

  // Calculate category totals
  const totalInvested = categoryAssets.reduce((sum, a) => sum + Number(a.total_cost), 0);
  const totalValue = categoryAssets.reduce((sum, a) => sum + (Number(a.current_value) || Number(a.total_cost)), 0);
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(totalInvested)}</p>
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
                  {totalPL >= 0 ? '+' : ''}{formatCurrency(totalPL)}
                  <span className="text-sm ml-2">({plPercent >= 0 ? '+' : ''}{plPercent.toFixed(1)}%)</span>
                </p>
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
                  const currentValue = Number(asset.current_value) || Number(asset.total_cost);
                  const pl = currentValue - Number(asset.total_cost);
                  const plPct = Number(asset.total_cost) > 0 
                    ? (pl / Number(asset.total_cost)) * 100 
                    : 0;
                  const isProfit = pl >= 0;

                  // Get the asset type from categories
                  const assetType = category.asset_types.find(t => t.code === asset.asset_type_code);
                  const TypeIcon = assetType?.icon ? IconMap[assetType.icon] || Package : Package;

                  return (
                    <Link
                      key={asset.id}
                      to={`/assets/${asset.id}`}
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
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {asset.currency} {formatCurrency(Number(asset.total_cost), asset.currency).replace(/[A-Z]+\s?/g, '')} invested
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(currentValue, asset.currency)}
                          </p>
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
