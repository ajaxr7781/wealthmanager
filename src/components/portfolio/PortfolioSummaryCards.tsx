import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PortfolioOverview } from '@/types/assets';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Target,
  PieChart,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortfolioSummaryCardsProps {
  overview: PortfolioOverview;
}

export function PortfolioSummaryCards({ overview }: PortfolioSummaryCardsProps) {
  const isProfit = overview.total_profit_loss >= 0;
  const hasMf = overview.mf_summary && overview.mf_summary.holdings_count > 0;
  const hasSip = overview.sip_summary && overview.sip_summary.active_count > 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  // Calculate total asset count including MF holdings
  const assetCount = overview.assets_by_type.reduce((sum, a) => sum + a.count, 0) + 
    (overview.mf_summary?.holdings_count || 0);

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
      value: assetCount.toString(),
      icon: Target,
      description: `${overview.assets_by_type.length + (hasMf ? 1 : 0)} asset types`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main summary cards */}
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

      {/* MF and SIP summary cards */}
      {(hasMf || hasSip) && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Mutual Funds Card */}
          {hasMf && overview.mf_summary && (
            <Card className="card-gold-border shadow-luxury">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Mutual Funds
                </CardTitle>
                <PieChart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">
                    {formatINR(overview.mf_summary.current_value_inr)}
                  </span>
                  <span className={cn(
                    "text-sm font-medium",
                    overview.mf_summary.return_pct >= 0 ? "text-positive" : "text-negative"
                  )}>
                    {formatPercent(overview.mf_summary.return_pct)}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Invested: {formatINR(overview.mf_summary.total_invested_inr)}</span>
                  <span>•</span>
                  <span>{overview.mf_summary.holdings_count} holdings</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {formatCurrency(overview.mf_summary.current_value_aed)} in AED
                </p>
              </CardContent>
            </Card>
          )}

          {/* SIP Card */}
          {hasSip && overview.sip_summary && (
            <Card className="card-gold-border shadow-luxury">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly SIP Commitment
                </CardTitle>
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatINR(overview.sip_summary.monthly_commitment_inr)}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{overview.sip_summary.active_count} active SIPs</span>
                  {overview.sip_summary.total_count > overview.sip_summary.active_count && (
                    <>
                      <span>•</span>
                      <span>{overview.sip_summary.total_count - overview.sip_summary.active_count} paused/completed</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {formatCurrency(overview.sip_summary.monthly_commitment_aed)}/month in AED
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
