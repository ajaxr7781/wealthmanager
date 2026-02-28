import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAssets } from '@/hooks/useAssets';
import { useAllAssetTransactions } from '@/hooks/useAssetTransactions';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Plus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface UnifiedTransaction {
  id: string;
  date: string;
  assetName: string;
  assetType: string;
  transactionType: string;
  quantity: number;
  quantityUnit: string;
  pricePerUnit: number | null;
  amount: number;
  fees: number;
  currency: string;
  source: 'asset_transactions' | 'asset_record';
}

export default function Transactions() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [sideFilter, setSideFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: allTxs, isLoading: txLoading } = useAllAssetTransactions();

  const isLoading = assetsLoading || txLoading;

  // Build asset lookup
  const assetMap = useMemo(() => {
    const map = new Map<string, { name: string; type: string; currency: string }>();
    for (const a of assets || []) {
      map.set(a.id, { name: a.asset_name, type: a.asset_type, currency: a.currency });
    }
    return map;
  }, [assets]);

  // Build unified transaction list: explicit transactions + synthesized from assets
  const unifiedTxs = useMemo(() => {
    const result: UnifiedTransaction[] = [];

    // IDs of assets that have explicit transactions
    const assetsWithTxs = new Set<string>();
    for (const tx of allTxs || []) {
      assetsWithTxs.add(tx.asset_id);
      const asset = assetMap.get(tx.asset_id);
      result.push({
        id: tx.id,
        date: tx.transaction_date,
        assetName: asset?.name || 'Unknown',
        assetType: asset?.type || '',
        transactionType: tx.transaction_type,
        quantity: Number(tx.quantity),
        quantityUnit: tx.quantity_unit || '',
        pricePerUnit: tx.price_per_unit ? Number(tx.price_per_unit) : null,
        amount: Number(tx.amount),
        fees: Number(tx.fees),
        currency: asset?.currency || 'AED',
        source: 'asset_transactions',
      });
    }

    // Synthesize purchase records for assets without explicit transactions
    for (const a of assets || []) {
      if (assetsWithTxs.has(a.id)) continue;

      const txType = a.asset_type === 'sip' ? 'SIP' : 'PURCHASE';
      const amount = Number(a.total_cost) || 0;
      const qty = Number(a.quantity) || Number(a.units_held) || 1;
      const unit = a.quantity_unit || (a.asset_type === 'real_estate' ? 'unit' : '');
      const ppu = amount > 0 && qty > 0 ? amount / qty : null;

      result.push({
        id: `asset-${a.id}`,
        date: a.purchase_date,
        assetName: a.asset_name,
        assetType: a.asset_type,
        transactionType: txType,
        quantity: qty,
        quantityUnit: unit,
        pricePerUnit: a.purchase_price_per_unit ? Number(a.purchase_price_per_unit) : ppu,
        amount,
        fees: 0,
        currency: a.currency,
        source: 'asset_record',
      });
    }

    // Sort by date descending
    result.sort((a, b) => b.date.localeCompare(a.date));
    return result;
  }, [allTxs, assets, assetMap]);

  // Get unique asset types for filter
  const assetTypes = useMemo(() => {
    const types = new Set<string>();
    for (const tx of unifiedTxs) if (tx.assetType) types.add(tx.assetType);
    return Array.from(types);
  }, [unifiedTxs]);

  // Get unique transaction types for filter
  const txTypes = useMemo(() => {
    const types = new Set<string>();
    for (const tx of unifiedTxs) types.add(tx.transactionType);
    return Array.from(types);
  }, [unifiedTxs]);

  // Filter transactions
  const filteredTxs = useMemo(() => {
    return unifiedTxs.filter(tx => {
      if (typeFilter !== 'all' && tx.assetType !== typeFilter) return false;
      if (sideFilter !== 'all' && tx.transactionType !== sideFilter) return false;
      if (dateFrom && tx.date < dateFrom) return false;
      if (dateTo && tx.date > dateTo) return false;
      return true;
    });
  }, [unifiedTxs, typeFilter, sideFilter, dateFrom, dateTo]);

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">Transactions</h1>
            <p className="text-muted-foreground">
              All asset transactions across your portfolio
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Asset Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {assetTypes.map(t => (
                <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sideFilter} onValueChange={setSideFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Transaction Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {txTypes.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full sm:w-[160px]"
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full sm:w-[160px]"
            placeholder="To"
          />
        </div>

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
        ) : filteredTxs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">No transactions</h3>
              <p className="text-muted-foreground">
                {unifiedTxs.length > 0 ? 'No transactions match your filters.' : 'Transactions will appear here when you add them.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Asset</th>
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">Type</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Quantity</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Price</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Amount</th>
                      <th className="text-right p-4 text-sm font-medium text-muted-foreground">Fees</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTxs.map((tx) => {
                      const isBuy = ['BUY', 'PURCHASE', 'SIP', 'SWITCH_IN'].includes(tx.transactionType);
                      return (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4 text-sm">
                            {format(new Date(tx.date), 'dd MMM yyyy')}
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {tx.assetName}
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={isBuy ? 'default' : 'secondary'}
                              className={cn(
                                "text-xs",
                                isBuy ? "bg-positive/10 text-positive" : "bg-negative/10 text-negative"
                              )}
                            >
                              {isBuy ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                              {tx.transactionType}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-right">
                            {tx.quantity.toLocaleString()} {tx.quantityUnit}
                          </td>
                          <td className="p-4 text-sm text-right">
                            {tx.pricePerUnit ? tx.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="p-4 text-sm text-right font-medium">
                            {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-sm text-right text-muted-foreground">
                            {tx.fees > 0 ? tx.fees.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
