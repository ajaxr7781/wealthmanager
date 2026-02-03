import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMfSips, useSipSummary, usePauseMfSip, useResumeMfSip, useStopMfSip } from '@/hooks/useMfSips';
import { formatINR, getNextSipDueDate, calculateSipTotalInvested } from '@/types/mutualFunds';
import { 
  Plus, 
  Calendar,
  Pause,
  Play,
  StopCircle,
  Edit,
  Wallet,
  TrendingUp
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
import type { MfSip } from '@/types/mutualFunds';

export default function SipListPage() {
  const { data: sips, isLoading } = useMfSips();
  const summary = useSipSummary();
  const pauseSip = usePauseMfSip();
  const resumeSip = useResumeMfSip();
  const stopSip = useStopMfSip();
  
  const [stoppingId, setStoppingId] = useState<string | null>(null);

  const handlePause = (id: string) => {
    pauseSip.mutate(id);
  };

  const handleResume = (id: string) => {
    resumeSip.mutate(id);
  };

  const handleStop = () => {
    if (stoppingId) {
      stopSip.mutate(stoppingId, {
        onSuccess: () => setStoppingId(null)
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-600">Active</Badge>;
      case 'PAUSED':
        return <Badge variant="secondary">Paused</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-32" />)}
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
            <Link to="/mf/sips/new">
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
                <p className="text-2xl font-bold">{summary.active_sips}</p>
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
                <p className="text-2xl font-bold">{formatINR(summary.monthly_commitment)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Invested</p>
                <p className="text-2xl font-bold">{formatINR(summary.total_invested)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-2">Upcoming This Month</p>
              {summary.upcoming_this_month.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {summary.upcoming_this_month.slice(0, 3).map((sip) => (
                    <li key={sip.id} className="flex justify-between">
                      <span className="truncate">{sip.scheme?.scheme_name?.slice(0, 20)}...</span>
                      <span className="font-medium">
                        {sip.next_due && format(sip.next_due, 'MMM d')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No SIPs due this month</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SIP List */}
        <div className="space-y-4">
          {!sips || sips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">
                  No SIPs set up yet.
                </p>
                <Button asChild>
                  <Link to="/mf/sips/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First SIP
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            sips.map((sip) => {
              const nextDue = getNextSipDueDate(sip);
              
              return (
                <Card key={sip.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{sip.scheme?.scheme_name || 'Unknown Scheme'}</h3>
                          {getStatusBadge(sip.status)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <span>Monthly: <strong>{formatINR(sip.sip_amount)}</strong></span>
                          <span>Total Invested: <strong>{formatINR(calculateSipTotalInvested(sip))}</strong></span>
                          <span>Day: <strong>{sip.sip_day_of_month}</strong></span>
                          {sip.folio_no && <span>Folio: {sip.folio_no}</span>}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <span>Started: {format(new Date(sip.start_date), 'MMM d, yyyy')}</span>
                          {sip.end_date && (
                            <span>Ends: {format(new Date(sip.end_date), 'MMM d, yyyy')}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col lg:items-end gap-2">
                        {sip.status === 'ACTIVE' && nextDue && (
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Next Due</p>
                            <p className="font-semibold">{format(nextDue, 'MMM d, yyyy')}</p>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          {sip.status === 'ACTIVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePause(sip.id)}
                              disabled={pauseSip.isPending}
                              title="Pause SIP"
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {sip.status === 'PAUSED' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResume(sip.id)}
                              disabled={resumeSip.isPending}
                              title="Resume SIP"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          {(sip.status === 'ACTIVE' || sip.status === 'PAUSED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setStoppingId(sip.id)}
                              title="Stop SIP"
                            >
                              <StopCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/mf/sips/${sip.id}/edit`}>
                              <Edit className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
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
              You can create a new SIP anytime if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStop}>
              Stop SIP
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
