import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUserSettings, useUpdateSettings } from '@/hooks/useAssets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Save } from 'lucide-react';

export default function PreferencesSettings() {
  const { data: settings, isLoading } = useUserSettings();
  const updateSettings = useUpdateSettings();

  const [usdToAed, setUsdToAed] = useState('3.6725');
  const [inrToAed, setInrToAed] = useState('0.044');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (settings) {
      setUsdToAed(settings.usd_to_aed_rate.toString());
      setInrToAed(settings.inr_to_aed_rate.toString());
      setAutoRefresh(settings.auto_refresh_prices ?? true);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      usd_to_aed_rate: parseFloat(usdToAed) || 3.6725,
      inr_to_aed_rate: parseFloat(inrToAed) || 0.044,
      auto_refresh_prices: autoRefresh,
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Preferences</h1>
          <p className="text-muted-foreground">
            Configure your currency rates and display preferences
          </p>
        </div>

        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle>Currency Conversion</CardTitle>
            <CardDescription>
              Set exchange rates for portfolio calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="usd-rate">USD to AED Rate</Label>
                <Input
                  id="usd-rate"
                  type="number"
                  step="0.0001"
                  value={usdToAed}
                  onChange={(e) => setUsdToAed(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  1 USD = {usdToAed} AED
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inr-rate">INR to AED Rate</Label>
                <Input
                  id="inr-rate"
                  type="number"
                  step="0.0001"
                  value={inrToAed}
                  onChange={(e) => setInrToAed(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  1 INR = {inrToAed} AED
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle>Price Updates</CardTitle>
            <CardDescription>
              Configure automatic price refresh settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-refresh Prices</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically fetch latest prices when viewing portfolio
                </p>
              </div>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
          </CardContent>
        </Card>

        <Button 
          onClick={handleSave} 
          disabled={updateSettings.isPending}
          className="gold-gradient text-primary-foreground"
        >
          <Save className="h-4 w-4 mr-2" />
          {updateSettings.isPending ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </AppLayout>
  );
}
