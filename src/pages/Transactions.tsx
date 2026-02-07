import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDefaultPortfolio } from '@/hooks/usePortfolios';
import { useProcessedTransactions, useCreateTransaction } from '@/hooks/useTransactions';
import { useLatestPrices } from '@/hooks/usePrices';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionFilters, TransactionFilter } from '@/components/transactions/TransactionFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export type { TransactionFilter } from '@/components/transactions/TransactionFilters';

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(searchParams.get('action') === 'add');
  const [filters, setFilters] = useState<TransactionFilter>({
    assetType: 'all',
    assetName: 'all',
    side: 'all',
  });

  const { data: portfolio, isLoading: portfolioLoading } = useDefaultPortfolio();
  const { data: txData, isLoading: txLoading } = useProcessedTransactions(portfolio?.id);
  const { data: prices } = useLatestPrices();
  const createTransaction = useCreateTransaction();

  // Combine and sort all transactions
  const allTransactions = useMemo(() => {
    if (!txData) return [];
    const combined = [...txData.gold.transactions, ...txData.silver.transactions];
    return combined.sort((a, b) => {
      const dateCompare = a.trade_date.localeCompare(b.trade_date);
      if (dateCompare !== 0) return dateCompare;
      return 0;
    });
  }, [txData]);

  // Get unique asset names for filter dropdown
  const availableAssetNames = useMemo(() => {
    if (!allTransactions.length) return [];
    const names = new Set<string>();
    allTransactions.forEach(tx => {
      if (tx.instrument_symbol) names.add(tx.instrument_symbol);
    });
    return Array.from(names);
  }, [allTransactions]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      // Asset type filter - support both legacy XAU/XAG and new asset type codes
      if (filters.assetType && filters.assetType !== 'all') {
        if (filters.assetType === 'XAU' || filters.assetType === 'XAG') {
          if (tx.instrument_symbol !== filters.assetType) return false;
        }
        // For new asset types, would need to check against asset_type_code
      }
      if (filters.assetName && filters.assetName !== 'all' && tx.instrument_symbol !== filters.assetName) {
        return false;
      }
      if (filters.side && filters.side !== 'all' && tx.side !== filters.side) {
        return false;
      }
      if (filters.dateFrom && tx.trade_date < filters.dateFrom) {
        return false;
      }
      if (filters.dateTo && tx.trade_date > filters.dateTo) {
        return false;
      }
      return true;
    });
  }, [allTransactions, filters]);

  const isLoading = portfolioLoading || txLoading;

  const handleFormSuccess = () => {
    setDialogOpen(false);
  };

  // Get current holdings for validation
  const currentHoldings = useMemo(() => ({
    XAU: txData?.gold.position.holding_oz ?? 0,
    XAG: txData?.silver.position.holding_oz ?? 0,
  }), [txData]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">Transactions</h1>
            <p className="text-muted-foreground">
              Track all your precious metals trades
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Transaction</DialogTitle>
              </DialogHeader>
              {portfolio && (
                <TransactionForm
                  portfolioId={portfolio.id}
                  currentHoldings={currentHoldings}
                  latestPrices={{
                    XAU: prices?.XAU?.price_aed_per_oz ?? null,
                    XAG: prices?.XAG?.price_aed_per_oz ?? null,
                  }}
                  onSuccess={handleFormSuccess}
                  onCancel={() => setDialogOpen(false)}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <TransactionFilters 
          filters={filters} 
          onFiltersChange={setFilters} 
          availableAssetNames={availableAssetNames}
        />

        {/* Transactions Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              {allTransactions.length === 0 ? (
                <>
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">No transactions yet</h3>
                  <p className="text-muted-foreground">Add your first transaction to start tracking.</p>
                </>
              ) : (
                <p className="text-muted-foreground">No transactions match your filters.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <TransactionTable 
            transactions={filteredTransactions} 
            portfolioId={portfolio?.id ?? ''}
            currentPrices={{
              XAU: prices?.XAU?.price_aed_per_oz ?? null,
              XAG: prices?.XAG?.price_aed_per_oz ?? null,
            }}
          />
        )}
      </div>
    </AppLayout>
  );
}