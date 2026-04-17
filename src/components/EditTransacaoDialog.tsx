import { useState, useEffect } from 'react';
import { useUpdateTransacao, type Transacao } from '@/hooks/useFinancas';
import { useContas, useCartoes } from '@/hooks/useContas';
import { CATEGORIAS_GASTO, CATEGORIAS_RECEITA, FORMAS_PAGAMENTO } from '@/lib/constants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CurrencyInput from '@/components/CurrencyInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface Props {
  transacao: Transacao | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function EditTransacaoDialog({ transacao, open, onOpenChange }: Props) {
  const update = useUpdateTransacao();
  const { data: contas } = useContas();
  const { data: cartoes } = useCartoes();

  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<string>('');
  const [contaId, setContaId] = useState<string>('');
  const [cartaoId, setCartaoId] = useState<string>('');
  const [data, setData] = useState('');

  useEffect(() => {
    if (!transacao) return;
    setDescricao(transacao.descricao);
    setValor(String(transacao.valor));
    setCategoria(transacao.categoria);
    setFormaPagamento(transacao.forma_pagamento || '');
    setContaId((transacao as any).conta_id || '');
    setCartaoId((transacao as any).cartao_id || '');
    setData(transacao.data);
  }, [transacao]);

  if (!transacao) return null;

  const isGasto = transacao.tipo === 'gasto';
  const categorias = isGasto ? CATEGORIAS_GASTO : CATEGORIAS_RECEITA;
  const isCartao = formaPagamento === 'Cartão de crédito';

  const onSave = () => {
    const numValor = parseFloat(valor);
    if (!descricao || !numValor || !categoria || !data) return;
    update.mutate(
      {
        id: transacao.id,
        descricao,
        valor: numValor,
        categoria,
        forma_pagamento: isGasto ? formaPagamento || null : null,
        conta_id: contaId || null,
        cartao_id: isGasto && isCartao && cartaoId ? cartaoId : null,
        data,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar {isGasto ? 'gasto' : 'receita'}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Descrição</Label>
            <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valor</Label>
            <CurrencyInput value={valor} onChange={setValor} />
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Conta</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger><SelectValue placeholder="Sem conta" /></SelectTrigger>
              <SelectContent>
                {contas?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nome} ({c.tipo === 'pj' ? 'PJ' : 'PF'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {isGasto && (
            <>
              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select value={formaPagamento} onValueChange={(v) => { setFormaPagamento(v); if (v !== 'Cartão de crédito') setCartaoId(''); }}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isCartao && (
                <div className="space-y-2">
                  <Label>Cartão</Label>
                  <Select value={cartaoId} onValueChange={setCartaoId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {cartoes?.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={update.isPending}>
            {update.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
