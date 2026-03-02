import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAssets, useUserSettings } from '@/hooks/useAssets';
import { useLatestPrices } from '@/hooks/usePrices';
import { useAllAssetTransactions } from '@/hooks/useAssetTransactions';
import { useCurrency } from '@/contexts/CurrencyContext';
import { DEFAULT_INR_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Coins, HelpCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, format } from 'date-fns';

const METAL_LABELS: Record<string, string> = {
  XAU: 'Gold',
  XAG: 'Silver',
};

export default function MetalDetail() {
  const { metalType } = useParams<{ metalType: string }>();
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: settings } = useUserSettings();
  const { data: prices } = useLatestPrices();
  const { data: allTransactions, isLoading: txLoading } = useAllAssetTransactions();
  const { formatAed } = useCurrency();

  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;
  const metalLabel = METAL_LABELS[metalType || ''] || metalType || 'Metal';

  const metalAssets = useMemo(
    () => assets?.filter(a => a.asset_type === 'precious_metals' && a.metal_type === metalType) || [],
    [assets, metalType]
  );

  const metalAssetIds = useMemo(() => new Set(metalAssets.map(a => a.id)), [metalAssets]);

  // Get all BUY transactions for this metal type
  const metalTransactions = useMemo(
    () => (allTransactions || [])
      .filter(t => metalAssetIds.has(t.asset_id) && t.transaction_type === 'BUY')
      .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date)),
    [allTransactions, metalAssetIds]
  );

  const isLoading = assetsLoading || txLoading;

  const getAssetValue = (a: any): number => {
    const priceData = metalType === 'XAU' ? prices?.XAU : prices?.XAG;
    if (priceData && a.quantity) {
      const qty = Number(a.quantity);
      const unit = (a.quantity_unit || 'oz').toLowerCase();
      const qtyOz = unit === 'grams' || unit === 'gram' || unit === 'g' ? qty / OUNCE_TO_GRAM : qty;
      return qtyOz * priceData.price_aed_per_oz;
    }
    return Number(a.current_value) || Number(a.total_cost) || 0;
  };

  const convertToAed = (value: number, currency: string) =>
    currency === 'INR' ? value * inrToAed : value;

  const totals = useMemo(() => {
    let totalInvested = 0;
    let totalValue = 0;
    let totalQtyOz = 0;

    for (const a of metalAssets) {
      totalInvested += convertToAed(Number(a.total_cost), a.currency);
      totalValue += convertToAed(getAssetValue(a), a.currency);
      if (a.quantity) {
        const qty = Number(a.quantity);
        const unit = (a.quantity_unit || 'oz').toLowerCase();
        totalQtyOz += unit === 'grams' || unit === 'gram' || unit === 'g' ? qty / OUNCE_TO_GRAM : qty;
      }
    }

    const pl = totalValue - totalInvested;
    const plPct = totalInvested > 0 ? (pl / totalInvested) * 100 : 0;

    // CAGR
    let cagr: number | null = null;
    if (metalAssets.length > 0 && totalInvested > 0 && totalValue > 0) {
      const dates = metalAssets.map(a => parseISO(a.purchase_date));
      const earliest = new Date(Math.min(...dates.map(d => d.getTime())));
      const years = differenceInDays(new Date(), earliest) / 365.25;
      if (years > 0) {
        cagr = (Math.pow(totalValue / totalInvested, 1 / years) - 1) * 100;
      }
    }

    return { totalInvested, totalValue, pl, plPct, totalQtyOz, cagr };
  }, [metalAssets, prices, inrToAed]);

  const fmtAed = (v: number) => formatAed(v, { decimals: 0 });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/holdings/precious_metals">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-gold/20 text-gold">
              <Coins className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{metalLabel}</h1>
              <p className="text-muted-foreground">
                {metalAssets.length} purchase{metalAssets.length !== 1 ? 's' : ''} · {totals.totalQtyOz.toFixed(3)} oz total
              </p>
            </div>
          </div>
          <Link to="/assets/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Purchase
            </Button>
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{fmtAed(totals.totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{fmtAed(totals.totalInvested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total P/L</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={cn("text-xl sm:text-2xl font-bold", totals.pl >= 0 ? "text-positive" : "text-negative")}>
                {totals.pl >= 0 ? '+' : ''}{fmtAed(totals.pl)}
                <span className="text-sm ml-2">({totals.plPct >= 0 ? '+' : ''}{totals.plPct.toFixed(1)}%)</span>
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                CAGR
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent>Compound Annual Growth Rate</TooltipContent>
                </Tooltip>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totals.cagr !== null ? (
                <p className={cn("text-xl sm:text-2xl font-bold",
                  totals.cagr > 12 ? "text-positive" : totals.cagr > 6 ? "text-warning" : "text-destructive"
                )}>
                  {totals.cagr >= 0 ? '+' : ''}{totals.cagr.toFixed(1)}%
                </p>
              ) : (
                <p className="text-lg text-muted-foreground">—</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Purchases / Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Purchases ({metalTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price/oz</TableHead>
                  <TableHead className="text-right">Invested</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metalTransactions.map(tx => {
                  const qty = Number(tx.quantity);
                  const unit = (tx.quantity_unit || 'oz').toLowerCase();
                  const qtyOz = unit === 'grams' || unit === 'gram' || unit === 'g' ? qty / OUNCE_TO_GRAM : qty;
                  const invested = Number(tx.amount) + Number(tx.fees);
                  
                  // Current value based on live price
                  const priceData = metalType === 'XAU' ? prices?.XAU : prices?.XAG;
                  const currentValue = priceData ? qtyOz * priceData.price_aed_per_oz : invested;
                  
                  const pl = currentValue - invested;
                  const plPct = invested > 0 ? (pl / invested) * 100 : 0;

                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{format(parseISO(tx.transaction_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-right">
                        {qty.toLocaleString()} {tx.quantity_unit || 'oz'}
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.price_per_unit ? fmtAed(Number(tx.price_per_unit)) : '—'}
                      </TableCell>
                      <TableCell className="text-right">{fmtAed(invested)}</TableCell>
                      <TableCell className="text-right">{fmtAed(currentValue)}</TableCell>
                      <TableCell className={cn("text-right", pl >= 0 ? "text-positive" : "text-negative")}>
                        {pl >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
                {metalTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No transactions found. Individual asset purchases are shown below.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Fallback: show assets without transactions */}
        {metalTransactions.length === 0 && metalAssets.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Assets</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Invested</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metalAssets.map(asset => {
                    const invested = convertToAed(Number(asset.total_cost), asset.currency);
                    const value = convertToAed(getAssetValue(asset), asset.currency);
                    const pl = value - invested;
                    const plPct = invested > 0 ? (pl / invested) * 100 : 0;

                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">{asset.asset_name}</TableCell>
                        <TableCell>{format(parseISO(asset.purchase_date), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          {asset.quantity ? `${Number(asset.quantity).toLocaleString()} ${asset.quantity_unit || 'oz'}` : '—'}
                        </TableCell>
                        <TableCell className="text-right">{fmtAed(invested)}</TableCell>
                        <TableCell className="text-right">{fmtAed(value)}</TableCell>
                        <TableCell className={cn("text-right", pl >= 0 ? "text-positive" : "text-negative")}>
                          {pl >= 0 ? '+' : ''}{plPct.toFixed(1)}%
                        </TableCell>
                        <TableCell>
                          <Link to={`/asset/${asset.id}`}>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
