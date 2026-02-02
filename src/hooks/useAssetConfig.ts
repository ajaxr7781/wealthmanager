import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { 
  AssetCategory, 
  AssetTypeConfig, 
  AssetCategoryWithTypes,
  ValuationMethod,
  UnitType 
} from '@/types/assetConfig';

/**
 * Fetch all asset categories
 */
export function useAssetCategories() {
  return useQuery({
    queryKey: ['asset-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as AssetCategory[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Fetch all asset types with their categories
 */
export function useAssetTypes() {
  return useQuery({
    queryKey: ['asset-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_types')
        .select(`
          *,
          category:asset_categories(*)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as AssetTypeConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetch categories with nested asset types (for navigation)
 */
export function useCategoriesWithTypes() {
  return useQuery({
    queryKey: ['categories-with-types'],
    queryFn: async () => {
      const [categoriesResult, typesResult] = await Promise.all([
        supabase
          .from('asset_categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('asset_types')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (typesResult.error) throw typesResult.error;

      const categories = categoriesResult.data as AssetCategory[];
      const types = typesResult.data as AssetTypeConfig[];

      // Group types by category
      const result: AssetCategoryWithTypes[] = categories.map(category => ({
        ...category,
        asset_types: types.filter(t => t.category_id === category.id),
      }));

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get asset types that support transactions
 */
export function useTransactionSupportedTypes() {
  return useQuery({
    queryKey: ['transaction-supported-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*')
        .eq('is_active', true)
        .eq('supports_transactions', true)
        .order('display_order');

      if (error) throw error;
      return data as AssetTypeConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get asset types that support price feeds
 */
export function usePriceFeedSupportedTypes() {
  return useQuery({
    queryKey: ['price-feed-supported-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset_types')
        .select('*')
        .eq('is_active', true)
        .eq('supports_price_feed', true)
        .order('display_order');

      if (error) throw error;
      return data as AssetTypeConfig[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a single asset type by code
 */
export function useAssetTypeByCode(code: string | undefined) {
  return useQuery({
    queryKey: ['asset-type', code],
    queryFn: async () => {
      if (!code) return null;
      
      const { data, error } = await supabase
        .from('asset_types')
        .select(`
          *,
          category:asset_categories(*)
        `)
        .eq('code', code)
        .single();

      if (error) throw error;
      return data as AssetTypeConfig;
    },
    enabled: !!code,
  });
}

/**
 * Create a new asset type
 */
export function useCreateAssetType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      category_id: string;
      code: string;
      name: string;
      icon?: string;
      color?: string;
      supports_price_feed?: boolean;
      supports_transactions?: boolean;
      valuation_method?: ValuationMethod;
      unit_type?: UnitType;
    }) => {
      const { error } = await supabase
        .from('asset_types')
        .insert({
          ...data,
          is_system: false, // User-created types can be deleted
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      queryClient.invalidateQueries({ queryKey: ['categories-with-types'] });
      toast.success('Asset type created');
    },
    onError: (error) => {
      toast.error('Failed to create asset type: ' + error.message);
    },
  });
}

/**
 * Update an asset type
 */
export function useUpdateAssetType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<{
      name: string;
      icon: string;
      color: string;
      supports_price_feed: boolean;
      supports_transactions: boolean;
      is_active: boolean;
    }>) => {
      const { error } = await supabase
        .from('asset_types')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      queryClient.invalidateQueries({ queryKey: ['categories-with-types'] });
      toast.success('Asset type updated');
    },
    onError: (error) => {
      toast.error('Failed to update asset type: ' + error.message);
    },
  });
}

/**
 * Toggle asset type active status
 */
export function useToggleAssetType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('asset_types')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-types'] });
      queryClient.invalidateQueries({ queryKey: ['categories-with-types'] });
      toast.success('Asset type updated');
    },
    onError: (error) => {
      toast.error('Failed to update: ' + error.message);
    },
  });
}
