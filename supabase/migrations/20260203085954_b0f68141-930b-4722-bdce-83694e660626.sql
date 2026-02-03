-- Add opening_balance column to mf_sips table for tracking total invested before SIP tracking started
ALTER TABLE public.mf_sips 
ADD COLUMN opening_balance numeric DEFAULT 0;