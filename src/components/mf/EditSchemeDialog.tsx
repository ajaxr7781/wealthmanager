import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useUpdateMfScheme } from '@/hooks/useMfSchemes';
import { Loader2 } from 'lucide-react';
import type { MfScheme } from '@/types/mutualFunds';

interface EditSchemeDialogProps {
  scheme: MfScheme;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSchemeDialog({ scheme, open, onOpenChange }: EditSchemeDialogProps) {
  const [formData, setFormData] = useState({
    scheme_name: '',
    fund_house: '',
    category: '',
    plan_type: '' as 'Regular' | 'Direct' | '',
    option_type: '' as 'Growth' | 'IDCW' | 'Dividend' | '',
    isin: '',
    amfi_scheme_code: '',
    benchmark: '',
    notes: '',
    is_active: true
  });

  const updateScheme = useUpdateMfScheme();

  useEffect(() => {
    if (scheme) {
      setFormData({
        scheme_name: scheme.scheme_name,
        fund_house: scheme.fund_house || '',
        category: scheme.category || '',
        plan_type: scheme.plan_type || '',
        option_type: scheme.option_type || '',
        isin: scheme.isin || '',
        amfi_scheme_code: scheme.amfi_scheme_code?.toString() || '',
        benchmark: scheme.benchmark || '',
        notes: scheme.notes || '',
        is_active: scheme.is_active
      });
    }
  }, [scheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    updateScheme.mutate({
      id: scheme.id,
      scheme_name: formData.scheme_name,
      fund_house: formData.fund_house || null,
      category: formData.category || null,
      plan_type: formData.plan_type || null,
      option_type: formData.option_type || null,
      isin: formData.isin || null,
      amfi_scheme_code: formData.amfi_scheme_code ? parseInt(formData.amfi_scheme_code) : null,
      benchmark: formData.benchmark || null,
      notes: formData.notes || null,
      is_active: formData.is_active,
      needs_verification: !formData.amfi_scheme_code
    }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scheme</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="scheme_name">Scheme Name *</Label>
              <Input
                id="scheme_name"
                value={formData.scheme_name}
                onChange={(e) => setFormData(prev => ({ ...prev, scheme_name: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="amfi_scheme_code">AMFI Scheme Code</Label>
              <Input
                id="amfi_scheme_code"
                type="number"
                value={formData.amfi_scheme_code}
                onChange={(e) => setFormData(prev => ({ ...prev, amfi_scheme_code: e.target.value }))}
                placeholder="e.g., 119551"
              />
            </div>

            <div>
              <Label htmlFor="isin">ISIN</Label>
              <Input
                id="isin"
                value={formData.isin}
                onChange={(e) => setFormData(prev => ({ ...prev, isin: e.target.value.toUpperCase() }))}
                placeholder="e.g., INF123A01234"
                maxLength={12}
              />
            </div>

            <div>
              <Label htmlFor="fund_house">Fund House</Label>
              <Input
                id="fund_house"
                value={formData.fund_house}
                onChange={(e) => setFormData(prev => ({ ...prev, fund_house: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Equity">Equity</SelectItem>
                  <SelectItem value="Debt">Debt</SelectItem>
                  <SelectItem value="Hybrid">Hybrid</SelectItem>
                  <SelectItem value="Solution Oriented">Solution Oriented</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="plan_type">Plan Type</Label>
              <Select
                value={formData.plan_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, plan_type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Direct">Direct</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="option_type">Option Type</Label>
              <Select
                value={formData.option_type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, option_type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Growth">Growth</SelectItem>
                  <SelectItem value="IDCW">IDCW</SelectItem>
                  <SelectItem value="Dividend">Dividend</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between">
              <div>
                <Label htmlFor="is_active">Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive schemes won't appear in holdings dropdowns
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateScheme.isPending || !formData.scheme_name}>
              {updateScheme.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
