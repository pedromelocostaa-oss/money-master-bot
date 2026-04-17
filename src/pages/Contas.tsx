import { useState, useEffect } from 'react';
import { useContas, useCartoes, useUpdateConta, useAddCartao, useUpdateCartao, useDeleteCartao, useSaldosContas } from '@/hooks/useContas';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import CurrencyInput from '@/components/CurrencyInput';
import { formatCurrency } from '@/lib/formatters';
import { Wallet, CreditCard, Plus, Pencil, Trash2, Briefcase, User } from 'lucide-react';

const BANDEIRAS = ['Visa', 'Mastercard', 'Elo', 'American Express', 'Hipercard', 'Outro'];

function ContaCard({ conta, saldo, onEdit }: any) {
  const Icon = conta.tipo === 'pj' ? Briefcase : User;
  const tipoLabel = conta.tipo === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física';
  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${conta.cor}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: conta.cor }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{conta.nome}</p>
            <p className="text-[11px] text-muted-foreground">{tipoLabel}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(conta)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Saldo atual</p>
      <p className={`text-2xl font-display font-bold tracking-tight tabular-nums ${saldo >= 0 ? 'text-foreground' : 'text-destructive'}`}>
        {formatCurrency(saldo)}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1">
        Inicial: {formatCurrency(Number(conta.saldo_inicial))}
      </p>
    </Card>
  );
}

function EditContaDialog({ conta, open, onOpenChange }: any) {
  const update = useUpdateConta();
  const [nome, setNome] = useState('');
  const [saldo, setSaldo] = useState('0');

  // Sincroniza os campos sempre que abrir com uma conta diferente
  useEffect(() => {
    if (conta && open) {
      setNome(conta.nome || '');
      setSaldo(String(conta.saldo_inicial ?? '0'));
    }
  }, [conta?.id, open]);

  const onSave = () => {
    const valorNumerico = saldo === '' ? 0 : Number(saldo);
    if (isNaN(valorNumerico)) return;
    update.mutate(
      { id: conta.id, nome, saldo_inicial: valorNumerico },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  if (!conta) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar conta</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Saldo inicial</Label>
            <CurrencyInput value={saldo} onChange={setSaldo} />
            <p className="text-xs text-muted-foreground">O saldo atual é calculado a partir deste valor + suas movimentações.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={update.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CartaoDialog({ open, onOpenChange, cartao, contas }: any) {
  const add = useAddCartao();
  const update = useUpdateCartao();
  const isEdit = !!cartao;

  const [nome, setNome] = useState(cartao?.nome || '');
  const [bandeira, setBandeira] = useState(cartao?.bandeira || '');
  const [limite, setLimite] = useState(String(cartao?.limite || ''));
  const [diaFech, setDiaFech] = useState(String(cartao?.dia_fechamento || ''));
  const [diaVenc, setDiaVenc] = useState(String(cartao?.dia_vencimento || ''));
  const [contaId, setContaId] = useState<string>(cartao?.conta_id || '');
  const [cor, setCor] = useState(cartao?.cor || '#6366F1');

  const onSave = () => {
    if (!nome) return;
    const payload = {
      nome,
      bandeira: bandeira || null,
      limite: limite ? Number(limite) : null,
      dia_fechamento: diaFech ? Number(diaFech) : null,
      dia_vencimento: diaVenc ? Number(diaVenc) : null,
      conta_id: contaId || null,
      cor,
    };
    if (isEdit) {
      update.mutate({ id: cartao.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      add.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? 'Editar cartão' : 'Novo cartão'}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Nubank Black" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Bandeira</Label>
              <Select value={bandeira} onValueChange={setBandeira}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {BANDEIRAS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Limite</Label>
              <CurrencyInput value={limite} onChange={setLimite} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dia fechamento</Label>
              <Input type="number" min="1" max="31" value={diaFech} onChange={(e) => setDiaFech(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Dia vencimento</Label>
              <Input type="number" min="1" max="31" value={diaVenc} onChange={(e) => setDiaVenc(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Conta vinculada</Label>
            <Select value={contaId} onValueChange={setContaId}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                {contas?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-full h-10 rounded-md bg-transparent border border-border cursor-pointer" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onSave} disabled={add.isPending || update.isPending}>{isEdit ? 'Salvar' : 'Adicionar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Contas() {
  const { data: contas, isLoading: loadingContas } = useContas();
  const { data: cartoes, isLoading: loadingCartoes } = useCartoes();
  const { data: saldos } = useSaldosContas();
  const deleteCartao = useDeleteCartao();

  const [editConta, setEditConta] = useState<any>(null);
  const [cartaoOpen, setCartaoOpen] = useState(false);
  const [editCartao, setEditCartao] = useState<any>(null);

  const totalGeral = saldos?.reduce((s, c) => s + c.saldo_atual, 0) || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Contas e cartões</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Gerencie suas contas pessoais, PJ e cartões de crédito</p>
      </div>

      {/* Total */}
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Patrimônio total</p>
            <p className={`text-2xl font-display font-bold tracking-tight tabular-nums ${totalGeral >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(totalGeral)}
            </p>
          </div>
        </div>
      </Card>

      {/* Contas */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Suas contas</h2>
        {loadingContas ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-36 rounded-2xl" />
            <Skeleton className="h-36 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contas?.map(c => {
              const s = saldos?.find(x => x.id === c.id);
              return (
                <ContaCard
                  key={c.id}
                  conta={c}
                  saldo={s?.saldo_atual ?? Number(c.saldo_inicial)}
                  onEdit={setEditConta}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Cartões */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Cartões de crédito</h2>
          <Button size="sm" onClick={() => { setEditCartao(null); setCartaoOpen(true); }} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Novo cartão
          </Button>
        </div>

        {loadingCartoes ? (
          <Skeleton className="h-24 rounded-2xl" />
        ) : !cartoes?.length ? (
          <Card className="py-12 text-center bg-card border-dashed border-border">
            <CreditCard className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-foreground">Nenhum cartão cadastrado</p>
            <p className="text-xs text-muted-foreground mt-1">Adicione seus cartões para vincular gastos a cada um</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cartoes.map(c => {
              const conta = contas?.find(x => x.id === c.conta_id);
              return (
                <Card key={c.id} className="p-4 bg-card border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${c.cor || '#6366F1'}20` }}
                      >
                        <CreditCard className="w-4 h-4" style={{ color: c.cor || '#6366F1' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{c.nome}</p>
                        {c.bandeira && <p className="text-[11px] text-muted-foreground">{c.bandeira}</p>}
                      </div>
                    </div>
                    <div className="flex">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditCartao(c); setCartaoOpen(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive"
                        onClick={() => { if (confirm(`Remover cartão "${c.nome}"?`)) deleteCartao.mutate(c.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    {c.limite && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Limite</span>
                        <span className="text-foreground font-medium tabular-nums">{formatCurrency(Number(c.limite))}</span>
                      </div>
                    )}
                    {c.dia_fechamento && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fechamento</span>
                        <span className="text-foreground">dia {c.dia_fechamento}</span>
                      </div>
                    )}
                    {c.dia_vencimento && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Vencimento</span>
                        <span className="text-foreground">dia {c.dia_vencimento}</span>
                      </div>
                    )}
                    {conta && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Conta</span>
                        <span className="text-foreground">{conta.nome}</span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <EditContaDialog conta={editConta} open={!!editConta} onOpenChange={(o: boolean) => !o && setEditConta(null)} />
      <CartaoDialog
        open={cartaoOpen}
        onOpenChange={(o: boolean) => { setCartaoOpen(o); if (!o) setEditCartao(null); }}
        cartao={editCartao}
        contas={contas}
      />
    </div>
  );
}
