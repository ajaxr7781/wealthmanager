import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, BarChart3, PiggyBank, Shield, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PortfolioSummary, formatPercent } from '@/lib/calculations';
import { useLiabilitySummary } from '@/hooks/useLiabilities';
import { useCurrency } from '@/contexts/CurrencyContext';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SummaryCardsProps {
  summary: PortfolioSummary;
}

export function SummaryCards({ summary }: SummaryCardsProps) {
  const { totalOutstanding, totalEmi, isLoading: liabLoading } = useLiabilitySummary();
  const { formatAed } = useCurrency();

  const fmt = (value: number | null) => value !== null ? formatAed(value) : '—';

  const portfolioValue = summary.net_cash_invested_aed + (summary.total_unrealized_pl_aed ?? 0);
  const netWorth = portfolioValue - totalOutstanding;

  const cards = [
    {
      title: 'Total Assets',
      value: fmt(summary.net_cash_invested_aed + (summary.total_unrealized_pl_aed ?? 0)),
      icon: Wallet,
      description: `Invested: ${fmt(summary.net_cash_invested_aed)}`,
      tooltip: 'Total current market value of all your assets',
    },
    {
      title: 'Total Liabilities',
      value: fmt(totalOutstanding),
      icon: Minus,
      description: totalEmi > 0 ? `Monthly EMI: ${fmt(totalEmi)}` : 'No active liabilities',
      negative: totalOutstanding > 0,
      tooltip: 'Sum of all outstanding loans and obligations',
    },
    {
      title: 'Net Worth',
      value: fmt(netWorth),
      icon: Shield,
      positive: netWorth >= 0,
      negative: netWorth < 0,
      description: 'Assets minus liabilities',
      tooltip: 'Your total wealth: assets minus all liabilities',
    },
    {
      title: 'Unrealized P/L',
      value: summary.total_unrealized_pl_aed !== null
        ? fmt(summary.total_unrealized_pl_aed)
        : '—',
      subValue: summary.total_unrealized_pl_aed !== null && summary.net_cash_invested_aed > 0
        ? formatPercent((summary.total_unrealized_pl_aed / summary.net_cash_invested_aed) * 100)
        : undefined,
      icon: summary.total_unrealized_pl_aed !== null && summary.total_unrealized_pl_aed >= 0 ? TrendingUp : TrendingDown,
      positive: summary.total_unrealized_pl_aed !== null && summary.total_unrealized_pl_aed >= 0,
      negative: summary.total_unrealized_pl_aed !== null && summary.total_unrealized_pl_aed < 0,
      description: 'On current holdings',
      tooltip: 'Gain/loss on positions you still hold',
    },
    {
      title: 'Realized P/L',
      value: fmt(summary.total_realized_pl_aed),
      icon: PiggyBank,
      description: 'From completed sales',
      positive: summary.total_realized_pl_aed >= 0,
      negative: summary.total_realized_pl_aed < 0,
      tooltip: 'Profit or loss from assets you have sold',
    },
    {
      title: 'Total Return',
      value: summary.total_return_pct !== null
        ? formatPercent(summary.total_return_pct)
        : '—',
      icon: BarChart3,
      positive: summary.total_return_pct !== null && summary.total_return_pct >= 0,
      negative: summary.total_return_pct !== null && summary.total_return_pct < 0,
      tooltip: 'Overall return percentage including realized + unrealized gains',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Tooltip key={card.title}>
          <TooltipTrigger asChild>
            <Card className={cn(
              card.title === 'Net Worth' && 'ring-1 ring-primary/20'
            )}>
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
          </TooltipTrigger>
          {card.tooltip && (
            <TooltipContent><p>{card.tooltip}</p></TooltipContent>
          )}
        </Tooltip>
      ))}
    </div>
  );
}
