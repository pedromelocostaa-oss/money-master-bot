import { useState, useMemo } from 'react';
import { useTransacoes, useDeleteTransacao } from '@/hooks/useFinancas';
import { CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Upload, Plus, ChevronDown, ChevronUp, Receipt, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransacaoForm from '@/components/TransacaoForm';
import ImportarTexto from '@/components/ImportarTexto';
import { FaturaInfo } from '@/components/FaturaInfo';

export default function Lancamentos() {
  const now = new Date();
  const [filterMes, setFilterMes] = useState(now.getMonth());
  const [filterAno, setFilterAno] = useState(now.getFullYear());
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { data: transacoes, isLoading } = useTransacoes(filterMes, filterAno);
  const deleteMutation = useDeleteTransacao();

  const navigateMonth = (dir: number) => {
    let m = filterMes + dir;
    let y = filterAno;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setFilterMes(m);
    setFilterAno(y);
  };

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(filterAno, i, 1);
      const label = format(d, 'MMMM', { locale: ptBR });
      options.push({ value: i, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, [filterAno]);

  const totals = useMemo(() => {
    if (!transacoes) return { receitas: 0, gastos: 0 };
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const gastos = transacoes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0);
    return { receitas, gastos };
  }, [transacoes]);

  // Group transactions by date
  const groupedTransacoes = useMemo(() => {
    if (!transacoes) return {};
    const groups: Record<string, typeof transacoes> = {};
    transacoes.forEach(t => {
      const dateKey = t.data;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });
    return groups;
  }, [transacoes]);

  const currentMonthLabel = monthOptions.find(m => m.value === filterMes)?.label || '';

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Lançamentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentMonthLabel} {filterAno}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setShowImport(!showImport); if (!showImport) setShowForm(false); }}
            className={`gap-1.5 ${showImport ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button
            size="sm"
            onClick={() => { setShowForm(!showForm); if (!showForm) setShowImport(false); }}
            className="gap-1.5"
          >
            {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showForm ? 'Fechar' : 'Novo'}</span>
          </Button>
        </div>
      </div>

      {/* Collapsible sections */}
      {showImport && (
        <Card className="p-4 bg-card border-primary/20 animate-scale-in">
          <ImportarTexto onClose={() => setShowImport(false)} />
        </Card>
      )}

      {showForm && (
        <div className="animate-scale-in">
          <TransacaoForm />
        </div>
      )}

      {/* Fatura info */}
      <FaturaInfo />

      {/* Month nav + summary */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <Select value={String(filterMes)} onValueChange={(v) => setFilterMes(Number(v))}>
            <SelectTrigger className="w-32 bg-secondary border-border h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(filterAno)} onValueChange={(v) => setFilterAno(Number(v))}>
            <SelectTrigger className="w-22 bg-secondary border-border h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {!isLoading && transacoes && transacoes.length > 0 && (
          <div className="flex gap-3 text-xs font-display font-semibold">
            <span className="text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              +{formatCurrency(totals.receitas)}
            </span>
            <span className="text-destructive flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              -{formatCurrency(totals.gastos)}
            </span>
            <span className={`${totals.receitas - totals.gastos >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              = {formatCurrency(totals.receitas - totals.gastos)}
            </span>
          </div>
        )}
      </div>

      {/* Transaction list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      ) : !transacoes?.length ? (
        <Card className="py-16 bg-card border-border text-center">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-foreground font-medium text-sm">Nenhuma transação</p>
          <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
            Adicione manualmente ou importe sua fatura com IA
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button size="sm" variant="outline" onClick={() => setShowImport(true)} className="gap-1.5 text-xs">
              <Upload className="w-3 h-3" /> Importar
            </Button>
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 text-xs">
              <Plus className="w-3 h-3" /> Adicionar
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedTransacoes).map(([date, items]) => {
            const d = new Date(date + 'T12:00:00');
            const dayLabel = format(d, "dd 'de' MMMM", { locale: ptBR });
            const weekDay = format(d, 'EEEE', { locale: ptBR });
            const dayTotal = items.reduce((s, t) => s + (t.tipo === 'gasto' ? -Number(t.valor) : Number(t.valor)), 0);

            return (
              <div key={date}>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{dayLabel}</span>
                    <span className="text-[10px] text-muted-foreground capitalize">{weekDay}</span>
                  </div>
                  <span className={`text-[11px] font-display font-semibold ${dayTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {dayTotal >= 0 ? '+' : ''}{formatCurrency(dayTotal)}
                  </span>
                </div>
                <div className="space-y-1">
                  {items.map(t => (
                    <Card
                      key={t.id}
                      className="px-3 py-2.5 md:px-4 md:py-3 bg-card border-border flex items-center gap-3 hover:bg-accent/20 transition-all group"
                    >
                      <div
                        className="w-1 h-9 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORIA_CORES[t.categoria] || 'hsl(var(--muted-foreground))' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {t.descricao}
                          {t.parcelas_total && t.parcelas_total > 1 && (
                            <span className="text-muted-foreground ml-1.5 text-[11px] font-normal">
                              {t.parcela_atual}/{t.parcelas_total}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {t.categoria}
                          {t.forma_pagamento && ` · ${t.forma_pagamento}`}
                        </p>
                      </div>
                      <span className={`text-sm font-display font-bold shrink-0 tabular-nums ${t.tipo === 'receita' ? 'text-success' : 'text-destructive'}`}>
                        {t.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(t.valor))}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(t.id)}
                        disabled={deleteMutation.isPending}
                        className="shrink-0 text-muted-foreground hover:text-destructive h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
