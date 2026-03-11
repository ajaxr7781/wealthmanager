import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { History, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { format, addMonths, isBefore, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { AssetTransaction } from '@/hooks/useAssetTransactions';

const BACKFILL_NOTE = 'Auto-generated historical installment';

interface BackfillSipTransactionsProps {
  assetId: string;
  sipAmount: number;
  sipDayOfMonth: number;
  sipStartDate: string;
  sipEndDate: string | null;
  sipStatus: string | null;
  totalCost: number;
  unitsHeld: number | null;
  existingTransactions: AssetTransaction[] | undefined;
  currency: string;
}

interface GeneratedInstallment {
  date: Date;
  amount: number;
}

export function BackfillSipTransactions({
  assetId,
  sipAmount,
  sipDayOfMonth,
  sipStartDate,
  sipEndDate,
  sipStatus,
  totalCost,
  unitsHeld,
  existingTransactions,
  currency,
}: BackfillSipTransactionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [revertConfirmOpen, setRevertConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [maxInstallments, setMaxInstallments] = useState<string>('');

  // Count backfilled transactions (auto-generated ones)
  const backfilledTransactions = useMemo(() => {
    return existingTransactions?.filter(
      (tx) => tx.notes === BACKFILL_NOTE && tx.transaction_type === 'SIP_INSTALLMENT'
    ) || [];
  }, [existingTransactions]);

  // Compute which months already have transactions
  const existingMonths = useMemo(() => {
    const months = new Set<string>();
    existingTransactions?.forEach((tx) => {
      if (['SIP_INSTALLMENT', 'BUY', 'PURCHASE', 'SIP'].includes(tx.transaction_type)) {
        const d = new Date(tx.transaction_date);
        months.add(`${d.getFullYear()}-${d.getMonth()}`);
      }
    });
    return months;
  }, [existingTransactions]);

  // Generate all possible installments from start date to end date (or today)
  const allPossibleInstallments = useMemo(() => {
    if (!sipAmount || !sipStartDate || !sipDayOfMonth) return [];

    const start = new Date(sipStartDate);
    const endLimit = sipEndDate ? new Date(sipEndDate) : new Date();
    const today = startOfDay(new Date());
    const end = isBefore(endLimit, today) ? endLimit : today;

    const results: GeneratedInstallment[] = [];
    let current = new Date(start.getFullYear(), start.getMonth(), sipDayOfMonth);
    if (isBefore(current, start)) {
      current = addMonths(current, 1);
    }

    while (isBefore(current, end) || current.getTime() === end.getTime()) {
      const monthKey = `${current.getFullYear()}-${current.getMonth()}`;
      if (!existingMonths.has(monthKey)) {
        results.push({ date: new Date(current), amount: sipAmount });
      }
      current = addMonths(current, 1);
    }

    return results;
  }, [sipAmount, sipStartDate, sipEndDate, sipDayOfMonth, existingMonths]);

  // Apply max installments cap
  const installments = useMemo(() => {
    const cap = maxInstallments ? parseInt(maxInstallments, 10) : 0;
    if (cap > 0 && cap < allPossibleInstallments.length) {
      return allPossibleInstallments.slice(0, cap);
    }
    return allPossibleInstallments;
  }, [allPossibleInstallments, maxInstallments]);

  const totalAmount = installments.reduce((sum, i) => sum + i.amount, 0);

  const fmtINR = (v: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency === 'INR' ? 'INR' : 'AED',
      maximumFractionDigits: 0,
    }).format(v);

  const handleBackfill = async () => {
    if (!user || installments.length === 0) return;
    setLoading(true);

    try {
      const rows = installments.map((inst) => ({
        user_id: user.id,
        asset_id: assetId,
        transaction_type: 'SIP_INSTALLMENT',
        transaction_date: format(inst.date, 'yyyy-MM-dd'),
        amount: inst.amount,
        quantity: 1,
        quantity_unit: 'units',
        fees: 0,
        notes: BACKFILL_NOTE,
      }));

      for (let i = 0; i < rows.length; i += 50) {
        const batch = rows.slice(i, i + 50);
        const { error } = await supabase.from('asset_transactions').insert(batch);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['asset-transactions', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });

      toast.success(`Generated ${installments.length} historical installments`);
      setConfirmOpen(false);
      setOpen(false);
    } catch (e: any) {
      toast.error('Failed to generate transactions: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevertBackfill = async () => {
    if (backfilledTransactions.length === 0) return;
    setLoading(true);

    try {
      const ids = backfilledTransactions.map((tx) => tx.id);
      
      // Delete in batches of 50
      for (let i = 0; i < ids.length; i += 50) {
        const batch = ids.slice(i, i + 50);
        const { error } = await supabase
          .from('asset_transactions')
          .delete()
          .in('id', batch);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['asset-transactions', assetId] });
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });

      toast.success(`Removed ${ids.length} backfilled installments`);
      setRevertConfirmOpen(false);
      setOpen(false);
    } catch (e: any) {
      toast.error('Failed to revert: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (!sipAmount || !sipStartDate) return null;

  // Default sipDayOfMonth to 1 if not set
  const effectiveDayOfMonth = sipDayOfMonth || 1;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setMaxInstallments(''); }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Backfill History
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Backfill SIP Installments
            </DialogTitle>
            <DialogDescription>
              Generate historical transaction records from your SIP start date so XIRR and performance metrics can be calculated accurately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Revert section */}
            {backfilledTransactions.length > 0 && (
              <div className="border border-destructive/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Previously Backfilled</p>
                    <p className="text-xs text-muted-foreground">
                      {backfilledTransactions.length} auto-generated installments found
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setRevertConfirmOpen(true)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Revert All
                  </Button>
                </div>
              </div>
            )}

            {/* SIP Info */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Amount</span>
                <span className="font-medium">{fmtINR(sipAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SIP Day</span>
                <span className="font-medium">{effectiveDayOfMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span className="font-medium">{format(new Date(sipStartDate), 'MMM yyyy')}</span>
              </div>
              {sipEndDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-medium">{format(new Date(sipEndDate), 'MMM yyyy')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Existing Transactions</span>
                <span className="font-medium">{existingMonths.size}</span>
              </div>
            </div>

            {/* Installment count override */}
            <div className="space-y-2">
              <Label htmlFor="max-installments" className="text-sm">
                Number of installments (optional)
              </Label>
              <Input
                id="max-installments"
                type="number"
                min="1"
                max={allPossibleInstallments.length || undefined}
                placeholder={`Auto: ${allPossibleInstallments.length} (from dates)`}
                value={maxInstallments}
                onChange={(e) => setMaxInstallments(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use date range, or enter a number to cap installments. 
                Useful for completed SIPs where you know the exact count (e.g., "4" for 4 months).
              </p>
            </div>

            {installments.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="h-8 w-8 text-positive mx-auto" />
                <p className="text-sm text-muted-foreground">
                  All installments are already recorded. Nothing to backfill.
                </p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Installments to generate</span>
                    <Badge variant="secondary">
                      {installments.length}
                      {maxInstallments && parseInt(maxInstallments) > 0 && parseInt(maxInstallments) < allPossibleInstallments.length && (
                        <span className="ml-1 text-xs opacity-70">
                          (capped from {allPossibleInstallments.length})
                        </span>
                      )}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total amount</span>
                    <span className="font-medium">{fmtINR(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Period</span>
                    <span className="text-sm">
                      {format(installments[0].date, 'MMM yyyy')} → {format(installments[installments.length - 1].date, 'MMM yyyy')}
                    </span>
                  </div>
                </div>

                {/* Warning */}
                <div className="flex gap-2 items-start bg-warning/10 text-warning-foreground border border-warning/20 rounded-lg p-3">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-warning" />
                  <div className="text-sm">
                    <p className="font-medium">Note</p>
                    <p className="text-muted-foreground">
                      This will create {installments.length} transaction records of {fmtINR(sipAmount)} each. 
                      NAV/units per installment are not known — only the cash flow dates and amounts are recorded, 
                      which is sufficient for accurate XIRR calculation. You can revert this at any time.
                    </p>
                  </div>
                </div>

                {/* Preview list (collapsed) */}
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Preview all {installments.length} installments
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg divide-y">
                    {installments.map((inst, i) => (
                      <div key={i} className="flex justify-between px-3 py-1.5">
                        <span>{format(inst.date, 'dd MMM yyyy')}</span>
                        <span className="font-mono">{fmtINR(inst.amount)}</span>
                      </div>
                    ))}
                  </div>
                </details>

                <Button
                  className="w-full"
                  onClick={() => setConfirmOpen(true)}
                >
                  Generate {installments.length} Installments
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm backfill */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Backfill</AlertDialogTitle>
            <AlertDialogDescription>
              This will create {installments.length} SIP installment transactions totalling {fmtINR(totalAmount)} 
              from {installments.length > 0 ? format(installments[0].date, 'MMM yyyy') : ''} to{' '}
              {installments.length > 0 ? format(installments[installments.length - 1].date, 'MMM yyyy') : ''}.
              You can revert this later using the "Revert All" button.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackfill} disabled={loading}>
              {loading ? 'Generating…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm revert */}
      <AlertDialog open={revertConfirmOpen} onOpenChange={setRevertConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert Backfill</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all {backfilledTransactions.length} auto-generated historical installments. 
              Your manually added transactions will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevertBackfill} 
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Reverting…' : `Delete ${backfilledTransactions.length} Installments`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
