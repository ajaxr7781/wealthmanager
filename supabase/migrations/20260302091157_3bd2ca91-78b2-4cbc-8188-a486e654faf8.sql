-- Insert missing transaction for "Gold Feb 2026" asset
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
WHERE a.id = 'd03ad5f2-9eb4-4351-b4b4-2c55f818f5a1'
AND NOT EXISTS (
  SELECT 1 FROM public.asset_transactions at2 WHERE at2.asset_id = a.id
);