-- Update Sukanya Samriddhi asset_type from 'shares' to 'fixed_deposit' (government savings scheme)
UPDATE public.assets 
SET asset_type = 'fixed_deposit', 
    category_code = COALESCE(category_code, 'government_savings'),
    updated_at = now()
WHERE id = '2ef3f11a-a1a2-4dfe-a97d-86ddedb8b9c2' 
  AND asset_name ILIKE '%sukanya%';