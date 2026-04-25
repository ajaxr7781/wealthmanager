import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingDown, Calendar, Percent, Wallet, AlertTriangle } from 'lucide-react';
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
      (acc, { analysis }) => {
        acc.principal += 0; // placeholder – not used here
        acc.paid += analysis.totalPaid;
        acc.interestPaid += analysis.totalInterestPaid;
        acc.projectedInterest += analysis.projectedTotalInterest ?? 0;
        return acc;
      },
      { principal: 0, paid: 0, interestPaid: 0, projectedInterest: 0 }
    );
  }, [analyses]);

  const earliestPayoff = useMemo(() => {
    const dates = analyses.map((a) => a.analysis.payoffDate).filter(Boolean) as Date[];
    if (!dates.length) return null;
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  }, [analyses]);

  const latestPayoff = useMemo(() => {
    const dates = analyses.map((a) => a.analysis.payoffDate).filter(Boolean) as Date[];
    if (!dates.length) return null;
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }, [analyses]);

  if (!liabilities?.length) return null;

  return (
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
            <p className="text-xs text-muted-foreground mt-1">Across all loans, current EMI</p>
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
          <CardTitle className="text-base">Per-Liability Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[820px]">
            <TableHeader>
              <TableRow>
                <TableHead>Liability</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Paid Principal</TableHead>
                <TableHead className="text-right">Interest Paid</TableHead>
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
                    {analysis.isOverpaying && (
                      <Badge variant="outline" className="mt-1 text-xs gap-1">
                        <AlertTriangle className="h-3 w-3" /> Paying above schedule
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[160px]">
                    <div className="flex items-center gap-2">
                      <Progress value={analysis.progressPct} className="h-2 flex-1" />
                      <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                        {analysis.progressPct.toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatCurrency(analysis.paidPrincipal)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-destructive">
                    {analysis.totalInterestPaid > 0 ? formatCurrency(analysis.totalInterestPaid) : '—'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {formatMonths(analysis.monthsRemaining)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {analysis.payoffDate ? format(analysis.payoffDate, 'MMM yyyy') : '—'}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium">
                    {analysis.projectedTotalCost ? formatCurrency(analysis.projectedTotalCost) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
