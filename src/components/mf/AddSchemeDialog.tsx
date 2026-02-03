import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSchemeSearch, useAddMfScheme } from '@/hooks/useMfSchemes';
import { useRefreshMfNav } from '@/hooks/useMfNav';
import { Search, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import type { MfSchemeMasterCache } from '@/types/mutualFunds';

interface AddSchemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSchemeDialog({ open, onOpenChange }: AddSchemeDialogProps) {
  const [step, setStep] = useState<'search' | 'manual'>('search');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  
  const [selectedScheme, setSelectedScheme] = useState<MfSchemeMasterCache | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    scheme_name: '',
    fund_house: '',
    category: '',
    plan_type: '' as 'Regular' | 'Direct' | '',
    option_type: '' as 'Growth' | 'IDCW' | 'Dividend' | '',
    isin: '',
    amfi_scheme_code: '',
    benchmark: '',
    notes: ''
  });

  const { data: searchResults, isLoading: isSearching } = useSchemeSearch(debouncedSearch);
  const addScheme = useAddMfScheme();
  const refreshNav = useRefreshMfNav();

  const handleSelectFromSearch = (scheme: MfSchemeMasterCache) => {
    setSelectedScheme(scheme);
    setFormData(prev => ({
      ...prev,
      scheme_name: scheme.scheme_name,
      amfi_scheme_code: scheme.scheme_code.toString(),
      isin: scheme.isin || '',
      fund_house: scheme.fund_house || ''
    }));
    setStep('manual'); // Move to details step
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const schemeData = {
      scheme_name: formData.scheme_name,
      fund_house: formData.fund_house || undefined,
      category: formData.category || undefined,
      plan_type: formData.plan_type || undefined,
      option_type: formData.option_type || undefined,
      isin: formData.isin || undefined,
      amfi_scheme_code: formData.amfi_scheme_code ? parseInt(formData.amfi_scheme_code) : undefined,
      benchmark: formData.benchmark || undefined,
      notes: formData.notes || undefined,
      needs_verification: !formData.amfi_scheme_code // Mark as needing verification if no AMFI code
    };

    addScheme.mutate(schemeData, {
      onSuccess: async (data) => {
        // Try to fetch NAV immediately if we have an AMFI code
        if (data.amfi_scheme_code) {
          refreshNav.mutate([data.id]);
        }
        handleClose();
      }
    });
  };

  const handleClose = () => {
    setStep('search');
    setSearchTerm('');
    setSelectedScheme(null);
    setFormData({
      scheme_name: '',
      fund_house: '',
      category: '',
      plan_type: '',
      option_type: '',
      isin: '',
      amfi_scheme_code: '',
      benchmark: '',
      notes: ''
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Mutual Fund Scheme</DialogTitle>
          <DialogDescription>
            Search from the scheme master list or enter details manually.
          </DialogDescription>
        </DialogHeader>

        {step === 'search' && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scheme name (min 3 characters)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {searchResults && searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {searchResults.map((scheme) => (
                  <button
                    key={`${scheme.scheme_code}-${scheme.source}`}
                    className="w-full text-left p-3 hover:bg-muted transition-colors"
                    onClick={() => handleSelectFromSearch(scheme)}
                  >
                    <p className="font-medium text-sm">{scheme.scheme_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Code: {scheme.scheme_code}
                      {scheme.isin && ` • ISIN: ${scheme.isin}`}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {debouncedSearch.length >= 3 && !isSearching && searchResults?.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No schemes found. Try a different search or enter manually.
              </p>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={() => setStep('manual')}>
                Enter Manually
              </Button>
            </div>
          </div>
        )}

        {step === 'manual' && (
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
                <p className="text-xs text-muted-foreground mt-1">
                  Required for automatic NAV updates
                </p>
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
                  placeholder="e.g., HDFC Mutual Fund"
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
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep('search')}>
                Back to Search
              </Button>
              <Button type="submit" disabled={addScheme.isPending || !formData.scheme_name}>
                {addScheme.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Scheme'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
