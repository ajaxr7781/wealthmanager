import { useState } from 'react';
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
}

const TX_TYPES = [
  { value: 'DEPOSIT', label: 'Deposit / Investment' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'INTEREST', label: 'Interest Credit' },
  { value: 'BUY', label: 'Buy' },
  { value: 'SELL', label: 'Sell' },
];

export function AssetTransactionSection({ assetId, currency, fmtCurrency }: AssetTransactionSectionProps) {
  const { data: transactions, isLoading } = useAssetTransactions(assetId);
  const createTx = useCreateAssetTransaction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    transaction_type: 'DEPOSIT',
    transaction_date: new Date().toISOString().slice(0, 10),
    amount: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;

    await createTx.mutateAsync({
      asset_id: assetId,
      transaction_type: form.transaction_type,
      transaction_date: form.transaction_date,
      amount,
      quantity: 1,
      quantity_unit: currency,
      notes: form.notes || undefined,
    });

    setOpen(false);
    setForm({ transaction_type: 'DEPOSIT', transaction_date: new Date().toISOString().slice(0, 10), amount: '', notes: '' });
  };

  const isCredit = (type: string) => ['DEPOSIT', 'BUY', 'INTEREST'].includes(type);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Transactions</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
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
                <Select value={form.transaction_type} onValueChange={(v) => setForm(f => ({ ...f, transaction_type: v }))}>
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
                  placeholder="100000"
                  value={form.amount}
                  onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
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
                    {tx.transaction_type}
                  </Badge>
                  <p className="text-sm text-muted-foreground mt-1">
                    {format(new Date(tx.transaction_date), 'dd MMM yyyy')}
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
