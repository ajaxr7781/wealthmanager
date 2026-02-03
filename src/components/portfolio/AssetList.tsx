import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Asset, PortfolioOverview } from '@/types/assets';
import { ASSET_TYPE_LABELS, DEFAULT_INR_TO_AED } from '@/types/assets';
import { useUserSettings } from '@/hooks/useAssets';
import { useActiveMfHoldings } from '@/hooks/useMfHoldings';
import { useActiveMfSips } from '@/hooks/useMfSips';
import { calculateSipCurrentValue } from '@/types/mutualFunds';
import { 
  Coins, 
  Building2, 
  Landmark, 
  TrendingUp, 
  PieChart, 
  BarChart3,
  ChevronRight,
  Plus,
  CalendarClock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetListProps {
  assets: Asset[];
  overview?: PortfolioOverview;
}

const ASSET_ICONS: Record<string, typeof Coins> = {
  precious_metals: Coins,
  real_estate: Building2,
  fixed_deposit: Landmark,
  sip: TrendingUp,
  mutual_fund: PieChart,
  shares: BarChart3,
};

const ASSET_COLORS: Record<string, string> = {
  precious_metals: 'bg-gold/20 text-gold',
  real_estate: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  fixed_deposit: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  sip: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  mutual_fund: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
  shares: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
};

export function AssetList({ assets, overview }: AssetListProps) {
  const { data: settings } = useUserSettings();
  const { data: mfHoldings } = useActiveMfHoldings();
  const { data: activeSips } = useActiveMfSips();
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  const formatCurrencyAED = (value: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatCurrencyINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const calculatePL = (asset: Asset) => {
    const currentValue = Number(asset.current_value) || Number(asset.total_cost);
    const totalCost = Number(asset.total_cost);
    const pl = currentValue - totalCost;
    const plPercent = totalCost > 0 ? (pl / totalCost) * 100 : 0;
    return { pl, plPercent };
  };

  const getValueInAED = (asset: Asset) => {
    const value = Number(asset.current_value) || Number(asset.total_cost);
    return asset.currency === 'INR' ? value * inrToAed : value;
  };

  const getCostInAED = (asset: Asset) => {
    const cost = Number(asset.total_cost);
    return asset.currency === 'INR' ? cost * inrToAed : cost;
  };

  // Calculate MF totals
  const mfTotalInvested = mfHoldings?.reduce((sum, h) => sum + h.invested_amount, 0) || 0;
  const mfCurrentValue = mfHoldings?.reduce((sum, h) => sum + (h.current_value || h.invested_amount), 0) || 0;
  const mfPL = mfCurrentValue - mfTotalInvested;
  const mfPLPercent = mfTotalInvested > 0 ? (mfPL / mfTotalInvested) * 100 : 0;

  // Calculate SIP totals
  const sipMonthlyCommitment = activeSips?.reduce((sum, s) => sum + s.sip_amount, 0) || 0;
  const sipCurrentValue = activeSips?.reduce((sum, s) => sum + calculateSipCurrentValue(s), 0) || 0;

  const hasAssets = assets.length > 0 || (mfHoldings && mfHoldings.length > 0);

  if (!hasAssets) {
    return (
      <Card className="shadow-luxury">
        <CardHeader>
          <CardTitle>Your Assets</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">No assets added yet</p>
          <Link to="/assets/new">
            <Button className="gold-gradient text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Asset
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-luxury">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Assets</CardTitle>
        <Link to="/assets/new">
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Asset
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Regular assets */}
          {assets.map((asset) => {
            const Icon = ASSET_ICONS[asset.asset_type] || Coins;
            const { pl, plPercent } = calculatePL(asset);
            const isProfit = pl >= 0;
            const valueAED = getValueInAED(asset);
            const costAED = getCostInAED(asset);

            return (
              <Link
                key={asset.id}
                to={`/asset/${asset.id}`}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    ASSET_COLORS[asset.asset_type]
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{asset.asset_name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {ASSET_TYPE_LABELS[asset.asset_type]}
                      </Badge>
                      {asset.currency === 'INR' && (
                        <Badge variant="outline" className="text-xs">INR</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrencyAED(costAED)} invested
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrencyAED(valueAED)}
                    </p>
                    <p className={cn(
                      "text-sm",
                      isProfit ? "text-positive" : "text-negative"
                    )}>
                      {isProfit ? '+' : ''}{plPercent.toFixed(1)}%
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            );
          })}

          {/* Mutual Funds summary row */}
          {mfHoldings && mfHoldings.length > 0 && (
            <Link
              to="/mf/holdings"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  ASSET_COLORS['mutual_fund']
                )}>
                  <PieChart className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Mutual Funds</p>
                    <Badge variant="secondary" className="text-xs">
                      {mfHoldings.length} holdings
                    </Badge>
                    <Badge variant="outline" className="text-xs">INR</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrencyINR(mfTotalInvested)} invested
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">
                    {formatCurrencyINR(mfCurrentValue)}
                  </p>
                  <p className={cn(
                    "text-sm",
                    mfPL >= 0 ? "text-positive" : "text-negative"
                  )}>
                    {mfPL >= 0 ? '+' : ''}{mfPLPercent.toFixed(1)}%
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          )}

          {/* SIPs summary row */}
          {activeSips && activeSips.length > 0 && (
            <Link
              to="/mf/sips"
              className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  ASSET_COLORS['sip']
                )}>
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Active SIPs</p>
                    <Badge variant="secondary" className="text-xs">
                      {activeSips.length} SIPs
                    </Badge>
                    <Badge variant="outline" className="text-xs">INR</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrencyINR(sipMonthlyCommitment)}/mo commitment
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">
                    {formatCurrencyINR(sipCurrentValue)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ≈ {formatCurrencyAED(sipCurrentValue * inrToAed)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
