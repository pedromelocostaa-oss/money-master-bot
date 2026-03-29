import { useState } from 'react';
import { useAddTransacao } from '@/hooks/useFinancas';
import { CATEGORIAS_GASTO, CATEGORIAS_RECEITA, FORMAS_PAGAMENTO } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function TransacaoForm() {
  const addMutation = useAddTransacao();

  const [tab, setTab] = useState<'gasto' | 'receita'>('gasto');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('');
  const [data, setData] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isParcelado, setIsParcelado] = useState(false);
  const [parcelas, setParcelas] = useState('2');
  const [isRecorrente, setIsRecorrente] = useState(false);
  const [mesesRecorrente, setMesesRecorrente] = useState('12');

  const categorias = tab === 'gasto' ? CATEGORIAS_GASTO : CATEGORIAS_RECEITA;

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
      numParcelas = parseInt(mesesRecorrente);
      if (!numParcelas || numParcelas < 2) return;
    }

    addMutation.mutate(
      {
        tipo: tab,
        descricao,
        valor: numValor,
        categoria,
        forma_pagamento: tab === 'gasto' ? formaPagamento || null : null,
        data,
        parcelas: numParcelas,
      },
      {
        onSuccess: () => {
          setDescricao('');
          setValor('');
          setCategoria('');
          setFormaPagamento('');
          setIsParcelado(false);
          setIsRecorrente(false);
        },
      }
    );
  };

  return (
    <Card className="p-4 md:p-5 bg-card border-border">
      <Tabs value={tab} onValueChange={(v) => { setTab(v as 'gasto' | 'receita'); setCategoria(''); setIsParcelado(false); setIsRecorrente(false); }}>
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
                <Input
                  type="number"
                  min="2"
                  max="24"
                  value={mesesRecorrente}
                  onChange={(e) => setMesesRecorrente(e.target.value)}
                  placeholder="Nº de meses"
                  className="bg-secondary border-border"
                />
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
