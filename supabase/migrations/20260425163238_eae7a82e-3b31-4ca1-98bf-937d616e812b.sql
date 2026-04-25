CREATE TABLE public.liability_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  liability_id UUID NOT NULL REFERENCES public.liabilities(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  principal_component NUMERIC,
  interest_component NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.liability_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own liability payments"
ON public.liability_payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own liability payments"
ON public.liability_payments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own liability payments"
ON public.liability_payments FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own liability payments"
ON public.liability_payments FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_liability_payments_liability_id ON public.liability_payments(liability_id);
CREATE INDEX idx_liability_payments_user_id ON public.liability_payments(user_id);

CREATE TRIGGER update_liability_payments_updated_at
BEFORE UPDATE ON public.liability_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();