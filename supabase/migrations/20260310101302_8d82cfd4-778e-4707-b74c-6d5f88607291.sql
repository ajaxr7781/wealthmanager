
-- Add switch_reference_id to link SWITCH_OUT and SWITCH_IN transaction pairs
ALTER TABLE public.asset_transactions 
ADD COLUMN IF NOT EXISTS switch_reference_id uuid DEFAULT NULL;

-- Add status column for pending/completed/failed/reversed switches
ALTER TABLE public.asset_transactions 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'completed';

-- Index for fast lookup of switch pairs
CREATE INDEX IF NOT EXISTS idx_asset_transactions_switch_ref 
ON public.asset_transactions(switch_reference_id) 
WHERE switch_reference_id IS NOT NULL;
