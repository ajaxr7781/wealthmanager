import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAssetCategories, useUpdateAssetType } from '@/hooks/useAssetConfig';
import { VALUATION_METHOD_LABELS, UNIT_TYPE_LABELS } from '@/types/assetConfig';
import type { AssetTypeConfig, ValuationMethod, UnitType } from '@/types/assetConfig';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  category_id: z.string().min(1, 'Please select a category'),
  icon: z.string().optional(),
  color: z.string().optional(),
  supports_price_feed: z.boolean(),
  supports_transactions: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

const ICON_OPTIONS = [
  'Coins', 'Landmark', 'TrendingUp', 'Building2', 'Bitcoin',
  'Wallet', 'Briefcase', 'BarChart3', 'PieChart', 'FileText', 'MapPin', 'Package'
];

const COLOR_OPTIONS = [
  { value: 'gold', label: 'Gold' },
  { value: 'blue', label: 'Blue' },
  { value: 'green', label: 'Green' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'orange', label: 'Orange' },
  { value: 'purple', label: 'Purple' },
  { value: 'gray', label: 'Gray' },
  { value: 'rose', label: 'Rose' },
];

interface EditAssetTypeDialogProps {
  assetType: AssetTypeConfig;
}

export function EditAssetTypeDialog({ assetType }: EditAssetTypeDialogProps) {
  const [open, setOpen] = useState(false);
  const { data: categories } = useAssetCategories();
  const updateType = useUpdateAssetType();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: assetType.name,
      category_id: assetType.category_id,
      icon: assetType.icon || 'Package',
      color: assetType.color || 'gray',
      supports_price_feed: assetType.supports_price_feed,
      supports_transactions: assetType.supports_transactions,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: assetType.name,
        category_id: assetType.category_id,
        icon: assetType.icon || 'Package',
        color: assetType.color || 'gray',
        supports_price_feed: assetType.supports_price_feed,
        supports_transactions: assetType.supports_transactions,
      });
    }
  }, [open, assetType, form]);

  const onSubmit = async (data: FormData) => {
    await updateType.mutateAsync({
      id: assetType.id,
      name: data.name,
      icon: data.icon || undefined,
      color: data.color || undefined,
      supports_price_feed: data.supports_price_feed,
      supports_transactions: data.supports_transactions,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Asset Type</DialogTitle>
          <DialogDescription>
            Update "{assetType.name}" settings. Code and valuation method cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Code:</span> {assetType.code} &nbsp;·&nbsp;
                <span className="font-medium">Valuation:</span> {VALUATION_METHOD_LABELS[assetType.valuation_method]} &nbsp;·&nbsp;
                <span className="font-medium">Unit:</span> {UNIT_TYPE_LABELS[assetType.unit_type]}
              </p>
            </div>

            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ICON_OPTIONS.map((icon) => (
                          <SelectItem key={icon} value={icon}>
                            {icon}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COLOR_OPTIONS.map((color) => (
                          <SelectItem key={color.value} value={color.value}>
                            {color.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <FormField
                control={form.control}
                name="supports_price_feed"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Supports Live Prices</FormLabel>
                      <FormDescription>Enable real-time price feeds</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supports_transactions"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Supports Transactions</FormLabel>
                      <FormDescription>Track buy/sell transactions</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateType.isPending}>
                {updateType.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
