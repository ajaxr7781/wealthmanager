import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveMfHoldings, useMfPortfolioSummary } from '@/hooks/useMfHoldings';
import { useRefreshMfNav } from '@/hooks/useMfNav';
import { formatINR, formatNAV, formatPercent } from '@/types/mutualFunds';
import { 
  Plus, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Eye,
  Edit,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export default function MfHoldingsPage() {
  const { data: holdings, isLoading } = useActiveMfHoldings();
  const summary = useMfPortfolioSummary();
  const refreshNav = useRefreshMfNav();

  const handleRefreshAll = () => {
    refreshNav.mutate(undefined); // Refresh all
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  // Find the latest NAV update time
  const latestUpdate = holdings?.reduce((latest, h) => {
    if (h.scheme?.nav_last_updated) {
      const updateTime = new Date(h.scheme.nav_last_updated);
      return updateTime > latest ? updateTime : latest;
    }
    return latest;
  }, new Date(0));

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Mutual Fund Holdings</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {latestUpdate && latestUpdate.getTime() > 0 
                ? `NAVs updated ${formatDistanceToNow(latestUpdate)} ago`
                : 'NAV not yet updated'}
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
              <Link to="/mf/holdings/new">
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
              <p className="text-2xl font-bold">{formatINR(summary.total_invested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold">{formatINR(summary.current_value)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Unrealized Gain</p>
              <p className={`text-2xl font-bold flex items-center gap-1 ${
                summary.unrealized_gain >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {summary.unrealized_gain >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {formatINR(Math.abs(summary.unrealized_gain))}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Returns</p>
              <p className={`text-2xl font-bold ${
                summary.return_pct >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatPercent(summary.return_pct)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Holdings List */}
        <div className="space-y-4">
          {!holdings || holdings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No mutual fund holdings yet.
                </p>
                <Button asChild>
                  <Link to="/mf/holdings/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Holding
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            holdings.map((holding) => {
              const scheme = holding.scheme;
              const gain = holding.unrealized_gain || 0;
              const returnPct = holding.absolute_return_pct || 0;
              
              return (
                <Card key={holding.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{scheme?.scheme_name || 'Unknown Scheme'}</h3>
                          {scheme?.plan_type && (
                            <Badge variant="secondary" className="text-xs">
                              {scheme.plan_type}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {holding.folio_no && <span>Folio: {holding.folio_no}</span>}
                          <span>Units: {holding.units_held.toFixed(4)}</span>
                          {scheme?.latest_nav && (
                            <span>NAV: ₹{formatNAV(scheme.latest_nav)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        <div className="text-right space-y-1">
                          <p className="text-sm text-muted-foreground">
                            Invested: {formatINR(holding.invested_amount)}
                          </p>
                          <p className="font-semibold">
                            Value: {formatINR(holding.current_value || 0)}
                          </p>
                          <p className={`text-sm font-medium ${
                            gain >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {gain >= 0 ? '+' : ''}{formatINR(gain)} ({formatPercent(returnPct)})
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/mf/holdings/${holding.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/mf/holdings/${holding.id}/edit`}>
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
