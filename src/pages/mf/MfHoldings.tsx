import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssets } from '@/hooks/useAssets';
import { useRefreshMfNav } from '@/hooks/useMfNav';
import { 
  Plus, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Edit,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MfHoldingsPage() {
  const { data: allAssets, isLoading } = useAssets();
  const refreshNav = useRefreshMfNav();

  // Filter to MF assets only
  const holdings = allAssets?.filter(a => a.asset_type === 'mutual_fund') || [];

  const totalInvested = holdings.reduce((sum, h) => sum + Number(h.total_cost), 0);
  const totalValue = holdings.reduce((sum, h) => sum + (Number(h.current_value) || Number(h.total_cost)), 0);
  const unrealizedGain = totalValue - totalInvested;
  const returnPct = totalInvested > 0 ? (unrealizedGain / totalInvested) * 100 : 0;

  const handleRefreshAll = () => {
    refreshNav.mutate(undefined);
  };

  const fmtINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Mutual Fund Holdings</h1>
            <p className="text-muted-foreground">
              {holdings.length} holding{holdings.length !== 1 ? 's' : ''} from unified portfolio
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefreshAll}
              disabled={refreshNav.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshNav.isPending ? 'animate-spin' : ''}`} />
              Refresh NAVs
            </Button>
            <Button asChild>
              <Link to="/assets/new">
                <Plus className="h-4 w-4 mr-2" />
                Add Holding
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Total Invested</p>
              <p className="text-2xl font-bold">{fmtINR(totalInvested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold">{fmtINR(totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Unrealized Gain</p>
              <p className={cn("text-2xl font-bold flex items-center gap-1",
                unrealizedGain >= 0 ? 'text-positive' : 'text-negative'
              )}>
                {unrealizedGain >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {fmtINR(Math.abs(unrealizedGain))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Returns</p>
              <p className={cn("text-2xl font-bold",
                returnPct >= 0 ? 'text-positive' : 'text-negative'
              )}>
                {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Holdings List */}
        <div className="space-y-4">
          {holdings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No mutual fund holdings yet.</p>
                <Button asChild>
                  <Link to="/assets/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Holding
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            holdings.map((holding) => {
              const invested = Number(holding.total_cost);
              const value = Number(holding.current_value) || invested;
              const gain = value - invested;
              const pct = invested > 0 ? (gain / invested) * 100 : 0;

              return (
                <Card key={holding.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{holding.asset_name}</h3>
                          {holding.folio_no && (
                            <Badge variant="secondary" className="text-xs">
                              {holding.folio_no}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {holding.units_held && <span>Units: {Number(holding.units_held).toFixed(4)}</span>}
                          {holding.nav_or_price && <span>NAV: ₹{Number(holding.nav_or_price).toFixed(4)}</span>}
                          {holding.instrument_name && <span>{holding.instrument_name}</span>}
                        </div>
                      </div>
                      
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="text-right space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Invested: {fmtINR(invested)}
                          </p>
                          <p className="font-semibold">
                            Value: {fmtINR(value)}
                          </p>
                          <p className={cn("text-sm font-medium",
                            gain >= 0 ? 'text-positive' : 'text-negative'
                          )}>
                            {gain >= 0 ? '+' : ''}{fmtINR(gain)} ({pct >= 0 ? '+' : ''}{pct.toFixed(1)}%)
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/asset/${holding.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/asset/${holding.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
