import { AppLayout } from '@/components/layout/AppLayout';
import { useDefaultPortfolio } from '@/hooks/usePortfolios';
import { usePortfolioSummary } from '@/hooks/usePortfolioSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Circle, Info } from 'lucide-react';
import { formatOz, formatGrams, formatCurrency, formatPercent, formatPL, ozToGrams, pricePerOzToPerGram } from '@/lib/calculations';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export default function Holdings() {
  const { data: portfolio, isLoading: portfolioLoading } = useDefaultPortfolio();
  const { data: summary, isLoading: summaryLoading } = usePortfolioSummary(portfolio?.id);

  const isLoading = portfolioLoading || summaryLoading;

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Holdings</h1>
          <p className="text-muted-foreground">Your current precious metals positions</p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        ) : summary ? (
          <div className="grid gap-6 md:grid-cols-2">
            {summary.instruments.map((inst) => {
              const pl = formatPL(inst.unrealized_pl_aed);
              const isGold = inst.symbol === 'XAU';
              
              return (
                <Card key={inst.symbol} className="card-gold-border shadow-luxury">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", isGold ? "gold-gradient" : "bg-silver")}>
                        {isGold ? <Coins className="h-5 w-5 text-white" /> : <Circle className="h-5 w-5 text-white fill-white" />}
                      </div>
                      <span>{inst.name} ({inst.symbol})</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <MetricRow label="Holdings (oz)" value={formatOz(inst.holding_oz)} />
                      <MetricRow label="Holdings (g)" value={formatGrams(inst.holding_grams)} />
                      <MetricRow label="Avg Cost (AED/oz)" value={formatCurrency(inst.average_cost_aed_per_oz, false)} tooltip={`Total cost basis: ${formatCurrency(inst.cost_basis_aed)}`} />
                      <MetricRow label="Avg Cost (AED/g)" value={formatCurrency(inst.average_cost_aed_per_gram, false)} />
                      <MetricRow label="Break-even (AED/oz)" value={formatCurrency(inst.break_even_aed_per_oz, false)} />
                      <MetricRow label="Break-even (AED/g)" value={formatCurrency(inst.break_even_aed_per_gram, false)} />
                    </div>
                    <div className="border-t pt-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Value</span>
                        <span className="font-bold">{inst.current_value_aed !== null ? formatCurrency(inst.current_value_aed) : 'Price missing'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Unrealized P/L</span>
                        <span className={cn("font-bold", pl.colorClass)}>{pl.text} {inst.unrealized_pl_pct !== null && `(${formatPercent(inst.unrealized_pl_pct)})`}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No holdings yet.</CardContent></Card>
        )}
      </div>
    </AppLayout>
  );
}

function MetricRow({ label, value, tooltip }: { label: string; value: string; tooltip?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {tooltip && (
          <Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger><TooltipContent>{tooltip}</TooltipContent></Tooltip>
        )}
      </div>
      <p className="font-mono font-medium">{value}</p>
    </div>
  );
}
