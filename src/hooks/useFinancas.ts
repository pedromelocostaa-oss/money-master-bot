import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

export type Transacao = Tables<'transacoes'>;
export type TransacaoInsert = TablesInsert<'transacoes'>;
export type LimiteCategoria = Tables<'limites_categoria'>;

export function useTransacoes(mes?: number, ano?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transacoes', user?.id, mes, ano],
    queryFn: async () => {
      let query = supabase
        .from('transacoes')
        .select('*')
        .order('data', { ascending: false });

      if (mes !== undefined && ano !== undefined) {
        const start = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
        const endDate = new Date(ano, mes + 1, 0);
        const end = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
        query = query.gte('data', start).lte('data', end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transacao[];
    },
    enabled: !!user,
  });
}

export function useTransacoesMesAtual() {
  const now = new Date();
  return useTransacoes(now.getMonth(), now.getFullYear());
}

export function useTransacoes6Meses() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transacoes-6meses', user?.id],
    queryFn: async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const start = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .gte('data', start)
        .order('data', { ascending: true });

      if (error) throw error;
      return data as Transacao[];
    },
    enabled: !!user,
  });
}

export function useAddTransacao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Omit<TransacaoInsert, 'user_id'> & { parcelas?: number }) => {
      if (!user) throw new Error('Não autenticado');
      const { parcelas, ...rest } = data;

      if (parcelas && parcelas > 1) {
        const valorParcela = Math.round((Number(rest.valor) / parcelas) * 100) / 100;
        const baseDate = new Date(rest.data + 'T12:00:00');
        const rows = Array.from({ length: parcelas }, (_, i) => {
          const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
          return {
            ...rest,
            valor: valorParcela,
            data: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            parcela_atual: i + 1,
            parcelas_total: parcelas,
            user_id: user.id,
          };
        });
        const { error } = await supabase.from('transacoes').insert(rows);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transacoes')
          .insert({ ...rest, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-6meses'] });
      toast.success('Transação adicionada!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao adicionar transação');
    },
  });
}

export function useDeleteTransacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transacoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-6meses'] });
      toast.success('Transação removida!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao remover transação');
    },
  });
}

export function useLimites() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['limites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('limites_categoria')
        .select('*');
      if (error) throw error;
      return data as LimiteCategoria[];
    },
    enabled: !!user,
  });
}

export function useUpsertLimite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ categoria, limite_mensal }: { categoria: string; limite_mensal: number }) => {
      if (!user) throw new Error('Não autenticado');

      // Check if exists
      const { data: existing } = await supabase
        .from('limites_categoria')
        .select('id')
        .eq('categoria', categoria)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('limites_categoria')
          .update({ limite_mensal })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('limites_categoria')
          .insert({ categoria, limite_mensal, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['limites'] });
      toast.success('Limite atualizado!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar limite');
    },
  });
}
