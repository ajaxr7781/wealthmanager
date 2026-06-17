CREATE POLICY "Users can update their own rebalance actions" ON public.rebalance_actions FOR UPDATE
  USING (recommendation_id IN (SELECT id FROM public.rebalance_recommendations WHERE user_id = auth.uid()))
  WITH CHECK (recommendation_id IN (SELECT id FROM public.rebalance_recommendations WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own rebalance actions" ON public.rebalance_actions FOR DELETE
  USING (recommendation_id IN (SELECT id FROM public.rebalance_recommendations WHERE user_id = auth.uid()));