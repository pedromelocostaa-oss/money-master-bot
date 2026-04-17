import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Conta = Tables<'contas'>;
export type ContaInsert = TablesInsert<'contas'>;
export type ContaUpdate = TablesUpdate<'contas'>;
export type Cartao = Tables<'cartoes'>;
export type CartaoInsert = TablesInsert<'cartoes'>;
export type CartaoUpdate = TablesUpdate<'cartoes'>;

export function useContas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['contas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas')
        .select('*')
        .order('tipo', { ascending: true });
      if (error) throw error;
      return data as Conta[];
    },
    enabled: !!user,
  });
}

export function useCartoes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['cartoes', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cartoes')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      return data as Cartao[];
    },
    enabled: !!user,
  });
}

export function useUpdateConta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & ContaUpdate) => {
      const { error } = await supabase.from('contas').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contas'] });
      toast.success('Conta atualizada');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar conta'),
  });
}

export function useAddCartao() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (data: Omit<CartaoInsert, 'user_id'>) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase.from('cartoes').insert({ ...data, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes'] });
      toast.success('Cartão adicionado');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao adicionar cartão'),
  });
}

export function useUpdateCartao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & CartaoUpdate) => {
      const { error } = await supabase.from('cartoes').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes'] });
      toast.success('Cartão atualizado');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar cartão'),
  });
}

export function useDeleteCartao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cartoes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cartoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Cartão removido');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao remover cartão'),
  });
}

/** Saldo atual = saldo_inicial + receitas - gastos vinculados à conta */
export function useSaldosContas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['saldos-contas', user?.id],
    queryFn: async () => {
      const [contasRes, txRes] = await Promise.all([
        supabase.from('contas').select('*'),
        supabase.from('transacoes').select('conta_id, tipo, valor'),
      ]);
      if (contasRes.error) throw contasRes.error;
      if (txRes.error) throw txRes.error;

      const contas = contasRes.data as Conta[];
      const txs = txRes.data as { conta_id: string | null; tipo: 'gasto' | 'receita'; valor: number }[];

      return contas.map(c => {
        const movs = txs.filter(t => t.conta_id === c.id);
        const receitas = movs.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
        const gastos = movs.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0);
        return {
          ...c,
          saldo_atual: Number(c.saldo_inicial) + receitas - gastos,
          receitas,
          gastos,
        };
      });
    },
    enabled: !!user,
  });
}
