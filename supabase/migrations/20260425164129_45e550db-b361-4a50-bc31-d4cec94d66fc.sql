INSERT INTO public.liability_payments (user_id, liability_id, payment_date, amount, notes)
SELECT v.user_id, v.liability_id, v.payment_date::date, v.amount, v.notes
FROM (VALUES
  ('9ce34ab8-b792-4f53-bf76-9d0c1abc6792'::uuid, '8e54df61-a584-497f-876a-cbaffe6b4b3a'::uuid, '2026-01-31', 2004::numeric, 'Jan 2026 installment (backfilled from notes)'),
  ('9ce34ab8-b792-4f53-bf76-9d0c1abc6792'::uuid, '8e54df61-a584-497f-876a-cbaffe6b4b3a'::uuid, '2026-02-28', 2004::numeric, 'Feb 2026 installment (backfilled from notes)'),
  ('9ce34ab8-b792-4f53-bf76-9d0c1abc6792'::uuid, '8e54df61-a584-497f-876a-cbaffe6b4b3a'::uuid, '2026-04-04', 2004::numeric, 'April 2026 installment (backfilled from notes)'),
  ('9ce34ab8-b792-4f53-bf76-9d0c1abc6792'::uuid, 'e3eec5f5-2ac7-451f-bee7-fab04b54c24e'::uuid, '2026-04-04', 494.66::numeric, 'April 2026 payment (backfilled from notes)')
) AS v(user_id, liability_id, payment_date, amount, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.liability_payments lp
  WHERE lp.liability_id = v.liability_id
    AND lp.payment_date = v.payment_date::date
    AND lp.amount = v.amount
);