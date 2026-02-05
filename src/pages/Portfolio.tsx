import { AppLayout } from '@/components/layout/AppLayout';
import { usePortfolioOverview, useAssets } from '@/hooks/useAssets';
import { useMetalPrices } from '@/hooks/useMetalPrices';
import { useUnifiedRefresh } from '@/hooks/useUnifiedRefresh';
import { PortfolioSummaryCards } from '@/components/portfolio/PortfolioSummaryCards';
import { AllocationBreakdown } from '@/components/portfolio/AllocationBreakdown';
import { AssetList } from '@/components/portfolio/AssetList';
import { LiveMetalPrices } from '@/components/portfolio/LiveMetalPrices';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Portfolio() {
  const { data: overview, isLoading: overviewLoading } = usePortfolioOverview();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: metalPrices, isLoading: pricesLoading } = useMetalPrices();
  const unifiedRefresh = useUnifiedRefresh();

  const isLoading = overviewLoading || assetsLoading;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">Portfolio</h1>
            <p className="text-muted-foreground">
              Your unified investment overview
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => unifiedRefresh.mutate()}
              disabled={unifiedRefresh.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${unifiedRefresh.isPending ? 'animate-spin' : ''}`} />
              Refresh All
            </Button>
            <Link to="/assets/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <PortfolioSkeleton />
        ) : overview ? (
          <>
            {/* Summary Cards */}
            <PortfolioSummaryCards overview={overview} />

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Allocation Breakdown */}
              <div className="lg:col-span-2">
                <AllocationBreakdown overview={overview} />
              </div>

              {/* Live Metal Prices */}
              <div className="space-y-6">
                <LiveMetalPrices 
                  prices={metalPrices} 
                  isLoading={pricesLoading} 
                  onRefresh={() => unifiedRefresh.mutate()}
                  isRefreshing={unifiedRefresh.isPending}
                />
              </div>
            </div>

            {/* Asset List */}
            <AssetList assets={assets || []} />
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </AppLayout>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-80 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Plus className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">No assets yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
        Start tracking your investments by adding your first asset.
      </p>
      <Link to="/assets/new">
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Asset
        </Button>
      </Link>
    </div>
  );
}