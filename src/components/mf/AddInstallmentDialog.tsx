import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateMfSip } from '@/hooks/useMfSips';
import { Loader2 } from 'lucide-react';
import type { MfSip } from '@/types/mutualFunds';
import { formatINR } from '@/types/mutualFunds';

interface AddInstallmentDialogProps {
  sip: MfSip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddInstallmentDialog({ sip, open, onOpenChange }: AddInstallmentDialogProps) {
  const updateSip = useUpdateMfSip();
  const [amount, setAmount] = useState(sip.sip_amount.toString());
  const [units, setUnits] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const installmentAmount = parseFloat(amount) || 0;
    const installmentUnits = parseFloat(units) || 0;
    
    updateSip.mutate({
      id: sip.id,
      invested_amount: (sip.invested_amount || 0) + installmentAmount,
      current_units: (sip.current_units || 0) + installmentUnits,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setAmount(sip.sip_amount.toString());
        setUnits('');
      }
    });
  };

  const calculatedNav = parseFloat(amount) && parseFloat(units) 
    ? (parseFloat(amount) / parseFloat(units)).toFixed(4)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add SIP Installment</DialogTitle>
          <DialogDescription>
            Record a new installment for {sip.scheme?.scheme_name?.slice(0, 40)}...
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 10000"
                required
              />
            </div>
            <div>
              <Label htmlFor="units">Units Purchased</Label>
              <Input
                id="units"
                type="number"
                step="0.0001"
                min="0"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., 25.1234"
                required
              />
            </div>
          </div>

          {calculatedNav && (
            <p className="text-sm text-muted-foreground">
              NAV at purchase: ₹{calculatedNav}
            </p>
          )}

          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Invested:</span>
              <span>{formatINR(sip.invested_amount || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current Units:</span>
              <span>{(sip.current_units || 0).toFixed(4)}</span>
            </div>
            <div className="border-t pt-1 mt-1 flex justify-between font-medium">
              <span>After this installment:</span>
              <span>
                {formatINR((sip.invested_amount || 0) + (parseFloat(amount) || 0))} / {((sip.current_units || 0) + (parseFloat(units) || 0)).toFixed(4)} units
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateSip.isPending || !amount || !units}>
              {updateSip.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Installment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
