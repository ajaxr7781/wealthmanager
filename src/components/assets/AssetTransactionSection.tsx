import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useAssetTransactions, useCreateAssetTransaction } from '@/hooks/useAssetTransactions';

interface AssetTransactionSectionProps {
  assetId: string;
  currency: string;
  fmtCurrency: (v: number) => string;
  assetType?: string;
}

const TX_TYPES = [
  { value: 'DEPOSIT', label: 'Deposit / Investment' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'INTEREST', label: 'Interest Credit' },
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' },
  { value: 'SIP_INSTALLMENT', label: 'SIP Installment' },
];

export function AssetTransactionSection({ assetId, currency, fmtCurrency, assetType }: AssetTransactionSectionProps) {
  const { data: transactions, isLoading } = useAssetTransactions(assetId);
  const createTx = useCreateAssetTransaction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    transaction_type: 'DEPOSIT',
    transaction_date: new Date().toISOString().slice(0, 10),
    amount: '',
    nav: '',
    units: '',
    notes: '',
  });

  const isSipInstallment = form.transaction_type === 'SIP_INSTALLMENT';

  // Auto-calculate: amount & NAV → units; amount & units → NAV
  useEffect(() => {
    if (!isSipInstallment) return;
    const amount = parseFloat(form.amount);
    const nav = parseFloat(form.nav);
    const units = parseFloat(form.units);

    if (amount > 0 && nav > 0 && !form.units) {
      const calc = Math.round((amount / nav) * 10000) / 10000;
      setForm(f => ({ ...f, units: calc.toString() }));
    }
  }, [form.amount, form.nav]);

  useEffect(() => {
    if (!isSipInstallment) return;
    const amount = parseFloat(form.amount);
    const units = parseFloat(form.units);

    if (amount > 0 && units > 0 && !form.nav) {
      const calc = Math.round((amount / units) * 100) / 100;
      setForm(f => ({ ...f, nav: calc.toString() }));
    }
  }, [form.amount, form.units]);

  const handleFieldChange = (field: string, value: string) => {
    if (isSipInstallment) {
      // Clear the third field when two are being entered
      if (field === 'amount') {
        setForm(f => ({ ...f, amount: value, units: '' }));
      } else if (field === 'nav') {
        setForm(f => ({ ...f, nav: value, units: '' }));
      } else if (field === 'units') {
        setForm(f => ({ ...f, units: value, nav: '' }));
      } else {
        setForm(f => ({ ...f, [field]: value }));
      }
    } else {
      setForm(f => ({ ...f, [field]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;

    const quantity = isSipInstallment ? Number(form.units) || 1 : 1;
    const pricePerUnit = isSipInstallment ? Number(form.nav) || undefined : undefined;

    await createTx.mutateAsync({
      asset_id: assetId,
      transaction_type: form.transaction_type,
      transaction_date: form.transaction_date,
      amount,
      quantity,
      quantity_unit: isSipInstallment ? 'units' : currency,
      price_per_unit: pricePerUnit,
      notes: form.notes || undefined,
    });

    setOpen(false);
    setForm({ transaction_type: 'DEPOSIT', transaction_date: new Date().toISOString().slice(0, 10), amount: '', nav: '', units: '', notes: '' });
  };

  const isCredit = (type: string) => ['DEPOSIT', 'BUY', 'INTEREST', 'SIP_INSTALLMENT'].includes(type);

  const defaultTxType = (assetType === 'sip' || assetType === 'mutual_fund') ? 'SIP_INSTALLMENT' : 'DEPOSIT';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transactions</CardTitle>
        <Dialog open={open} onOpenChange={(v) => {
          setOpen(v);
          if (v) setForm(f => ({ ...f, transaction_type: defaultTxType }));
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.transaction_type} onValueChange={(v) => setForm(f => ({ ...f, transaction_type: v, nav: '', units: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TX_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.transaction_date}
                  onChange={(e) => setForm(f => ({ ...f, transaction_date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Amount ({currency})</Label>
                <Input
                  type="number"
                  placeholder="e.g. 10000"
                  value={form.amount}
                  onChange={(e) => handleFieldChange('amount', e.target.value)}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              {isSipInstallment && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>NAV (₹)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 125.45"
                      value={form.nav}
                      onChange={(e) => handleFieldChange('nav', e.target.value)}
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-muted-foreground">Auto-calculates if Amount & Units given</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Units</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 79.7131"
                      value={form.units}
                      onChange={(e) => handleFieldChange('units', e.target.value)}
                      min="0"
                      step="0.0001"
                    />
                    <p className="text-xs text-muted-foreground">Auto-calculates if Amount & NAV given</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="e.g. FY 2024-25 contribution"
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createTx.isPending}>
                {createTx.isPending ? 'Saving…' : 'Save Transaction'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : !transactions || transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No transactions recorded yet. Add your yearly contributions to track performance.
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-3 border rounded-lg">
                <div>
                  <Badge variant={isCredit(tx.transaction_type) ? 'default' : 'secondary'}>
                    {tx.transaction_type === 'SIP_INSTALLMENT' ? 'SIP Installment' : tx.transaction_type}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(tx.transaction_date), 'dd MMM yyyy')}
                    {tx.price_per_unit && <span className="ml-2">NAV: ₹{Number(tx.price_per_unit).toFixed(2)}</span>}
                    {tx.quantity > 1 && <span className="ml-2">Units: {Number(tx.quantity).toFixed(4)}</span>}
                  </p>
                  {tx.notes && <p className="text-xs text-muted-foreground mt-0.5">{tx.notes}</p>}
                </div>
                <div className="text-right">
                  <p className="font-medium">{fmtCurrency(Number(tx.amount))}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
