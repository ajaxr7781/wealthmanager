import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLatestPrices, useCreatePrice, usePriceHistory } from '@/hooks/usePrices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Coins, Circle } from 'lucide-react';
import { formatNumber, pricePerOzToPerGram } from '@/lib/calculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function Prices() {
  const { data: prices, isLoading } = useLatestPrices();
  const createPrice = useCreatePrice();
  const [xauPrice, setXauPrice] = useState('');
  const [xagPrice, setXagPrice] = useState('');
  const { data: xauHistory } = usePriceHistory('XAU');
  const { data: xagHistory } = usePriceHistory('XAG');
  const [selectedChart, setSelectedChart] = useState<'XAU' | 'XAG'>('XAU');

  const handleUpdatePrices = async () => {
    if (xauPrice) {
      await createPrice.mutateAsync({ instrument_symbol: 'XAU', price_aed_per_oz: Number(xauPrice) });
      setXauPrice('');
    }
    if (xagPrice) {
      await createPrice.mutateAsync({ instrument_symbol: 'XAG', price_aed_per_oz: Number(xagPrice) });
      setXagPrice('');
    }
  };

  const chartData = (selectedChart === 'XAU' ? xauHistory : xagHistory)?.map(p => ({
    date: new Date(p.as_of).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: p.price_aed_per_oz,
  })) || [];

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div><h1 className="text-2xl lg:text-3xl font-bold">Prices</h1><p className="text-muted-foreground">Update and track metal prices</p></div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-luxury">
            <CardHeader><CardTitle>Update Prices</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Coins className="h-4 w-4 text-gold" />Gold (XAU) - AED/oz</Label>
                <Input type="number" placeholder={prices?.XAU ? formatNumber(prices.XAU.price_aed_per_oz, 2) : 'Enter price'} value={xauPrice} onChange={(e) => setXauPrice(e.target.value)} />
                {xauPrice && <p className="text-xs text-muted-foreground">= AED {formatNumber(pricePerOzToPerGram(Number(xauPrice)), 2)}/g</p>}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Circle className="h-4 w-4 text-silver fill-silver" />Silver (XAG) - AED/oz</Label>
                <Input type="number" placeholder={prices?.XAG ? formatNumber(prices.XAG.price_aed_per_oz, 2) : 'Enter price'} value={xagPrice} onChange={(e) => setXagPrice(e.target.value)} />
                {xagPrice && <p className="text-xs text-muted-foreground">= AED {formatNumber(pricePerOzToPerGram(Number(xagPrice)), 2)}/g</p>}
              </div>
              <Button onClick={handleUpdatePrices} disabled={(!xauPrice && !xagPrice) || createPrice.isPending} className="w-full">
                {createPrice.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</> : 'Update Prices'}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-luxury">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Price History</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant={selectedChart === 'XAU' ? 'default' : 'outline'} onClick={() => setSelectedChart('XAU')}>Gold</Button>
                <Button size="sm" variant={selectedChart === 'XAG' ? 'default' : 'outline'} onClick={() => setSelectedChart('XAG')}>Silver</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Line type="monotone" dataKey="price" stroke={selectedChart === 'XAU' ? 'hsl(43, 74%, 49%)' : 'hsl(210, 11%, 71%)'} strokeWidth={2} /></LineChart>
                  </ResponsiveContainer>
                ) : <div className="flex items-center justify-center h-full text-muted-foreground">No price history</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
