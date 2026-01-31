import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PortfolioOverview } from '@/types/assets';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioSummaryCardsProps {
  overview: PortfolioOverview;
}

export function PortfolioSummaryCards({ overview }: PortfolioSummaryCardsProps) {
  const isProfit = overview.total_profit_loss >= 0;

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
      title: 'Total Invested',
      value: formatCurrency(overview.total_invested),
      icon: Wallet,
      description: 'Net cash invested across all assets',
    },
    {
      title: 'Current Value',
      value: formatCurrency(overview.total_current_value),
      icon: DollarSign,
      description: 'Total current portfolio value',
    },
    {
      title: 'Total P/L',
      value: formatCurrency(overview.total_profit_loss),
      subValue: formatPercent(overview.total_profit_loss_percent),
      icon: isProfit ? TrendingUp : TrendingDown,
      positive: isProfit,
      negative: !isProfit,
    },
    {
      title: 'Asset Count',
      value: overview.assets_by_type.reduce((sum, a) => sum + a.count, 0).toString(),
      icon: Target,
      description: `${overview.assets_by_type.length} asset types`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      ))}
    </div>
  );
}
