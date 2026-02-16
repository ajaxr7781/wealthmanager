
-- Drop overly permissive ALL policies
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON public.asset_categories;
DROP POLICY IF EXISTS "Authenticated users can manage asset types" ON public.asset_types;

-- Restrict write access to admin role only
CREATE POLICY "Admins can manage categories" ON public.asset_categories
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage asset types" ON public.asset_types
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
