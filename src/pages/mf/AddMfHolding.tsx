import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveMfSchemes } from '@/hooks/useMfSchemes';
import { useAddMfHolding } from '@/hooks/useMfHoldings';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AddMfHolding() {
  const navigate = useNavigate();
  const { data: schemes, isLoading: schemesLoading } = useActiveMfSchemes();
  const addHolding = useAddMfHolding();

  const [formData, setFormData] = useState({
    scheme_id: '',
    folio_no: '',
    invested_amount: '',
    units_held: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addHolding.mutate({
      scheme_id: formData.scheme_id,
      folio_no: formData.folio_no || undefined,
      invested_amount: parseFloat(formData.invested_amount),
      units_held: parseFloat(formData.units_held)
    }, {
      onSuccess: () => {
        navigate('/mf/holdings');
      }
    });
  };

  const selectedScheme = schemes?.find(s => s.id === formData.scheme_id);

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/mf/holdings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Holdings
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Add Mutual Fund Holding</CardTitle>
            <CardDescription>
              Add a new mutual fund holding to your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="scheme_id">Select Scheme *</Label>
                <Select
                  value={formData.scheme_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, scheme_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a scheme from your catalog" />
                  </SelectTrigger>
                  <SelectContent>
                    {schemesLoading ? (
                      <div className="p-4 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : schemes?.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No schemes found. 
                        <Link to="/settings/mf-schemes" className="text-primary ml-1">
                          Add schemes first
                        </Link>
                      </div>
                    ) : (
                      schemes?.map((scheme) => (
                        <SelectItem key={scheme.id} value={scheme.id}>
                          <div className="flex flex-col">
                            <span>{scheme.scheme_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {scheme.fund_house} • {scheme.plan_type}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedScheme?.needs_verification && (
                  <p className="text-xs text-warning mt-1">
                    This scheme needs AMFI code verification for NAV updates
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="folio_no">Folio Number</Label>
                <Input
                  id="folio_no"
                  value={formData.folio_no}
                  onChange={(e) => setFormData(prev => ({ ...prev, folio_no: e.target.value }))}
                  placeholder="e.g., 12345678/90"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invested_amount">Total Invested Amount (₹) *</Label>
                  <Input
                    id="invested_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.invested_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, invested_amount: e.target.value }))}
                    placeholder="e.g., 100000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="units_held">Units Held *</Label>
                  <Input
                    id="units_held"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.units_held}
                    onChange={(e) => setFormData(prev => ({ ...prev, units_held: e.target.value }))}
                    placeholder="e.g., 150.2345"
                    required
                  />
                </div>
              </div>

              {selectedScheme?.latest_nav && formData.units_held && (
                <Card className="bg-muted/50">
                  <CardContent className="py-3">
                    <p className="text-sm">
                      <strong>Estimated Current Value:</strong>{' '}
                      ₹{(selectedScheme.latest_nav * parseFloat(formData.units_held || '0')).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on NAV of ₹{selectedScheme.latest_nav} as of {selectedScheme.latest_nav_date}
                    </p>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/mf/holdings')}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addHolding.isPending || !formData.scheme_id || !formData.invested_amount || !formData.units_held}
                >
                  {addHolding.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Holding'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
