import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Divida {
  id: string;
  user_id: string;
  nome: string;
  valor: number;
  data_vencimento: string | null;
  descricao: string | null;
  pago: boolean;
  created_at: string;
}

export interface DividaInsert {
  nome: string;
  valor: number;
  data_vencimento?: string | null;
  descricao?: string | null;
  pago?: boolean;
}

const TABLE = 'dividas' as const;

export function useDividas() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dividas', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', user!.id)
        .order('data_vencimento', { ascending: true });
      if (error) throw error;
      return data as Divida[];
    },
    enabled: !!user,
  });
}

export function useAddDivida() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: DividaInsert) => {
      if (!user) throw new Error('Não autenticado');
      const { error } = await supabase
        .from(TABLE)
        .insert({ ...payload, user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dividas'] });
      toast.success('Dívida registrada!');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao salvar'),
  });
}

export function useToggleDividaPaga() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pago }: { id: string; pago: boolean }) => {
      const { error } = await supabase
        .from(TABLE)
        .update({ pago })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dividas'] });
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao atualizar'),
  });
}

export function useDeleteDivida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dividas'] });
      toast.success('Dívida removida');
    },
    onError: (err: any) => toast.error(err.message || 'Erro ao remover'),
  });
}
