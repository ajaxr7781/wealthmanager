import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Asset, AssetFormData, AssetType, PortfolioOverview, Currency } from '@/types/assets';
import { ASSET_TYPE_LABELS, DEFAULT_USD_TO_AED, DEFAULT_INR_TO_AED, OUNCE_TO_GRAM } from '@/types/assets';

export function useAssets(assetType?: AssetType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['assets', user?.id, assetType],
    queryFn: async () => {
      let query = supabase
        .from('assets')
        .select('*, asset_type_code, category_code')
        .order('purchase_date', { ascending: false });
      
      if (assetType) {
        query = query.eq('asset_type', assetType);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Map database fields to Asset type
      return (data || []).map(item => ({
        ...item,
        asset_type_code: item.asset_type_code || null,
        category_code: item.category_code || null,
      })) as Asset[];
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
  const { data: settings } = useUserSettings();
  
  // Get dynamic INR to AED rate from settings
  const inrToAed = settings?.inr_to_aed_rate || DEFAULT_INR_TO_AED;

  return useQuery({
    queryKey: ['portfolio-overview', user?.id, inrToAed],
    queryFn: async () => {
      // Fetch assets, transactions, MF holdings, SIPs, schemes, and categories in parallel
      const [assetsResult, transactionsResult, pricesResult, mfHoldingsResult, sipsResult, schemesResult, categoriesResult] = await Promise.all([
        supabase.from('assets').select('*'),
        supabase.from('transactions').select('*'),
        supabase.from('price_snapshots').select('*').order('as_of', { ascending: false }).limit(10),
        supabase.from('mf_holdings').select('*').eq('is_active', true),
        supabase.from('mf_sips').select('*'),
        supabase.from('mf_schemes').select('id, latest_nav'),
        supabase.from('asset_categories').select('code, name, color, icon').eq('is_active', true),
      ]);

      if (assetsResult.error) throw assetsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      const assets = (assetsResult.data || []) as Asset[];
      const transactions = transactionsResult.data || [];
      const priceSnapshots = pricesResult.data || [];
      const mfHoldings = mfHoldingsResult.data || [];
      const sips = sipsResult.data || [];
      const schemes = schemesResult.data || [];
      const categories = categoriesResult.data || [];

      // Build category lookup map
      const categoryMap = new Map<string, { name: string; color: string | null; icon: string | null }>();
      for (const cat of categories) {
        categoryMap.set(cat.code, { name: cat.name, color: cat.color, icon: cat.icon });
      }

      // Create a map of scheme id to NAV for quick lookup
      const schemeNavMap = new Map<string, number>();
      for (const scheme of schemes) {
        if (scheme.latest_nav) {
          schemeNavMap.set(scheme.id, Number(scheme.latest_nav));
        }
      }

      // Get latest prices for XAU and XAG
      const goldPrice = priceSnapshots.find(p => p.instrument_symbol === 'XAU');
      const silverPrice = priceSnapshots.find(p => p.instrument_symbol === 'XAG');

      // Calculate precious metals summary from transactions (legacy data)
      let goldHoldingOz = 0;
      let goldCostBasisAed = 0;
      let silverHoldingOz = 0;
      let silverCostBasisAed = 0;

      for (const tx of transactions) {
        const quantityOz = tx.quantity_unit === 'OZ' ? tx.quantity : tx.quantity / OUNCE_TO_GRAM;
        const pricePerOz = tx.price_unit === 'AED_PER_OZ' ? tx.price : tx.price * OUNCE_TO_GRAM;
        const totalValue = quantityOz * pricePerOz + (tx.fees || 0);

        if (tx.instrument_symbol === 'XAU') {
          if (tx.side === 'BUY') {
            goldHoldingOz += quantityOz;
            goldCostBasisAed += totalValue;
          } else {
            goldHoldingOz -= quantityOz;
            goldCostBasisAed -= (goldCostBasisAed / (goldHoldingOz + quantityOz)) * quantityOz;
          }
        } else if (tx.instrument_symbol === 'XAG') {
          if (tx.side === 'BUY') {
            silverHoldingOz += quantityOz;
            silverCostBasisAed += totalValue;
          } else {
            silverHoldingOz -= quantityOz;
            silverCostBasisAed -= (silverCostBasisAed / (silverHoldingOz + quantityOz)) * quantityOz;
          }
        }
      }

      // Calculate current value for precious metals
      const goldCurrentValue = goldPrice ? goldHoldingOz * Number(goldPrice.price_aed_per_oz) : goldCostBasisAed;
      const silverCurrentValue = silverPrice ? silverHoldingOz * Number(silverPrice.price_aed_per_oz) : silverCostBasisAed;
      const preciousMetalsInvested = goldCostBasisAed + silverCostBasisAed;
      const preciousMetalsCurrentValue = goldCurrentValue + silverCurrentValue;
      const preciousMetalsCount = (goldHoldingOz > 0 ? 1 : 0) + (silverHoldingOz > 0 ? 1 : 0);

      // Calculate totals by category_code (dynamic, not hardcoded asset_type)
      const assetsByCategory = new Map<string, {
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

      // Process assets from assets table (non-precious-metals mostly)
      for (const asset of assets) {
        const invested = Number(asset.total_cost) || 0;
        const currentVal = Number(asset.current_value) || invested;
        
        // Convert to AED for unified totals using dynamic rate
        let investedAED = invested;
        let currentAED = currentVal;
        
        if (asset.currency === 'INR') {
          investedAED = invested * inrToAed;
          currentAED = currentVal * inrToAed;
        }

        total_invested += investedAED;
        total_current_value += currentAED;

        // By category (dynamic)
        const catKey = asset.category_code || asset.asset_type || 'other';
        const existing = assetsByCategory.get(catKey) || { total_invested: 0, current_value: 0, count: 0 };
        assetsByCategory.set(catKey, {
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

      // Add precious metals from transactions to totals
      if (preciousMetalsCount > 0) {
        total_invested += preciousMetalsInvested;
        total_current_value += preciousMetalsCurrentValue;
        
        const existingMetals = assetsByCategory.get('precious_metals') || { total_invested: 0, current_value: 0, count: 0 };
        assetsByCategory.set('precious_metals', {
          total_invested: existingMetals.total_invested + preciousMetalsInvested,
          current_value: existingMetals.current_value + preciousMetalsCurrentValue,
          count: existingMetals.count + preciousMetalsCount,
        });

        // Add to AED currency breakdown
        const aedExisting = byCurrency.get('AED') || { total_invested: 0, current_value: 0 };
        byCurrency.set('AED', {
          total_invested: aedExisting.total_invested + preciousMetalsInvested,
          current_value: aedExisting.current_value + preciousMetalsCurrentValue,
        });
      }

      // Calculate MF holdings summary (in INR)
      const mfInvestedINR = mfHoldings.reduce((sum, h) => sum + Number(h.invested_amount || 0), 0);
      const mfCurrentValueINR = mfHoldings.reduce((sum, h) => sum + Number(h.current_value || h.invested_amount || 0), 0);
      const mfInvestedAED = mfInvestedINR * inrToAed;
      const mfCurrentValueAED = mfCurrentValueINR * inrToAed;
      const mfUnrealizedGainINR = mfCurrentValueINR - mfInvestedINR;
      const mfReturnPct = mfInvestedINR > 0 ? (mfUnrealizedGainINR / mfInvestedINR) * 100 : 0;

      // Add MF to totals
      if (mfHoldings.length > 0) {
        total_invested += mfInvestedAED;
        total_current_value += mfCurrentValueAED;
      }

      // Calculate SIP summary with current values based on units and NAV
      const activeSips = sips.filter(s => s.status === 'ACTIVE');
      const sipMonthlyINR = activeSips.reduce((sum, s) => sum + Number(s.sip_amount || 0), 0);
      const sipMonthlyAED = sipMonthlyINR * inrToAed;
      
      // Calculate SIP invested and current value
      let sipInvestedINR = 0;
      let sipCurrentValueINR = 0;
      for (const sip of sips) {
        sipInvestedINR += Number(sip.invested_amount || 0);
        const units = Number(sip.current_units || 0);
        const nav = schemeNavMap.get(sip.scheme_id) || 0;
        sipCurrentValueINR += units * nav;
      }
      const sipInvestedAED = sipInvestedINR * inrToAed;
      const sipCurrentValueAED = sipCurrentValueINR * inrToAed;

      // Add SIP values to totals
      if (sipInvestedAED > 0 || sipCurrentValueAED > 0) {
        total_invested += sipInvestedAED;
        total_current_value += sipCurrentValueAED;
      }

      // Return null if no assets at all
      const hasAnyAssets = assets.length > 0 || preciousMetalsCount > 0 || mfHoldings.length > 0 || sipCurrentValueAED > 0;
      if (!hasAnyAssets) {
        return null;
      }

      const overview: PortfolioOverview = {
        total_invested,
        total_current_value,
        total_profit_loss: total_current_value - total_invested,
        total_profit_loss_percent: total_invested > 0 
          ? ((total_current_value - total_invested) / total_invested) * 100 
          : 0,
        assets_by_type: Array.from(assetsByCategory.entries()).map(([code, data]) => {
          const catInfo = categoryMap.get(code);
          return {
            type: code,
            label: catInfo?.name || ASSET_TYPE_LABELS[code as AssetType] || code,
            total_invested: data.total_invested,
            current_value: data.current_value,
            profit_loss: data.current_value - data.total_invested,
            count: data.count,
            color: catInfo?.color || null,
            icon: catInfo?.icon || null,
          };
        }),
        currency_breakdown: Array.from(byCurrency.entries()).map(([currency, data]) => ({
          currency,
          ...data,
        })),
        mf_summary: mfHoldings.length > 0 ? {
          total_invested_inr: mfInvestedINR,
          current_value_inr: mfCurrentValueINR,
          total_invested_aed: mfInvestedAED,
          current_value_aed: mfCurrentValueAED,
          unrealized_gain_inr: mfUnrealizedGainINR,
          return_pct: mfReturnPct,
          holdings_count: mfHoldings.length,
        } : undefined,
        sip_summary: sips.length > 0 ? {
          invested_inr: sipInvestedINR,
          invested_aed: sipInvestedAED,
          current_value_inr: sipCurrentValueINR,
          current_value_aed: sipCurrentValueAED,
          monthly_commitment_inr: sipMonthlyINR,
          monthly_commitment_aed: sipMonthlyAED,
          active_count: activeSips.length,
          total_count: sips.length,
        } : undefined,
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
      display_currency: string;
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
