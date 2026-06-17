import { Link } from 'react-router-dom';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Landmark, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRenewalChain } from '@/hooks/useRenewalChain';
import type { Asset } from '@/types/assets';

interface Props {
  asset: Asset;
}

export function RenewalChainTimeline({ asset }: Props) {
  const chainId = asset.renewal_chain_id || asset.id;
  const { data: chain, isLoading } = useRenewalChain(chainId);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  // Only show timeline if there is at least one renewal (>1 link)
  if (!chain || chain.length < 2) return null;

  const totalPrincipalSeed = Number(chain[0].principal) || Number(chain[0].total_cost) || 0;
  const totalInterestEarned = chain.reduce((sum, link, idx) => {
    // Interest realised on completed (renewed/closed) links
    if (link.lifecycle_status === 'renewed' || link.lifecycle_status === 'closed') {
      const principal = Number(link.principal) || 0;
      const maturity = Number(link.maturity_amount) || Number(link.current_value) || principal;
      return sum + Math.max(0, maturity - principal);
    }
    // Current link: use accrued (current_value - principal)
    if (idx === chain.length - 1) {
      const principal = Number(link.principal) || 0;
      const cv = Number(link.current_value) || principal;
      return sum + Math.max(0, cv - principal);
    }
    return sum;
  }, 0);

  const firstDate = parseISO(chain[0].purchase_date);
  const lastLink = chain[chain.length - 1];
  const lastDate = lastLink.maturity_date ? parseISO(lastLink.maturity_date) : new Date();
  const totalDays = Math.max(1, differenceInDays(lastDate, firstDate));
  const years = totalDays / 365.25;
  const blendedReturn = totalPrincipalSeed > 0 && years > 0
    ? (Math.pow((totalPrincipalSeed + totalInterestEarned) / totalPrincipalSeed, 1 / years) - 1) * 100
    : null;

  const currency = asset.currency;
  const fmt = (n: number) => `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <Card className="shadow-luxury">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Renewal History
        </CardTitle>
        <CardDescription>
          This deposit has been renewed {chain.length - 1} time{chain.length - 1 === 1 ? '' : 's'}.
          Total interest realised across the chain: <span className="font-semibold text-positive">{fmt(totalInterestEarned)}</span>
          {blendedReturn !== null && (
            <> · Blended CAGR: <span className="font-semibold">{blendedReturn.toFixed(2)}%</span> over {years.toFixed(1)} years</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative border-l border-border pl-6 space-y-4">
          {chain.map((link, idx) => {
            const isCurrent = link.id === asset.id;
            const principal = Number(link.principal) || Number(link.total_cost) || 0;
            const maturity = Number(link.maturity_amount) || 0;
            const interest = Math.max(0, maturity - principal);
            const status = link.lifecycle_status;
            const statusLabel =
              status === 'renewed' ? 'Renewed' :
              status === 'closed' ? 'Closed' :
              status === 'prematurely_closed' ? 'Closed early' :
              'Active';
            const statusClass =
              status === 'renewed' ? 'bg-muted text-muted-foreground' :
              status === 'closed' || status === 'prematurely_closed' ? 'bg-destructive/10 text-destructive' :
              'bg-positive/15 text-positive';
            return (
              <li key={link.id} className="relative">
                <span className={cn(
                  "absolute -left-[31px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background",
                  isCurrent ? "border-primary" : "border-border"
                )}>
                  <Landmark className={cn("h-3 w-3", isCurrent ? "text-primary" : "text-muted-foreground")} />
                </span>
                <Link
                  to={`/asset/${link.id}`}
                  className={cn(
                    "block rounded-md border p-3 hover:bg-muted/40 transition-colors group",
                    isCurrent && "border-primary/40 bg-primary/5"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                      <span className="font-medium text-sm truncate">{link.asset_name}</span>
                      <Badge className={cn("text-[10px]", statusClass)} variant="secondary">{statusLabel}</Badge>
                      {isCurrent && <Badge variant="outline" className="text-[10px]">Current</Badge>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Started</p>
                      <p className="font-medium">{format(parseISO(link.purchase_date), 'dd MMM yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Matures</p>
                      <p className="font-medium">{link.maturity_date ? format(parseISO(link.maturity_date), 'dd MMM yyyy') : '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Principal</p>
                      <p className="font-medium">{fmt(principal)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interest @ {link.interest_rate ?? '—'}%</p>
                      <p className="font-medium text-positive">+ {fmt(interest)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
