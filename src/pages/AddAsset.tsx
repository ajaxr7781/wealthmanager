import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreateAsset } from '@/hooks/useAssets';
import { useMetalPrices } from '@/hooks/useMetalPrices';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Coins, 
  Building2, 
  Landmark, 
  TrendingUp, 
  PieChart, 
  BarChart3,
  ArrowLeft,
  ArrowRight,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetType, AssetFormData, Currency } from '@/types/assets';
import { ASSET_TYPE_LABELS, QUANTITY_UNITS, DEFAULT_QUANTITY_UNIT, OUNCE_TO_GRAM } from '@/types/assets';

const ASSET_TYPE_ICONS = {
  precious_metals: Coins,
  real_estate: Building2,
  fixed_deposit: Landmark,
  sip: TrendingUp,
  mutual_fund: PieChart,
  shares: BarChart3,
};

const ASSET_TYPES: AssetType[] = [
  'precious_metals',
  'real_estate',
  'fixed_deposit',
  'sip',
  'mutual_fund',
  'shares',
];

export default function AddAsset() {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const { data: metalPrices } = useMetalPrices();
  
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<AssetFormData>>({
    currency: 'AED',
    purchase_date: new Date().toISOString().split('T')[0],
  });

  const updateForm = (updates: Partial<AssetFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    if (!formData.asset_type || !formData.asset_name || !formData.total_cost) {
      return;
    }

    // Calculate current value if not set
    let currentValue = formData.current_value;
    
    if (!currentValue && formData.asset_type === 'precious_metals' && formData.quantity && metalPrices) {
      const metalType = formData.metal_type as 'XAU' | 'XAG';
      const priceData = metalPrices[metalType];
      if (priceData) {
        const pricePerGram = priceData.aed_per_gram;
        const quantityGrams = formData.quantity_unit === 'oz' 
          ? formData.quantity * OUNCE_TO_GRAM 
          : formData.quantity;
        currentValue = quantityGrams * pricePerGram;
      }
    }

    await createAsset.mutateAsync({
      ...formData,
      current_value: currentValue,
    } as AssetFormData);
    
    navigate('/portfolio');
  };

  const canProceed = () => {
    if (step === 1) return !!formData.asset_type;
    if (step === 2) return !!formData.asset_name && !!formData.total_cost && formData.total_cost > 0;
    return true;
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/portfolio')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portfolio
          </Button>
          <h1 className="text-2xl lg:text-3xl font-bold">Add New Asset</h1>
          <p className="text-muted-foreground">
            Track a new investment in your portfolio
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'flex items-center',
                s < 3 && 'flex-1'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={cn(
                    'flex-1 h-1 mx-2 rounded-full transition-colors',
                    step > s ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Asset Type */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Asset Type</CardTitle>
              <CardDescription>
                What kind of investment are you adding?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {ASSET_TYPES.map((type) => {
                  const Icon = ASSET_TYPE_ICONS[type];
                  const isSelected = formData.asset_type === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateForm({ 
                        asset_type: type,
                        quantity_unit: DEFAULT_QUANTITY_UNIT[type],
                      })}
                      className={cn(
                        'p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <Icon className={cn(
                        'h-6 w-6 mb-2',
                        isSelected ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <p className="font-medium text-sm">{ASSET_TYPE_LABELS[type]}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Common Fields */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the core details of your {ASSET_TYPE_LABELS[formData.asset_type!]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="asset_name">Asset Name *</Label>
                  <Input
                    id="asset_name"
                    placeholder="e.g., Gold Investment, Dubai Land"
                    value={formData.asset_name || ''}
                    onChange={(e) => updateForm({ asset_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
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
                  <Label htmlFor="purchase_date">Purchase Date *</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date || ''}
                    onChange={(e) => updateForm({ purchase_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_cost">Total Cost ({formData.currency}) *</Label>
                  <Input
                    id="total_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.total_cost || ''}
                    onChange={(e) => updateForm({ total_cost: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Quantity fields if applicable */}
              {formData.asset_type && QUANTITY_UNITS[formData.asset_type].length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.0001"
                      min="0"
                      placeholder="0"
                      value={formData.quantity || ''}
                      onChange={(e) => updateForm({ quantity: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity_unit">Unit</Label>
                    <Select
                      value={formData.quantity_unit || DEFAULT_QUANTITY_UNIT[formData.asset_type]}
                      onValueChange={(value) => updateForm({ quantity_unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUANTITY_UNITS[formData.asset_type].map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {formData.quantity && formData.total_cost && formData.quantity > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Price per {formData.quantity_unit}: {formData.currency}{' '}
                    {(formData.total_cost / formData.quantity).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional details..."
                  value={formData.notes || ''}
                  onChange={(e) => updateForm({ notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Type-specific Fields */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>
                Optional fields specific to {ASSET_TYPE_LABELS[formData.asset_type!]}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Precious Metals */}
              {formData.asset_type === 'precious_metals' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Metal Type</Label>
                    <RadioGroup
                      value={formData.metal_type || 'XAU'}
                      onValueChange={(value) => updateForm({ metal_type: value })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="XAU" id="gold" />
                        <Label htmlFor="gold" className="font-normal">Gold (XAU)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="XAG" id="silver" />
                        <Label htmlFor="silver" className="font-normal">Silver (XAG)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  {metalPrices && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <p className="font-medium mb-1">Live Prices:</p>
                      {metalPrices.XAU && (
                        <p>Gold: AED {metalPrices.XAU.aed_per_gram.toFixed(2)}/g</p>
                      )}
                      {metalPrices.XAG && (
                        <p>Silver: AED {metalPrices.XAG.aed_per_gram.toFixed(2)}/g</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Real Estate */}
              {formData.asset_type === 'real_estate' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., Dubai Marina, Kerala"
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
                    <Label htmlFor="current_value">Current Estimated Value ({formData.currency})</Label>
                    <Input
                      id="current_value"
                      type="number"
                      min="0"
                      placeholder="Leave blank if same as purchase price"
                      value={formData.current_value || ''}
                      onChange={(e) => updateForm({ 
                        current_value: parseFloat(e.target.value) || undefined,
                        is_current_value_manual: true,
                      })}
                    />
                  </div>
                </div>
              )}

              {/* Fixed Deposit */}
              {formData.asset_type === 'fixed_deposit' && (
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
                      <Label htmlFor="principal">Principal Amount</Label>
                      <Input
                        id="principal"
                        type="number"
                        min="0"
                        value={formData.principal || ''}
                        onChange={(e) => updateForm({ principal: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interest_rate">Interest Rate (% p.a.)</Label>
                      <Input
                        id="interest_rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={formData.interest_rate || ''}
                        onChange={(e) => updateForm({ interest_rate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="maturity_date">Maturity Date</Label>
                      <Input
                        id="maturity_date"
                        type="date"
                        value={formData.maturity_date || ''}
                        onChange={(e) => updateForm({ maturity_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maturity_amount">Maturity Amount</Label>
                      <Input
                        id="maturity_amount"
                        type="number"
                        min="0"
                        placeholder="Auto-calculated if blank"
                        value={formData.maturity_amount || ''}
                        onChange={(e) => updateForm({ maturity_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* SIP / Mutual Fund / Shares */}
              {['sip', 'mutual_fund', 'shares'].includes(formData.asset_type || '') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="instrument_name">Instrument / Fund Name</Label>
                    <Input
                      id="instrument_name"
                      placeholder="e.g., HDFC Mid-Cap Opportunities, Apple Inc."
                      value={formData.instrument_name || ''}
                      onChange={(e) => updateForm({ instrument_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="broker_platform">Broker / Platform</Label>
                      <Input
                        id="broker_platform"
                        placeholder="e.g., Zerodha, Interactive Brokers"
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
                  {formData.asset_type === 'sip' && (
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
                </div>
              )}

              {/* Current Value Override */}
              {!['real_estate', 'fixed_deposit'].includes(formData.asset_type || '') && (
                <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="current_value_override">
                    Current Value Override ({formData.currency})
                  </Label>
                  <Input
                    id="current_value_override"
                    type="number"
                    min="0"
                    placeholder="Leave blank for auto-calculation"
                    value={formData.current_value || ''}
                    onChange={(e) => updateForm({ 
                      current_value: parseFloat(e.target.value) || undefined,
                      is_current_value_manual: true,
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Override the calculated current value if needed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(1, s - 1))}
            disabled={step === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          
          {step < 3 ? (
            <Button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={createAsset.isPending}
              className="gold-gradient text-primary-foreground"
            >
              {createAsset.isPending ? 'Saving...' : 'Save Asset'}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
