import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/calculations';
import { Coins, Circle } from 'lucide-react';

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
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="shadow-luxury">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUpIcon className="h-4 w-4 text-primary" />
          Live Prices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
                    AED {formatNumber(prices.XAU.price_aed_per_oz, 2)}/oz
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AED {formatNumber(prices.XAU.price_aed_per_gram, 2)}/g · {formatTime(prices.XAU.as_of)}
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
                    AED {formatNumber(prices.XAG.price_aed_per_oz, 2)}/oz
                  </p>
                  <p className="text-xs text-muted-foreground">
                    AED {formatNumber(prices.XAG.price_aed_per_gram, 2)}/g · {formatTime(prices.XAG.as_of)}
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
