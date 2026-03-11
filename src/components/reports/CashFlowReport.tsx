import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowDownCircle, Clock, AlertCircle } from 'lucide-react';
import { format, differenceInDays, addMonths } from 'date-fns';
import type { Asset, PortfolioOverview } from '@/types/assets';

interface CashFlowReportProps {
  overview: PortfolioOverview;
  assets: Asset[];
  sips: Asset[];
}

function formatAED(v: number) {
  return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatINR(v: number) {
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function getNextSipDueDateFromAsset(asset: Asset): Date | null {
  if (!asset.sip_day_of_month) return null;
  const today = new Date();
  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), asset.sip_day_of_month);
  return dueThisMonth >= today ? dueThisMonth : new Date(today.getFullYear(), today.getMonth() + 1, asset.sip_day_of_month);
}

export function CashFlowReport({ overview, assets, sips }: CashFlowReportProps) {
  // Monthly SIP outflow
  const activeSips = sips.filter(s => s.sip_status === 'ACTIVE');
  const monthlySipINR = activeSips.reduce((s, sip) => s + Number(sip.sip_amount || 0), 0);

  // Upcoming SIPs this month
  const today = new Date();
  const upcomingSips = activeSips
    .map(sip => ({ ...sip, nextDue: getNextSipDueDateFromAsset(sip) }))
    .filter(s => s.nextDue && s.nextDue.getMonth() === today.getMonth() && s.nextDue.getFullYear() === today.getFullYear())
    .sort((a, b) => (a.nextDue?.getTime() || 0) - (b.nextDue?.getTime() || 0));

  // FD Maturity timeline
  const fdAssets = assets.filter(a =>
    a.asset_type === 'fixed_deposit' || a.category_code === 'banking_fi'
  ).filter(a => a.maturity_date);

  const upcomingMaturities = fdAssets
    .map(a => ({
      name: a.asset_name,
      maturityDate: a.maturity_date!,
      amount: Number(a.maturity_amount) || Number(a.current_value) || Number(a.total_cost) || 0,
      daysLeft: differenceInDays(new Date(a.maturity_date!), today),
      currency: a.currency,
    }))
    .filter(a => a.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  // Annual investment contribution (by purchase year)
  const yearlyContributions = new Map<number, number>();
  for (const a of assets) {
    const year = new Date(a.purchase_date).getFullYear();
    yearlyContributions.set(year, (yearlyContributions.get(year) || 0) + Number(a.total_cost));
  }
  const sortedYears = Array.from(yearlyContributions.entries()).sort((a, b) => b[0] - a[0]);

  return (
    <div className="space-y-6">
      {/* Monthly Outflow Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <ArrowDownCircle className="h-4 w-4" /> Monthly SIP Outflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{formatINR(monthlySipINR)}</div>
            <p className="text-xs text-muted-foreground mt-1">{activeSips.length} active SIPs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-4 w-4" /> SIPs Due This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{upcomingSips.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {upcomingSips.length > 0 ? `Next: ${format(upcomingSips[0].nextDue!, 'MMM d')}` : 'None pending'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> Upcoming Maturities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{upcomingMaturities.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {upcomingMaturities.length > 0 ? `Next in ${upcomingMaturities[0].daysLeft} days` : 'None upcoming'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming SIP Obligations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> SIP Obligations
            </CardTitle>
            <CardDescription>Upcoming SIP payments this month</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingSips.length > 0 ? (
              <div className="space-y-3">
                {upcomingSips.map(sip => (
                  <div key={sip.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="font-medium text-sm">{sip.asset_name || 'SIP'}</p>
                      <p className="text-xs text-muted-foreground">
                        Due: {sip.nextDue ? format(sip.nextDue, 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                    <span className="font-medium text-sm">{formatINR(Number(sip.sip_amount || 0))}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No SIPs due this month</p>
            )}
          </CardContent>
        </Card>

        {/* Maturity Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" /> Maturity Timeline
            </CardTitle>
            <CardDescription>FDs and fixed-income instruments maturing soon</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingMaturities.length > 0 ? (
              <div className="space-y-3">
                {upcomingMaturities.slice(0, 8).map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                    <div>
                      <p className="font-medium text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(m.maturityDate), 'MMM d, yyyy')} · {m.daysLeft} days left
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-sm">
                        {m.currency === 'INR' ? formatINR(m.amount) : formatAED(m.amount)}
                      </span>
                      {m.daysLeft <= 30 && (
                        <Badge variant="outline" className="ml-2 text-warning border-warning/50">
                          <AlertCircle className="h-3 w-3 mr-0.5" /> Soon
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No upcoming maturities</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Annual Contribution Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Annual Contribution Trend</CardTitle>
          <CardDescription>Yearly investment contributions</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedYears.length > 0 ? (
            <div className="space-y-3">
              {sortedYears.map(([year, amount]) => {
                const maxAmount = Math.max(...sortedYears.map(y => y[1]));
                const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                return (
                  <div key={year} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{year}</span>
                      <span className="text-muted-foreground">{formatAED(amount)}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No contribution data</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
