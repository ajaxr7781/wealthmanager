import { AppLayout } from '@/components/layout/AppLayout';
import { useDefaultPortfolio } from '@/hooks/usePortfolios';
import { useTransactions } from '@/hooks/useTransactions';
import { useAssets, usePortfolioOverview } from '@/hooks/useAssets';
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { useMfSips } from '@/hooks/useMfSips';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3, PieChart, TrendingUp, Wallet,
  Coins, Building2, Target, Shield, LineChart, Download,
} from 'lucide-react';

import { PortfolioHealthDashboard } from '@/components/reports/PortfolioHealthDashboard';
import { AllocationReport } from '@/components/reports/AllocationReport';
import { PerformanceLeaderboard } from '@/components/reports/PerformanceLeaderboard';
import { CashFlowReport } from '@/components/reports/CashFlowReport';
import { PreciousMetalsAnalysis } from '@/components/reports/PreciousMetalsAnalysis';
import { RealEstateReport } from '@/components/reports/RealEstateReport';
import { GoalProjection } from '@/components/reports/GoalProjection';
import { RiskExposure } from '@/components/reports/RiskExposure';
import { GrowthTimeline } from '@/components/reports/GrowthTimeline';
import { ReportExports } from '@/components/reports/ReportExports';

export default function Reports() {
  const { data: portfolio } = useDefaultPortfolio();
  const { data: transactions } = useTransactions(portfolio?.id);
  const { data: assets } = useAssets();
  const { data: overview } = usePortfolioOverview();
  const { data: preciousMetalsSummary } = usePortfolioSummary(portfolio?.id);
  const { data: sips } = useMfSips();

  return (
    <AppLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
            Reports & Portfolio Intelligence
          </h1>
          <p className="text-muted-foreground">
            Comprehensive analytics, projections, and export tools
          </p>
        </div>

        <Tabs defaultValue="health" className="space-y-6">
          <div className="overflow-x-auto scrollbar-none -mx-4 px-4 md:mx-0 md:px-0">
            <TabsList className="inline-flex w-auto min-w-full md:min-w-0 h-auto flex-wrap gap-1 bg-muted/50 p-1">
              <TabsTrigger value="health" className="text-xs md:text-sm gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" /> Health
              </TabsTrigger>
              <TabsTrigger value="allocation" className="text-xs md:text-sm gap-1.5">
                <PieChart className="h-3.5 w-3.5" /> Allocation
              </TabsTrigger>
              <TabsTrigger value="performance" className="text-xs md:text-sm gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Performance
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="text-xs md:text-sm gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Cash Flow
              </TabsTrigger>
              <TabsTrigger value="metals" className="text-xs md:text-sm gap-1.5">
                <Coins className="h-3.5 w-3.5" /> Metals
              </TabsTrigger>
              <TabsTrigger value="realestate" className="text-xs md:text-sm gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Real Estate
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-xs md:text-sm gap-1.5">
                <Target className="h-3.5 w-3.5" /> Goals
              </TabsTrigger>
              <TabsTrigger value="risk" className="text-xs md:text-sm gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Risk
              </TabsTrigger>
              <TabsTrigger value="growth" className="text-xs md:text-sm gap-1.5">
                <LineChart className="h-3.5 w-3.5" /> Growth
              </TabsTrigger>
              <TabsTrigger value="export" className="text-xs md:text-sm gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="health">
            {overview ? (
              <PortfolioHealthDashboard
                overview={overview}
                preciousMetalsSummary={preciousMetalsSummary}
                assets={assets || []}
              />
            ) : (
              <EmptyState message="Add assets to view portfolio health dashboard" />
            )}
          </TabsContent>

          <TabsContent value="allocation">
            {overview ? (
              <AllocationReport overview={overview} assets={assets || []} />
            ) : (
              <EmptyState message="Add assets to view allocation reports" />
            )}
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceLeaderboard assets={assets || []} />
          </TabsContent>

          <TabsContent value="cashflow">
            {overview ? (
              <CashFlowReport overview={overview} assets={assets || []} sips={sips || []} />
            ) : (
              <EmptyState message="Add assets to view cash flow report" />
            )}
          </TabsContent>

          <TabsContent value="metals">
            <PreciousMetalsAnalysis
              summary={preciousMetalsSummary}
              totalPortfolioValue={overview?.total_current_value || 0}
            />
          </TabsContent>

          <TabsContent value="realestate">
            <RealEstateReport
              assets={assets || []}
              totalPortfolioValue={overview?.total_current_value || 0}
            />
          </TabsContent>

          <TabsContent value="goals">
            <GoalProjection totalCurrentValue={overview?.total_current_value || 0} />
          </TabsContent>

          <TabsContent value="risk">
            {overview ? (
              <RiskExposure overview={overview} assets={assets || []} />
            ) : (
              <EmptyState message="Add assets to view risk exposure" />
            )}
          </TabsContent>

          <TabsContent value="growth">
            {overview ? (
              <GrowthTimeline assets={assets || []} overview={overview} />
            ) : (
              <EmptyState message="Add assets to view growth timeline" />
            )}
          </TabsContent>

          <TabsContent value="export">
            <ReportExports assets={assets} transactions={transactions} overview={overview} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
      {message}
    </div>
  );
}
