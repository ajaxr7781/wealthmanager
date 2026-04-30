UPDATE public.liability_payments
SET principal_component = 1627.34,
    interest_component = 376.66,
    notes = 'Instalment #5 of 48 (30/04/2026)'
WHERE id = 'b17c4122-5e51-4c9e-9686-6d54aad7cad3';

UPDATE public.liabilities
SET outstanding = 78231.27,
    next_due_date = '2026-05-31'
WHERE id = '8e54df61-a584-497f-876a-cbaffe6b4b3a';