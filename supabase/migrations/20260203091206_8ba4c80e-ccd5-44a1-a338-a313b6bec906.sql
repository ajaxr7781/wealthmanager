-- Add invested_amount to mf_sips for tracking total invested
ALTER TABLE public.mf_sips 
ADD COLUMN invested_amount numeric DEFAULT 0;