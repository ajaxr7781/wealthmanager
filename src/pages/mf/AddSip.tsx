import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useActiveMfSchemes } from '@/hooks/useMfSchemes';
import { useAddMfSip } from '@/hooks/useMfSips';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function AddSipPage() {
  const navigate = useNavigate();
  const { data: schemes, isLoading: schemesLoading } = useActiveMfSchemes();
  const addSip = useAddMfSip();

  const [formData, setFormData] = useState({
    scheme_id: '',
    folio_no: '',
    sip_amount: '',
    sip_day_of_month: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    current_units: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addSip.mutate({
      scheme_id: formData.scheme_id,
      folio_no: formData.folio_no || undefined,
      sip_amount: parseFloat(formData.sip_amount),
      sip_day_of_month: parseInt(formData.sip_day_of_month),
      start_date: formData.start_date,
      end_date: formData.end_date || undefined,
      current_units: formData.current_units ? parseFloat(formData.current_units) : 0,
      notes: formData.notes || undefined
    }, {
      onSuccess: () => {
        navigate('/mf/sips');
      }
    });
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/mf/sips">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to SIPs
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create New SIP</CardTitle>
            <CardDescription>
              Set up a Systematic Investment Plan for regular investments
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
                    <SelectValue placeholder="Choose a scheme" />
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
                          {scheme.scheme_name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="sip_amount">SIP Amount (₹) *</Label>
                  <Input
                    id="sip_amount"
                    type="number"
                    step="100"
                    min="100"
                    value={formData.sip_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, sip_amount: e.target.value }))}
                    placeholder="e.g., 10000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="sip_day_of_month">SIP Day (1-28) *</Label>
                  <Select
                    value={formData.sip_day_of_month}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, sip_day_of_month: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date (Optional)</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    min={formData.start_date}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave empty for perpetual SIP
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="folio_no">Folio Number (Optional)</Label>
                  <Input
                    id="folio_no"
                    value={formData.folio_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, folio_no: e.target.value }))}
                    placeholder="e.g., 12345678/90"
                  />
                </div>

                <div>
                  <Label htmlFor="current_units">Current Units Held</Label>
                  <Input
                    id="current_units"
                    type="number"
                    step="0.001"
                    min="0"
                    value={formData.current_units}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_units: e.target.value }))}
                    placeholder="e.g., 125.456"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total units held in this SIP
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => navigate('/mf/sips')}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addSip.isPending || !formData.scheme_id || !formData.sip_amount || !formData.sip_day_of_month}
                >
                  {addSip.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create SIP'
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
