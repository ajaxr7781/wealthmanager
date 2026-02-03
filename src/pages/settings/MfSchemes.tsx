import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useMfSchemes, 
  useImportSchemeMaster, 
  useImportAmfiData,
  useSchemeCache,
  useDeleteMfScheme
} from '@/hooks/useMfSchemes';
import { useRefreshMfNav } from '@/hooks/useMfNav';
import { AddSchemeDialog } from '@/components/mf/AddSchemeDialog';
import { EditSchemeDialog } from '@/components/mf/EditSchemeDialog';
import { formatNAV, formatINR } from '@/types/mutualFunds';
import type { MfScheme } from '@/types/mutualFunds';
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Download, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
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

export default function MfSchemesSettings() {
  const { data: schemes, isLoading } = useMfSchemes();
  const { data: cacheStatus } = useSchemeCache();
  const importMaster = useImportSchemeMaster();
  const importAmfi = useImportAmfiData();
  const refreshNav = useRefreshMfNav();
  const deleteScheme = useDeleteMfScheme();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingScheme, setEditingScheme] = useState<MfScheme | null>(null);
  const [deletingScheme, setDeletingScheme] = useState<MfScheme | null>(null);

  const filteredSchemes = schemes?.filter(s => 
    s.scheme_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.fund_house?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.isin?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefreshNav = (schemeId: string) => {
    refreshNav.mutate([schemeId]);
  };

  const handleDeleteScheme = () => {
    if (deletingScheme) {
      deleteScheme.mutate(deletingScheme.id, {
        onSuccess: () => setDeletingScheme(null)
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
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
            <h1 className="text-2xl lg:text-3xl font-bold">Mutual Fund Schemes</h1>
            <p className="text-muted-foreground">
              Manage your mutual fund scheme catalog with AMFI code mapping
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => importMaster.mutate({ force: true })}
              disabled={importMaster.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {importMaster.isPending ? 'Importing...' : 'Import Master List'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => importAmfi.mutate({ force: true, auto_map: true })}
              disabled={importAmfi.isPending}
            >
              <Download className="h-4 w-4 mr-2" />
              {importAmfi.isPending ? 'Importing...' : 'Import AMFI Data'}
            </Button>
          </div>
        </div>

        {/* Cache Status */}
        {cacheStatus && (
          <Card className="bg-muted/50">
            <CardContent className="py-3">
              <div className="flex items-center gap-4 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {cacheStatus.exists ? (
                  <span>
                    Scheme cache: <strong>{cacheStatus.source}</strong> • 
                    Last updated {formatDistanceToNow(new Date(cacheStatus.cached_at!))} ago
                  </span>
                ) : (
                  <span className="text-warning">
                    No scheme cache. Click "Import Master List" to fetch schemes from MFAPI.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Add */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, fund house, or ISIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Scheme
          </Button>
        </div>

        {/* Schemes List */}
        <div className="space-y-4">
          {filteredSchemes?.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {schemes?.length === 0 
                    ? 'No schemes added yet. Click "Add Scheme" to get started.'
                    : 'No schemes match your search.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSchemes?.map((scheme) => (
              <Card key={scheme.id} className="hover:shadow-md transition-shadow">
                <CardContent className="py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{scheme.scheme_name}</h3>
                        {scheme.needs_verification ? (
                          <Badge variant="outline" className="text-warning border-warning">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Needs Mapping
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {!scheme.is_active && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        {scheme.fund_house && <span>{scheme.fund_house}</span>}
                        {scheme.category && <span>• {scheme.category}</span>}
                        {scheme.plan_type && <span>• {scheme.plan_type}</span>}
                        {scheme.option_type && <span>• {scheme.option_type}</span>}
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        {scheme.amfi_scheme_code && (
                          <span>AMFI: <strong>{scheme.amfi_scheme_code}</strong></span>
                        )}
                        {scheme.isin && (
                          <span>ISIN: <strong>{scheme.isin}</strong></span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col lg:items-end gap-2">
                      {scheme.latest_nav && (
                        <div className="text-right">
                          <p className="font-semibold">NAV: ₹{formatNAV(scheme.latest_nav)}</p>
                          <p className="text-xs text-muted-foreground">
                            {scheme.latest_nav_date && format(new Date(scheme.latest_nav_date), 'MMM d, yyyy')}
                            {scheme.nav_source && ` • ${scheme.nav_source}`}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRefreshNav(scheme.id)}
                          disabled={refreshNav.isPending || !scheme.amfi_scheme_code}
                          title={!scheme.amfi_scheme_code ? 'AMFI code required' : 'Refresh NAV'}
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshNav.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingScheme(scheme)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingScheme(scheme)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add Dialog */}
      <AddSchemeDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
      />

      {/* Edit Dialog */}
      {editingScheme && (
        <EditSchemeDialog
          scheme={editingScheme}
          open={!!editingScheme}
          onOpenChange={(open) => !open && setEditingScheme(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingScheme} onOpenChange={(open) => !open && setDeletingScheme(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Scheme?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingScheme?.scheme_name}" and all associated holdings, transactions, and SIPs. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScheme}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
