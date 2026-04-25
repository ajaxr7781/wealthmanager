import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingDown, Calendar, Percent, Wallet, AlertTriangle, Info, PieChart } from 'lucide-react';
import { useLiabilities } from '@/hooks/useLiabilities';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/calculations';
import { analyzeLiability, formatMonths } from '@/lib/liabilityCalculations';
import type { LiabilityPayment } from '@/hooks/useLiabilityPayments';
import { format } from 'date-fns';

/** Fetch all payments for the user in one query, grouped by liability_id */
function useAllLiabilityPayments() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-liability-payments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('liability_payments')
        .select('*')
        .order('payment_date', { ascending: true });
      if (error) throw error;
      const grouped: Record<string, LiabilityPayment[]> = {};
      (data || []).forEach((p) => {
        (grouped[p.liability_id] ||= []).push(p as LiabilityPayment);
      });
      return grouped;
    },
    enabled: !!user,
  });
}

export function LiabilityAnalysis() {
  const { data: liabilities } = useLiabilities();
  const { data: paymentsByLiability } = useAllLiabilityPayments();

  const analyses = useMemo(() => {
    if (!liabilities) return [];
    return liabilities.map((l) => ({
      liability: l,
      analysis: analyzeLiability(l, paymentsByLiability?.[l.id] || []),
    }));
  }, [liabilities, paymentsByLiability]);

  const totals = useMemo(() => {
    return analyses.reduce(
      (acc, { analysis, liability }) => {
        acc.principal += Number(liability.principal) || 0;
        acc.outstanding += Number(liability.outstanding) || 0;
        acc.paid += analysis.totalPaid;
        acc.interestPaid += analysis.totalInterestPaid;
        acc.projectedInterest += analysis.projectedTotalInterest ?? 0;
        acc.projectedCost += analysis.projectedTotalCost ?? 0;
        return acc;
      },
      { principal: 0, outstanding: 0, paid: 0, interestPaid: 0, projectedInterest: 0, projectedCost: 0 }
    );
  }, [analyses]);

  const overallInterestSharePct = totals.projectedCost > 0
    ? (totals.projectedInterest / totals.projectedCost) * 100
    : null;

  const latestPayoff = useMemo(() => {
    const dates = analyses.map((a) => a.analysis.payoffDate).filter(Boolean) as Date[];
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }, [analyses]);

  const earliestPayoff = useMemo(() => {
    const dates = analyses.map((a) => a.analysis.payoffDate).filter(Boolean) as Date[];
    if (!dates.length) return null;
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  }, [analyses]);

  if (!liabilities?.length) return null;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Summary metric cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xl font-semibold text-foreground">{formatCurrency(totals.paid)}</span>
              <p className="text-xs text-muted-foreground mt-1">
                Principal: {formatCurrency(totals.paid - totals.interestPaid)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5" /> Interest Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xl font-semibold text-destructive">{formatCurrency(totals.interestPaid)}</span>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.paid > 0 ? `${((totals.interestPaid / totals.paid) * 100).toFixed(1)}% of paid` : '—'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" /> Projected Interest
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xl font-semibold text-foreground">
                {totals.projectedInterest > 0 ? formatCurrency(totals.projectedInterest) : '—'}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {overallInterestSharePct != null
                  ? `${overallInterestSharePct.toFixed(1)}% of total cost`
                  : 'Across all loans'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Debt-Free By
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-xl font-semibold text-foreground">
                {latestPayoff ? format(latestPayoff, 'MMM yyyy') : '—'}
              </span>
              {earliestPayoff && latestPayoff && earliestPayoff.getTime() !== latestPayoff.getTime() && (
                <p className="text-xs text-muted-foreground mt-1">
                  First: {format(earliestPayoff, 'MMM yyyy')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-liability breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              Per-Liability Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Liability</TableHead>
                  <TableHead>Schedule Progress</TableHead>
                  <TableHead className="text-right">Paid Principal</TableHead>
                  <TableHead className="text-right">Interest Paid</TableHead>
                  <TableHead className="text-right">
                    <span className="inline-flex items-center gap-1">
                      APR
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          Effective annual reducing rate derived from EMI, principal & tenure. Banks often quote a lower flat rate.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  </TableHead>
                  <TableHead className="text-right">Months Left</TableHead>
                  <TableHead className="text-right">Payoff Date</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyses.map(({ liability, analysis }) => (
                  <TableRow key={liability.id}>
                    <TableCell>
                      <div className="font-medium whitespace-nowrap">{liability.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {analysis.installmentsTotal != null && (
                          <Badge variant="secondary" className="text-xs">
                            {analysis.installmentsPaid}/{analysis.installmentsTotal} paid
                          </Badge>
                        )}
                        {analysis.isFlatRateQuoted && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant="outline" className="text-xs gap-1 cursor-help">
                                <AlertTriangle className="h-3 w-3" /> Flat rate
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Quoted rate ({analysis.quotedRate.toFixed(2)}%) is flat-style. True reducing APR is ~{analysis.effectiveAprPct?.toFixed(2)}%.
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {analysis.isOverpaying && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <AlertTriangle className="h-3 w-3" /> Above schedule
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[160px]">
                      <div className="flex items-center gap-2">
                        <Progress value={analysis.scheduleProgressPct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                          {analysis.scheduleProgressPct.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatCurrency(analysis.paidPrincipal)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap text-destructive">
                      {analysis.totalInterestPaid > 0 ? formatCurrency(analysis.totalInterestPaid) : '—'}
                      {analysis.avgInterestPerEmi != null && analysis.avgInterestPerEmi > 0 && (
                        <div className="text-xs text-muted-foreground font-normal">
                          avg {formatCurrency(analysis.avgInterestPerEmi)}/mo
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {analysis.effectiveAprPct != null ? (
                        <>
                          {analysis.effectiveAprPct.toFixed(2)}%
                          {analysis.quotedRate > 0 && (
                            <div className="text-xs text-muted-foreground font-normal">
                              quoted {analysis.quotedRate.toFixed(2)}%
                            </div>
                          )}
                        </>
                      ) : (
                        `${analysis.quotedRate.toFixed(2)}%`
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatMonths(analysis.monthsRemaining)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {analysis.payoffDate ? format(analysis.payoffDate, 'MMM yyyy') : '—'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {analysis.projectedTotalCost ? (
                        <>
                          {formatCurrency(analysis.projectedTotalCost)}
                          {analysis.interestSharePct != null && (
                            <div className="text-xs text-muted-foreground font-normal">
                              {analysis.interestSharePct.toFixed(1)}% interest
                            </div>
                          )}
                        </>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
