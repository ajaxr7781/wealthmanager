import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Landmark, CreditCard, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  stats: {
    current: number;
    totalValue: number;
    totalLiabilities: number;
    change: number;
    changePct: number;
  };
  period: string;
  fmtCurrency: (v: number) => string;
}

export function NetWorthSummaryCards({ stats, period, fmtCurrency }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" /> Net Worth
          </div>
          <p className="text-2xl font-bold">{fmtCurrency(stats.current)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Landmark className="h-4 w-4" /> Total Assets
          </div>
          <p className="text-2xl font-bold">{fmtCurrency(stats.totalValue)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CreditCard className="h-4 w-4" /> Liabilities
          </div>
          <p className="text-2xl font-bold text-destructive">{fmtCurrency(stats.totalLiabilities)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            {stats.change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            Change ({period})
          </div>
          <p className={cn("text-2xl font-bold", stats.change >= 0 ? 'text-positive' : 'text-negative')}>
            {stats.change >= 0 ? '+' : ''}{fmtCurrency(stats.change)}
          </p>
          <p className={cn("text-sm", stats.change >= 0 ? 'text-positive' : 'text-negative')}>
            {stats.changePct >= 0 ? '+' : ''}{stats.changePct.toFixed(4)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
