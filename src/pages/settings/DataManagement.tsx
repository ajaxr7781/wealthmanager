import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  RefreshCw, Database, TrendingUp, Clock, CheckCircle2, 
  XCircle, AlertTriangle, Loader2 
} from 'lucide-react';
import { 
  useSyncJobLogs, useLatestSyncStatus, 
  useTriggerSchemeMasterSync, useTriggerNavUpdate 
} from '@/hooks/useSyncJobs';
import { useSchemeCache } from '@/hooks/useMfSchemes';
import { format, formatDistanceToNow } from 'date-fns';

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <Badge variant="default" className="bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Success</Badge>;
    case 'partial':
      return <Badge variant="default" className="bg-amber-600"><AlertTriangle className="h-3 w-3 mr-1" />Partial</Badge>;
    case 'failed':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    case 'running':
      return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Running</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function SyncStatusCard({ 
  title, description, icon: Icon, jobName, onTrigger, isPending 
}: { 
  title: string; description: string; icon: React.ElementType; 
  jobName: string; onTrigger: () => void; isPending: boolean;
}) {
  const { data: latest, isLoading } = useLatestSyncStatus(jobName);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <Button size="sm" onClick={onTrigger} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            {isPending ? 'Running...' : 'Run Now'}
          </Button>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : latest ? (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Run</span>
              <span>{formatDistanceToNow(new Date(latest.started_at), { addSuffix: true })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={latest.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Rows</span>
              <span>{latest.rows_processed} processed{latest.rows_failed > 0 ? `, ${latest.rows_failed} failed` : ''}</span>
            </div>
            {latest.error_message && (
              <p className="text-xs text-destructive mt-1 line-clamp-2">{latest.error_message}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No runs recorded yet</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function DataManagement() {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: cacheStatus } = useSchemeCache();
  const { data: allLogs, isLoading: logsLoading } = useSyncJobLogs();
  
  const schemeMasterSync = useTriggerSchemeMasterSync();
  const navUpdate = useTriggerNavUpdate();

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">Data Management</h1>
          <p className="text-muted-foreground">Manage MF data sync, NAV updates, and view job history</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="history">Job History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Cache Status */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Scheme Master Cache</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {cacheStatus ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">{cacheStatus.exists ? 'Available' : 'Empty'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Source</p>
                      <p className="font-medium">{cacheStatus.source || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Age</p>
                      <p className="font-medium">{cacheStatus.age_days != null ? `${cacheStatus.age_days} days` : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="font-medium">
                        {cacheStatus.cached_at 
                          ? formatDistanceToNow(new Date(cacheStatus.cached_at), { addSuffix: true })
                          : 'Never'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <Skeleton className="h-12" />
                )}
              </CardContent>
            </Card>

            {/* Sync Controls */}
            <div className="grid gap-4 md:grid-cols-2">
              <SyncStatusCard
                title="Scheme Master Sync"
                description="Monthly sync from MFAPI (1st of month, 02:00 UTC)"
                icon={Database}
                jobName="import-mf-scheme-master"
                onTrigger={() => schemeMasterSync.mutate()}
                isPending={schemeMasterSync.isPending}
              />
              <SyncStatusCard
                title="NAV Update"
                description="Daily NAV for holdings & SIPs (21:00 UTC)"
                icon={TrendingUp}
                jobName="update-mf-nav"
                onTrigger={() => navUpdate.mutate()}
                isPending={navUpdate.isPending}
              />
            </div>

            {/* Schedule Info */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Scheduled Jobs</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Scope</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Scheme Master Sync</TableCell>
                      <TableCell>1st of every month, 02:00 UTC</TableCell>
                      <TableCell>All MFAPI schemes → cache</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Daily NAV Update</TableCell>
                      <TableCell>Daily at 21:00 UTC</TableCell>
                      <TableCell>Holdings & SIPs only</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Metal Prices</TableCell>
                      <TableCell>Hourly</TableCell>
                      <TableCell>XAU, XAG</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Metal Alerts</TableCell>
                      <TableCell>Hourly (at :05)</TableCell>
                      <TableCell>Active alert rules</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Job Run History</CardTitle>
                <CardDescription>Last 20 job runs across all sync tasks</CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="space-y-2">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}
                  </div>
                ) : allLogs && allLogs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job</TableHead>
                          <TableHead>Started</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Rows</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allLogs.map(log => {
                          const duration = log.completed_at
                            ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}s`
                            : '—';
                          return (
                            <TableRow key={log.id}>
                              <TableCell className="font-medium whitespace-nowrap">{log.job_name}</TableCell>
                              <TableCell className="whitespace-nowrap text-sm">
                                {format(new Date(log.started_at), 'MMM d, HH:mm')}
                              </TableCell>
                              <TableCell>{duration}</TableCell>
                              <TableCell><StatusBadge status={log.status} /></TableCell>
                              <TableCell>
                                {log.rows_processed}
                                {log.rows_failed > 0 && <span className="text-destructive ml-1">(+{log.rows_failed} failed)</span>}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs text-destructive">
                                {log.error_message || '—'}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No job runs recorded yet. Trigger a sync to get started.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
