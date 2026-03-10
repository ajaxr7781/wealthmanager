import { AppLayout } from '@/components/layout/AppLayout';
import { useCategoriesWithTypes, useToggleAssetType, useToggleAssetCategory, useDeleteAssetCategory, useDeleteAssetType } from '@/hooks/useAssetConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Coins, Landmark, TrendingUp, Building2, Bitcoin, Wallet,
  Briefcase, BarChart3, PieChart, FileText, MapPin, Package, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getColorClass, VALUATION_METHOD_LABELS } from '@/types/assetConfig';
import { AddAssetTypeDialog } from '@/components/settings/AddAssetTypeDialog';
import { AddAssetCategoryDialog } from '@/components/settings/AddAssetCategoryDialog';
import { EditAssetCategoryDialog } from '@/components/settings/EditAssetCategoryDialog';
import { EditAssetTypeDialog } from '@/components/settings/EditAssetTypeDialog';

const IconMap: Record<string, typeof Coins> = {
  Coins, Landmark, TrendingUp, Building2, Bitcoin, Wallet,
  Briefcase, BarChart3, PieChart, FileText, MapPin, Package,
  HandCoins: Wallet,
};

export default function AssetTypesSettings() {
  const { data: categories, isLoading } = useCategoriesWithTypes(true);
  const toggleType = useToggleAssetType();
  const toggleCategory = useToggleAssetCategory();
  const deleteCategory = useDeleteAssetCategory();
  const deleteType = useDeleteAssetType();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Asset Configuration</h1>
          <p className="text-muted-foreground">
            Manage asset categories and types. Toggle items on/off to show or hide them in the app.
          </p>
        </div>

        <Tabs defaultValue="types" className="space-y-6">
          <TabsList>
            <TabsTrigger value="types">Asset Types</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="types" className="space-y-6">
            <div className="flex justify-end">
              <AddAssetTypeDialog />
            </div>

            {categories?.map((category) => {
              const CategoryIcon = IconMap[category.icon || 'Package'] || Package;
              
              return (
                <Card key={category.id} className={cn("shadow-pro", !category.is_active && "opacity-60")}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        getColorClass(category.color)
                      )}>
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {category.name}
                          {!category.is_active && (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {category.asset_types.length} asset type{category.asset_types.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {category.asset_types.map((assetType) => {
                        const TypeIcon = IconMap[assetType.icon || 'Package'] || Package;
                        
                        return (
                          <div
                            key={assetType.id}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border",
                              !assetType.is_active && "opacity-60 bg-muted/30"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <TypeIcon className="h-5 w-5 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{assetType.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {VALUATION_METHOD_LABELS[assetType.valuation_method]}
                                  </Badge>
                                  {assetType.supports_price_feed && (
                                    <Badge variant="outline" className="text-xs">Live Prices</Badge>
                                  )}
                                  {assetType.supports_transactions && (
                                    <Badge variant="outline" className="text-xs">Transactions</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {assetType.is_system && (
                                <Badge variant="secondary" className="text-xs">System</Badge>
                              )}
                              <EditAssetTypeDialog assetType={assetType} />
                              {!assetType.is_system && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete "{assetType.name}"?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently remove this asset type. Assets using this type may be affected.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteType.mutate(assetType.id)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <Switch
                                checked={assetType.is_active}
                                onCheckedChange={(checked) => {
                                  toggleType.mutate({ id: assetType.id, is_active: checked });
                                }}
                                disabled={toggleType.isPending}
                              />
                            </div>
                          </div>
                        );
                      })}

                      {category.asset_types.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No asset types in this category
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <div className="flex justify-end">
              <AddAssetCategoryDialog />
            </div>

            <Card className="shadow-pro">
              <CardHeader>
                <CardTitle>Asset Categories</CardTitle>
                <CardDescription>
                  Categories group related asset types together in the sidebar navigation.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {categories?.map((category) => {
                    const CategoryIcon = IconMap[category.icon || 'Package'] || Package;
                    
                    return (
                      <div
                        key={category.id}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-lg border",
                          !category.is_active && "opacity-60 bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            getColorClass(category.color)
                          )}>
                            <CategoryIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{category.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {category.code}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {category.asset_types.length} type{category.asset_types.length !== 1 ? 's' : ''}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Order: {category.display_order}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <EditAssetCategoryDialog category={category} />
                          {category.asset_types.length === 0 ? (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete "{category.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove this category.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteCategory.mutate(category.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled title="Remove all asset types first">
                              <Trash2 className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          )}
                          <Switch
                            checked={category.is_active}
                            onCheckedChange={(checked) => {
                              toggleCategory.mutate({ id: category.id, is_active: checked });
                            }}
                            disabled={toggleCategory.isPending}
                          />
                        </div>
                      </div>
                    );
                  })}

                  {(!categories || categories.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No categories configured
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
