import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Coins, Circle, Clock } from 'lucide-react';
import type { MetalPrices } from '@/types/assets';

interface LiveMetalPricesProps {
  prices: MetalPrices | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function LiveMetalPrices({ prices, isLoading, onRefresh, isRefreshing }: LiveMetalPricesProps) {
  const formatNumber = (value: number, decimals: number = 2) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-luxury">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Live Metal Prices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  const hasError = prices?.source === 'failed' || (!prices?.XAU && !prices?.XAG);

  return (
    <Card className="shadow-luxury">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUpIcon className="h-4 w-4 text-primary" />
          Live Metal Prices
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasError ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">Unable to fetch live prices</p>
            <Button
              variant="link"
              size="sm"
              onClick={onRefresh}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        ) : (
          <>
            {/* Gold */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center">
                  <Coins className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Gold (XAU)</p>
                  {prices?.XAU ? (
                    <>
                      <p className="text-lg font-bold text-gold">
                        AED {formatNumber(prices.XAU.aed_per_oz, 2)}/oz
                      </p>
                      <p className="text-xs text-muted-foreground">
                        AED {formatNumber(prices.XAU.aed_per_gram, 2)}/g · 
                        ${formatNumber(prices.XAU.usd_per_oz, 2)}/oz
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No price data</p>
                  )}
                </div>
              </div>
            </div>

            {/* Silver */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-silver flex items-center justify-center">
                  <Circle className="h-4 w-4 text-white fill-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Silver (XAG)</p>
                  {prices?.XAG ? (
                    <>
                      <p className="text-lg font-bold text-silver">
                        AED {formatNumber(prices.XAG.aed_per_oz, 2)}/oz
                      </p>
                      <p className="text-xs text-muted-foreground">
                        AED {formatNumber(prices.XAG.aed_per_gram, 2)}/g · 
                        ${formatNumber(prices.XAG.usd_per_oz, 2)}/oz
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No price data</p>
                  )}
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
              <Clock className="h-3 w-3" />
              <span>Updated: {formatTime(prices?.last_updated || null)}</span>
            </div>
            {prices?.source && prices.source !== 'failed' && (
              <p className="text-xs text-muted-foreground">
                Source: {prices.source}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TrendingUpIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}
