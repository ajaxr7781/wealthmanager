import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAsset, useUpdateAsset } from '@/hooks/useAssets';
import { useMetalPrices } from '@/hooks/useMetalPrices';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save } from 'lucide-react';
import { FDFormFields } from '@/components/assets/FDFormFields';
import { calculateFDCurrentValue } from '@/lib/fdCalculations';
import type { Currency } from '@/types/assets';

export default function EditAsset() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: asset, isLoading: assetLoading } = useAsset(id);
  const updateAsset = useUpdateAsset();
  const { data: metalPrices } = useMetalPrices();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesWithTypes();

  const [formData, setFormData] = useState<Record<string, any>>({});

  // Prefill form when asset loads
  useEffect(() => {
    if (asset) {
      setFormData({
        asset_name: asset.asset_name,
        currency: asset.currency,
        purchase_date: asset.purchase_date,
        total_cost: asset.total_cost,
        quantity: asset.quantity,
        quantity_unit: asset.quantity_unit,
        current_value: asset.current_value,
        is_current_value_manual: asset.is_current_value_manual,
        location: asset.location,
        area_sqft: asset.area_sqft,
        rental_income_monthly: asset.rental_income_monthly,
        bank_name: asset.bank_name,
        principal: asset.principal,
        interest_rate: asset.interest_rate,
        maturity_date: asset.maturity_date,
        maturity_amount: asset.maturity_amount,
        instrument_name: asset.instrument_name,
        broker_platform: asset.broker_platform,
        nav_or_price: asset.nav_or_price,
        sip_frequency: asset.sip_frequency,
        notes: asset.notes,
        metal_type: asset.metal_type,
      });
    }
  }, [asset]);

  const updateForm = (updates: Record<string, any>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !formData.asset_name) return;

    const assetTypeCode = asset?.asset_type_code || asset?.asset_type;
    const isFD = ['fixed_deposit', 'bonds'].includes(assetTypeCode || '');
    
    // For FDs, calculate current value based on accrued interest if not manually set
    let currentValue = formData.current_value;
    if (isFD && !formData.is_current_value_manual && formData.principal && formData.interest_rate) {
      currentValue = calculateFDCurrentValue({
        principal: formData.principal,
        interestRate: formData.interest_rate,
        purchaseDate: formData.purchase_date || asset?.purchase_date || '',
        maturityDate: formData.maturity_date || undefined,
      });
    }

    await updateAsset.mutateAsync({
      id,
      ...formData,
      current_value: currentValue,
    });
    navigate(`/asset/${id}`);
  };

  const isLoading = assetLoading || categoriesLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  if (!asset) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 text-center">
          <p className="text-muted-foreground">Asset not found</p>
          <Button variant="link" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const assetTypeCode = asset.asset_type_code || asset.asset_type;

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(`/asset/${id}`)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Asset
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold">Edit Asset</h1>
          <p className="text-muted-foreground">
            Update details for {asset.asset_name}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="asset_name">Asset Name *</Label>
                  <Input
                    id="asset_name"
                    value={formData.asset_name || ''}
                    onChange={(e) => updateForm({ asset_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency || 'AED'}
                    onValueChange={(value: Currency) => updateForm({ currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AED">AED (UAE Dirham)</SelectItem>
                      <SelectItem value="INR">INR (Indian Rupee)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => updateForm({ purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_cost">Total Cost ({formData.currency})</Label>
                  <Input
                    id="total_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_cost || ''}
                    onChange={(e) => updateForm({ total_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Quantity fields */}
              {formData.quantity !== null && formData.quantity !== undefined && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.0001"
                      min="0"
                      value={formData.quantity || ''}
                      onChange={(e) => updateForm({ quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity_unit">Unit</Label>
                    <Input
                      id="quantity_unit"
                      value={formData.quantity_unit || ''}
                      onChange={(e) => updateForm({ quantity_unit: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Type-Specific Fields */}
          {(assetTypeCode === 'real_estate' || assetTypeCode === 'land') && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Property Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location || ''}
                    onChange={(e) => updateForm({ location: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="area_sqft">Area (sq.ft)</Label>
                    <Input
                      id="area_sqft"
                      type="number"
                      min="0"
                      value={formData.area_sqft || ''}
                      onChange={(e) => updateForm({ area_sqft: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rental_income">Monthly Rental Income</Label>
                    <Input
                      id="rental_income"
                      type="number"
                      min="0"
                      value={formData.rental_income_monthly || ''}
                      onChange={(e) => updateForm({ rental_income_monthly: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_value">Current Estimated Value</Label>
                  <Input
                    id="current_value"
                    type="number"
                    min="0"
                    value={formData.current_value || ''}
                    onChange={(e) => updateForm({ 
                      current_value: parseFloat(e.target.value) || undefined,
                      is_current_value_manual: true,
                    })}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {(assetTypeCode === 'fixed_deposit' || assetTypeCode === 'bonds' || assetTypeCode === 'savings_account') && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Banking Details</CardTitle>
              </CardHeader>
              <CardContent>
                <FDFormFields
                  formData={formData}
                  updateForm={updateForm}
                  selectedTypeCode={assetTypeCode}
                />
              </CardContent>
            </Card>
          )}

          {['stocks', 'mutual_fund', 'sip', 'crypto', 'nps'].includes(assetTypeCode) && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Investment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="instrument_name">Instrument / Fund Name</Label>
                  <Input
                    id="instrument_name"
                    value={formData.instrument_name || ''}
                    onChange={(e) => updateForm({ instrument_name: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="broker_platform">Broker / Platform</Label>
                    <Input
                      id="broker_platform"
                      value={formData.broker_platform || ''}
                      onChange={(e) => updateForm({ broker_platform: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nav_or_price">Current NAV / Price</Label>
                    <Input
                      id="nav_or_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.nav_or_price || ''}
                      onChange={(e) => updateForm({ nav_or_price: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                {assetTypeCode === 'sip' && (
                  <div className="space-y-2">
                    <Label htmlFor="sip_frequency">SIP Frequency</Label>
                    <Select
                      value={formData.sip_frequency || 'monthly'}
                      onValueChange={(value) => updateForm({ sip_frequency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                placeholder="Any additional details..."
                value={formData.notes || ''}
                onChange={(e) => updateForm({ notes: e.target.value })}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/asset/${id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateAsset.isPending || !formData.asset_name}
              className="gold-gradient text-primary-foreground"
            >
              <Save className="h-4 w-4 mr-2" />
              {updateAsset.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
