import { Link } from 'react-router-dom';
import { useAssets, useUserSettings } from '@/hooks/useAssets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, ChevronRight, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, format, parseISO } from 'date-fns';
import { DEFAULT_INR_TO_AED } from '@/types/assets';

export function FDMaturityAlerts() {
  const { data: assets, isLoading } = useAssets();
  const { data: settings } = useUserSettings();
  
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  // Filter FDs with upcoming maturity (within 90 days)
  const upcomingMaturities = assets
    ?.filter(a => {
      if (a.asset_type !== 'fixed_deposit' && a.asset_type_code !== 'fixed_deposit') return false;
      if (!a.maturity_date) return false;
      
      const daysToMaturity = differenceInDays(parseISO(a.maturity_date), new Date());
      return daysToMaturity >= 0 && daysToMaturity <= 90;
    })
    .map(a => ({
      ...a,
      daysToMaturity: differenceInDays(parseISO(a.maturity_date!), new Date()),
      maturityAmountAed: a.maturity_amount 
        ? a.currency === 'INR' 
          ? Number(a.maturity_amount) * inrToAed 
          : Number(a.maturity_amount)
        : 0,
    }))
    .sort((a, b) => a.daysToMaturity - b.daysToMaturity)
    .slice(0, 5) || [];

  // Calculate total maturity value in AED
  const totalMaturityValueAed = upcomingMaturities.reduce(
    (sum, fd) => sum + fd.maturityAmountAed,
    0
  );

  if (isLoading || upcomingMaturities.length === 0) {
    return null;
  }

  const getUrgencyBadge = (days: number) => {
    if (days <= 7) {
      return <Badge variant="destructive" className="text-xs">This Week</Badge>;
    } else if (days <= 30) {
      return <Badge className="bg-warning text-warning-foreground text-xs">This Month</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">{days} days</Badge>;
    }
  };

  return (
    <Card className="shadow-luxury border-warning/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-warning" />
          Upcoming FD Maturities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total Maturity Summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-positive/10 border border-positive/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-positive" />
            <span className="text-sm font-medium">Total Maturing</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-positive">
              AED {totalMaturityValueAed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">
              {upcomingMaturities.length} FD{upcomingMaturities.length !== 1 ? 's' : ''} in next 90 days
            </p>
          </div>
        </div>

        {/* Individual FD List */}
        {upcomingMaturities.map((fd) => (
          <Link
            key={fd.id}
            to={`/assets/${fd.id}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                fd.daysToMaturity <= 7 ? "bg-destructive/10" : "bg-warning/10"
              )}>
                {fd.daysToMaturity <= 7 ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <Calendar className="h-4 w-4 text-warning" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm line-clamp-1">{fd.asset_name}</p>
                <p className="text-xs text-muted-foreground">
                  {fd.bank_name && `${fd.bank_name} • `}
                  Matures {format(parseISO(fd.maturity_date!), 'dd MMM yyyy')}
                </p>
                {fd.maturity_amount && (
                  <div className="mt-0.5">
                    {fd.currency === 'INR' ? (
                      <>
                        <p className="text-xs font-medium text-positive">
                          ₹{Number(fd.maturity_amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ≈ AED {fd.maturityAmountAed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs font-medium text-positive">
                        AED {Number(fd.maturity_amount).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getUrgencyBadge(fd.daysToMaturity)}
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}