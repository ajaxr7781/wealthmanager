import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { AppLayout } from '@/components/layout/AppLayout';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { LivePrices } from '@/components/dashboard/LivePrices';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { FDMaturityAlerts } from '@/components/dashboard/FDMaturityAlerts';
import { PortfolioTrendChart } from '@/components/dashboard/PortfolioTrendChart';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: summary, isLoading, prices } = usePortfolioSummary();

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
            Portfolio Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your investments across all asset classes
          </p>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : summary ? (
          <>
            {/* Summary Cards */}
            <SummaryCards summary={summary} />

            {/* Portfolio Trend */}
            <PortfolioTrendChart />

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Allocation Chart */}
              <div className="lg:col-span-2">
                <AllocationChart summary={summary} />
              </div>

              {/* Live Prices + Quick Actions + Alerts */}
              <div className="space-y-6">
                <FDMaturityAlerts />
                <LivePrices prices={prices} />
                <QuickActions />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">No data yet</h3>
            <p className="text-muted-foreground mb-4">Add your first asset to get started!</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-80 rounded-lg" />
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
