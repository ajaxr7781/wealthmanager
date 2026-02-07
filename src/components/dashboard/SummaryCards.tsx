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
  BarChart3,
  PiggyBank,
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
      subValue: summary.total_unrealized_pl_aed !== null && summary.net_cash_invested_aed > 0
        ? formatPercent((summary.total_unrealized_pl_aed / summary.net_cash_invested_aed) * 100)
        : undefined,
      icon: summary.total_unrealized_pl_aed !== null && summary.total_unrealized_pl_aed >= 0 ? TrendingUp : TrendingDown,
      positive: summary.total_unrealized_pl_aed !== null && summary.total_unrealized_pl_aed >= 0,
      negative: summary.total_unrealized_pl_aed !== null && summary.total_unrealized_pl_aed < 0,
      description: 'On current holdings',
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
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <card.icon className={cn(
              "h-4 w-4",
              card.positive && "text-positive",
              card.negative && "text-negative",
              !card.positive && !card.negative && "text-muted-foreground"
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-semibold",
              card.positive && "text-positive",
              card.negative && "text-negative"
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