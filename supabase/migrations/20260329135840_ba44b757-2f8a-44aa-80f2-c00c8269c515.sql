-- Create enum for transaction type
CREATE TYPE public.tipo_transacao AS ENUM ('gasto', 'receita');

-- Create transacoes table
CREATE TABLE public.transacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo tipo_transacao NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL CHECK (valor > 0),
  categoria TEXT NOT NULL,
  forma_pagamento TEXT,
  data DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create limites_categoria table
CREATE TABLE public.limites_categoria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  categoria TEXT NOT NULL,
  limite_mensal NUMERIC NOT NULL CHECK (limite_mensal >= 0),
  UNIQUE (user_id, categoria)
);

-- Enable RLS
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.limites_categoria ENABLE ROW LEVEL SECURITY;

-- RLS policies for transacoes
CREATE POLICY "Users can view own transactions"
  ON public.transacoes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transacoes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transacoes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transacoes FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS policies for limites_categoria
CREATE POLICY "Users can view own limits"
  ON public.limites_categoria FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own limits"
  ON public.limites_categoria FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own limits"
  ON public.limites_categoria FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own limits"
  ON public.limites_categoria FOR DELETE
  USING (auth.uid() = user_id);

-- Index for common queries
CREATE INDEX idx_transacoes_user_data ON public.transacoes (user_id, data DESC);
CREATE INDEX idx_transacoes_user_tipo ON public.transacoes (user_id, tipo);
CREATE INDEX idx_limites_user ON public.limites_categoria (user_id);