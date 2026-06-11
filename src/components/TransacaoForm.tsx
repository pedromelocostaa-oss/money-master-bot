import { useState } from 'react';
import { useAddTransacao } from '@/hooks/useFinancas';
import { useAddDivida } from '@/hooks/useDividas';
import { useContas, useCartoes } from '@/hooks/useContas';
import { CATEGORIAS_GASTO, CATEGORIAS_RECEITA, FORMAS_PAGAMENTO } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CurrencyInput from '@/components/CurrencyInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus, UserPlus, X } from 'lucide-react';
import { format, addMonths, addDays } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

export default function TransacaoForm() {
  const addMutation = useAddTransacao();
  const addDividaMutation = useAddDivida();
  const { data: contas } = useContas();
  const { data: cartoes } = useCartoes();

  const [tab, setTab] = useState<'gasto' | 'receita'>('gasto');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [contaId, setContaId] = useState<string>('');
  const [cartaoId, setCartaoId] = useState<string>('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelas, setParcelas] = useState('2');
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [mesesRecorrente, setMesesRecorrente] = useState('12');
  const [recorrenciaSemFim, setRecorrenciaSemFim] = useState(false);

  // Cobrar alguém
  const [cobrarAtivo, setCobrarAtivo] = useState(false);
  const [cobrarNome, setCobrarNome] = useState('');
  const [cobrarTipo, setCobrarTipo] = useState<'total' | 'metade' | 'outro'>('total');
  const [cobrarValorCustom, setCobrarValorCustom] = useState('');
  const [cobrarTemPrazo, setCobrarTemPrazo] = useState(true);

  const categorias = tab === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_RECEITA;
  const isCartao = formaPagamento === 'Cartão de crédito';

  const numValor = parseFloat(valor) || 0;
  const cobrarValorCalculado =
    cobrarTipo === 'total' ? numValor :
    cobrarTipo === 'metade' ? Math.round((numValor / 2) * 100) / 100 :
    parseFloat(cobrarValorCustom) || 0;

  const handleFormaPagamentoChange = (v: string) => {
    const wasCartao = formaPagamento === 'Cartão de crédito';
    const isNowCartao = v === 'Cartão de crédito';
    setFormaPagamento(v);
    if (v !== 'Cartão de crédito') setCartaoId('');
    if (isNowCartao && !wasCartao) {
      setData(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
    } else if (!isNowCartao && wasCartao) {
      setData(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const resetForm = () => {
    setDescricao('');
    setValor('');
    setCategoria('');
    setFormaPagamento('');
    setCartaoId('');
    setIsParcelado(false);
    setIsRecorrente(false);
    setData(format(new Date(), 'yyyy-MM-dd'));
    setCobrarAtivo(false);
    setCobrarNome('');
    setCobrarTipo('total');
    setCobrarValorCustom('');
    setCobrarTemPrazo(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao || !numValor || numValor <= 0 || !categoria || !data) return;

    let numParcelas: number | undefined;
    if (tab === 'gasto' && isParcelado) {
      numParcelas = parseInt(parcelas);
      if (!numParcelas || numParcelas < 2) return;
    }
    if (isRecorrente) {
      numParcelas = recorrenciaSemFim ? 120 : parseInt(mesesRecorrente);
      if (!recorrenciaSemFim && (!numParcelas || numParcelas < 2)) return;
    }

    const shouldCobrar = cobrarAtivo && tab === 'gasto' && cobrarNome.trim() && cobrarValorCalculado > 0;

    addMutation.mutate(
      {
        tipo: tab,
        descricao,
        valor: numValor,
        categoria,
        forma_pagamento: tab === 'gasto' ? formaPagamento || null : null,
        conta_id: contaId || null,
        cartao_id: tab === 'gasto' && isCartao && cartaoId ? cartaoId : null,
        data,
        parcelas: numParcelas,
        isRecorrente,
      },
      {
        onSuccess: () => {
          if (shouldCobrar) {
            const vencimento = cobrarTemPrazo ? format(addDays(new Date(data + 'T12:00:00'), 30), 'yyyy-MM-dd') : null;
            addDividaMutation.mutate({
              nome: cobrarNome.trim(),
              valor: cobrarValorCalculado,
              data_vencimento: vencimento,
              descricao: `Referente a: ${descricao}`,
            });
          }
          resetForm();
        },
      }
    );
  };

  return (
    <Card className="p-4 md:p-5 bg-card border-border">
      <Tabs value={tab} onValueChange={(v) => {
        setTab(v as 'gasto' | 'receita');
        setCategoria('');
        setIsParcelado(false);
        setIsRecorrente(false);
        setCartaoId('');
        setFormaPagamento('');
        setData(format(new Date(), 'yyyy-MM-dd'));
        setCobrarAtivo(false);
      }}>
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
            <Label className="text-foreground">Valor</Label>
            <CurrencyInput
              value={valor}
              onChange={setValor}
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

          <div className="space-y-2">
            <Label className="text-foreground">Conta</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger className="bg-secondary border-border">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {contas?.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome} <span className="text-muted-foreground text-xs">({c.tipo === 'pj' ? 'PJ' : 'PF'})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tab === 'gasto' && (
            <div className="space-y-2">
              <Label className="text-foreground">Forma de pagamento</Label>
              <Select value={formaPagamento} onValueChange={handleFormaPagamentoChange}>
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

          {tab === 'gasto' && isCartao && (
            <div className="space-y-2">
              <Label className="text-foreground">Cartão</Label>
              <Select value={cartaoId} onValueChange={setCartaoId}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder={cartoes && cartoes.length === 0 ? 'Cadastre um cartão em Contas' : 'Selecione o cartão'} />
                </SelectTrigger>
                <SelectContent>
                  {cartoes?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}{c.bandeira ? ` · ${c.bandeira}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-foreground">
              Data{isCartao && <span className="text-blue-400 text-xs ml-1">(mês da fatura)</span>}
            </Label>
            <Input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              className="bg-secondary border-border"
            />
            {isCartao && (
              <p className="text-[11px] text-blue-400/80">
                Avançado para o mês seguinte — quando a fatura será paga
              </p>
            )}
          </div>

          {tab === 'gasto' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={isParcelado} onCheckedChange={(v) => { setIsParcelado(v); if (v) setIsRecorrente(false); }} />
                <Label className="text-foreground">Parcelado</Label>
              </div>
              {isParcelado && (
                <Input
                  type="number"
                  min="2"
                  max="48"
                  value={parcelas}
                  onChange={(e) => setParcelas(e.target.value)}
                  placeholder="Nº de parcelas"
                  className="bg-secondary border-border"
                />
              )}
            </div>
          )}

          {!isParcelado && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch checked={isRecorrente} onCheckedChange={setIsRecorrente} />
                <Label className="text-foreground">Recorrente</Label>
              </div>
              {isRecorrente && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Switch checked={recorrenciaSemFim} onCheckedChange={setRecorrenciaSemFim} />
                    <Label className="text-xs text-muted-foreground">Sem data para terminar</Label>
                  </div>
                  {!recorrenciaSemFim && (
                    <Input
                      type="number"
                      min="2"
                      max="120"
                      value={mesesRecorrente}
                      onChange={(e) => setMesesRecorrente(e.target.value)}
                      placeholder="Nº de meses"
                      className="bg-secondary border-border"
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Cobrar alguém ── */}
          {tab === 'gasto' && (
            <div className="sm:col-span-2 lg:col-span-3 space-y-3">
              <button
                type="button"
                onClick={() => setCobrarAtivo(v => !v)}
                className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                  cobrarAtivo
                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                    : 'bg-secondary text-muted-foreground border-transparent hover:border-border hover:text-foreground'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                {cobrarAtivo ? 'Gerar cobrança ativado' : 'Cobrar alguém por este gasto'}
                {cobrarAtivo && <X className="w-3 h-3 ml-1 opacity-60" />}
              </button>

              {cobrarAtivo && (
                <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3 animate-fade-in">
                  <p className="text-[11px] text-amber-400/80 font-medium uppercase tracking-wide">Quem te deve?</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Nome */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <Input
                        value={cobrarNome}
                        onChange={(e) => setCobrarNome(e.target.value)}
                        placeholder="Ex: Layla"
                        className="bg-secondary border-border h-9 text-sm"
                      />
                    </div>

                    {/* Valor */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Valor a cobrar</Label>
                      <div className="flex gap-1 mb-1.5">
                        {(['total', 'metade', 'outro'] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => { setCobrarTipo(opt); setCobrarValorCustom(''); }}
                            className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md border transition-all ${
                              cobrarTipo === opt
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                : 'bg-secondary text-muted-foreground border-transparent hover:text-foreground'
                            }`}
                          >
                            {opt === 'total' ? 'Total' : opt === 'metade' ? 'Metade' : 'Outro'}
                          </button>
                        ))}
                      </div>
                      {cobrarTipo === 'outro' ? (
                        <CurrencyInput
                          value={cobrarValorCustom}
                          onChange={setCobrarValorCustom}
                          className="bg-secondary border-border h-9"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-amber-400 tabular-nums">
                          {numValor > 0 ? formatCurrency(cobrarValorCalculado) : '—'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Definir prazo de cobrança (30 dias)</Label>
                    <Switch checked={cobrarTemPrazo} onCheckedChange={setCobrarTemPrazo} className="scale-90" />
                  </div>

                  <p className="text-[11px] text-muted-foreground/60">
                    Uma dívida de <span className="text-amber-400 font-medium">{cobrarValorCalculado > 0 ? formatCurrency(cobrarValorCalculado) : '—'}</span> será criada automaticamente em "Dívidas a Receber"
                    {cobrarTemPrazo ? ' com vencimento em 30 dias.' : ', sem prazo de vencimento.'}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-end">
            <Button type="submit" disabled={addMutation.isPending || addDividaMutation.isPending} className="w-full">
              {(addMutation.isPending || addDividaMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar{cobrarAtivo && cobrarNome.trim() ? ` · Cobrar ${cobrarNome}` : ''}
            </Button>
          </div>
        </form>
      </Tabs>
    </Card>
  );
}
