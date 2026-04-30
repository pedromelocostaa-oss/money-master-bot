import { useState } from 'react';
import { useAddTransacao } from '@/hooks/useFinancas';
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
import { Loader2, Plus } from 'lucide-react';
import { format, addMonths } from 'date-fns';

export default function TransacaoForm() {
  const addMutation = useAddTransacao();
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

  const categorias = tab === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_RECEITA;
  const isCartao = formaPagamento === 'Cartão de crédito';

  const handleFormaPagamentoChange = (v: string) => {
    const wasCartao = formaPagamento === 'Cartão de crédito';
    const isNowCartao = v === 'Cartão de crédito';

    setFormaPagamento(v);
    if (v !== 'Cartão de crédito') setCartaoId('');

    if (isNowCartao && !wasCartao) {
      // Avança a data para o mês seguinte ao selecionar cartão de crédito
      setData(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
    } else if (!isNowCartao && wasCartao) {
      // Volta para hoje ao trocar para outro meio de pagamento
      setData(format(new Date(), 'yyyy-MM-dd'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValor = parseFloat(valor);
    if (!descricao || !numValor || numValor <= 0 || !categoria || !data) return;

    let numParcelas: number | undefined;
    if (tab === 'gasto' && isParcelado) {
      numParcelas = parseInt(parcelas);
      if (!numParcelas || numParcelas < 2) return;
    }
    if (isRecorrente) {
      if (recorrenciaSemFim) {
        numParcelas = 120;
      } else {
        numParcelas = parseInt(mesesRecorrente);
        if (!numParcelas || numParcelas < 2) return;
      }
    }

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
          setDescricao('');
          setValor('');
          setCategoria('');
          setFormaPagamento('');
          setCartaoId('');
          setIsParcelado(false);
          setIsRecorrente(false);
          setData(format(new Date(), 'yyyy-MM-dd'));
        },
      }
    );
  };

  return (
    <Card className="p-4 md:p-5 bg-card border-border">
      <Tabs value={tab} onValueChange={(v) => { setTab(v as 'gasto' | 'receita'); setCategoria(''); setIsParcelado(false); setIsRecorrente(false); setCartaoId(''); setFormaPagamento(''); setData(format(new Date(), 'yyyy-MM-dd')); }}>
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

          {/* Parcelamento (only for expenses) */}
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

          {/* Recorrente (for both) */}
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

          <div className="flex items-end">
            <Button type="submit" disabled={addMutation.isPending} className="w-full">
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </Button>
          </div>
        </form>
      </Tabs>
    </Card>
  );
}
