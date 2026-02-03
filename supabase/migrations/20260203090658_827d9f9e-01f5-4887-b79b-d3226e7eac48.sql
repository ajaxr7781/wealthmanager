-- Remove opening_balance and add current_units to mf_sips
ALTER TABLE public.mf_sips 
DROP COLUMN IF EXISTS opening_balance,
ADD COLUMN current_units numeric DEFAULT 0;