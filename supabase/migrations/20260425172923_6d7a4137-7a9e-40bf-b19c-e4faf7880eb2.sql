-- Update ENBD Auto Loan with accurate schedule data from bank's Loan Repayment Schedule
-- Loan: AED 85,900 @ 2.99% (APR 6.20%), 48 monthly installments of 2,004.00 starting 31/12/2025

UPDATE public.liabilities
SET 
  principal = 85900.00,
  emi = 2004.00,
  interest_rate = 2.99,
  tenure_months = 48,
  outstanding = 79858.61,
  next_due_date = '2026-04-30',
  notes = 'ENBD Auto Loan. Loan A/C: 7359110140590001. Customer: AJAY RAMACHANDRAN. Fixed rate 2.99% (APR 6.20%). 48 monthly installments of AED 2,004.00 from 31/12/2025 to 30/11/2029. Total payable AED 96,192.00.'
WHERE id = '8e54df61-a584-497f-876a-cbaffe6b4b3a';

-- Insert missing Installment #1 (31/12/2025)
INSERT INTO public.liability_payments (liability_id, user_id, payment_date, amount, principal_component, interest_component, notes)
SELECT 
  '8e54df61-a584-497f-876a-cbaffe6b4b3a',
  user_id,
  '2025-12-31',
  2004.00,
  1131.20,
  872.80,
  'Instalment #1 of 48 (31/12/2025)'
FROM public.liabilities WHERE id = '8e54df61-a584-497f-876a-cbaffe6b4b3a';

-- Update Installment #2 (31/01/2026) - existing Jan payment
UPDATE public.liability_payments
SET principal_component = 1617.04,
    interest_component = 386.96,
    notes = 'Instalment #2 of 48 (31/01/2026)'
WHERE id = 'f5374914-1c1f-4206-8057-41186c86b7f0';

-- Update Installment #3 (28/02/2026) - existing Feb payment
UPDATE public.liability_payments
SET principal_component = 1661.15,
    interest_component = 342.85,
    notes = 'Instalment #3 of 48 (28/02/2026)'
WHERE id = '87d7a675-18fa-4874-9c56-73a92521d377';

-- Update Installment #4 (31/03/2026) - existing payment dated 04/04/2026 was for March installment
UPDATE public.liability_payments
SET payment_date = '2026-03-31',
    principal_component = 1632.00,
    interest_component = 372.00,
    notes = 'Instalment #4 of 48 (31/03/2026, paid 04/04/2026)'
WHERE id = '7703cf32-5bc8-4e60-affd-43a27028f794';