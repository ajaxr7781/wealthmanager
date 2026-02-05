import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssets, useUserSettings } from '@/hooks/useAssets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Calendar, ChevronRight, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, format, parseISO } from 'date-fns';
import { DEFAULT_INR_TO_AED } from '@/types/assets';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FilterDays = '30' | '60' | '90';

export function FDMaturityAlerts() {
  const [filterDays, setFilterDays] = useState<FilterDays>('90');
  const { data: assets, isLoading } = useAssets();
  const { data: settings } = useUserSettings();
  
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;
  const maxDays = parseInt(filterDays);

  // Filter FDs with upcoming maturity (within selected days)
  const upcomingMaturities = assets
    ?.filter(a => {
      if (a.asset_type !== 'fixed_deposit' && a.asset_type_code !== 'fixed_deposit') return false;
      if (!a.maturity_date) return false;
      
      const daysToMaturity = differenceInDays(parseISO(a.maturity_date), new Date());
      return daysToMaturity >= 0 && daysToMaturity <= maxDays;
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
      return <Badge variant="warning" className="text-xs">This Month</Badge>;
    } else {
      return <Badge variant="secondary" className="text-xs">{days} days</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Bell className="h-4 w-4 text-primary" />
            Upcoming FD Maturities
          </CardTitle>
          <Select value={filterDays} onValueChange={(v) => setFilterDays(v as FilterDays)}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="60">60 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Total Maturity Summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-positive/5 border border-positive/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-positive" />
            <span className="text-sm font-medium text-foreground">Total Maturing</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-positive">
              AED {totalMaturityValueAed.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground">
              {upcomingMaturities.length} FD{upcomingMaturities.length !== 1 ? 's' : ''} in next {filterDays} days
            </p>
          </div>
        </div>

        {/* Individual FD List */}
        {upcomingMaturities.map((fd) => (
          <Link
            key={fd.id}
            to={`/assets/${fd.id}`}
            className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                fd.daysToMaturity <= 7 ? "bg-destructive/10" : "bg-primary/10"
              )}>
                {fd.daysToMaturity <= 7 ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <Calendar className="h-4 w-4 text-primary" />
                )}
              </div>
              <div>
                <p className="font-medium text-sm text-foreground line-clamp-1">{fd.asset_name}</p>
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
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}