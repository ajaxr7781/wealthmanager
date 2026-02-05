import { AppLayout } from '@/components/layout/AppLayout';
import { useDefaultPortfolio } from '@/hooks/usePortfolios';
import { useTransactions } from '@/hooks/useTransactions';
import { useAssets, usePortfolioOverview } from '@/hooks/useAssets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/assets';
import { ASSET_TYPE_LABELS } from '@/types/assets';

export default function Reports() {
  const { data: portfolio } = useDefaultPortfolio();
  const { data: transactions } = useTransactions(portfolio?.id);
  const { data: assets } = useAssets();
  const { data: overview } = usePortfolioOverview();

  const exportTransactionsCSV = () => {
    if (!transactions?.length) return;
    const headers = ['Date', 'Metal', 'Side', 'Quantity', 'Unit', 'Price', 'Price Unit', 'Fees', 'Notes'];
    const rows = transactions.map(tx => [
      tx.trade_date, 
      tx.instrument_symbol, 
      tx.side, 
      tx.quantity, 
      tx.quantity_unit, 
      tx.price, 
      tx.price_unit, 
      tx.fees, 
      tx.notes || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `precious-metals-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const exportAssetsCSV = () => {
    if (!assets?.length) return;
    const headers = ['Name', 'Type', 'Currency', 'Purchase Date', 'Total Cost', 'Current Value', 'P/L', 'Notes'];
    const rows = assets.map(asset => [
      asset.asset_name,
      ASSET_TYPE_LABELS[asset.asset_type],
      asset.currency,
      asset.purchase_date,
      asset.total_cost,
      asset.current_value || asset.total_cost,
      (asset.current_value || asset.total_cost) - asset.total_cost,
      asset.notes || ''
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCSV(csv, `all-assets-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary stats
  const topPerformers = assets?.filter(a => a.current_value && a.current_value > a.total_cost)
    .sort((a, b) => {
      const aPL = ((a.current_value || a.total_cost) - a.total_cost) / a.total_cost;
      const bPL = ((b.current_value || b.total_cost) - b.total_cost) / b.total_cost;
      return bPL - aPL;
    })
    .slice(0, 5) || [];

  const bottomPerformers = assets?.filter(a => a.current_value && a.current_value < a.total_cost)
    .sort((a, b) => {
      const aPL = ((a.current_value || a.total_cost) - a.total_cost) / a.total_cost;
      const bPL = ((b.current_value || b.total_cost) - b.total_cost) / b.total_cost;
      return aPL - bPL;
    })
    .slice(0, 5) || [];

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Export data and analyze your investment performance
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Portfolio Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">
                {overview ? `AED ${overview.total_current_value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">
                {overview ? `AED ${overview.total_invested.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                Total P/L
                {overview && overview.total_profit_loss >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-positive" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-negative" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-semibold",
                overview && overview.total_profit_loss >= 0 ? "text-positive" : "text-negative"
              )}>
                {overview ? (
                  <>
                    {overview.total_profit_loss >= 0 ? '+' : ''}
                    AED {overview.total_profit_loss.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    <span className="ml-2 text-sm">
                      ({overview.total_profit_loss_percent >= 0 ? '+' : ''}{overview.total_profit_loss_percent.toFixed(1)}%)
                    </span>
                  </>
                ) : '—'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Asset Count</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-foreground">
                {overview ? overview.assets_by_type.reduce((sum, a) => sum + a.count, 0) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {overview?.assets_by_type.length || 0} categories
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="export" className="space-y-6">
          <TabsList>
            <TabsTrigger value="export">Export Data</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    Precious Metals Transactions
                  </CardTitle>
                  <CardDescription>
                    Export all Gold & Silver buy/sell transactions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={exportTransactionsCSV} 
                    disabled={!transactions?.length}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    {transactions?.length || 0} transactions available
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-primary" />
                    All Assets
                  </CardTitle>
                  <CardDescription>
                    Export complete asset portfolio data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={exportAssetsCSV} 
                    disabled={!assets?.length}
                    className="w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">
                    {assets?.length || 0} assets available
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-positive">
                    <TrendingUp className="h-5 w-5" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>Best performing assets by return %</CardDescription>
                </CardHeader>
                <CardContent>
                  {topPerformers.length > 0 ? (
                    <div className="space-y-3">
                      {topPerformers.map((asset) => (
                        <PerformanceRow key={asset.id} asset={asset} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No profitable assets yet
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-negative">
                    <TrendingDown className="h-5 w-5" />
                    Underperformers
                  </CardTitle>
                  <CardDescription>Assets with negative returns</CardDescription>
                </CardHeader>
                <CardContent>
                  {bottomPerformers.length > 0 ? (
                    <div className="space-y-3">
                      {bottomPerformers.map((asset) => (
                        <PerformanceRow key={asset.id} asset={asset} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No underperforming assets
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation by Type</CardTitle>
                <CardDescription>Breakdown of your portfolio by asset category</CardDescription>
              </CardHeader>
              <CardContent>
                {overview && overview.assets_by_type.length > 0 ? (
                  <div className="space-y-4">
                    {overview.assets_by_type.map((category) => {
                      const percentage = overview.total_current_value > 0 
                        ? (category.current_value / overview.total_current_value) * 100 
                        : 0;
                      const isProfit = category.profit_loss >= 0;
                      
                      return (
                        <div key={category.type} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium text-foreground">{category.label}</span>
                              <span className="text-sm text-muted-foreground ml-2">
                                ({category.count} asset{category.count !== 1 ? 's' : ''})
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-medium text-foreground">
                                AED {category.current_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                              </span>
                              <span className={cn(
                                "text-sm ml-2 inline-flex items-center gap-0.5",
                                isProfit ? "text-positive" : "text-negative"
                              )}>
                                {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {isProfit ? '+' : ''}{((category.profit_loss / category.total_invested) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {percentage.toFixed(1)}% of portfolio
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Add assets to see allocation breakdown
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function PerformanceRow({ asset }: { asset: Asset }) {
  const currentValue = asset.current_value || asset.total_cost;
  const profitLoss = currentValue - asset.total_cost;
  const profitLossPercent = (profitLoss / asset.total_cost) * 100;
  const isProfit = profitLoss >= 0;

  return (
    <div className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border">
      <div>
        <p className="font-medium text-sm text-foreground">{asset.asset_name}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {format(new Date(asset.purchase_date), 'MMM yyyy')}
        </p>
      </div>
      <div className="text-right">
        <p className={cn(
          "font-medium text-sm flex items-center gap-0.5",
          isProfit ? "text-positive" : "text-negative"
        )}>
          {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {isProfit ? '+' : ''}{profitLossPercent.toFixed(1)}%
        </p>
        <p className="text-xs text-muted-foreground">
          {isProfit ? '+' : ''}AED {profitLoss.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </p>
      </div>
    </div>
  );
}