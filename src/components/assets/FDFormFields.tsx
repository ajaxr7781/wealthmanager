import { useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { calculateMaturityAmount } from '@/lib/fdCalculations';
import type { AssetFormData } from '@/types/assets';

interface FDFormFieldsProps {
  formData: Partial<AssetFormData> & {
    principal?: number | null;
    interest_rate?: number | null;
    maturity_date?: string | null;
    maturity_amount?: number | null;
    bank_name?: string | null;
    purchase_date?: string | null;
    currency?: string | null;
  };
  updateForm: (updates: Partial<AssetFormData>) => void;
  selectedTypeCode: string | null;
}

export function FDFormFields({ formData, updateForm, selectedTypeCode }: FDFormFieldsProps) {
  // Calculate maturity amount when principal, purchase_date, maturity_date, and interest_rate are available
  const calculatedMaturityAmount = useMemo(() => {
    if (!formData.principal || !formData.interest_rate || !formData.purchase_date || !formData.maturity_date) {
      return null;
    }
    return calculateMaturityAmount({
      principal: formData.principal,
      interestRate: formData.interest_rate,
      purchaseDate: formData.purchase_date,
      maturityDate: formData.maturity_date,
    });
  }, [formData.principal, formData.interest_rate, formData.purchase_date, formData.maturity_date]);

  // Auto-update maturity amount when calculation changes (if not manually set or if user clears it)
  useEffect(() => {
    if (calculatedMaturityAmount && !formData.maturity_amount) {
      updateForm({ maturity_amount: Math.round(calculatedMaturityAmount) });
    }
  }, [calculatedMaturityAmount]);

  const handlePrincipalChange = (value: number) => {
    // When principal changes, also update total_cost to match
    updateForm({ 
      principal: value,
      total_cost: value,
    });
  };

  const handleMaturityDateChange = (value: string) => {
    // Clear maturity amount to trigger recalculation
    updateForm({ 
      maturity_date: value,
      maturity_amount: undefined,
    });
  };

  const handleInterestRateChange = (value: number) => {
    // Clear maturity amount to trigger recalculation
    updateForm({ 
      interest_rate: value,
      maturity_amount: undefined,
    });
  };

  const currency = formData.currency || 'AED';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bank_name">Bank / Institution</Label>
        <Input
          id="bank_name"
          placeholder="e.g., Emirates NBD, HDFC Bank"
          value={formData.bank_name || ''}
          onChange={(e) => updateForm({ bank_name: e.target.value })}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="principal">Principal Amount *</Label>
          <Input
            id="principal"
            type="number"
            min="0"
            value={formData.principal || ''}
            onChange={(e) => handlePrincipalChange(parseFloat(e.target.value) || 0)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="interest_rate">Interest Rate (% p.a.) *</Label>
          <Input
            id="interest_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.interest_rate || ''}
            onChange={(e) => handleInterestRateChange(parseFloat(e.target.value) || 0)}
          />
        </div>
      </div>
      {selectedTypeCode !== 'savings_account' && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maturity_date">Maturity Date</Label>
              <Input
                id="maturity_date"
                type="date"
                value={formData.maturity_date || ''}
                onChange={(e) => handleMaturityDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maturity_amount">Maturity Amount</Label>
              <Input
                id="maturity_amount"
                type="number"
                min="0"
                placeholder={calculatedMaturityAmount ? `≈ ${Math.round(calculatedMaturityAmount).toLocaleString()}` : 'Auto-calculated'}
                value={formData.maturity_amount || ''}
                onChange={(e) => updateForm({ maturity_amount: parseFloat(e.target.value) || undefined })}
              />
              {calculatedMaturityAmount && !formData.maturity_amount && (
                <p className="text-xs text-muted-foreground">
                  Will be set to ≈ {Math.round(calculatedMaturityAmount).toLocaleString()} based on compound interest
                </p>
              )}
            </div>
          </div>
          {formData.principal && formData.interest_rate && formData.maturity_date && formData.maturity_amount && (
            <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
              <p className="font-medium">FD Summary</p>
              <p className="text-muted-foreground">
                Interest earned at maturity: {currency}{' '}
                {(formData.maturity_amount - formData.principal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
