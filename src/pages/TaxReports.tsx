import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssets } from '@/hooks/useAssets';
import { useAllAssetTransactions } from '@/hooks/useAssetTransactions';
import {
  calculateTaxLots,
  getHarvestSuggestions,
  getCurrentFY,
  getFYOptions,
  formatAssetClass,
  generateTaxCSV,
  type TaxSummary,
  type TaxLot,
  type HarvestSuggestion,
} from '@/lib/taxCalculations';
import { cn } from '@/lib/utils';
import {
  Receipt,
  TrendingUp,
  TrendingDown,
  Download,
  AlertTriangle,
  Scissors,
  IndianRupee,
  Info,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const fmtINR = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function TaxReports() {
  const [fy, setFy] = useState(getCurrentFY());
  const { data: assets, isLoading: assetsLoading } = useAssets();
  const { data: transactions, isLoading: txLoading } = useAllAssetTransactions();

  const isLoading = assetsLoading || txLoading;

  const taxSummary = useMemo<TaxSummary | null>(() => {
    if (!assets || !transactions) return null;
    // Only INR assets for Indian tax
    const inrAssets = assets.filter(a => a.currency === 'INR');
    const inrAssetIds = new Set(inrAssets.map(a => a.id));
    const inrTxs = transactions.filter(tx => inrAssetIds.has(tx.asset_id));
    return calculateTaxLots(inrAssets, inrTxs, fy);
  }, [assets, transactions, fy]);

  const harvestSuggestions = useMemo<HarvestSuggestion[]>(() => {
    if (!taxSummary) return [];
    return getHarvestSuggestions(taxSummary.lots);
  }, [taxSummary]);

  const realizedLots = taxSummary?.lots.filter(l => l.isRealized) || [];
  const unrealizedLots = taxSummary?.lots.filter(l => !l.isRealized) || [];

  const handleExportCSV = () => {
    if (!taxSummary) return;
    const csv = generateTaxCSV(taxSummary);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tax-report-${fy}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Receipt className="h-6 w-6" />
              Tax Reports
            </h1>
            <p className="text-muted-foreground text-sm">
              Capital gains analysis under Indian tax rules (INR holdings only)
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <Select value={fy} onValueChange={setFy}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="FY" />
              </SelectTrigger>
              <SelectContent>
                {getFYOptions().map(f => (
                  <SelectItem key={f} value={f}>FY {f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!taxSummary}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : !taxSummary ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No data available for tax calculation.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Disclaimer */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Estimates are based on FY 2024-25 tax rules. Equity LTCG has ₹1.25L exemption at 12.5%. 
                Debt MF gains are taxed at slab rate. Consult a CA for exact tax filing.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Realized STCG</p>
                  <p className={cn("text-xl font-bold", taxSummary.realizedSTCG >= 0 ? 'text-positive' : 'text-negative')}>
                    {fmtINR(taxSummary.realizedSTCG)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tax: ~{fmtINR(taxSummary.estimatedTaxSTCG)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Realized LTCG</p>
                  <p className={cn("text-xl font-bold", taxSummary.realizedLTCG >= 0 ? 'text-positive' : 'text-negative')}>
                    {fmtINR(taxSummary.realizedLTCG)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Tax: ~{fmtINR(taxSummary.estimatedTaxLTCG)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">LTCG Exemption</p>
                  <p className="text-xl font-bold text-foreground">
                    {fmtINR(taxSummary.ltcgExemptionRemaining)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    of ₹1.25L remaining
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <IndianRupee className="h-3.5 w-3.5" />
                    Est. Total Tax
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    {fmtINR(taxSummary.totalEstimatedTax)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    FY {fy}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="realized" className="space-y-4">
              <TabsList>
                <TabsTrigger value="realized">
                  Realized ({realizedLots.length})
                </TabsTrigger>
                <TabsTrigger value="unrealized">
                  Unrealized ({unrealizedLots.length})
                </TabsTrigger>
                <TabsTrigger value="harvest">
                  Tax Harvesting ({harvestSuggestions.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="realized">
                <Card>
                  <CardHeader>
                    <CardTitle>Realized Capital Gains — FY {fy}</CardTitle>
                    <CardDescription>
                      Gains/losses from assets sold during this financial year
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {realizedLots.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No realized gains/losses in FY {fy}
                      </p>
                    ) : (
                      <LotTable lots={realizedLots} showSellDate />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="unrealized">
                <Card>
                  <CardHeader>
                    <CardTitle>Unrealized Capital Gains</CardTitle>
                    <CardDescription>
                      Potential gains/losses if you sell current holdings today
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {unrealizedLots.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No unrealized positions
                      </p>
                    ) : (
                      <LotTable lots={unrealizedLots} showSellDate={false} />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="harvest">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scissors className="h-5 w-5" />
                      Tax Loss Harvesting Suggestions
                    </CardTitle>
                    <CardDescription>
                      Holdings with unrealized losses that could be sold to offset capital gains
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {harvestSuggestions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">
                        No tax harvesting opportunities found. All holdings are in profit! 🎉
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {harvestSuggestions.map((s, i) => (
                          <div
                            key={`${s.assetId}-${i}`}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-3"
                          >
                            <div>
                              <p className="font-medium text-foreground">{s.assetName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {formatAssetClass(s.assetClass)}
                                </Badge>
                                <Badge variant={s.isLongTerm ? 'default' : 'outline'} className="text-xs">
                                  {s.isLongTerm ? 'LTCG' : 'STCG'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {s.holdingMonths} months
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-negative font-medium">
                                Loss: {fmtINR(s.unrealizedLoss)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Potential tax saving: ~{fmtINR(s.potentialTaxSaving)}
                              </p>
                            </div>
                          </div>
                        ))}

                        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground mt-4">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                          <p>
                            Tax harvesting involves selling and repurchasing. Be aware of wash sale implications 
                            and ensure you maintain your desired asset allocation. Consult a tax advisor.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}

function LotTable({ lots, showSellDate }: { lots: TaxLot[]; showSellDate: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Asset</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Class</th>
            <th className="text-left py-2 px-2 font-medium text-muted-foreground">Buy Date</th>
            {showSellDate && <th className="text-left py-2 px-2 font-medium text-muted-foreground">Sell Date</th>}
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Holding</th>
            <th className="text-center py-2 px-2 font-medium text-muted-foreground">Type</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">Cost</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">{showSellDate ? 'Proceeds' : 'Value'}</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">Gain/Loss</th>
            <th className="text-right py-2 px-2 font-medium text-muted-foreground">Tax</th>
          </tr>
        </thead>
        <tbody>
          {lots.map((lot, idx) => (
            <tr key={`${lot.assetId}-${idx}`} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-2 px-2 max-w-[180px] truncate" title={lot.assetName}>
                {lot.assetName}
              </td>
              <td className="py-2 px-2">
                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                  {formatAssetClass(lot.assetClass)}
                </Badge>
              </td>
              <td className="py-2 px-2 whitespace-nowrap text-muted-foreground">
                {format(parseISO(lot.purchaseDate), 'dd MMM yy')}
              </td>
              {showSellDate && (
                <td className="py-2 px-2 whitespace-nowrap text-muted-foreground">
                  {lot.sellDate ? format(parseISO(lot.sellDate), 'dd MMM yy') : '—'}
                </td>
              )}
              <td className="py-2 px-2 text-center text-muted-foreground">
                {lot.holdingMonths}m
              </td>
              <td className="py-2 px-2 text-center">
                <Badge variant={lot.isLongTerm ? 'default' : 'outline'} className="text-xs">
                  {lot.isLongTerm ? 'LT' : 'ST'}
                </Badge>
              </td>
              <td className="py-2 px-2 text-right whitespace-nowrap">
                {fmtINR(lot.costBasis)}
              </td>
              <td className="py-2 px-2 text-right whitespace-nowrap">
                {fmtINR(lot.saleProceeds)}
              </td>
              <td className={cn(
                "py-2 px-2 text-right whitespace-nowrap font-medium",
                lot.gain >= 0 ? 'text-positive' : 'text-negative'
              )}>
                {lot.gain >= 0 ? '+' : ''}{fmtINR(lot.gain)}
              </td>
              <td className="py-2 px-2 text-right whitespace-nowrap text-muted-foreground">
                ~{fmtINR(lot.estimatedTax)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
