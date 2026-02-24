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

  // Get unique asset types for filter
  const assetTypes = useMemo(() => {
    const types = new Set<string>();
    for (const a of assets || []) types.add(a.asset_type);
    return Array.from(types);
  }, [assets]);

  // Filter transactions
  const filteredTxs = useMemo(() => {
    if (!allTxs) return [];
    return allTxs.filter(tx => {
      const asset = assetMap.get(tx.asset_id);
      if (typeFilter !== 'all' && asset?.type !== typeFilter) return false;
      if (sideFilter !== 'all' && tx.transaction_type !== sideFilter) return false;
      if (dateFrom && tx.transaction_date < dateFrom) return false;
      if (dateTo && tx.transaction_date > dateTo) return false;
      return true;
    });
  }, [allTxs, assetMap, typeFilter, sideFilter, dateFrom, dateTo]);

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6">
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
        <div className="flex flex-wrap gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
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
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Side" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="BUY">Buy</SelectItem>
              <SelectItem value="SELL">Sell</SelectItem>
              <SelectItem value="PURCHASE">Purchase</SelectItem>
              <SelectItem value="REDEMPTION">Redemption</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[160px]"
            placeholder="From"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[160px]"
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
                {(allTxs?.length || 0) > 0 ? 'No transactions match your filters.' : 'Transactions will appear here when you add them.'}
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
                      const asset = assetMap.get(tx.asset_id);
                      const isBuy = ['BUY', 'PURCHASE', 'SWITCH_IN'].includes(tx.transaction_type);
                      return (
                        <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-4 text-sm">
                            {format(new Date(tx.transaction_date), 'dd MMM yyyy')}
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {asset?.name || 'Unknown'}
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
                              {tx.transaction_type}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm text-right">
                            {Number(tx.quantity).toLocaleString()} {tx.quantity_unit || ''}
                          </td>
                          <td className="p-4 text-sm text-right">
                            {tx.price_per_unit ? Number(tx.price_per_unit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                          </td>
                          <td className="p-4 text-sm text-right font-medium">
                            {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="p-4 text-sm text-right text-muted-foreground">
                            {Number(tx.fees) > 0 ? Number(tx.fees).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
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
