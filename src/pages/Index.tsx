import { useEffect, useState } from 'react';
import { useDefaultPortfolio } from '@/hooks/usePortfolios';
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { useLatestPrices, useCreatePrice } from '@/hooks/usePrices';
import { AppLayout } from '@/components/layout/AppLayout';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { AllocationChart } from '@/components/dashboard/AllocationChart';
import { LivePrices } from '@/components/dashboard/LivePrices';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: portfolio, isLoading: portfolioLoading } = useDefaultPortfolio();
  const { data: summary, isLoading: summaryLoading, prices } = usePortfolioSummary(portfolio?.id);
  const createPrice = useCreatePrice();

  const isLoading = portfolioLoading || summaryLoading;

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl lg:text-3xl font-bold">Precious Metals</h1>
          <p className="text-muted-foreground">
            Track your Gold & Silver investments
          </p>
        </div>

        {isLoading ? (
          <DashboardSkeleton />
        ) : summary ? (
          <>
            {/* Summary Cards */}
            <SummaryCards summary={summary} />

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Allocation Chart */}
              <div className="lg:col-span-2">
                <AllocationChart summary={summary} />
              </div>

              {/* Live Prices + Quick Actions */}
              <div className="space-y-6">
                <LivePrices prices={prices} />
                <QuickActions />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>No data yet. Add your first transaction to get started!</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="lg:col-span-2 h-80" />
        <div className="space-y-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      </div>
    </div>
  );
}
