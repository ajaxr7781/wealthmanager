import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAsset, useUpdateAsset, useDeleteAsset } from '@/hooks/useAssets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const handleDelete = async () => {
    if (!id) return;
    await deleteAsset.mutateAsync(id);
    navigate('/portfolio');
  };

  const formatCurrency = (value: number, currency: string = 'AED') => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
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
          <Button variant="link" onClick={() => navigate('/portfolio')}>
            Back to Portfolio
          </Button>
        </div>
      </AppLayout>
    );
  }

  const Icon = ASSET_ICONS[asset.asset_type] || Coins;
  const currentValue = Number(asset.current_value) || Number(asset.total_cost);
  const totalCost = Number(asset.total_cost);
  const pl = currentValue - totalCost;
  const plPercent = totalCost > 0 ? (pl / totalCost) * 100 : 0;
  const isProfit = pl >= 0;

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/portfolio')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Portfolio
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
              <Button variant="outline" size="sm" disabled>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
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
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="shadow-luxury">
            <CardHeader className="pb-2">
              <CardDescription>Total Cost</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(totalCost, asset.currency)}
              </p>
            </CardContent>
          </Card>
          
          <Card className="shadow-luxury">
            <CardHeader className="pb-2">
              <CardDescription>Current Value</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {formatCurrency(currentValue, asset.currency)}
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
                {isProfit ? '+' : ''}{formatCurrency(pl, asset.currency)}
              </p>
              <p className={cn(
                "text-sm",
                isProfit ? "text-positive" : "text-negative"
              )}>
                ({isProfit ? '+' : ''}{plPercent.toFixed(2)}%)
              </p>
            </CardContent>
          </Card>
        </div>

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
                {asset.bank_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Bank</p>
                    <p className="font-medium">{asset.bank_name}</p>
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
