import { useParams, Link, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMfHolding, useMfTransactions, useDeleteMfHolding } from '@/hooks/useMfHoldings';
import { formatINR, formatNAV, formatPercent } from '@/types/mutualFunds';
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  Plus
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
  const { data: holding, isLoading } = useMfHolding(id);
  const { data: transactions } = useMfTransactions(id);
  const deleteHolding = useDeleteMfHolding();

  const handleDelete = async () => {
    if (!id) return;
    await deleteHolding.mutateAsync(id);
    navigate('/mf/holdings');
  };

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

  if (!holding) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Holding not found</p>
              <Button asChild>
                <Link to="/mf/holdings">
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

  const scheme = holding.scheme;
  const gain = holding.unrealized_gain || 0;
  const returnPct = holding.absolute_return_pct || 0;

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/mf/holdings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{scheme?.scheme_name || 'Unknown Scheme'}</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                {scheme?.fund_house && <span>{scheme.fund_house}</span>}
                {scheme?.plan_type && (
                  <Badge variant="secondary">{scheme.plan_type}</Badge>
                )}
                {scheme?.option_type && (
                  <Badge variant="outline">{scheme.option_type}</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/mf/holdings/${id}/edit`}>
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
                    This action cannot be undone.
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
              <p className="text-2xl font-bold">{holding.units_held.toFixed(4)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Invested Amount</p>
              <p className="text-2xl font-bold">{formatINR(holding.invested_amount)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="text-2xl font-bold">{formatINR(holding.current_value || 0)}</p>
              {scheme?.latest_nav && (
                <p className="text-xs text-muted-foreground">
                  NAV: ₹{formatNAV(scheme.latest_nav)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Returns</p>
              <p className={`text-2xl font-bold flex items-center gap-1 ${
                gain >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {gain >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {formatINR(Math.abs(gain))}
              </p>
              <p className={`text-sm ${gain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(returnPct)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Holding Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {holding.folio_no && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Folio Number</span>
                <span className="font-medium">{holding.folio_no}</span>
              </div>
            )}
            {scheme?.isin && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">ISIN</span>
                <span className="font-medium">{scheme.isin}</span>
              </div>
            )}
            {scheme?.amfi_scheme_code && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">AMFI Code</span>
                <span className="font-medium">{scheme.amfi_scheme_code}</span>
              </div>
            )}
            {scheme?.category && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{scheme.category}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <Button size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </CardHeader>
          <CardContent>
            {!transactions || transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No transactions recorded yet
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <Badge variant={tx.transaction_type === 'PURCHASE' ? 'default' : 'secondary'}>
                        {tx.transaction_type}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {format(new Date(tx.transaction_date), 'dd MMM yyyy')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatINR(tx.amount)}</p>
                      <p className="text-sm text-muted-foreground">
                        {tx.units.toFixed(4)} units @ ₹{formatNAV(tx.nav_at_transaction || 0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
