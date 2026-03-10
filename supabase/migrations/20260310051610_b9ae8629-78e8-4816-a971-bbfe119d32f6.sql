
-- Allow authenticated users to create/update/delete asset categories
CREATE POLICY "Authenticated users can create categories"
  ON public.asset_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON public.asset_categories FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete non-system categories"
  ON public.asset_categories FOR DELETE
  TO authenticated
  USING (true);

-- Allow authenticated users to create/update/delete asset types
CREATE POLICY "Authenticated users can create asset types"
  ON public.asset_types FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update asset types"
  ON public.asset_types FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete non-system asset types"
  ON public.asset_types FOR DELETE
  TO authenticated
  USING (is_system = false);
