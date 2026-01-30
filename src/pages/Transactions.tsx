import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useDefaultPortfolio } from '@/hooks/usePortfolios';
import { useProcessedTransactions, useCreateTransaction, useDeleteTransaction } from '@/hooks/useTransactions';
import { useLatestPrices } from '@/hooks/usePrices';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionTable } from '@/components/transactions/TransactionTable';
import { TransactionFilters } from '@/components/transactions/TransactionFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionWithPosition } from '@/lib/calculations';

export type TransactionFilter = {
  instrument?: 'XAU' | 'XAG' | 'all';
  side?: 'BUY' | 'SELL' | 'all';
  dateFrom?: string;
  dateTo?: string;
};

export default function Transactions() {
  const [searchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(searchParams.get('action') === 'add');
  const [filters, setFilters] = useState<TransactionFilter>({
    instrument: 'all',
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

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter(tx => {
      if (filters.instrument && filters.instrument !== 'all' && tx.instrument_symbol !== filters.instrument) {
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
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Transactions</h1>
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
        <TransactionFilters filters={filters} onFiltersChange={setFilters} />

        {/* Transactions Table */}
        {isLoading ? (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {allTransactions.length === 0 ? (
                <>
                  <p>No transactions yet.</p>
                  <p className="text-sm mt-1">Add your first transaction to start tracking.</p>
                </>
              ) : (
                <p>No transactions match your filters.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <TransactionTable 
            transactions={filteredTransactions} 
            portfolioId={portfolio?.id ?? ''}
          />
        )}
      </div>
    </AppLayout>
  );
}
