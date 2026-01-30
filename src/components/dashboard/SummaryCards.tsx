import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  PortfolioSummary, 
  formatCurrency, 
  formatPercent,
} from '@/lib/calculations';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PiggyBank,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardsProps {
  summary: PortfolioSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const cards = [
    {
      title: 'Net Cash Invested',
      value: formatCurrency(summary.net_cash_invested_aed),
      icon: Wallet,
      description: `Buys: ${formatCurrency(summary.total_buys_aed)} - Sells: ${formatCurrency(summary.total_sells_aed)}`,
    },
    {
      title: 'Current Value',
      value: summary.current_value_aed !== null 
        ? formatCurrency(summary.current_value_aed) 
        : 'Price missing',
      icon: DollarSign,
      description: summary.current_value_aed !== null ? 'Based on latest prices' : 'Update prices to see value',
      warning: summary.current_value_aed === null,
    },
    {
      title: 'Total P/L',
      value: summary.total_pl_aed !== null 
        ? formatCurrency(summary.total_pl_aed) 
        : '—',
      subValue: summary.total_return_pct !== null 
        ? formatPercent(summary.total_return_pct) 
        : undefined,
      icon: summary.total_pl_aed !== null && summary.total_pl_aed >= 0 ? TrendingUp : TrendingDown,
      positive: summary.total_pl_aed !== null && summary.total_pl_aed >= 0,
      negative: summary.total_pl_aed !== null && summary.total_pl_aed < 0,
    },
    {
      title: 'Total Return',
      value: summary.total_return_pct !== null 
        ? formatPercent(summary.total_return_pct) 
        : '—',
      icon: BarChart3,
      positive: summary.total_return_pct !== null && summary.total_return_pct >= 0,
      negative: summary.total_return_pct !== null && summary.total_return_pct < 0,
    },
    {
      title: 'Realized P/L',
      value: formatCurrency(summary.total_realized_pl_aed),
      icon: PiggyBank,
      description: 'From completed sales',
      positive: summary.total_realized_pl_aed >= 0,
      negative: summary.total_realized_pl_aed < 0,
    },
    {
      title: 'Unrealized P/L',
      value: summary.total_unrealized_pl_aed !== null 
        ? formatCurrency(summary.total_unrealized_pl_aed) 
        : '—',
      icon: TrendingUp,
      description: 'On current holdings',
      positive: summary.total_unrealized_pl_aed !== null && summary.total_unrealized_pl_aed >= 0,
      negative: summary.total_unrealized_pl_aed !== null && summary.total_unrealized_pl_aed < 0,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="card-gold-border shadow-luxury">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={cn(
              "h-4 w-4",
              card.positive && "text-positive",
              card.negative && "text-negative",
              card.warning && "text-accent",
              !card.positive && !card.negative && !card.warning && "text-muted-foreground"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              card.positive && "text-positive",
              card.negative && "text-negative",
              card.warning && "text-accent"
            )}>
              {card.value}
              {card.subValue && (
                <span className="ml-2 text-base font-medium">
                  ({card.subValue})
                </span>
              )}
            </div>
            {card.description && (
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
