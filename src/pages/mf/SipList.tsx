import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAssets, useUpdateAsset } from '@/hooks/useAssets';
import { cn } from '@/lib/utils';
import { 
  Plus, 
  Calendar,
  Pause,
  Play,
  StopCircle,
  Edit,
  Wallet,
  TrendingUp,
  Banknote
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
} from '@/components/ui/alert-dialog';

export default function SipListPage() {
  const { data: allAssets, isLoading } = useAssets();
  const updateAsset = useUpdateAsset();
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  // Filter to SIP assets
  const sips = allAssets?.filter(a => a.asset_type === 'sip') || [];

  const activeSips = sips.filter(s => s.sip_status === 'ACTIVE');
  const monthlyCommitment = activeSips.reduce((sum, s) => sum + (Number(s.sip_amount) || 0), 0);
  const totalInvested = sips.reduce((sum, s) => sum + Number(s.total_cost), 0);
  const totalValue = sips.reduce((sum, s) => sum + (Number(s.current_value) || Number(s.total_cost)), 0);

  const fmtINR = (v: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

  const handlePause = (id: string) => {
    updateAsset.mutate({ id, sip_status: 'PAUSED' } as any);
  };

  const handleResume = (id: string) => {
    updateAsset.mutate({ id, sip_status: 'ACTIVE' } as any);
  };

  const handleStop = () => {
    if (stoppingId) {
      updateAsset.mutate({ 
        id: stoppingId, 
        sip_status: 'COMPLETED',
        sip_end_date: new Date().toISOString().split('T')[0]
      } as any, {
        onSuccess: () => setStoppingId(null)
      });
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-positive/20 text-positive">Active</Badge>;
      case 'PAUSED': return <Badge variant="secondary">Paused</Badge>;
      case 'COMPLETED': return <Badge variant="outline">Completed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">SIP Management</h1>
            <p className="text-muted-foreground">
              Track and manage your Systematic Investment Plans
            </p>
          </div>
          <Button asChild>
            <Link to="/assets/new">
              <Plus className="h-4 w-4 mr-2" />
              Add SIP
            </Link>
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active SIPs</p>
                <p className="text-2xl font-bold">{activeSips.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Banknote className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invested</p>
                <p className="text-2xl font-bold">{fmtINR(totalInvested)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-positive/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-positive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Value</p>
                <p className="text-2xl font-bold">{fmtINR(totalValue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Commitment</p>
                <p className="text-2xl font-bold">{fmtINR(monthlyCommitment)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SIP List */}
        <div className="space-y-4">
          {sips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No SIPs set up yet.</p>
                <Button asChild>
                  <Link to="/assets/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First SIP
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            sips.map((sip) => {
              const invested = Number(sip.total_cost);
              const value = Number(sip.current_value) || invested;
              const gain = value - invested;
              const isProfit = gain >= 0;
              const status = sip.sip_status || 'ACTIVE';
              
              return (
                <Card key={sip.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{sip.asset_name}</h3>
                          {getStatusBadge(status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>Invested: <strong>{fmtINR(invested)}</strong></span>
                          {sip.units_held && <span>Units: <strong>{Number(sip.units_held).toFixed(4)}</strong></span>}
                          <span>Value: <strong className={isProfit ? "text-positive" : "text-negative"}>{fmtINR(value)}</strong></span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          {sip.sip_amount && <span>Monthly: {fmtINR(Number(sip.sip_amount))}</span>}
                          {sip.sip_day_of_month && <span>Day: {sip.sip_day_of_month}</span>}
                          {sip.sip_start_date && <span>Started: {format(new Date(sip.sip_start_date), 'MMM yyyy')}</span>}
                          {sip.folio_no && <span>Folio: {sip.folio_no}</span>}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {status === 'ACTIVE' && (
                          <Button variant="ghost" size="sm" onClick={() => handlePause(sip.id)} title="Pause SIP">
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {status === 'PAUSED' && (
                          <Button variant="ghost" size="sm" onClick={() => handleResume(sip.id)} title="Resume SIP">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {(status === 'ACTIVE' || status === 'PAUSED') && (
                          <Button variant="ghost" size="sm" onClick={() => setStoppingId(sip.id)} title="Stop SIP">
                            <StopCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/asset/${sip.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Stop Confirmation */}
      <AlertDialog open={!!stoppingId} onOpenChange={(open) => !open && setStoppingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop SIP?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the SIP as completed and set today as the end date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop}>Stop SIP</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
