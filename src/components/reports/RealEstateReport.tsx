import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/assets';

interface RealEstateReportProps {
  assets: Asset[];
  totalPortfolioValue: number;
}

function formatAED(v: number) {
  return `AED ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function RealEstateReport({ assets, totalPortfolioValue }: RealEstateReportProps) {
  const reAssets = assets.filter(a =>
    a.asset_type === 'real_estate' || a.category_code === 'real_assets'
  );

  if (reAssets.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No real estate holdings found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {reAssets.map(asset => {
        const cost = Number(asset.total_cost) || 0;
        const current = Number(asset.current_value) || cost;
        const pl = current - cost;
        const plPct = cost > 0 ? (pl / cost) * 100 : 0;
        const isProfit = pl >= 0;
        const days = differenceInDays(new Date(), new Date(asset.purchase_date));
        const years = days / 365.25;
        const cagr = years >= 0.08 && cost > 0 && current > 0
          ? (Math.pow(current / cost, 1 / years) - 1) * 100
          : null;
        const portfolioPct = totalPortfolioValue > 0 ? (current / totalPortfolioValue) * 100 : 0;

        return (
          <Card key={asset.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {asset.asset_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Purchase Cost</p>
                  <p className="font-medium">{formatAED(cost)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Value</p>
                  <p className="font-medium">{formatAED(current)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">CAGR</p>
                  <p className={cn("font-medium", (cagr ?? 0) >= 0 ? "text-positive" : "text-negative")}>
                    {cagr !== null ? `${cagr.toFixed(1)}%` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">% of Portfolio</p>
                  <p className="font-medium">{portfolioPct.toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Holding Period</p>
                  <p className="font-medium">{years.toFixed(1)} years</p>
                </div>
                {asset.location && (
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{asset.location}</p>
                  </div>
                )}
                {asset.rental_income_monthly && (
                  <div>
                    <p className="text-muted-foreground">Monthly Rental</p>
                    <p className="font-medium">{formatAED(Number(asset.rental_income_monthly))}</p>
                  </div>
                )}
                {asset.area_sqft && (
                  <div>
                    <p className="text-muted-foreground">Area</p>
                    <p className="font-medium">{Number(asset.area_sqft).toLocaleString()} sqft</p>
                  </div>
                )}
              </div>

              <div className={cn("p-3 rounded-lg flex items-center justify-between", isProfit ? "bg-positive/10" : "bg-negative/10")}>
                <span className="text-sm text-muted-foreground">P/L</span>
                <span className={cn("font-medium text-sm flex items-center gap-0.5", isProfit ? "text-positive" : "text-negative")}>
                  {isProfit ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {isProfit ? '+' : ''}{formatAED(pl)} ({plPct >= 0 ? '+' : ''}{plPct.toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
