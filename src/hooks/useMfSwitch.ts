import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Asset } from '@/types/assets';

export interface MfSwitchInput {
  sourceAssetId: string;
  destinationAssetId: string;
  transactionDate: string;
  switchUnits: number;
  switchAmount: number;
  sourceNav?: number;
  destinationNav?: number;
  destinationUnits?: number;
  referenceNo?: string;
  remarks?: string;
  status?: 'completed' | 'pending' | 'failed' | 'reversed';
}

export function useMfSwitch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: MfSwitchInput) => {
      if (!user) throw new Error('Not authenticated');

      const {
        sourceAssetId,
        destinationAssetId,
        transactionDate,
        switchUnits,
        switchAmount,
        sourceNav,
        destinationNav,
        destinationUnits,
        referenceNo,
        remarks,
        status = 'completed',
      } = input;

      if (sourceAssetId === destinationAssetId) {
        throw new Error('Source and destination funds must be different');
      }

      // Fetch source asset to validate units
      const { data: sourceAsset, error: srcErr } = await supabase
        .from('assets')
        .select('*')
        .eq('id', sourceAssetId)
        .single();
      if (srcErr) throw srcErr;

      const availableUnits = Number(sourceAsset.units_held) || 0;
      if (switchUnits > availableUnits + 0.0001) {
        throw new Error(`Cannot switch ${switchUnits} units. Only ${availableUnits.toFixed(4)} available.`);
      }

      // Fetch destination asset
      const { data: destAsset, error: dstErr } = await supabase
        .from('assets')
        .select('*')
        .eq('id', destinationAssetId)
        .single();
      if (dstErr) throw dstErr;

      // Generate shared switch reference
      const switchRefId = crypto.randomUUID();

      // Calculate destination units if NAV provided
      const calcDestUnits = destinationUnits || (destinationNav && switchAmount > 0 ? switchAmount / destinationNav : 0);

      const notesText = [remarks, referenceNo ? `Ref: ${referenceNo}` : ''].filter(Boolean).join(' | ');

      // Create SWITCH_OUT transaction
      const { error: outErr } = await supabase
        .from('asset_transactions')
        .insert({
          asset_id: sourceAssetId,
          user_id: user.id,
          transaction_type: 'SWITCH_OUT',
          transaction_date: transactionDate,
          quantity: switchUnits,
          quantity_unit: 'units',
          price_per_unit: sourceNav || null,
          amount: switchAmount,
          fees: 0,
          notes: notesText || null,
          switch_reference_id: switchRefId,
          status,
        });
      if (outErr) throw outErr;

      // Create SWITCH_IN transaction
      const { error: inErr } = await supabase
        .from('asset_transactions')
        .insert({
          asset_id: destinationAssetId,
          user_id: user.id,
          transaction_type: 'SWITCH_IN',
          transaction_date: transactionDate,
          quantity: calcDestUnits || 0,
          quantity_unit: 'units',
          price_per_unit: destinationNav || null,
          amount: switchAmount,
          fees: 0,
          notes: notesText || null,
          switch_reference_id: switchRefId,
          status,
        });
      if (inErr) throw inErr;

      // Update holdings only if status is completed
      if (status === 'completed') {
        // Update source asset: reduce units and invested amount proportionally
        const srcInvested = Number(sourceAsset.total_cost) || 0;
        const proportion = availableUnits > 0 ? switchUnits / availableUnits : 1;
        const investedReduction = srcInvested * proportion;
        const newSrcUnits = Math.max(0, availableUnits - switchUnits);
        const newSrcInvested = Math.max(0, srcInvested - investedReduction);
        const srcNav = Number(sourceAsset.nav_or_price) || 0;
        const newSrcValue = srcNav > 0 ? newSrcUnits * srcNav : null;

        const { error: srcUpdateErr } = await supabase
          .from('assets')
          .update({
            units_held: newSrcUnits,
            quantity: newSrcUnits,
            total_cost: newSrcInvested,
            current_value: newSrcValue,
          })
          .eq('id', sourceAssetId);
        if (srcUpdateErr) throw srcUpdateErr;

        // Update destination asset: increase units and invested amount
        // Cost basis: use switched invested amount (not market value) to preserve continuity
        const dstUnits = Number(destAsset.units_held) || 0;
        const dstInvested = Number(destAsset.total_cost) || 0;
        const newDstUnits = dstUnits + (calcDestUnits || 0);
        const newDstInvested = dstInvested + investedReduction;
        const dstNav = Number(destAsset.nav_or_price) || 0;
        const newDstValue = dstNav > 0 ? newDstUnits * dstNav : null;

        const { error: dstUpdateErr } = await supabase
          .from('assets')
          .update({
            units_held: newDstUnits,
            quantity: newDstUnits,
            total_cost: newDstInvested,
            current_value: newDstValue,
          })
          .eq('id', destinationAssetId);
        if (dstUpdateErr) throw dstUpdateErr;
      }

      return { switchRefId, sourceAssetId, destinationAssetId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', result.sourceAssetId] });
      queryClient.invalidateQueries({ queryKey: ['asset', result.destinationAssetId] });
      queryClient.invalidateQueries({ queryKey: ['asset-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['all-asset-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overview'] });
      toast.success('Switch recorded successfully');
    },
    onError: (e) => toast.error('Switch failed: ' + e.message),
  });
}
