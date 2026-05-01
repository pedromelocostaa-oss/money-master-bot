CREATE TABLE public.dividas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  descricao TEXT,
  pago BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dividas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own dividas" ON public.dividas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own dividas" ON public.dividas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own dividas" ON public.dividas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own dividas" ON public.dividas FOR DELETE USING (auth.uid() = user_id);