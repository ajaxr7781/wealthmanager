import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLatestPrices, useCreatePrice, usePriceHistory } from '@/hooks/usePrices';
import { useMetalPrices, useRefreshMetalPrices, useSaveMetalPrices } from '@/hooks/useMetalPrices';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Coins, Circle, RefreshCw, Download, Clock } from 'lucide-react';
import { formatNumber, pricePerOzToPerGram } from '@/lib/calculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function Prices() {
  const { data: prices, isLoading } = useLatestPrices();
  const { data: livePrices, isLoading: liveLoading } = useMetalPrices();
  const refreshLivePrices = useRefreshMetalPrices();
  const savePrices = useSaveMetalPrices();
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

  const handleSaveLivePrices = async () => {
    if (!livePrices?.XAU || !livePrices?.XAG) {
      toast.error('No live prices available to save');
      return;
    }
    await savePrices.mutateAsync({
      xauPrice: livePrices.XAU.aed_per_oz,
      xagPrice: livePrices.XAG.aed_per_oz,
      source: 'api',
    });
  };

  const chartData = (selectedChart === 'XAU' ? xauHistory : xagHistory)?.map(p => ({
    date: new Date(p.as_of).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: p.price_aed_per_oz,
  })) || [];

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    // Get timezone abbreviation
    const timezone = Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
      .formatToParts(date)
      .find(part => part.type === 'timeZoneName')?.value || '';
    
    const timeStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    let relativeStr = '';
    if (diffMins < 1) {
      relativeStr = 'just now';
    } else if (diffMins < 60) {
      relativeStr = `${diffMins}m ago`;
    } else if (diffMins < 1440) {
      relativeStr = `${Math.floor(diffMins / 60)}h ago`;
    } else {
      relativeStr = `${Math.floor(diffMins / 1440)}d ago`;
    }
    
    return `${timeStr} ${timezone} (${relativeStr})`;
  };

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Prices</h1>
          <p className="text-muted-foreground">Fetch live prices or update manually</p>
        </div>

        {/* Live Prices Card */}
        <Card className="shadow-luxury border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Live Market Prices
              </CardTitle>
              <CardDescription>
                Real-time prices from goldprice.org (converted to AED)
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshLivePrices.mutate()}
                disabled={refreshLivePrices.isPending}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshLivePrices.isPending ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLivePrices}
                disabled={savePrices.isPending || !livePrices?.XAU}
                className="gold-gradient text-primary-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                Save to History
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {liveLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : livePrices?.source === 'failed' || (!livePrices?.XAU && !livePrices?.XAG) ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Unable to fetch live prices</p>
                <Button
                  variant="link"
                  onClick={() => refreshLivePrices.mutate()}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                {/* Gold */}
                <div className="p-4 rounded-lg bg-gold/10 border border-gold/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center">
                      <Coins className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold">Gold (XAU)</p>
                      <p className="text-xs text-muted-foreground">Troy Ounce</p>
                    </div>
                  </div>
                  {livePrices?.XAU ? (
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-gold">
                        AED {formatNumber(livePrices.XAU.aed_per_oz, 2)}/oz
                      </p>
                      <p className="text-sm text-muted-foreground">
                        AED {formatNumber(livePrices.XAU.aed_per_gram, 2)}/gram
                      </p>
                      <p className="text-xs text-muted-foreground">
                        USD ${formatNumber(livePrices.XAU.usd_per_oz, 2)}/oz
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No price available</p>
                  )}
                </div>

                {/* Silver */}
                <div className="p-4 rounded-lg bg-silver/10 border border-silver/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-silver flex items-center justify-center">
                      <Circle className="h-5 w-5 text-white fill-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Silver (XAG)</p>
                      <p className="text-xs text-muted-foreground">Troy Ounce</p>
                    </div>
                  </div>
                  {livePrices?.XAG ? (
                    <div className="space-y-1">
                      <p className="text-2xl font-bold text-silver">
                        AED {formatNumber(livePrices.XAG.aed_per_oz, 2)}/oz
                      </p>
                      <p className="text-sm text-muted-foreground">
                        AED {formatNumber(livePrices.XAG.aed_per_gram, 2)}/gram
                      </p>
                      <p className="text-xs text-muted-foreground">
                        USD ${formatNumber(livePrices.XAG.usd_per_oz, 2)}/oz
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No price available</p>
                  )}
                </div>
              </div>
            )}
            
            {livePrices?.last_updated && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4 pt-4 border-t">
                <Clock className="h-3 w-3" />
                <span>Last fetched: {formatTime(livePrices.last_updated)}</span>
                {livePrices.source && <span>• Source: {livePrices.source}</span>}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Manual Update Card */}
          <Card className="shadow-luxury">
            <CardHeader>
              <CardTitle>Manual Price Update</CardTitle>
              <CardDescription>Enter prices manually if API is unavailable</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-gold" />
                  Gold (XAU) - AED/oz
                </Label>
                <Input 
                  type="number" 
                  placeholder={prices?.XAU ? formatNumber(prices.XAU.price_aed_per_oz, 2) : 'Enter price'} 
                  value={xauPrice} 
                  onChange={(e) => setXauPrice(e.target.value)} 
                />
                {xauPrice && (
                  <p className="text-xs text-muted-foreground">
                    = AED {formatNumber(pricePerOzToPerGram(Number(xauPrice)), 2)}/g
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-silver fill-silver" />
                  Silver (XAG) - AED/oz
                </Label>
                <Input 
                  type="number" 
                  placeholder={prices?.XAG ? formatNumber(prices.XAG.price_aed_per_oz, 2) : 'Enter price'} 
                  value={xagPrice} 
                  onChange={(e) => setXagPrice(e.target.value)} 
                />
                {xagPrice && (
                  <p className="text-xs text-muted-foreground">
                    = AED {formatNumber(pricePerOzToPerGram(Number(xagPrice)), 2)}/g
                  </p>
                )}
              </div>
              <Button 
                onClick={handleUpdatePrices} 
                disabled={(!xauPrice && !xagPrice) || createPrice.isPending} 
                className="w-full"
              >
                {createPrice.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Prices'
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Price History Chart */}
          <Card className="shadow-luxury">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Price History</CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant={selectedChart === 'XAU' ? 'default' : 'outline'} 
                  onClick={() => setSelectedChart('XAU')}
                >
                  Gold
                </Button>
                <Button 
                  size="sm" 
                  variant={selectedChart === 'XAG' ? 'default' : 'outline'} 
                  onClick={() => setSelectedChart('XAG')}
                >
                  Silver
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`AED ${formatNumber(value, 2)}`, 'Price/oz']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke={selectedChart === 'XAU' ? 'hsl(43, 74%, 49%)' : 'hsl(210, 11%, 71%)'} 
                        strokeWidth={2} 
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No price history yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
