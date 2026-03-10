
-- Step 1: Reassign transactions from duplicate Gold to primary Gold
UPDATE public.asset_transactions
SET asset_id = 'fe1e69f1-d9d7-4d07-b047-923a45802c91'
WHERE asset_id = 'd03ad5f2-9eb4-4351-b4b4-2c55f818f5a1';

-- Reassign transactions from duplicate Silver to primary Silver
UPDATE public.asset_transactions
SET asset_id = '582e76db-7415-48bb-b83b-b12aa4483db0'
WHERE asset_id = 'd0f2cf04-6eda-416f-bb37-872eb7987f8e';

-- Step 2: Update primary Gold totals
UPDATE public.assets
SET quantity = 2.068,
    units_held = 2.068,
    total_cost = 35689.465056
WHERE id = 'fe1e69f1-d9d7-4d07-b047-923a45802c91';

-- Update primary Silver totals
UPDATE public.assets
SET quantity = 21.56,
    units_held = 21.56,
    total_cost = 8606.42
WHERE id = '582e76db-7415-48bb-b83b-b12aa4483db0';

-- Step 3: Delete duplicate asset records
DELETE FROM public.assets WHERE id = 'd03ad5f2-9eb4-4351-b4b4-2c55f818f5a1';
DELETE FROM public.assets WHERE id = 'd0f2cf04-6eda-416f-bb37-872eb7987f8e';
