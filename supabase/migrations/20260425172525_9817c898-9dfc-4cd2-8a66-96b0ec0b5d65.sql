
-- Update FAB credit card liability with accurate schedule data
UPDATE public.liabilities
SET 
  emi = 494.66,
  interest_rate = 4.68,
  tenure_months = 48,
  outstanding = 19650.00,
  next_due_date = '2026-05-04',
  notes = 'FAB Credit Card Quick Cash Instalment Plan. Card: 542536XXXXXX8209. 48-month plan, MAR-2026 to FEB-2030. Total principal AED 20,000.00, total interest AED 3,744.08, total amount AED 23,744.08. Rate: 0.39%/month (4.68% p.a.).'
WHERE id = 'e3eec5f5-2ac7-451f-bee7-fab04b54c24e';

-- Update existing payment #1 (MAR-2026, paid 2026-04-04) with correct principal/interest split
UPDATE public.liability_payments
SET 
  principal_component = 350.00,
  interest_component = 144.66,
  notes = 'Instalment #1 of 48 (MAR-2026)'
WHERE id = '8bf95ef1-939d-4575-aa01-a515926f2027';
