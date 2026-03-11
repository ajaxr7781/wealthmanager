import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingDown, Download, Calendar, Award, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Asset } from '@/types/assets';

interface PerformanceLeaderboardProps {
  assets: Asset[];
}

function calculateCAGR(invested: number, current: number, purchaseDate: string): number | null {
  const days = differenceInDays(new Date(), new Date(purchaseDate));
  if (days < 30 || invested <= 0 || current <= 0) return null;
  const years = days / 365.25;
  return (Math.pow(current / invested, 1 / years) - 1) * 100;
}

interface RankedAsset {
  id: string;
  name: string;
  investedAed: number;
  currentValueAed: number;
  absoluteGain: number;
  returnPct: number;
  cagr: number | null;
  purchaseDate: string;
  rank: number;
}

function rankAssets(assets: Asset[], convertToAed: (v: number, cur: string) => number): RankedAsset[] {
  return assets
    .map(a => {
      const invested = convertToAed(Number(a.total_cost) || 0, a.currency);
      const currentValue = convertToAed(Number(a.current_value) || Number(a.total_cost) || 0, a.currency);
      const absoluteGain = currentValue - invested;
      const returnPct = invested > 0 ? (absoluteGain / invested) * 100 : 0;
      const cagr = calculateCAGR(invested, currentValue, a.purchase_date);
      return { id: a.id, name: a.asset_name, investedAed: invested, currentValueAed: currentValue, absoluteGain, returnPct, cagr, purchaseDate: a.purchase_date, rank: 0 };
    })
    .sort((a, b) => b.returnPct - a.returnPct)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

function exportLeaderboardCSV(ranked: RankedAsset[], symbol: string) {
  const headers = ['Rank', 'Asset Name', `Invested (${symbol})`, `Current Value (${symbol})`, `Gain (${symbol})`, 'Return %', 'CAGR %', 'Purchase Date'];
  const rows = ranked.map(a => [
    a.rank, a.name, a.investedAed.toFixed(4), a.currentValueAed.toFixed(4),
    a.absoluteGain.toFixed(4), a.returnPct.toFixed(4),
    a.cagr !== null ? a.cagr.toFixed(4) : 'N/A', a.purchaseDate
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const el = document.createElement('a');
  el.href = url;
  el.download = `performance-leaderboard-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  el.click();
  URL.revokeObjectURL(url);
}

export function PerformanceLeaderboard({ assets }: PerformanceLeaderboardProps) {
  const { formatAed, symbol, rates } = useCurrency();
  
  // Convert asset values to AED base first, then display via formatAed
  const convertToAed = (value: number, currency: string): number => {
    if (currency === 'INR') return value * (rates.inrToAed || 0.044);
    return value; // AED or USD already handled
  };

  const ranked = rankAssets(assets, convertToAed);
  const top5 = ranked.filter(a => a.returnPct > 0).slice(0, 5);
  const bottom5 = ranked.filter(a => a.returnPct < 0).slice(-5).reverse();

  const fmt = (v: number) => formatAed(v, { decimals: 0 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <Button variant="outline" size="sm" onClick={() => exportLeaderboardCSV(ranked, symbol)} disabled={ranked.length === 0}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-positive">
              <Award className="h-5 w-5" /> Top 5 Performers
            </CardTitle>
            <CardDescription>Best performing assets by return %</CardDescription>
          </CardHeader>
          <CardContent>
            {top5.length > 0 ? (
              <div className="space-y-3">
                {top5.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-primary w-6 text-center">#{a.rank}</span>
                      <div>
                        <p className="font-medium text-sm text-foreground">{a.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(a.purchaseDate), 'MMM yyyy')}
                          {a.cagr !== null && <span>· CAGR {a.cagr.toFixed(4)}%</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-positive flex items-center gap-0.5 justify-end">
                        <ArrowUpRight className="h-3 w-3" />+{a.returnPct.toFixed(4)}%
                      </p>
                      <p className="text-xs text-muted-foreground">+{fmt(a.absoluteGain)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No profitable assets yet</p>
            )}
          </CardContent>
        </Card>

        {/* Bottom Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-negative">
              <TrendingDown className="h-5 w-5" /> Bottom 5 Performers
            </CardTitle>
            <CardDescription>Assets with lowest returns</CardDescription>
          </CardHeader>
          <CardContent>
            {bottom5.length > 0 ? (
              <div className="space-y-3">
                {bottom5.map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-negative w-6 text-center">#{a.rank}</span>
                      <div>
                        <p className="font-medium text-sm text-foreground">{a.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(a.purchaseDate), 'MMM yyyy')}
                          {a.cagr !== null && <span>· CAGR {a.cagr.toFixed(4)}%</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-negative flex items-center gap-0.5 justify-end">
                        <ArrowDownRight className="h-3 w-3" />{a.returnPct.toFixed(4)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{fmt(a.absoluteGain)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No underperforming assets</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader>
          <CardTitle>Full Performance Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Rank</th>
                  <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Asset</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Invested</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Current</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Gain</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Return</th>
                  <th className="text-right py-2 px-3 font-semibold text-muted-foreground">CAGR</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map(a => {
                  const isProfit = a.returnPct >= 0;
                  return (
                    <tr key={a.id} className="border-b border-border hover:bg-accent/50">
                      <td className="py-2 px-3 font-bold text-muted-foreground">#{a.rank}</td>
                      <td className="py-2 px-3 font-medium">{a.name}</td>
                      <td className="text-right py-2 px-3">{fmt(a.investedAed)}</td>
                      <td className="text-right py-2 px-3">{fmt(a.currentValueAed)}</td>
                      <td className={cn("text-right py-2 px-3", isProfit ? "text-positive" : "text-negative")}>
                        {isProfit ? '+' : ''}{fmt(a.absoluteGain)}
                      </td>
                      <td className={cn("text-right py-2 px-3 font-medium", isProfit ? "text-positive" : "text-negative")}>
                        {isProfit ? '+' : ''}{a.returnPct.toFixed(1)}%
                      </td>
                      <td className="text-right py-2 px-3">{a.cagr !== null ? `${a.cagr.toFixed(1)}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
