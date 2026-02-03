import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveMfSchemes } from '@/hooks/useMfSchemes';
import { useMfSip, useUpdateMfSip, useDeleteMfSip } from '@/hooks/useMfSips';
import { Loader2, ArrowLeft, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function EditSipPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: sip, isLoading: sipLoading } = useMfSip(id);
  const { data: schemes, isLoading: schemesLoading } = useActiveMfSchemes();
  const updateSip = useUpdateMfSip();
  const deleteSip = useDeleteMfSip();
  const [showDelete, setShowDelete] = useState(false);

  const [formData, setFormData] = useState({
    scheme_id: '',
    folio_no: '',
    sip_amount: '',
    sip_day_of_month: '',
    start_date: '',
    end_date: '',
    current_units: '',
    invested_amount: '',
    notes: ''
  });

  useEffect(() => {
    if (sip) {
      setFormData({
        scheme_id: sip.scheme_id,
        folio_no: sip.folio_no || '',
        sip_amount: sip.sip_amount.toString(),
        sip_day_of_month: sip.sip_day_of_month.toString(),
        start_date: sip.start_date,
        end_date: sip.end_date || '',
        current_units: (sip.current_units || 0).toString(),
        invested_amount: (sip.invested_amount || 0).toString(),
        notes: sip.notes || ''
      });
    }
  }, [sip]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    updateSip.mutate({
      id: id!,
      scheme_id: formData.scheme_id,
      folio_no: formData.folio_no || null,
      sip_amount: parseFloat(formData.sip_amount),
      sip_day_of_month: parseInt(formData.sip_day_of_month),
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      current_units: formData.current_units ? parseFloat(formData.current_units) : 0,
      invested_amount: formData.invested_amount ? parseFloat(formData.invested_amount) : 0,
      notes: formData.notes || null
    }, {
      onSuccess: () => {
        navigate('/mf/sips');
      }
    });
  };

  const handleDelete = () => {
    deleteSip.mutate(id!, {
      onSuccess: () => navigate('/mf/sips')
    });
  };

  if (sipLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-[500px]" />
        </div>
      </AppLayout>
    );
  }

  if (!sip) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 text-center">
          <p className="text-muted-foreground">SIP not found</p>
          <Button asChild className="mt-4">
            <Link to="/mf/sips">Back to SIPs</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Edit SIP</CardTitle>
                <CardDescription>
                  Update your Systematic Investment Plan details
                </CardDescription>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setShowDelete(true)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
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
                  <Label htmlFor="invested_amount">Total Invested (₹)</Label>
                  <Input
                    id="invested_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.invested_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, invested_amount: e.target.value }))}
                    placeholder="e.g., 50000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total amount invested so far
                  </p>
                </div>

                <div>
                  <Label htmlFor="current_units">Current Units Held</Label>
                  <Input
                    id="current_units"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.current_units}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_units: e.target.value }))}
                    placeholder="e.g., 125.4567"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total units held in this SIP
                  </p>
                </div>
              </div>

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
                  disabled={updateSip.isPending || !formData.scheme_id || !formData.sip_amount || !formData.sip_day_of_month}
                >
                  {updateSip.isPending ? (
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
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SIP?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this SIP record. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
