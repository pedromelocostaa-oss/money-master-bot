import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CurrencyInput from '@/components/CurrencyInput';
import { useAddDivida } from '@/hooks/useDividas';
import { formatCurrency } from '@/lib/formatters';
import { format, addDays } from 'date-fns';
import { Loader2, UserPlus } from 'lucide-react';
import type { Transacao } from '@/hooks/useFinancas';

interface Props {
  transacao: Transacao | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export default function CobrarDialog({ transacao, open, onOpenChange }: Props) {
  const addDivida = useAddDivida();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'total' | 'metade' | 'outro'>('total');
  const [valorCustom, setValorCustom] = useState('');

  if (!transacao) return null;

  const totalTransacao = Number(transacao.valor);
  const valorCalculado =
    tipo === 'total' ? totalTransacao :
    tipo === 'metade' ? Math.round((totalTransacao / 2) * 100) / 100 :
    parseFloat(valorCustom) || 0;

  const handleClose = () => {
    setNome('');
    setTipo('total');
    setValorCustom('');
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!nome.trim() || valorCalculado <= 0) return;
    const vencimento = format(addDays(new Date(transacao.data + 'T12:00:00'), 30), 'yyyy-MM-dd');
    addDivida.mutate(
      {
        nome: nome.trim(),
        valor: valorCalculado,
        data_vencimento: vencimento,
        descricao: `Referente a: ${transacao.descricao}`,
      },
      { onSuccess: handleClose }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-amber-400" />
            </div>
            <DialogTitle className="text-base">Cobrar alguém</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Transaction reference */}
          <div className="px-3 py-2 rounded-lg bg-secondary text-xs text-muted-foreground flex items-center justify-between">
            <span className="truncate">{transacao.descricao}</span>
            <span className="font-semibold text-foreground ml-2 shrink-0">{formatCurrency(totalTransacao)}</span>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Quem te deve?</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Layla"
              className="bg-secondary border-border"
              autoFocus
            />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-xs">Valor a cobrar</Label>
            <div className="flex gap-1.5 mb-2">
              {(['total', 'metade', 'outro'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { setTipo(opt); setValorCustom(''); }}
                  className={`flex-1 text-[11px] font-semibold py-2 rounded-lg border transition-all ${
                    tipo === opt
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-secondary text-muted-foreground border-transparent hover:text-foreground'
                  }`}
                >
                  {opt === 'total' ? 'Total' : opt === 'metade' ? 'Metade' : 'Personalizado'}
                </button>
              ))}
            </div>
            {tipo === 'outro' ? (
              <CurrencyInput
                value={valorCustom}
                onChange={setValorCustom}
                className="bg-secondary border-border"
              />
            ) : (
              <p className="text-lg font-bold text-amber-400 tabular-nums">
                {formatCurrency(valorCalculado)}
              </p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground/60">
            A dívida será criada com vencimento em 30 dias e aparecerá em "Dívidas a Receber".
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} size="sm">Cancelar</Button>
          <Button
            onClick={handleSave}
            disabled={!nome.trim() || valorCalculado <= 0 || addDivida.isPending}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white border-0"
          >
            {addDivida.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
            Criar cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
