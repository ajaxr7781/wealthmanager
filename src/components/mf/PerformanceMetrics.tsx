import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateCAGR } from '@/lib/xirrCalc';
import type { NavHistoryPoint } from '@/hooks/useNavHistory';

interface PerformanceMetricsProps {
  navHistory: NavHistoryPoint[] | undefined;
  latestNav: number | null;
  purchaseDate: string;
  invested: number;
  currentValue: number;
}

interface PeriodReturn {
  label: string;
  value: number | null;
}

function getNavAtDate(history: NavHistoryPoint[], targetDate: Date): number | null {
  const target = targetDate.toISOString().slice(0, 10);
  // Find closest NAV on or before target date
  let closest: NavHistoryPoint | null = null;
  for (const p of history) {
    if (p.nav_date <= target) {
      closest = p;
    } else {
      break;
    }
  }
  return closest ? Number(closest.nav_value) : null;
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

export function PerformanceMetrics({ navHistory, latestNav, purchaseDate, invested, currentValue }: PerformanceMetricsProps) {
  const metrics = useMemo(() => {
    if (!navHistory || navHistory.length === 0 || !latestNav) return null;

    const now = new Date();
    const currentNav = latestNav;

    // Day change
    const yesterday = navHistory.length >= 2 ? navHistory[navHistory.length - 2] : null;
    const dayChange = yesterday ? ((currentNav - Number(yesterday.nav_value)) / Number(yesterday.nav_value)) * 100 : null;

    // Period returns based on NAV
    const periods: { label: string; months: number }[] = [
      { label: '1M', months: 1 },
      { label: '3M', months: 3 },
      { label: '6M', months: 6 },
      { label: '1Y', months: 12 },
    ];

    const periodReturns: PeriodReturn[] = periods.map(({ label, months }) => {
      const pastDate = subtractMonths(now, months);
      const pastNav = getNavAtDate(navHistory, pastDate);
      if (!pastNav) return { label, value: null };
      return { label, value: ((currentNav - pastNav) / pastNav) * 100 };
    });

    // CAGR
    const purchaseDt = new Date(purchaseDate);
    const years = (now.getTime() - purchaseDt.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const cagr = invested > 0 && currentValue > 0 ? calculateCAGR(invested, currentValue, years) : null;

    return { dayChange, periodReturns, cagr };
  }, [navHistory, latestNav, purchaseDate, invested, currentValue]);

  if (!metrics) {
    return (
      <Card>
        <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Insufficient NAV history data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle>Performance Metrics</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {/* Day Change */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm font-medium">Day Change</span>
          <ReturnBadge value={metrics.dayChange} />
        </div>

        {/* Period Returns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.periodReturns.map((pr) => (
            <div key={pr.label} className="text-center p-3 rounded-lg border">
              <p className="text-xs text-muted-foreground mb-1">{pr.label} Return</p>
              <ReturnBadge value={pr.value} size="lg" />
            </div>
          ))}
        </div>

        {/* CAGR */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <span className="text-sm font-medium">CAGR</span>
          {metrics.cagr !== null ? (
            <ReturnBadge value={metrics.cagr * 100} />
          ) : (
            <span className="text-sm text-muted-foreground">Insufficient data</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReturnBadge({ value, size = 'sm' }: { value: number | null; size?: 'sm' | 'lg' }) {
  if (value === null) return <span className="text-sm text-muted-foreground">—</span>;

  const isPositive = value >= 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 font-semibold",
      size === 'lg' ? 'text-lg' : 'text-sm',
      isPositive ? 'text-positive' : 'text-negative'
    )}>
      <Icon className={size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
      {value >= 0 ? '+' : ''}{value.toFixed(4)}%
    </span>
  );
}
