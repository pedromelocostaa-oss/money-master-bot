import { useState, useMemo } from 'react';
import { useTransacoes, useAddTransacao, useDeleteTransacao } from '@/hooks/useFinancas';
import { CATEGORIAS_GASTO, CATEGORIAS_RECEITA, FORMAS_PAGAMENTO, CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

export default function Lancamentos() {
  const now = new Date();
  const [filterMes, setFilterMes] = useState(now.getMonth());
  const [filterAno, setFilterAno] = useState(now.getFullYear());
  const { data: transacoes, isLoading } = useTransacoes(filterMes, filterAno);
  const addMutation = useAddTransacao();
  const deleteMutation = useDeleteTransacao();

  // Form state
  const [tab, setTab] = useState<'gasto' | 'receita'>('gasto');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));

  const categorias = tab === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_RECEITA;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValor = parseFloat(valor);
    if (!descricao || !numValor || numValor <= 0 || !categoria || !data) return;

    addMutation.mutate(
      {
        tipo: tab,
        descricao,
        valor: numValor,
        categoria,
        forma_pagamento: tab === 'gasto' ? formaPagamento || null : null,
        data,
      },
      {
        onSuccess: () => {
          setDescricao('');
          setValor('');
          setCategoria('');
          setFormaPagamento('');
        },
      }
    );
  };

  // Month filter options
  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(filterAno, i, 1);
      options.push({ value: i, label: format(d, 'MMMM') });
    }
    return options;
  }, [filterAno]);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Lançamentos</h1>

      {/* Form */}
      <Card className="p-4 md:p-5 bg-card border-border">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as 'gasto' | 'receita'); setCategoria(''); }}>
          <TabsList className="bg-secondary mb-4">
            <TabsTrigger value="gasto">Novo Gasto</TabsTrigger>
            <TabsTrigger value="receita">Nova Receita</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Descrição</Label>
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex: Mercado, Uber..."
                required
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                required
                className="bg-secondary border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Categoria</Label>
              <Select value={categoria} onValueChange={setCategoria} required>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {tab === 'gasto' && (
              <div className="space-y-2">
                <Label className="text-foreground">Forma de pagamento</Label>
                <Select value={formaPagamento} onValueChange={setFormaPagamento}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-foreground">Data</Label>
              <Input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="bg-secondary border-border"
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={addMutation.isPending} className="w-full">
                {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </Button>
            </div>
          </form>
        </Tabs>
      </Card>

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
