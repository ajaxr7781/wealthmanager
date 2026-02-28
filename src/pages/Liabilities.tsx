import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, CreditCard, Home, Car, Landmark, Wallet } from 'lucide-react';
import { useLiabilities, useCreateLiability, useUpdateLiability, useDeleteLiability, type LiabilityFormData, type Liability } from '@/hooks/useLiabilities';
import { formatCurrency } from '@/lib/calculations';

const LIABILITY_TYPES = [
  { value: 'mortgage', label: 'Mortgage', icon: Home },
  { value: 'loan', label: 'Personal Loan', icon: Landmark },
  { value: 'auto_loan', label: 'Auto Loan', icon: Car },
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'other', label: 'Other', icon: Landmark },
];

/** Helper: store numeric form state as string so users can clear "0" */
function numStr(v: number | undefined | null): string {
  if (v === undefined || v === null) return '';
  return String(v);
}

function LiabilityForm({ onSubmit, initial, onClose }: {
  onSubmit: (data: LiabilityFormData) => void;
  initial?: Liability;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    type: initial?.type || 'loan',
    principal: numStr(initial?.principal),
    outstanding: numStr(initial?.outstanding),
    interest_rate: numStr(initial?.interest_rate),
    emi: numStr(initial?.emi),
    next_due_date: initial?.next_due_date || '',
    currency: initial?.currency || 'AED',
    notes: initial?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      type: form.type,
      principal: Number(form.principal) || 0,
      outstanding: Number(form.outstanding) || 0,
      interest_rate: form.interest_rate ? Number(form.interest_rate) : undefined,
      emi: form.emi ? Number(form.emi) : undefined,
      next_due_date: form.next_due_date || undefined,
      currency: form.currency,
      notes: form.notes || undefined,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <ScrollArea className="max-h-[60vh] pr-3">
        <div className="grid gap-4 sm:grid-cols-2 p-1">
          <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIABILITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Principal</Label><Input type="number" min={0} step="0.01" value={form.principal} onChange={e => setForm(p => ({ ...p, principal: e.target.value }))} required /></div>
          <div><Label>Outstanding</Label><Input type="number" min={0} step="0.01" value={form.outstanding} onChange={e => setForm(p => ({ ...p, outstanding: e.target.value }))} required /></div>
          <div><Label>Interest Rate (%)</Label><Input type="number" min={0} step="0.01" value={form.interest_rate} onChange={e => setForm(p => ({ ...p, interest_rate: e.target.value }))} placeholder="Optional" /></div>
          <div><Label>EMI / Monthly Payment</Label><Input type="number" min={0} step="0.01" value={form.emi} onChange={e => setForm(p => ({ ...p, emi: e.target.value }))} placeholder="Optional" /></div>
          <div><Label>Next Due Date</Label><Input type="date" value={form.next_due_date} onChange={e => setForm(p => ({ ...p, next_due_date: e.target.value }))} /></div>
          <div>
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={v => setForm(p => ({ ...p, currency: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="AED">AED</SelectItem>
                <SelectItem value="INR">INR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 p-1"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
      </ScrollArea>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">{initial ? 'Update' : 'Add'} Liability</Button>
      </div>
    </form>
  );
}

/** Dialog for recording an installment / payment against a liability */
function PaymentDialog({ liability, open, onOpenChange }: {
  liability: Liability;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const updateLiability = useUpdateLiability();
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) return;
    const newOutstanding = Math.max(0, liability.outstanding - payAmt);
    updateLiability.mutate({
      id: liability.id,
      outstanding: newOutstanding,
      notes: notes
        ? `${liability.notes ? liability.notes + '\n' : ''}Payment of ${payAmt} on ${new Date().toISOString().slice(0, 10)}. ${notes}`
        : liability.notes,
    });
    onOpenChange(false);
    setAmount('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
        <form onSubmit={handlePay} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Current outstanding: <span className="font-semibold text-foreground">{formatCurrency(liability.outstanding)}</span>
          </p>
          <div><Label>Payment Amount</Label><Input type="number" min={0.01} step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus /></div>
          <div><Label>Notes (optional)</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Jan 2026 EMI" /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Record Payment</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function LiabilitiesPage() {
  const { data: liabilities, isLoading } = useLiabilities();
  const createLiability = useCreateLiability();
  const updateLiability = useUpdateLiability();
  const deleteLiability = useDeleteLiability();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Liability | undefined>();
  const [payingLiability, setPayingLiability] = useState<Liability | undefined>();

  const totalOutstanding = liabilities?.reduce((s, l) => s + Number(l.outstanding), 0) ?? 0;
  const totalEmi = liabilities?.reduce((s, l) => s + Number(l.emi || 0), 0) ?? 0;

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Liabilities</h1>
            <p className="text-muted-foreground text-sm">Track loans, mortgages, and other obligations</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(undefined); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Liability</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader><DialogTitle>{editing ? 'Edit' : 'Add'} Liability</DialogTitle></DialogHeader>
              <LiabilityForm
                initial={editing}
                onSubmit={(data) => {
                  if (editing) updateLiability.mutate({ id: editing.id, ...data });
                  else createLiability.mutate(data);
                }}
                onClose={() => { setDialogOpen(false); setEditing(undefined); }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Outstanding</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-semibold text-destructive">{formatCurrency(totalOutstanding)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Monthly EMI</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-semibold text-foreground">{formatCurrency(totalEmi)}</span></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Active Liabilities</CardTitle></CardHeader>
            <CardContent><span className="text-2xl font-semibold text-foreground">{liabilities?.length ?? 0}</span></CardContent>
          </Card>
        </div>

        {/* Table - scrollable on mobile */}
        <Card>
          <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[700px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">EMI</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead className="w-28"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : !liabilities?.length ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No liabilities yet</TableCell></TableRow>
                  ) : liabilities.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium whitespace-nowrap">{l.name}</TableCell>
                      <TableCell><Badge variant="secondary">{LIABILITY_TYPES.find(t => t.value === l.type)?.label || l.type}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(l.principal)}</TableCell>
                      <TableCell className="text-right text-destructive font-medium">{formatCurrency(l.outstanding)}</TableCell>
                      <TableCell className="text-right">{l.interest_rate ? `${l.interest_rate}%` : '—'}</TableCell>
                      <TableCell className="text-right">{l.emi ? formatCurrency(l.emi) : '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{l.next_due_date || '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Record Payment" onClick={() => setPayingLiability(l)}>
                            <Wallet className="h-4 w-4 text-primary" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => { setEditing(l); setDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Delete" onClick={() => deleteLiability.mutate(l.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>

      {/* Payment dialog */}
      {payingLiability && (
        <PaymentDialog
          liability={payingLiability}
          open={!!payingLiability}
          onOpenChange={(o) => { if (!o) setPayingLiability(undefined); }}
        />
      )}
    </AppLayout>
  );
}
