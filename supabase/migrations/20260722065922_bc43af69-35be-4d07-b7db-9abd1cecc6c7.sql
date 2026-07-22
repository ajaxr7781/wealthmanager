INSERT INTO public.asset_types (
  category_id, code, name, icon, display_order, is_active, is_system,
  metadata_schema, supports_price_feed, supports_transactions,
  unit_type, valuation_method
) VALUES (
  '7d299fbf-e10a-47b9-9c49-dc43df49155c',
  'ulip',
  'ULIP (Unit Linked Insurance)',
  'Shield',
  2,
  true,
  true,
  '{"fields":["insurer","policy_number","fund_name","premium_frequency","premium_amount","policy_term_years","sum_assured","maturity_date"]}'::jsonb,
  false,
  true,
  'units',
  'nav_based'
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  category_id = EXCLUDED.category_id,
  metadata_schema = EXCLUDED.metadata_schema,
  supports_transactions = EXCLUDED.supports_transactions,
  valuation_method = EXCLUDED.valuation_method,
  unit_type = EXCLUDED.unit_type,
  is_system = EXCLUDED.is_system,
  updated_at = now();