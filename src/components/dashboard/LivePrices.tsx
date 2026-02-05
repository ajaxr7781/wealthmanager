import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/calculations';
import { formatShortRelative, formatDateTime } from '@/lib/dateUtils';
import { Coins, Circle, TrendingUp } from 'lucide-react';

interface LatestPrice {
  price_aed_per_oz: number;
  price_aed_per_gram: number;
  as_of: string;
}

interface LivePricesProps {
  prices: {
    XAU: LatestPrice | null;
    XAG: LatestPrice | null;
  } | undefined;
}

export function LivePrices({ prices }: LivePricesProps) {

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Live Prices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gold */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
              <Coins className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Gold (XAU)</p>
              {prices?.XAU ? (
                <>
                  <p className="text-lg font-semibold text-foreground">
                    AED {formatNumber(prices.XAU.price_aed_per_oz, 2)}/oz
                  </p>
                  <p 
                    className="text-xs text-muted-foreground cursor-help"
                    title={formatDateTime(prices.XAU.as_of)}
                  >
                    AED {formatNumber(prices.XAU.price_aed_per_gram, 2)}/g · {formatShortRelative(prices.XAU.as_of)} ago
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
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <Circle className="h-4 w-4 text-muted-foreground fill-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Silver (XAG)</p>
              {prices?.XAG ? (
                <>
                  <p className="text-lg font-semibold text-foreground">
                    AED {formatNumber(prices.XAG.price_aed_per_oz, 2)}/oz
                  </p>
                  <p 
                    className="text-xs text-muted-foreground cursor-help"
                    title={formatDateTime(prices.XAG.as_of)}
                  >
                    AED {formatNumber(prices.XAG.price_aed_per_gram, 2)}/g · {formatShortRelative(prices.XAG.as_of)} ago
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No price data</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}