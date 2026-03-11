import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Coins, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PortfolioSummary, InstrumentSummary } from '@/lib/calculations';
import { formatCurrency, formatOz, formatGrams, pricePerOzToPerGram } from '@/lib/calculations';

interface PreciousMetalsAnalysisProps {
  summary: PortfolioSummary | null;
  totalPortfolioValue: number;
}

function formatAED(v: number) {
  return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function MetalCard({ inst, totalPortfolioValue }: { inst: InstrumentSummary; totalPortfolioValue: number }) {
  const allocationPct = totalPortfolioValue > 0 && inst.current_value_aed
    ? (inst.current_value_aed / totalPortfolioValue) * 100
    : 0;

  const isProfit = (inst.unrealized_pl_aed ?? 0) >= 0;

  // Simulation: ±10% price change
  const sim10Up = inst.current_price_aed_per_oz !== null && inst.holding_oz > 0
    ? inst.holding_oz * inst.current_price_aed_per_oz * 1.1
    : null;
  const sim10Down = inst.current_price_aed_per_oz !== null && inst.holding_oz > 0
    ? inst.holding_oz * inst.current_price_aed_per_oz * 0.9
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Coins className={cn("h-5 w-5", inst.symbol === 'XAU' ? "text-gold-metal" : "text-silver-metal")} />
          {inst.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Holdings</p>
            <p className="font-medium">{formatOz(inst.holding_oz)}</p>
            <p className="text-xs text-muted-foreground">{formatGrams(inst.holding_grams)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Avg Buy Price</p>
            <p className="font-medium">{formatAED(inst.average_cost_aed_per_oz)}/oz</p>
            <p className="text-xs text-muted-foreground">{formatAED(inst.average_cost_aed_per_gram)}/g</p>
          </div>
          <div>
            <p className="text-muted-foreground">Current Price</p>
            <p className="font-medium">
              {inst.current_price_aed_per_oz !== null ? `${formatAED(inst.current_price_aed_per_oz)}/oz` : '—'}
            </p>
            <p className="text-xs text-muted-foreground">
              {inst.current_price_aed_per_gram !== null ? `${formatAED(inst.current_price_aed_per_gram)}/g` : ''}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total Value</p>
            <p className="font-medium">
              {inst.current_value_aed !== null ? formatAED(inst.current_value_aed) : '—'}
            </p>
            <p className="text-xs text-muted-foreground">{allocationPct.toFixed(1)}% of portfolio</p>
          </div>
        </div>

        {/* P/L */}
        <div className={cn("p-3 rounded-lg", isProfit ? "bg-positive/10" : "bg-negative/10")}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Unrealized P/L</span>
            <span className={cn("font-medium text-sm flex items-center gap-1", isProfit ? "text-positive" : "text-negative")}>
              {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {inst.unrealized_pl_aed !== null ? formatAED(inst.unrealized_pl_aed) : '—'}
              {inst.unrealized_pl_pct !== null && (
                <span className="ml-1">({inst.unrealized_pl_pct >= 0 ? '+' : ''}{inst.unrealized_pl_pct.toFixed(1)}%)</span>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-muted-foreground">Realized P/L</span>
            <span className={cn("font-medium text-sm", inst.realized_pl_aed >= 0 ? "text-positive" : "text-negative")}>
              {inst.realized_pl_aed >= 0 ? '+' : ''}{formatAED(inst.realized_pl_aed)}
            </span>
          </div>
        </div>

        {/* Price Simulation */}
        {sim10Up !== null && sim10Down !== null && inst.current_value_aed !== null && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Price Impact Simulation</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-positive" />
                <span className="text-muted-foreground">+10%:</span>
                <span className="font-medium text-positive">{formatAED(sim10Up)}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="h-3 w-3 text-negative" />
                <span className="text-muted-foreground">-10%:</span>
                <span className="font-medium text-negative">{formatAED(sim10Down)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PreciousMetalsAnalysis({ summary, totalPortfolioValue }: PreciousMetalsAnalysisProps) {
  if (!summary || summary.instruments.every(i => i.holding_oz === 0)) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No precious metals holdings found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {summary.instruments
        .filter(i => i.holding_oz > 0)
        .map(inst => (
          <MetalCard key={inst.symbol} inst={inst} totalPortfolioValue={totalPortfolioValue} />
        ))}
    </div>
  );
}
