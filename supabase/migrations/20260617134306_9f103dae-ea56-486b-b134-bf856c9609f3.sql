
ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS parent_asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS renewal_chain_id uuid,
  ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'active';

UPDATE public.assets
SET renewal_chain_id = id
WHERE renewal_chain_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_assets_renewal_chain ON public.assets(renewal_chain_id);
CREATE INDEX IF NOT EXISTS idx_assets_parent ON public.assets(parent_asset_id);
CREATE INDEX IF NOT EXISTS idx_assets_lifecycle ON public.assets(lifecycle_status);
