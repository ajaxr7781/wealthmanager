-- Drop overly permissive RLS policies on asset_categories
DROP POLICY IF EXISTS "Authenticated users can create categories" ON public.asset_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON public.asset_categories;
DROP POLICY IF EXISTS "Authenticated users can delete non-system categories" ON public.asset_categories;

-- Drop overly permissive RLS policies on asset_types
DROP POLICY IF EXISTS "Authenticated users can create asset types" ON public.asset_types;
DROP POLICY IF EXISTS "Authenticated users can update asset types" ON public.asset_types;
DROP POLICY IF EXISTS "Authenticated users can delete non-system asset types" ON public.asset_types;