import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PortfolioOverview } from '@/types/assets';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Shield,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLiabilitySummary } from '@/hooks/useLiabilities';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PortfolioSummaryCardsProps {
  overview: PortfolioOverview;
}

export function PortfolioSummaryCards({ overview }: PortfolioSummaryCardsProps) {
  const isProfit = overview.total_profit_loss >= 0;
  const { totalOutstanding, totalEmi } = useLiabilitySummary();

  const netWorth = overview.total_current_value - totalOutstanding;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const cards = [
    {
      title: 'Total Assets',
      value: formatCurrency(overview.total_current_value),
      icon: Wallet,
      description: `Invested: ${formatCurrency(overview.total_invested)}`,
      tooltip: 'Total current market value of all your assets',
    },
    {
      title: 'Total Liabilities',
      value: formatCurrency(totalOutstanding),
      icon: Minus,
      description: totalEmi > 0 ? `Monthly EMI: ${formatCurrency(totalEmi)}` : 'No liabilities',
      negative: totalOutstanding > 0,
      tooltip: 'Sum of all outstanding loans and obligations',
    },
    {
      title: 'Net Worth',
      value: formatCurrency(netWorth),
      icon: Shield,
      positive: netWorth >= 0,
      negative: netWorth < 0,
      description: 'Assets minus liabilities',
      highlight: true,
      tooltip: 'Your total wealth after subtracting all liabilities',
    },
    {
      title: 'Total P/L',
      value: formatCurrency(overview.total_profit_loss),
      subValue: formatPercent(overview.total_profit_loss_percent),
      icon: isProfit ? TrendingUp : TrendingDown,
      positive: isProfit,
      negative: !isProfit,
      tooltip: 'Profit or loss across all holdings',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Tooltip key={card.title}>
          <TooltipTrigger asChild>
            <Card className={cn(
              "card-gold-border shadow-luxury",
              card.highlight && "ring-1 ring-primary/20"
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
                  "text-2xl font-bold",
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
          {card.tooltip && <TooltipContent><p>{card.tooltip}</p></TooltipContent>}
        </Tooltip>
      ))}
    </div>
  );
}
