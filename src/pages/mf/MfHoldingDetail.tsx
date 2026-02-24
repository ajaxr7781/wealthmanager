import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAsset, useDeleteAsset } from '@/hooks/useAssets';
import { useAssetTransactions } from '@/hooks/useAssetTransactions';
import { cn } from '@/lib/utils';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
} from 'lucide-react';
import { format } from 'date-fns';
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

export default function MfHoldingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: asset, isLoading } = useAsset(id);
  const { data: transactions } = useAssetTransactions(id);
  const deleteAsset = useDeleteAsset();

  const handleDelete = async () => {
    if (!id) return;
    await deleteAsset.mutateAsync(id);
    navigate('/holdings');
  };

  const fmtINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!asset) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Asset not found</p>
              <Button asChild>
                <Link to="/holdings">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Holdings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const invested = Number(asset.total_cost);
  const value = Number(asset.current_value) || invested;
  const gain = value - invested;
  const returnPct = invested > 0 ? (gain / invested) * 100 : 0;

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{asset.asset_name}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                {asset.instrument_name && <span>{asset.instrument_name}</span>}
                {asset.folio_no && <Badge variant="secondary">{asset.folio_no}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/asset/${id}/edit`}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Holding?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this holding and all its transactions.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Units Held</p>
              <p className="text-2xl font-bold">{Number(asset.units_held || 0).toFixed(4)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Invested Amount</p>
              <p className="text-2xl font-bold">{fmtINR(invested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold">{fmtINR(value)}</p>
              {asset.nav_or_price && (
                <p className="text-xs text-muted-foreground">
                  NAV: ₹{Number(asset.nav_or_price).toFixed(4)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Returns</p>
              <p className={cn("text-2xl font-bold flex items-center gap-1",
                gain >= 0 ? 'text-positive' : 'text-negative'
              )}>
                {gain >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {fmtINR(Math.abs(gain))}
              </p>
              <p className={cn("text-sm", gain >= 0 ? 'text-positive' : 'text-negative')}>
                {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle>Holding Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {asset.folio_no && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Folio Number</span>
                <span className="font-medium">{asset.folio_no}</span>
              </div>
            )}
            {asset.broker_platform && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium">{asset.broker_platform}</span>
              </div>
            )}
            {asset.scheme_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheme ID</span>
                <span className="font-medium text-xs">{asset.scheme_id}</span>
              </div>
            )}
            {asset.category_code && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{asset.category_code}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {!transactions || transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No transactions recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isBuy = ['BUY', 'PURCHASE', 'SWITCH_IN'].includes(tx.transaction_type);
                  return (
                    <div key={tx.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <Badge variant={isBuy ? 'default' : 'secondary'}>
                          {tx.transaction_type}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(tx.transaction_date), 'dd MMM yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{fmtINR(Number(tx.amount))}</p>
                        <p className="text-sm text-muted-foreground">
                          {Number(tx.quantity).toFixed(4)} {tx.quantity_unit || 'units'}
                          {tx.price_per_unit ? ` @ ₹${Number(tx.price_per_unit).toFixed(4)}` : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
