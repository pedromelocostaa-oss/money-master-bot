import { useState, useMemo } from 'react';
import { useTransacoes, useDeleteTransacao } from '@/hooks/useFinancas';
import { CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import TransacaoForm from '@/components/TransacaoForm';
import ImportarTexto from '@/components/ImportarTexto';
import { FaturaInfo } from '@/components/FaturaInfo';

export default function Lancamentos() {
  const now = new Date();
  const [filterMes, setFilterMes] = useState(now.getMonth());
  const [filterAno, setFilterAno] = useState(now.getFullYear());
  const [showImport, setShowImport] = useState(false);
  const { data: transacoes, isLoading } = useTransacoes(filterMes, filterAno);
  const deleteMutation = useDeleteTransacao();

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(filterAno, i, 1);
      options.push({ value: i, label: format(d, 'MMMM') });
    }
    return options;
  }, [filterAno]);

  const totals = useMemo(() => {
    if (!transacoes) return { receitas: 0, gastos: 0 };
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const gastos = transacoes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0);
    return { receitas, gastos };
  }, [transacoes]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-foreground">Lançamentos</h1>
        <Button
          variant={showImport ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowImport(!showImport)}
          className="gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Importar via IA</span>
          <span className="sm:hidden">Importar</span>
        </Button>
      </div>

      {/* Import section - collapsible */}
      {showImport && (
        <Card className="p-4 bg-card border-border border-primary/20">
          <ImportarTexto onClose={() => setShowImport(false)} />
        </Card>
      )}

      {/* Manual form */}
      <TransacaoForm />

      {/* Fatura info */}
      <FaturaInfo />

      {/* Filters + summary */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 items-center">
          <Select value={String(filterMes)} onValueChange={(v) => setFilterMes(Number(v))}>
            <SelectTrigger className="w-36 bg-secondary border-border h-9 text-sm">
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
            <SelectTrigger className="w-24 bg-secondary border-border h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {!isLoading && transacoes && transacoes.length > 0 && (
          <div className="flex gap-4 text-xs font-medium">
            <span className="text-success">+{formatCurrency(totals.receitas)}</span>
            <span className="text-destructive">-{formatCurrency(totals.gastos)}</span>
            <span className={totals.receitas - totals.gastos >= 0 ? 'text-foreground' : 'text-destructive'}>
              = {formatCurrency(totals.receitas - totals.gastos)}
            </span>
          </div>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !transacoes?.length ? (
        <Card className="p-10 bg-card border-border text-center">
          <p className="text-muted-foreground text-sm">Nenhuma transação neste período</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Adicione manualmente ou importe via IA</p>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {transacoes.map(t => (
            <Card key={t.id} className="p-3 md:p-4 bg-card border-border flex items-center gap-3 animate-slide-up hover:bg-accent/30 transition-colors">
              <div
                className="w-1.5 h-10 rounded-full shrink-0"
                style={{ backgroundColor: CATEGORIA_CORES[t.categoria] || 'hsl(var(--muted-foreground))' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {t.descricao}
                  {t.parcelas_total && t.parcelas_total > 1 && (
                    <span className="text-muted-foreground ml-1 text-xs">({t.parcela_atual}/{t.parcelas_total})</span>
                  )}
                </p>
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
                className="shrink-0 text-muted-foreground hover:text-destructive h-8 w-8"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
