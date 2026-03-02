-- Insert missing transaction for "Silver Feb 2026" asset
INSERT INTO public.asset_transactions (asset_id, user_id, transaction_type, transaction_date, quantity, quantity_unit, price_per_unit, amount, fees, notes)
SELECT 
  a.id,
  a.user_id,
  'BUY',
  a.purchase_date,
  a.quantity,
  'OZ',
  CASE WHEN a.quantity > 0 THEN a.total_cost / a.quantity ELSE 0 END,
  a.total_cost,
  0,
  'Auto-created from asset record'
FROM public.assets a
WHERE a.id = 'd0f2cf04-6eda-416f-bb37-872eb7987f8e'
AND NOT EXISTS (
  SELECT 1 FROM public.asset_transactions at2 WHERE at2.asset_id = a.id
);