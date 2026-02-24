import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

import { useAsset, useUpdateAsset } from '@/hooks/useAssets';
import { ArrowLeft, Save } from 'lucide-react';

export default function EditMfHolding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useAsset(id);
  const updateAsset = useUpdateAsset();

  const [formData, setFormData] = useState({
    folio_no: '',
    units_held: '',
    invested_amount: '',
    is_active: true
  });

  useEffect(() => {
    if (asset) {
      setFormData({
        folio_no: asset.folio_no || '',
        units_held: (asset.units_held || asset.quantity || 0).toString(),
        invested_amount: asset.total_cost.toString(),
        is_active: asset.sip_status !== 'COMPLETED'
      });
    }
  }, [asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    await updateAsset.mutateAsync({
      id,
      folio_no: formData.folio_no || null,
      units_held: parseFloat(formData.units_held) || 0,
      quantity: parseFloat(formData.units_held) || 0,
      total_cost: parseFloat(formData.invested_amount) || 0,
    });

    navigate(`/mf/holdings/${id}`);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  if (!asset) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Holding not found</p>
              <Button asChild>
                <Link to="/mf/holdings">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Holdings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/mf/holdings/${id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Holding</h1>
            <p className="text-muted-foreground">{asset.asset_name}</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Holding Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="folio_no">Folio Number</Label>
                  <Input
                    id="folio_no"
                    value={formData.folio_no}
                    onChange={(e) => setFormData(prev => ({ ...prev, folio_no: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="units_held">Units Held</Label>
                  <Input
                    id="units_held"
                    type="number"
                    step="0.0001"
                    value={formData.units_held}
                    onChange={(e) => setFormData(prev => ({ ...prev, units_held: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invested_amount">Invested Amount (₹)</Label>
                  <Input
                    id="invested_amount"
                    type="number"
                    step="0.01"
                    value={formData.invested_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, invested_amount: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateAsset.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {updateAsset.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to={`/mf/holdings/${id}`}>Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
