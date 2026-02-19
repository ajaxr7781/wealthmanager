import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAsset, useDeleteAsset } from '@/hooks/useAssets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ASSET_TYPE_LABELS } from '@/types/assets';
import { 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Coins, 
  Building2, 
  Landmark, 
  TrendingUp, 
  PieChart, 
  BarChart3,
  Calendar,
  MapPin,
  Banknote,
  Percent,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEffectiveFDValue, getFDStatus } from '@/lib/fdCalculations';
import { differenceInDays, parseISO } from 'date-fns';
import { LearnMoreDialog } from '@/components/shared/LearnMoreDialog';
import { useCurrency } from '@/contexts/CurrencyContext';

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

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useAsset(id);
  const deleteAsset = useDeleteAsset();
  const [learnOpen, setLearnOpen] = useState(false);
  const { convert, format: fmtCurrency } = useCurrency();

  const handleDelete = async () => {
    if (!id) return;
    await deleteAsset.mutateAsync(id);
    navigate('/portfolio');
  };

  const formatCurrencyVal = (value: number, currency: string = 'AED') => {
    const converted = convert(value, currency as 'AED' | 'INR' | 'USD');
    return fmtCurrency(converted);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6" />
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

  const Icon = ASSET_ICONS[asset.asset_type] || Coins;
  const totalCost = Number(asset.total_cost);
  
  // Calculate current value - special handling for FDs
  let currentValue: number;
  let fdStatus: ReturnType<typeof getFDStatus> | null = null;
  let fdValueMethod: string | null = null;
  
  if (asset.asset_type === 'fixed_deposit' || asset.asset_type_code === 'fixed_deposit') {
    const fdResult = getEffectiveFDValue({
      principal: asset.principal ? Number(asset.principal) : null,
      interest_rate: asset.interest_rate ? Number(asset.interest_rate) : null,
      purchase_date: asset.purchase_date,
      maturity_date: asset.maturity_date,
      maturity_amount: asset.maturity_amount ? Number(asset.maturity_amount) : null,
      current_value: asset.current_value ? Number(asset.current_value) : null,
      is_current_value_manual: asset.is_current_value_manual,
      total_cost: totalCost,
    });
    currentValue = fdResult.currentValue;
    fdValueMethod = fdResult.method;
    fdStatus = getFDStatus(asset.maturity_date);
  } else {
    currentValue = Number(asset.current_value) || totalCost;
  }
  
  const pl = currentValue - totalCost;
  const plPercent = totalCost > 0 ? (pl / totalCost) * 100 : 0;
  const isProfit = pl >= 0;

  // CAGR calculation
  const days = differenceInDays(new Date(), parseISO(asset.purchase_date));
  const years = days / 365.25;
  const cagr = years > 0 && totalCost > 0 && currentValue > 0
    ? (Math.pow(currentValue / totalCost, 1 / years) - 1) * 100
    : null;

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-14 h-14 rounded-xl flex items-center justify-center",
                ASSET_COLORS[asset.asset_type]
              )}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{asset.asset_name}</h1>
                <Badge variant="secondary" className="mt-1">
                  {ASSET_TYPE_LABELS[asset.asset_type]}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Link to={`/asset/${id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Asset</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete "{asset.asset_name}"? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Value Summary */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card className="shadow-luxury">
            <CardHeader className="pb-2">
              <CardDescription>Total Cost</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrencyVal(totalCost, asset.currency)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-luxury">
            <CardHeader className="pb-2">
              <CardDescription>Current Value</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrencyVal(currentValue, asset.currency)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-luxury">
            <CardHeader className="pb-2">
              <CardDescription>Profit / Loss</CardDescription>
            </CardHeader>
            <CardContent>
              <p className={cn(
                "text-2xl font-bold",
                isProfit ? "text-positive" : "text-negative"
              )}>
                {isProfit ? '+' : ''}{formatCurrencyVal(pl, asset.currency)}
              </p>
              <p className={cn(
                "text-sm",
                isProfit ? "text-positive" : "text-negative"
              )}>
                ({isProfit ? '+' : ''}{plPercent.toFixed(2)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-luxury">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1">
                CAGR
                <Tooltip>
                  <TooltipTrigger><HelpCircle className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent className="max-w-[200px]">Compound Annual Growth Rate — annualized return since purchase.</TooltipContent>
                </Tooltip>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cagr !== null ? (
                <p className={cn(
                  "text-2xl font-bold",
                  cagr > 12 ? "text-positive" : cagr > 6 ? "text-warning" : "text-destructive"
                )}>
                  {cagr >= 0 ? '+' : ''}{cagr.toFixed(1)}%
                </p>
              ) : (
                <p className="text-lg text-muted-foreground">—</p>
              )}
              <p className="text-xs text-muted-foreground">{Math.round(days)} days held</p>
            </CardContent>
          </Card>
        </div>

        <LearnMoreDialog
          open={learnOpen}
          onOpenChange={setLearnOpen}
          title="Asset Performance Metrics"
          sections={[
            { heading: 'CAGR', content: 'Compound Annual Growth Rate measures annualized return: (Current / Cost)^(1/years) - 1. Green >12%, Yellow 6-12%, Red <6%.' },
            { heading: 'P/L', content: 'Profit or Loss = Current Value - Total Cost. Percentage is relative to initial investment.' },
          ]}
        />

        {/* Details */}
        <Card className="shadow-luxury">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Date</p>
                  <p className="font-medium">{formatDate(asset.purchase_date)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium">{asset.currency}</p>
                </div>
              </div>

              {asset.quantity && (
                <div className="flex items-center gap-3">
                  <Percent className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Quantity</p>
                    <p className="font-medium">
                      {asset.quantity} {asset.quantity_unit}
                    </p>
                  </div>
                </div>
              )}

              {asset.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{asset.location}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Type-specific details */}
            {asset.asset_type === 'precious_metals' && asset.metal_type && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Metal Type</p>
                <Badge>{asset.metal_type === 'XAU' ? 'Gold' : 'Silver'}</Badge>
              </div>
            )}

            {asset.asset_type === 'fixed_deposit' && (
              <div className="pt-4 border-t space-y-3">
                {fdStatus && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Badge 
                      variant={fdStatus.status === 'matured' ? 'secondary' : 'outline'}
                      className={cn(
                        fdStatus.status === 'matured' && 'bg-positive/20 text-positive'
                      )}
                    >
                      {fdStatus.label}
                    </Badge>
                    {fdValueMethod && (
                      <span className="text-xs text-muted-foreground">
                        (Value: {fdValueMethod})
                      </span>
                    )}
                  </div>
                )}
                {asset.bank_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bank</p>
                    <p className="font-medium">{asset.bank_name}</p>
                  </div>
                )}
                {asset.principal && (
                  <div>
                    <p className="text-sm text-muted-foreground">Principal</p>
                    <p className="font-medium">{formatCurrencyVal(Number(asset.principal), asset.currency)}</p>
                  </div>
                )}
                {asset.interest_rate && (
                  <div>
                    <p className="text-sm text-muted-foreground">Interest Rate</p>
                    <p className="font-medium">{asset.interest_rate}% p.a.</p>
                  </div>
                )}
                {asset.maturity_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Maturity Date</p>
                    <p className="font-medium">{formatDate(asset.maturity_date)}</p>
                  </div>
                )}
                {asset.maturity_amount && (
                  <div>
                    <p className="text-sm text-muted-foreground">Maturity Amount</p>
                    <p className="font-medium">{formatCurrencyVal(Number(asset.maturity_amount), asset.currency)}</p>
                  </div>
                )}
              </div>
            )}

            {['sip', 'mutual_fund', 'shares'].includes(asset.asset_type) && (
              <div className="pt-4 border-t space-y-3">
                {asset.instrument_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Instrument</p>
                    <p className="font-medium">{asset.instrument_name}</p>
                  </div>
                )}
                {asset.broker_platform && (
                  <div>
                    <p className="text-sm text-muted-foreground">Broker / Platform</p>
                    <p className="font-medium">{asset.broker_platform}</p>
                  </div>
                )}
              </div>
            )}

            {asset.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Notes</p>
                <p className="text-sm">{asset.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
