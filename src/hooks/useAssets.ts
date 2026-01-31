import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Asset, AssetFormData, AssetType, PortfolioOverview, Currency } from '@/types/assets';
import { ASSET_TYPE_LABELS, DEFAULT_USD_TO_AED, DEFAULT_INR_TO_AED } from '@/types/assets';

export function useAssets(assetType?: AssetType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['assets', user?.id, assetType],
    queryFn: async () => {
      let query = supabase
        .from('assets')
        .select('*')
        .order('purchase_date', { ascending: false });
      
      if (assetType) {
        query = query.eq('asset_type', assetType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []) as Asset[];
    },
    enabled: !!user,
  });
}

export function useAsset(id: string | undefined) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Asset;
    },
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (formData: AssetFormData) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('assets')
        .insert({
          user_id: user.id,
          ...formData,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      toast.success('Asset added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add asset: ' + error.message);
    },
  });
}

export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...formData }: Partial<Asset> & { id: string }) => {
      const { data, error } = await supabase
        .from('assets')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', data.id] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      toast.success('Asset updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update asset: ' + error.message);
    },
  });
}

export function useDeleteAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      toast.success('Asset deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete asset: ' + error.message);
    },
  });
}

export function usePortfolioOverview() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['portfolio-overview', user?.id],
    queryFn: async () => {
      const { data: assets, error } = await supabase
        .from('assets')
        .select('*');

      if (error) throw error;
      if (!assets || assets.length === 0) {
        return null;
      }

      // Calculate totals by asset type
      const assetsByType = new Map<AssetType, {
        total_invested: number;
        current_value: number;
        count: number;
      }>();

      // Calculate totals by currency
      const byCurrency = new Map<Currency, {
        total_invested: number;
        current_value: number;
      }>();

      let total_invested = 0;
      let total_current_value = 0;

      for (const asset of assets as Asset[]) {
        const invested = Number(asset.total_cost) || 0;
        const currentVal = Number(asset.current_value) || invested;
        
        // Convert to AED for unified totals
        let investedAED = invested;
        let currentAED = currentVal;
        
        if (asset.currency === 'INR') {
          investedAED = invested * DEFAULT_INR_TO_AED;
          currentAED = currentVal * DEFAULT_INR_TO_AED;
        }

        total_invested += investedAED;
        total_current_value += currentAED;

        // By type
        const typeKey = asset.asset_type as AssetType;
        const existing = assetsByType.get(typeKey) || { total_invested: 0, current_value: 0, count: 0 };
        assetsByType.set(typeKey, {
          total_invested: existing.total_invested + investedAED,
          current_value: existing.current_value + currentAED,
          count: existing.count + 1,
        });

        // By currency
        const currKey = asset.currency as Currency;
        const currExisting = byCurrency.get(currKey) || { total_invested: 0, current_value: 0 };
        byCurrency.set(currKey, {
          total_invested: currExisting.total_invested + invested,
          current_value: currExisting.current_value + currentVal,
        });
      }

      const overview: PortfolioOverview = {
        total_invested,
        total_current_value,
        total_profit_loss: total_current_value - total_invested,
        total_profit_loss_percent: total_invested > 0 
          ? ((total_current_value - total_invested) / total_invested) * 100 
          : 0,
        assets_by_type: Array.from(assetsByType.entries()).map(([type, data]) => ({
          type,
          label: ASSET_TYPE_LABELS[type],
          total_invested: data.total_invested,
          current_value: data.current_value,
          profit_loss: data.current_value - data.total_invested,
          count: data.count,
        })),
        currency_breakdown: Array.from(byCurrency.entries()).map(([currency, data]) => ({
          currency,
          ...data,
        })),
      };

      return overview;
    },
    enabled: !!user,
  });
}

export function useUserSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Return default settings if none exist
      if (!data) {
        return {
          usd_to_aed_rate: DEFAULT_USD_TO_AED,
          inr_to_aed_rate: DEFAULT_INR_TO_AED,
          auto_refresh_prices: true,
        };
      }
      
      return {
        ...data,
        usd_to_aed_rate: Number(data.usd_to_aed_rate),
        inr_to_aed_rate: Number(data.inr_to_aed_rate),
      };
    },
    enabled: !!user,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (settings: Partial<{
      usd_to_aed_rate: number;
      inr_to_aed_rate: number;
      auto_refresh_prices: boolean;
    }>) => {
      if (!user) throw new Error('Not authenticated');

      // Try to update first
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .single();

      if (existing) {
        const { error } = await supabase
          .from('user_settings')
          .update(settings)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id, ...settings });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
      toast.success('Settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
}
