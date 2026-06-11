import { useState } from 'react';
import { useAddDivida } from '@/hooks/useDividas';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import CurrencyInput from '@/components/CurrencyInput';
import { Loader2, Plus } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function DividaForm() {
  const addMutation = useAddDivida();
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [temPrazo, setTemPrazo] = useState(true);
  const [dataVencimento, setDataVencimento] = useState(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  const [descricao, setDescricao] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValor = parseFloat(valor);
    if (!nome.trim() || !numValor || numValor <= 0) return;
    if (temPrazo && !dataVencimento) return;

    addMutation.mutate(
      { nome: nome.trim(), valor: numValor, data_vencimento: temPrazo ? dataVencimento : null, descricao: descricao.trim() || null },
      {
        onSuccess: () => {
          setNome('');
          setValor('');
          setDescricao('');
          setTemPrazo(true);
          setDataVencimento(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
        },
      }
    );
  };

  return (
    <Card className="p-4 md:p-5 bg-card border-amber-500/20">
      <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-4">Nova dívida a receber</p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label className="text-foreground">Quem está devendo</Label>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: João, Maria..."
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
          <div className="flex items-center justify-between">
            <Label className="text-foreground">Prazo para cobrança</Label>
            <div className="flex items-center gap-1.5">
              <Switch checked={temPrazo} onCheckedChange={setTemPrazo} className="scale-90" />
              <span className="text-[11px] text-muted-foreground">{temPrazo ? 'Definir' : 'Sem prazo'}</span>
            </div>
          </div>
          {temPrazo ? (
            <Input
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              required
              className="bg-secondary border-border"
            />
          ) : (
            <p className="text-xs text-muted-foreground/60 h-10 flex items-center">
              A dívida ficará sem data de vencimento
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-foreground">Descrição (opcional)</Label>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Empréstimo viagem..."
            className="bg-secondary border-border"
          />
        </div>

        <div className="flex items-end sm:col-span-2 lg:col-span-4">
          <Button type="submit" disabled={addMutation.isPending} className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold">
            {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Registrar dívida
          </Button>
        </div>
      </form>
    </Card>
  );
}
