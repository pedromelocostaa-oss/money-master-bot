import { useState, useMemo } from 'react';
import { useTransacoes, useDeleteTransacao } from '@/hooks/useFinancas';
import { CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import TransacaoForm from '@/components/TransacaoForm';

export default function Lancamentos() {
  const now = new Date();
  const [filterMes, setFilterMes] = useState(now.getMonth());
  const [filterAno, setFilterAno] = useState(now.getFullYear());
  const { data: transacoes, isLoading } = useTransacoes(filterMes, filterAno);
  const deleteMutation = useDeleteTransacao();

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <Select value={String(filterMes)} onValueChange={(v) => setFilterMes(Number(v))}>
          <SelectTrigger className="w-40 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map(m => (
              <SelectItem key={m.value} value={String(m.value)}>
                {m.label.charAt(0).toUpperCase() + m.label.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={String(filterAno)} onValueChange={(v) => setFilterAno(Number(v))}>
          <SelectTrigger className="w-28 bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !transacoes?.length ? (
        <Card className="p-8 bg-card border-border text-center text-muted-foreground">
          Nenhuma transação neste período
        </Card>
      ) : (
        <div className="space-y-2">
          {transacoes.map(t => (
            <Card key={t.id} className="p-3 md:p-4 bg-card border-border flex items-center gap-3 animate-slide-up">
              <div
                className="w-2 h-10 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORIA_CORES[t.categoria] || '#6B7280' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{t.descricao}</p>
                <p className="text-xs text-muted-foreground">
                  {t.categoria}
                  {t.forma_pagamento && ` · ${t.forma_pagamento}`}
                  {' · '}
                  {formatDate(t.data)}
                </p>
              </div>
              <span className={`text-sm font-display font-bold shrink-0 ${t.tipo === 'receita' ? 'text-success' : 'text-destructive'}`}>
                {t.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(t.valor))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(t.id)}
                disabled={deleteMutation.isPending}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
