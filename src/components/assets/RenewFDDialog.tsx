import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, addMonths, parseISO, differenceInMonths, differenceInDays, isValid } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { calculateMaturityAmount } from '@/lib/fdCalculations';
import { useCreateAsset, useUpdateAsset } from '@/hooks/useAssets';
import type { Asset } from '@/types/assets';
import { RefreshCw } from 'lucide-react';

type RenewalMode = 'principal_plus_interest' | 'principal_only' | 'custom';

interface RenewFDDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: Asset;
}

export function RenewFDDialog({ open, onOpenChange, asset }: RenewFDDialogProps) {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();

  const oldPrincipal = Number(asset.principal) || Number(asset.total_cost) || 0;
  const oldMaturityAmount = Number(asset.maturity_amount) || oldPrincipal;
  const interestPayout = Math.max(0, oldMaturityAmount - oldPrincipal);
  const oldRate = Number(asset.interest_rate) || 0;

  // Default tenure in months from original FD
  const defaultTenureMonths = useMemo(() => {
    if (asset.purchase_date && asset.maturity_date) {
      const m = differenceInMonths(parseISO(asset.maturity_date), parseISO(asset.purchase_date));
      return m > 0 ? m : 12;
    }
    return 12;
  }, [asset.purchase_date, asset.maturity_date]);

  const [mode, setMode] = useState<RenewalMode>('principal_plus_interest');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>(oldRate ? String(oldRate) : '');
  const [tenureMonths, setTenureMonths] = useState<string>(String(defaultTenureMonths));
  const [startDate, setStartDate] = useState<string>(
    asset.maturity_date && parseISO(asset.maturity_date) <= new Date()
      ? asset.maturity_date
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (open) {
      setMode('principal_plus_interest');
      setCustomAmount(String(oldMaturityAmount.toFixed(2)));
      setInterestRate(oldRate ? String(oldRate) : '');
      setTenureMonths(String(defaultTenureMonths));
      setStartDate(
        asset.maturity_date && parseISO(asset.maturity_date) <= new Date()
          ? asset.maturity_date
          : format(new Date(), 'yyyy-MM-dd')
      );
      setNotes('');
    }
  }, [open, oldMaturityAmount, oldRate, defaultTenureMonths, asset.maturity_date]);

  const newPrincipal = useMemo(() => {
    if (mode === 'principal_plus_interest') return oldMaturityAmount;
    if (mode === 'principal_only') return oldPrincipal;
    return parseFloat(customAmount) || 0;
  }, [mode, oldMaturityAmount, oldPrincipal, customAmount]);

  const newMaturityDate = useMemo(() => {
    const months = parseInt(tenureMonths) || 0;
    if (!startDate || months <= 0) return '';
    return format(addMonths(parseISO(startDate), months), 'yyyy-MM-dd');
  }, [startDate, tenureMonths]);

  const projectedMaturity = useMemo(() => {
    const rate = parseFloat(interestRate);
    if (!newPrincipal || !rate || !startDate || !newMaturityDate) return null;
    return calculateMaturityAmount({
      principal: newPrincipal,
      interestRate: rate,
      purchaseDate: startDate,
      maturityDate: newMaturityDate,
    });
  }, [newPrincipal, interestRate, startDate, newMaturityDate]);

  const RATE_MIN = 0.1;
  const RATE_MAX = 20;
  const TENURE_MIN = 1;
  const TENURE_MAX = 600; // 50 years
  const MIN_PRINCIPAL = 100;
  const FUTURE_START_WARN_DAYS = 90;

  const validation = useMemo(() => {
    const errors: Record<string, string> = {};
    const warnings: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Maturity status of source FD
    if (asset.maturity_date) {
      const md = parseISO(asset.maturity_date);
      if (isValid(md) && md > today) {
        const daysLeft = differenceInDays(md, today);
        warnings.push(
          `Original FD has not matured yet (${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining). Premature renewal may incur a penalty and reduce the effective maturity amount.`
        );
      }
    } else {
      warnings.push('Original FD has no maturity date on record. Verify the rollover amount manually.');
    }

    // Principal
    if (!(newPrincipal > 0)) {
      errors.principal = 'Renewal amount must be greater than 0.';
    } else if (newPrincipal < MIN_PRINCIPAL) {
      errors.principal = `Renewal amount must be at least ${asset.currency} ${MIN_PRINCIPAL}.`;
    }

    if (mode === 'custom') {
      const amt = parseFloat(customAmount);
      if (isNaN(amt)) {
        errors.principal = 'Enter a valid amount.';
      } else if (amt <= 0) {
        errors.principal = 'Amount must be greater than 0.';
      } else if (amt > oldMaturityAmount + 0.005) {
        errors.principal = `Cannot exceed maturity amount (${asset.currency} ${oldMaturityAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}).`;
      } else if (amt < MIN_PRINCIPAL) {
        errors.principal = `Amount must be at least ${asset.currency} ${MIN_PRINCIPAL}.`;
      }
    }

    // Interest rate
    const rate = parseFloat(interestRate);
    if (interestRate === '' || isNaN(rate)) {
      errors.rate = 'Interest rate is required.';
    } else if (rate < RATE_MIN || rate > RATE_MAX) {
      errors.rate = `Rate must be between ${RATE_MIN}% and ${RATE_MAX}% p.a.`;
    } else if (oldRate && rate < oldRate * 0.5) {
      warnings.push(`New rate (${rate}%) is much lower than the previous rate (${oldRate}%). Confirm this is intentional.`);
    }

    // Tenure
    const months = parseInt(tenureMonths);
    if (!tenureMonths || isNaN(months)) {
      errors.tenure = 'Tenure is required.';
    } else if (!Number.isInteger(months) || months < TENURE_MIN) {
      errors.tenure = `Tenure must be a whole number of months (min ${TENURE_MIN}).`;
    } else if (months > TENURE_MAX) {
      errors.tenure = `Tenure cannot exceed ${TENURE_MAX} months (${TENURE_MAX / 12} years).`;
    }

    // Start date
    if (!startDate) {
      errors.startDate = 'Start date is required.';
    } else {
      const sd = parseISO(startDate);
      if (!isValid(sd)) {
        errors.startDate = 'Invalid date.';
      } else {
        if (asset.purchase_date && sd < parseISO(asset.purchase_date)) {
          errors.startDate = 'Start date cannot be before the original purchase date.';
        }
        if (asset.maturity_date) {
          const md = parseISO(asset.maturity_date);
          const earlyDays = differenceInDays(md, sd);
          if (earlyDays > 0) {
            warnings.push(`Start date is ${earlyDays} day${earlyDays === 1 ? '' : 's'} before original maturity — this is a premature renewal.`);
          }
        }
        const futureDays = differenceInDays(sd, today);
        if (futureDays > FUTURE_START_WARN_DAYS) {
          warnings.push(`Start date is ${futureDays} days in the future. Most banks require renewal within 14 days of maturity.`);
        }
      }
    }

    // Maturity date consistency
    if (newMaturityDate && startDate) {
      const sd = parseISO(startDate);
      const nm = parseISO(newMaturityDate);
      if (nm <= sd) {
        errors.tenure = errors.tenure || 'Maturity date must be after start date.';
      }
    }

    return { errors, warnings, isValid: Object.keys(errors).length === 0 };
  }, [
    mode, customAmount, interestRate, tenureMonths, startDate, newMaturityDate,
    newPrincipal, oldMaturityAmount, oldRate, asset.currency, asset.maturity_date, asset.purchase_date,
  ]);

  const canSubmit =
    validation.isValid &&
    !!projectedMaturity &&
    !createAsset.isPending &&
    !updateAsset.isPending;

  const handleRenew = async () => {
    if (!canSubmit || !projectedMaturity || !validation.isValid) return;

    const rate = parseFloat(interestRate);
    const baseName = asset.asset_name.replace(/\s*\(Renewed.*\)$/i, '');
    const newName = `${baseName} (Renewed ${format(parseISO(startDate), 'MMM yyyy')})`;

    const payoutNote = mode === 'principal_only'
      ? ` Interest payout of ${asset.currency} ${interestPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })} taken out.`
      : mode === 'custom'
        ? ` Renewed amount: ${asset.currency} ${newPrincipal.toLocaleString(undefined, { maximumFractionDigits: 2 })} (of maturity ${asset.currency} ${oldMaturityAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}).`
        : ' Full maturity amount rolled over.';

    // 1. Create the new (renewed) FD
    const created = await createAsset.mutateAsync({
      asset_type: 'fixed_deposit',
      asset_type_code: asset.asset_type_code || 'fixed_deposit',
      category_code: asset.category_code || 'fixed_deposit',
      asset_name: newName,
      currency: asset.currency,
      purchase_date: startDate,
      bank_name: asset.bank_name || undefined,
      principal: newPrincipal,
      interest_rate: rate,
      maturity_date: newMaturityDate,
      maturity_amount: Math.round(projectedMaturity),
      total_cost: newPrincipal,
      notes: [
        `Renewed from "${asset.asset_name}" (ID: ${asset.id}).`,
        payoutNote.trim(),
        notes.trim(),
      ].filter(Boolean).join(' '),
    });

    // 2. Mark the original FD as closed/renewed
    const closureNote = `Renewed on ${format(parseISO(startDate), 'dd MMM yyyy')} into "${newName}".${payoutNote}`;
    const mergedNotes = [asset.notes, closureNote].filter(Boolean).join('\n\n');

    await updateAsset.mutateAsync({
      id: asset.id,
      notes: mergedNotes,
      current_value: oldMaturityAmount,
      is_current_value_manual: true,
    });

    onOpenChange(false);
    if (created?.id) {
      navigate(`/asset/${created.id}`, { replace: true });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Renew Fixed Deposit
          </DialogTitle>
          <DialogDescription>
            Create a new FD with the maturity proceeds. The original FD will be marked as renewed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Maturity summary */}
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original principal</span>
              <span className="font-medium">{asset.currency} {oldPrincipal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Interest earned</span>
              <span className="font-medium text-positive">+ {asset.currency} {interestPayout.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="text-muted-foreground">Maturity amount</span>
              <span className="font-semibold">{asset.currency} {oldMaturityAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Renewal mode */}
          <div className="space-y-2">
            <Label>Renewal option</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as RenewalMode)} className="space-y-2">
              <div className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent/50">
                <RadioGroupItem value="principal_plus_interest" id="r1" className="mt-0.5" />
                <Label htmlFor="r1" className="flex-1 cursor-pointer font-normal">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Renew principal + interest</span>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Roll over the full maturity amount ({asset.currency} {oldMaturityAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}) for compounding.
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent/50">
                <RadioGroupItem value="principal_only" id="r2" className="mt-0.5" />
                <Label htmlFor="r2" className="flex-1 cursor-pointer font-normal">
                  <span className="font-medium">Renew principal only</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reinvest principal ({asset.currency} {oldPrincipal.toLocaleString(undefined, { maximumFractionDigits: 0 })}); withdraw interest as payout.
                  </p>
                </Label>
              </div>
              <div className="flex items-start gap-3 rounded-md border p-3 hover:bg-accent/50">
                <RadioGroupItem value="custom" id="r3" className="mt-0.5" />
                <Label htmlFor="r3" className="flex-1 cursor-pointer font-normal">
                  <span className="font-medium">Custom amount</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Choose a partial amount to reinvest.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {mode === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="custom-amount">Amount to renew ({asset.currency})</Label>
              <Input
                id="custom-amount"
                type="number"
                min="0"
                max={oldMaturityAmount}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="renew-rate">New interest rate (% p.a.) *</Label>
              <Input
                id="renew-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renew-tenure">Tenure (months) *</Label>
              <Input
                id="renew-tenure"
                type="number"
                min="1"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="renew-start">Start date *</Label>
              <Input
                id="renew-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Maturity date</Label>
              <Input value={newMaturityDate} readOnly className="bg-muted" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="renew-notes">Notes (optional)</Label>
            <Textarea
              id="renew-notes"
              placeholder="Any additional notes about the renewal"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Projection */}
          {projectedMaturity && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm space-y-1">
              <p className="font-medium">New FD summary</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Principal</span>
                <span className="font-medium">{asset.currency} {newPrincipal.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Projected maturity</span>
                <span className="font-medium text-positive">{asset.currency} {Math.round(projectedMaturity).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interest gain</span>
                <span className="font-medium">{asset.currency} {Math.round(projectedMaturity - newPrincipal).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleRenew} disabled={!canSubmit}>
            {createAsset.isPending || updateAsset.isPending ? 'Renewing…' : 'Renew FD'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
