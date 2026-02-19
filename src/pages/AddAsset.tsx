import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCreateAsset } from '@/hooks/useAssets';
import { useMetalPrices } from '@/hooks/useMetalPrices';
import { useCategoriesWithTypes } from '@/hooks/useAssetConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { FDFormFields } from '@/components/assets/FDFormFields';
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
  Bitcoin,
  Wallet,
  Briefcase,
  MapPin,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AssetType, AssetFormData, Currency } from '@/types/assets';
import { OUNCE_TO_GRAM } from '@/types/assets';
import { getColorClass } from '@/types/assetConfig';
import type { AssetTypeConfig } from '@/types/assetConfig';

// Map icon strings to components
const IconMap: Record<string, typeof Coins> = {
  Coins,
  Landmark,
  TrendingUp,
  Building2,
  Bitcoin,
  Wallet,
  Briefcase,
  BarChart3,
  PieChart,
  MapPin,
  Package,
  FileText: Landmark,
  HandCoins: Wallet,
};

// Map new asset type codes to legacy asset_type enum values
const CODE_TO_LEGACY_TYPE: Record<string, AssetType> = {
  gold: 'precious_metals',
  silver: 'precious_metals',
  fixed_deposit: 'fixed_deposit',
  savings_account: 'fixed_deposit', // Map to closest legacy type
  bonds: 'fixed_deposit',
  stocks: 'shares',
  mutual_fund: 'mutual_fund',
  sip: 'sip',
  real_estate: 'real_estate',
  land: 'real_estate',
  crypto: 'shares', // Map to closest legacy type
  nps: 'mutual_fund',
  business: 'shares',
  loans_given: 'fixed_deposit',
};

// Get quantity units based on asset type
const getQuantityUnits = (assetType: AssetTypeConfig | undefined): string[] => {
  if (!assetType) return ['units'];
  
  switch (assetType.unit_type) {
    case 'weight':
      return ['grams', 'oz'];
    case 'area':
      return ['sqft', 'sqm', 'units'];
    case 'units':
      return ['units', 'shares'];
    case 'quantity':
      return ['units'];
    default:
      return ['units'];
  }
};

export default function AddAsset() {
  const navigate = useNavigate();
  const createAsset = useCreateAsset();
  const { data: metalPrices } = useMetalPrices();
  const { data: categories, isLoading: categoriesLoading } = useCategoriesWithTypes();
  
  const [step, setStep] = useState(1);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>(null);
  const [selectedTypeCode, setSelectedTypeCode] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AssetFormData> & { asset_type_code?: string; category_code?: string }>({
    currency: 'AED',
    purchase_date: new Date().toISOString().split('T')[0],
  });

  // Get selected category and type
  const selectedCategory = useMemo(() => 
    categories?.find(c => c.code === selectedCategoryCode),
    [categories, selectedCategoryCode]
  );
  
  const selectedType = useMemo(() => 
    selectedCategory?.asset_types.find(t => t.code === selectedTypeCode),
    [selectedCategory, selectedTypeCode]
  );

  const updateForm = (updates: Partial<AssetFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleCategorySelect = (categoryCode: string) => {
    setSelectedCategoryCode(categoryCode);
    setSelectedTypeCode(null);
    
    // If category has only one type, auto-select it
    const category = categories?.find(c => c.code === categoryCode);
    if (category?.asset_types.length === 1) {
      const type = category.asset_types[0];
      handleTypeSelect(type.code, categoryCode);
    }
  };

  const handleTypeSelect = (typeCode: string, catCode?: string) => {
    setSelectedTypeCode(typeCode);
    const categoryCode = catCode || selectedCategoryCode;
    const category = categories?.find(c => c.code === categoryCode);
    const type = category?.asset_types.find(t => t.code === typeCode);
    
    if (type && category) {
      const legacyType = CODE_TO_LEGACY_TYPE[typeCode] || 'shares';
      const units = getQuantityUnits(type);
      
      updateForm({ 
        asset_type: legacyType,
        quantity_unit: units[0],
        // Set metal_type for precious metals
        metal_type: typeCode === 'gold' ? 'XAU' : typeCode === 'silver' ? 'XAG' : undefined,
      });
      
      // Store new codes in form data for submission
      setFormData(prev => ({
        ...prev,
        asset_type: legacyType,
        asset_type_code: typeCode,
        category_code: categoryCode || undefined,
        quantity_unit: units[0],
        metal_type: typeCode === 'gold' ? 'XAU' : typeCode === 'silver' ? 'XAG' : undefined,
      }));
    }
  };

  const handleSubmit = async () => {
    if (!selectedTypeCode || !formData.asset_name || !formData.total_cost) {
      return;
    }

    // Calculate current value if not set
    let currentValue = formData.current_value;
    
    if (!currentValue && (selectedTypeCode === 'gold' || selectedTypeCode === 'silver') && formData.quantity && metalPrices) {
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
    if (step === 1) return !!selectedTypeCode;
    if (step === 2) return !!formData.asset_name && !!formData.total_cost && formData.total_cost > 0;
    return true;
  };

  if (categoriesLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
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
            <CardContent className="space-y-6">
              {/* Category Selection */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories?.map((category) => {
                  const Icon = IconMap[category.icon || 'Package'] || Package;
                  const isSelected = selectedCategoryCode === category.code;
                  
                  return (
                    <button
                      key={category.code}
                      type="button"
                      onClick={() => handleCategorySelect(category.code)}
                      className={cn(
                        'p-4 rounded-lg border-2 text-left transition-all hover:border-primary/50',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center mb-2",
                        getColorClass(category.color)
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="font-medium text-sm">{category.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {category.asset_types.length} type{category.asset_types.length !== 1 ? 's' : ''}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Type Selection (if category has multiple types) */}
              {selectedCategory && selectedCategory.asset_types.length > 1 && (
                <div className="pt-4 border-t">
                  <Label className="mb-3 block">Select specific type:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {selectedCategory.asset_types.map((type) => {
                      const Icon = IconMap[type.icon || 'Package'] || Package;
                      const isSelected = selectedTypeCode === type.code;
                      
                      return (
                        <button
                          key={type.code}
                          type="button"
                          onClick={() => handleTypeSelect(type.code)}
                          className={cn(
                            'p-3 rounded-lg border-2 text-left transition-all hover:border-primary/50',
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={cn(
                              'h-4 w-4',
                              isSelected ? 'text-primary' : 'text-muted-foreground'
                            )} />
                            <span className="font-medium text-sm">{type.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Common Fields */}
        {step === 2 && selectedType && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Enter the core details of your {selectedType.name}
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

              {/* Quantity fields based on unit type */}
              {selectedType.unit_type !== 'currency' && (
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
                      value={formData.quantity_unit || getQuantityUnits(selectedType)[0]}
                      onValueChange={(value) => updateForm({ quantity_unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getQuantityUnits(selectedType).map((unit) => (
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
        {step === 3 && selectedType && (
          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>
                Optional fields specific to {selectedType.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Precious Metals */}
              {(selectedTypeCode === 'gold' || selectedTypeCode === 'silver') && (
                <div className="space-y-4">
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-1">Selected Metal: {selectedType.name}</p>
                    {metalPrices && metalPrices[formData.metal_type as 'XAU' | 'XAG'] && (
                      <p>
                        Live Price: AED {metalPrices[formData.metal_type as 'XAU' | 'XAG']?.aed_per_gram.toFixed(2)}/g
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Real Estate / Land */}
              {(selectedTypeCode === 'real_estate' || selectedTypeCode === 'land') && (
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
                    {selectedTypeCode === 'real_estate' && (
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
                    )}
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

              {/* Fixed Deposit / Bonds / Savings */}
              {['fixed_deposit', 'savings_account', 'bonds'].includes(selectedTypeCode || '') && (
                <FDFormFields
                  formData={formData}
                  updateForm={updateForm}
                  selectedTypeCode={selectedTypeCode}
                />
              )}

              {/* Stocks / Mutual Funds / SIP / Crypto */}
              {['stocks', 'mutual_fund', 'sip', 'crypto', 'nps'].includes(selectedTypeCode || '') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="instrument_name">
                      {selectedTypeCode === 'crypto' ? 'Coin / Token Name' : 'Instrument / Fund Name'}
                    </Label>
                    <Input
                      id="instrument_name"
                      placeholder={selectedTypeCode === 'crypto' ? 'e.g., Bitcoin, Ethereum' : 'e.g., HDFC Mid-Cap, Apple Inc.'}
                      value={formData.instrument_name || ''}
                      onChange={(e) => updateForm({ instrument_name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="broker_platform">
                        {selectedTypeCode === 'crypto' ? 'Exchange / Wallet' : 'Broker / Platform'}
                      </Label>
                      <Input
                        id="broker_platform"
                        placeholder={selectedTypeCode === 'crypto' ? 'e.g., Binance, MetaMask' : 'e.g., Zerodha, Interactive Brokers'}
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
                  {selectedTypeCode === 'sip' && (
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

              {/* Business / Loans Given */}
              {['business', 'loans_given'].includes(selectedTypeCode || '') && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="instrument_name">
                      {selectedTypeCode === 'business' ? 'Business Name' : 'Borrower Name'}
                    </Label>
                    <Input
                      id="instrument_name"
                      placeholder={selectedTypeCode === 'business' ? 'e.g., ABC Enterprises' : 'e.g., John Doe'}
                      value={formData.instrument_name || ''}
                      onChange={(e) => updateForm({ instrument_name: e.target.value })}
                    />
                  </div>
                  {selectedTypeCode === 'loans_given' && (
                    <div className="grid gap-4 md:grid-cols-2">
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
                      <div className="space-y-2">
                        <Label htmlFor="maturity_date">Due Date</Label>
                        <Input
                          id="maturity_date"
                          type="date"
                          value={formData.maturity_date || ''}
                          onChange={(e) => updateForm({ maturity_date: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Current Value Override for applicable types */}
              {!['real_estate', 'land', 'fixed_deposit', 'bonds'].includes(selectedTypeCode || '') && (
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
