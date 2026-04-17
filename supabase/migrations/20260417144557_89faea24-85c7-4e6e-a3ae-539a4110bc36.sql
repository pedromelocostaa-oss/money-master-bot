-- Enum para tipo de conta
CREATE TYPE public.tipo_conta AS ENUM ('pessoal', 'pj');

-- Tabela de contas (PF/PJ)
CREATE TABLE public.contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo public.tipo_conta NOT NULL,
  nome TEXT NOT NULL,
  saldo_inicial NUMERIC NOT NULL DEFAULT 0,
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own contas" ON public.contas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own contas" ON public.contas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own contas" ON public.contas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own contas" ON public.contas FOR DELETE USING (auth.uid() = user_id);

-- Tabela de cartões
CREATE TABLE public.cartoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  bandeira TEXT,
  limite NUMERIC,
  dia_fechamento INTEGER,
  dia_vencimento INTEGER,
  cor TEXT,
  conta_id UUID REFERENCES public.contas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own cartoes" ON public.cartoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own cartoes" ON public.cartoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own cartoes" ON public.cartoes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own cartoes" ON public.cartoes FOR DELETE USING (auth.uid() = user_id);

-- Adicionar referências em transacoes
ALTER TABLE public.transacoes
  ADD COLUMN conta_id UUID REFERENCES public.contas(id) ON DELETE SET NULL,
  ADD COLUMN cartao_id UUID REFERENCES public.cartoes(id) ON DELETE SET NULL;

-- Função para timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_contas_updated_at BEFORE UPDATE ON public.contas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cartoes_updated_at BEFORE UPDATE ON public.cartoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar contas padrão para novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user_contas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.contas (user_id, tipo, nome, saldo_inicial, cor)
  VALUES 
    (NEW.id, 'pessoal', 'Pessoal', 0, '#10B981'),
    (NEW.id, 'pj', 'Empresarial', 0, '#3B82F6');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_contas
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_contas();

-- Criar contas padrão para usuários existentes que ainda não têm
INSERT INTO public.contas (user_id, tipo, nome, saldo_inicial, cor)
SELECT u.id, 'pessoal', 'Pessoal', 0, '#10B981'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.contas c WHERE c.user_id = u.id AND c.tipo = 'pessoal');

INSERT INTO public.contas (user_id, tipo, nome, saldo_inicial, cor)
SELECT u.id, 'pj', 'Empresarial', 0, '#3B82F6'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.contas c WHERE c.user_id = u.id AND c.tipo = 'pj');