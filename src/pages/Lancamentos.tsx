import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTransacoes, useDeleteTransacao, useDeleteTransacoes, useDeleteFutureTransacoes, type Transacao } from '@/hooks/useFinancas';
import { useContas, useCartoes } from '@/hooks/useContas';
import { useDividas, useToggleDividaPaga, useDeleteDivida } from '@/hooks/useDividas';
import { CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Upload, Plus, ChevronUp, Receipt, ChevronLeft, ChevronRight, Search, ArrowUp, ArrowDown, ArrowUpDown, Pencil, X, Download, HandCoins, CheckCircle2, Clock, AlertTriangle, ChevronDown, UserPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TransacaoForm from '@/components/TransacaoForm';
import DividaForm from '@/components/DividaForm';
import ImportarTexto from '@/components/ImportarTexto';
import EditTransacaoDialog from '@/components/EditTransacaoDialog';
import CobrarDialog from '@/components/CobrarDialog';

type SortOrder = 'desc' | 'asc' | 'value-desc' | 'value-asc';

export default function Lancamentos() {
  const now = new Date();
  const [searchParams] = useSearchParams();
  const initialMes = searchParams.get('mes') !== null ? Number(searchParams.get('mes')) : now.getMonth();
  const initialAno = searchParams.get('ano') !== null ? Number(searchParams.get('ano')) : now.getFullYear();
  const initialTipo = searchParams.get('tipo') as 'gasto' | 'receita' | null;

  const [filterMes, setFilterMes] = useState(initialMes);
  const [filterAno, setFilterAno] = useState(initialAno);
  const [filterTipo, setFilterTipo] = useState<'todos' | 'gasto' | 'receita'>(initialTipo || 'todos');
  const [filterConta, setFilterConta] = useState<string>('todas');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDividaForm, setShowDividaForm] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Transacao | null>(null);
  const [cobrandoTransacao, setCobrandoTransacao] = useState<Transacao | null>(null);

  const { data: transacoes, isLoading } = useTransacoes(filterMes, filterAno);
  const { data: contas } = useContas();
  const { data: cartoes } = useCartoes();
  const { data: dividas, isLoading: loadingDividas } = useDividas();
  const deleteMutation = useDeleteTransacao();
  const deleteManyMutation = useDeleteTransacoes();
  const deleteFutureMutation = useDeleteFutureTransacoes();
  const togglePagaMutation = useToggleDividaPaga();
  const deleteDividaMutation = useDeleteDivida();

  const contaNome = (id: string | null | undefined) => contas?.find(c => c.id === id)?.nome;
  const cartaoNome = (id: string | null | undefined) => cartoes?.find(c => c.id === id)?.nome;

  const filteredTransacoes = useMemo(() => {
    if (!transacoes) return undefined;
    let result = transacoes;

    if (filterTipo !== 'todos') result = result.filter(t => t.tipo === filterTipo);
    if (filterConta !== 'todas') result = result.filter(t => (t as any).conta_id === filterConta);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        t.descricao.toLowerCase().includes(q) ||
        t.categoria.toLowerCase().includes(q) ||
        (t.forma_pagamento && t.forma_pagamento.toLowerCase().includes(q))
      );
    }

    result = [...result].sort((a, b) => {
      if (sortOrder === 'asc') return a.data.localeCompare(b.data);
      if (sortOrder === 'desc') return b.data.localeCompare(a.data);
      if (sortOrder === 'value-desc') return Number(b.valor) - Number(a.valor);
      if (sortOrder === 'value-asc') return Number(a.valor) - Number(b.valor);
      return 0;
    });

    return result;
  }, [transacoes, filterTipo, filterConta, searchQuery, sortOrder]);

  useEffect(() => { setSelected(new Set()); }, [filterMes, filterAno, filterTipo, filterConta, searchQuery]);

  const navigateMonth = (dir: number) => {
    let m = filterMes + dir, y = filterAno;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setFilterMes(m); setFilterAno(y);
  };

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(filterAno, i, 1);
      const label = format(d, 'MMMM', { locale: ptBR });
      return { value: i, label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
  }, [filterAno]);

  const totals = useMemo(() => {
    const base = filteredTransacoes || [];
    const receitas = base.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const gastos = base.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0);
    return { receitas, gastos };
  }, [filteredTransacoes]);

  const groupedTransacoes = useMemo(() => {
    if (!filteredTransacoes) return {};
    const groups: Record<string, Transacao[]> = {};
    filteredTransacoes.forEach(t => {
      if (!groups[t.data]) groups[t.data] = [];
      groups[t.data].push(t);
    });
    const sortedKeys = Object.keys(groups).sort((a, b) =>
      sortOrder === 'asc' ? a.localeCompare(b) : b.localeCompare(a)
    );
    const sorted: Record<string, Transacao[]> = {};
    sortedKeys.forEach(k => { sorted[k] = groups[k]; });
    return sorted;
  }, [filteredTransacoes, sortOrder]);

  const currentMonthLabel = monthOptions.find(m => m.value === filterMes)?.label || '';

  const cycleSortOrder = () => {
    const cycle: SortOrder[] = ['desc', 'asc', 'value-desc', 'value-asc'];
    setSortOrder(cycle[(cycle.indexOf(sortOrder) + 1) % cycle.length]);
  };

  const sortLabel = {
    desc: 'Mais recentes', asc: 'Mais antigos',
    'value-desc': 'Maior valor', 'value-asc': 'Menor valor',
  }[sortOrder];
  const SortIcon = sortOrder === 'asc' ? ArrowUp : sortOrder === 'desc' ? ArrowDown : ArrowUpDown;

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const allVisibleIds = filteredTransacoes?.map(t => t.id) || [];
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every(id => selected.has(id));
  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allVisibleIds));
  };
  const handleDeleteSelected = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Excluir ${ids.length} transação(ões)?`)) return;
    deleteManyMutation.mutate(ids, { onSuccess: () => setSelected(new Set()) });
  };

  const handleExportCSV = () => {
    if (!filteredTransacoes || filteredTransacoes.length === 0) return;
    const header = ['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor', 'Forma de Pagamento', 'Conta', 'Cartao'];
    const rows = filteredTransacoes.map(t => [
      t.data,
      `"${t.descricao.replace(/"/g, '""')}"`,
      t.categoria,
      t.tipo,
      Number(t.valor).toFixed(2).replace('.', ','),
      t.forma_pagamento || '',
      contaNome((t as any).conta_id) || '',
      cartaoNome((t as any).cartao_id) || '',
    ]);
    const csv = [header.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lancamentos-${currentMonthLabel}-${filterAno}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openDividaForm = () => {
    setShowDividaForm(!showDividaForm);
    setShowForm(false);
    setShowImport(false);
  };
  const openForm = () => {
    setShowForm(!showForm);
    setShowDividaForm(false);
    setShowImport(false);
  };
  const openImport = () => {
    setShowImport(!showImport);
    setShowForm(false);
    setShowDividaForm(false);
  };

  // Map de dívidas vinculadas a transações (via "Referente a: <descricao>")
  const dividasPorDescricao = useMemo(() => {
    const map = new Map<string, typeof dividas extends (infer U)[] | undefined ? U : never>();
    if (!dividas) return map;
    dividas.forEach(d => {
      if (d.descricao?.startsWith('Referente a: ')) {
        const key = d.descricao.replace('Referente a: ', '');
        const existing = map.get(key);
        // Prioriza a dívida não paga; se já tem uma não paga, mantém
        if (!existing || (!d.pago && existing.pago)) {
          map.set(key, d);
        }
      }
    });
    return map;
  }, [dividas]);

  const dividasPendentes = (dividas || []).filter(d => !d.pago);
  const hoje = format(now, 'yyyy-MM-dd');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Lançamentos</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{currentMonthLabel} {filterAno}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline" size="sm"
            onClick={handleExportCSV}
            disabled={!filteredTransacoes || filteredTransacoes.length === 0}
            title="Exportar CSV"
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={openImport}
            className={`gap-1.5 ${showImport ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={openDividaForm}
            className={`gap-1.5 ${showDividaForm ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'text-amber-400 border-amber-500/30 hover:bg-amber-500/10'}`}
          >
            <HandCoins className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dívida</span>
          </Button>
          <Button
            size="sm"
            onClick={openForm}
            className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/15 border-0 font-semibold"
          >
            {showForm ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{showForm ? 'Fechar' : 'Novo'}</span>
          </Button>
        </div>
      </div>

      {showImport && (
        <Card className="p-4 bg-card border-primary/20 animate-scale-in">
          <ImportarTexto onClose={() => setShowImport(false)} />
        </Card>
      )}
      {showDividaForm && <div className="animate-scale-in"><DividaForm /></div>}
      {showForm && <div className="animate-scale-in"><TransacaoForm /></div>}

      {/* Month nav + totals */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-1">
          <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <Select value={String(filterMes)} onValueChange={(v) => setFilterMes(Number(v))}>
            <SelectTrigger className="w-32 bg-secondary border-border h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(filterAno)} onValueChange={(v) => setFilterAno(Number(v))}>
            <SelectTrigger className="w-22 bg-secondary border-border h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {!isLoading && filteredTransacoes && filteredTransacoes.length > 0 && (
          <div className="flex gap-3 text-xs font-display font-semibold tabular-nums">
            <span className="text-success flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              +{formatCurrency(totals.receitas)}
            </span>
            <span className="text-destructive flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
              -{formatCurrency(totals.gastos)}
            </span>
            <span className={totals.receitas - totals.gastos >= 0 ? 'text-foreground' : 'text-destructive'}>
              = {formatCurrency(totals.receitas - totals.gastos)}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex bg-secondary rounded-xl p-0.5">
          {(['todos', 'gasto', 'receita'] as const).map(opt => (
            <button
              key={opt}
              onClick={() => setFilterTipo(opt)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterTipo === opt ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt === 'todos' ? 'Todos' : opt === 'gasto' ? 'Gastos' : 'Receitas'}
            </button>
          ))}
        </div>

        <Select value={filterConta} onValueChange={setFilterConta}>
          <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs bg-secondary border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as contas</SelectItem>
            {contas?.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text" placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[34px] bg-muted border-0 rounded-[10px] text-sm pl-8 focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>

        <Button variant="outline" size="sm" onClick={cycleSortOrder} className="gap-1.5 h-8 text-xs shrink-0">
          <SortIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{sortLabel}</span>
        </Button>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5 animate-scale-in">
          <div className="flex items-center gap-3">
            <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
            <span className="text-sm font-medium text-foreground">
              {selected.size} selecionada{selected.size > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="h-8">
              <X className="w-3.5 h-3.5 mr-1" />Limpar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={deleteManyMutation.isPending} className="h-8">
              <Trash2 className="w-3.5 h-3.5 mr-1" />Excluir
            </Button>
          </div>
        </div>
      )}

      {/* Transactions list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : !filteredTransacoes?.length ? (
        <Card className="py-16 bg-card border-border text-center">
          <Receipt className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-foreground font-medium text-sm">
            {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhuma transação'}
          </p>
          <p className="text-muted-foreground text-xs mt-1 max-w-xs mx-auto">
            {searchQuery ? `Nenhuma transação corresponde a "${searchQuery}"` : 'Adicione manualmente ou importe sua fatura'}
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
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
                  <span className={`text-[11px] font-display font-semibold tabular-nums ${dayTotal >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {dayTotal >= 0 ? '+' : ''}{formatCurrency(dayTotal)}
                  </span>
                </div>
                <Card className="shadow-apple-md border-0 rounded-xl overflow-hidden">
                  {items.map((t, i) => {
                    const isSel = selected.has(t.id);
                    const conta = contaNome((t as any).conta_id);
                    const cartao = cartaoNome((t as any).cartao_id);
                    const linkedDivida = dividasPorDescricao.get(t.descricao);
                    return (
                      <div key={t.id}>
                        {i > 0 && <div className="h-px bg-border/50 mx-4" />}
                        <div
                          className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group ${
                            isSel ? 'bg-primary/5' : linkedDivida && !linkedDivida.pago ? 'bg-amber-500/[0.04]' : ''
                          }`}
                        >
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => toggleOne(t.id)}
                            className={`shrink-0 transition-opacity ${selected.size > 0 || isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                          />
                          <div
                            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0"
                            style={{ background: `${CATEGORIA_CORES[t.categoria] || '#6B7280'}1E` }}
                          >
                            <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: CATEGORIA_CORES[t.categoria] || '#6B7280' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {t.descricao}
                              {t.parcelas_total && t.parcelas_total > 1 && (
                                <span className="text-muted-foreground ml-1.5 text-[11px] font-normal">
                                  {t.parcela_atual}/{t.parcelas_total}
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {t.categoria}
                              {cartao ? ` · ${cartao}` : t.forma_pagamento ? ` · ${t.forma_pagamento}` : ''}
                              {conta ? ` · ${conta}` : ''}
                            </p>
                            {linkedDivida && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <UserPlus className={`w-3 h-3 shrink-0 ${linkedDivida.pago ? 'text-success/60' : 'text-amber-400'}`} />
                                <span className={`text-[10px] font-medium ${linkedDivida.pago ? 'text-success/70' : 'text-amber-400'}`}>
                                  {linkedDivida.nome}
                                </span>
                                <span className="text-[10px] text-muted-foreground/60">·</span>
                                <span className={`text-[10px] font-semibold tabular-nums ${linkedDivida.pago ? 'text-success/70' : 'text-amber-400'}`}>
                                  {formatCurrency(Number(linkedDivida.valor))}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  linkedDivida.pago
                                    ? 'bg-success/10 text-success/70'
                                    : 'bg-amber-500/15 text-amber-400'
                                }`}>
                                  {linkedDivida.pago ? 'Pago' : 'Pendente'}
                                </span>
                              </div>
                            )}
                          </div>
                          <span className={`text-[15px] font-semibold shrink-0 tabular-nums ${
                            t.tipo === 'receita' ? 'text-success' : 'text-foreground'
                          }`}>
                            {t.tipo === 'receita' ? '+' : '-'}{formatCurrency(Number(t.valor))}
                          </span>
                          <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {t.tipo === 'gasto' && (
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => setCobrandoTransacao(t)}
                                className="text-muted-foreground hover:text-amber-400 h-7 w-7"
                                title="Cobrar alguém por este gasto"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => setEditing(t)}
                              className="text-muted-foreground hover:text-primary h-7 w-7"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            {t.parcelas_total && t.parcelas_total > 1 ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost" size="icon"
                                    disabled={deleteMutation.isPending || deleteFutureMutation.isPending}
                                    className="text-muted-foreground hover:text-destructive h-7 w-7"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="text-xs">
                                  <DropdownMenuItem
                                    onClick={() => deleteMutation.mutate(t.id)}
                                    className="text-xs gap-2"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    Excluir somente esta
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      if (!confirm(`Excluir "${t.descricao}" desta data em diante?`)) return;
                                      deleteFutureMutation.mutate({ descricao: t.descricao, fromData: t.data });
                                    }}
                                    className="text-xs gap-2 text-destructive focus:text-destructive"
                                  >
                                    <ChevronDown className="w-3 h-3" />
                                    Excluir esta e todas as futuras
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                variant="ghost" size="icon"
                                onClick={() => deleteMutation.mutate(t.id)}
                                disabled={deleteMutation.isPending}
                                className="text-muted-foreground hover:text-destructive h-7 w-7"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Dívidas a Receber ── */}
      <div>
        <div className="flex items-center justify-between mb-3 mt-4">
          <div className="flex items-center gap-2">
            <HandCoins className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-foreground">Dívidas a Receber</h2>
            {dividasPendentes.length > 0 && (
              <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                {formatCurrency(dividasPendentes.reduce((s, d) => s + Number(d.valor), 0))}
              </span>
            )}
          </div>
        </div>

        {loadingDividas ? (
          <div className="space-y-2">
            {[1, 2].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : !dividas?.length ? (
          <Card className="py-10 bg-card border-border text-center">
            <HandCoins className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma dívida cadastrada</p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">Clique em "Dívida" para registrar quem te deve</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {dividas.map(d => {
              const vencida = !d.pago && d.data_vencimento < hoje;
              const venceHoje = !d.pago && d.data_vencimento === hoje;
              return (
                <Card
                  key={d.id}
                  className={`px-4 py-3 border flex items-center gap-3 transition-all group ${
                    d.pago
                      ? 'bg-card/50 border-border opacity-60'
                      : vencida
                      ? 'bg-destructive/5 border-destructive/20'
                      : venceHoje
                      ? 'bg-warning/5 border-warning/20'
                      : 'bg-card border-amber-500/20'
                  }`}
                >
                  <button
                    onClick={() => togglePagaMutation.mutate({ id: d.id, pago: !d.pago })}
                    className="shrink-0 text-muted-foreground hover:text-amber-400 transition-colors"
                    title={d.pago ? 'Marcar como pendente' : 'Marcar como pago'}
                  >
                    <CheckCircle2 className={`w-4.5 h-4.5 ${d.pago ? 'text-success' : 'text-muted-foreground/40'}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${d.pago ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {d.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {d.descricao && <span className="text-[11px] text-muted-foreground truncate">{d.descricao}</span>}
                      <span className={`flex items-center gap-1 text-[10px] font-medium ${vencida ? 'text-destructive' : venceHoje ? 'text-warning' : 'text-muted-foreground'}`}>
                        {vencida ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {d.pago ? 'Pago' : `Vence ${format(new Date(d.data_vencimento + 'T12:00:00'), "dd/MM/yy")}`}
                      </span>
                    </div>
                  </div>
                  <span className={`text-sm font-display font-bold shrink-0 tabular-nums ${d.pago ? 'text-muted-foreground' : 'text-amber-400'}`}>
                    {formatCurrency(Number(d.valor))}
                  </span>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => deleteDividaMutation.mutate(d.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive h-7 w-7 shrink-0 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <EditTransacaoDialog
        transacao={editing}
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
      />
      <CobrarDialog
        transacao={cobrandoTransacao}
        open={!!cobrandoTransacao}
        onOpenChange={(o) => !o && setCobrandoTransacao(null)}
      />
    </div>
  );
}
