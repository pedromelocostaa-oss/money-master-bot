import { useState } from 'react';
import { useAddDivida } from '@/hooks/useDividas';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import CurrencyInput from '@/components/CurrencyInput';
import { Loader2, Plus } from 'lucide-react';
import { format } from 'date-fns';

export default function DividaForm() {
  const addMutation = useAddDivida();
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [descricao, setDescricao] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValor = parseFloat(valor);
    if (!nome.trim() || !numValor || numValor <= 0 || !dataVencimento) return;

    addMutation.mutate(
      { nome: nome.trim(), valor: numValor, data_vencimento: dataVencimento, descricao: descricao.trim() || null },
      {
        onSuccess: () => {
          setNome('');
          setValor('');
          setDescricao('');
          setDataVencimento(format(new Date(), 'yyyy-MM-dd'));
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
          <Label className="text-foreground">Data de vencimento</Label>
          <Input
            type="date"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
            required
            className="bg-secondary border-border"
          />
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
