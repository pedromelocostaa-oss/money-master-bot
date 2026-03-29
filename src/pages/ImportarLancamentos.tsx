import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, Sparkles, Check, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { CATEGORIA_CORES } from '@/lib/constants';
import type { Database } from '@/integrations/supabase/types';

type TipoTransacao = Database['public']['Enums']['tipo_transacao'];

interface ParsedTransacao {
  descricao: string;
  valor: number;
  data: string;
  tipo: TipoTransacao;
  categoria: string;
  forma_pagamento?: string | null;
  parcela_atual?: number | null;
  parcelas_total?: number | null;
  selected?: boolean;
}

export default function ImportarLancamentos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transacoes, setTransacoes] = useState<ParsedTransacao[]>([]);

  const handleParse = async () => {
    if (!texto.trim()) {
      toast.error('Cole ou digite os lançamentos primeiro');
      return;
    }
    setParsing(true);
    setTransacoes([]);

    try {
      const { data, error } = await supabase.functions.invoke('parse-transacoes', {
        body: { texto },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);

      const items = (data.transacoes || []).map((t: ParsedTransacao) => ({
        ...t,
        selected: true,
      }));

      if (items.length === 0) {
        toast.warning('Nenhuma transação identificada no texto');
      } else {
        toast.success(`${items.length} transações identificadas!`);
      }

      setTransacoes(items);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar texto');
    } finally {
      setParsing(false);
    }
  };

  const toggleItem = (index: number) => {
    setTransacoes(prev =>
      prev.map((t, i) => (i === index ? { ...t, selected: !t.selected } : t))
    );
  };

  const toggleAll = () => {
    const allSelected = transacoes.every(t => t.selected);
    setTransacoes(prev => prev.map(t => ({ ...t, selected: !allSelected })));
  };

  const removeItem = (index: number) => {
    setTransacoes(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    const selected = transacoes.filter(t => t.selected);
    if (selected.length === 0) {
      toast.error('Selecione pelo menos uma transação');
      return;
    }

    setSaving(true);
    try {
      const rows = selected.map(t => ({
        descricao: t.descricao,
        valor: t.valor,
        data: t.data,
        tipo: t.tipo,
        categoria: t.categoria,
        forma_pagamento: t.forma_pagamento || null,
        parcela_atual: t.parcela_atual || null,
        parcelas_total: t.parcelas_total || null,
        user_id: user.id,
      }));

      const { error } = await supabase.from('transacoes').insert(rows);
      if (error) throw error;

      toast.success(`${selected.length} transações salvas!`);
      setTransacoes([]);
      setTexto('');
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-6meses'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = transacoes.filter(t => t.selected).length;
  const totalGastos = transacoes.filter(t => t.selected && t.tipo === 'gasto').reduce((s, t) => s + t.valor, 0);
  const totalReceitas = transacoes.filter(t => t.selected && t.tipo === 'receita').reduce((s, t) => s + t.valor, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Importar Lançamentos</h1>
      <p className="text-muted-foreground text-sm">
        Cole aqui sua fatura de cartão, extrato ou lista de gastos/receitas. A IA vai identificar e categorizar tudo automaticamente.
      </p>

      {/* Input area */}
      <Card className="p-4 bg-card border-border space-y-4">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"Cole aqui sua fatura, extrato ou lista de lançamentos...\n\nExemplo:\n27 de março\n∙ Supermercado EPA — R$ 32,76\n∙ Uber — R$ 12,27\n\nSalário março — R$ 5.000,00"}
          rows={8}
          className="bg-secondary border-border resize-none text-sm"
        />
        <Button
          onClick={handleParse}
          disabled={parsing || !texto.trim()}
          className="w-full sm:w-auto"
        >
          {parsing ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
              Analisando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Analisar com IA
            </>
          )}
        </Button>
      </Card>

      {/* Loading skeleton */}
      {parsing && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}

      {/* Results */}
      {transacoes.length > 0 && !parsing && (
        <div className="space-y-4">
          {/* Summary bar */}
          <Card className="p-4 bg-card border-border flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={transacoes.every(t => t.selected)}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedCount} de {transacoes.length} selecionadas
              </span>
            </div>
            <div className="flex gap-4 text-sm">
              {totalGastos > 0 && (
                <span className="text-destructive font-medium">
                  Gastos: -{formatCurrency(totalGastos)}
                </span>
              )}
              {totalReceitas > 0 && (
                <span className="text-success font-medium">
                  Receitas: +{formatCurrency(totalReceitas)}
                </span>
              )}
            </div>
          </Card>

          {/* Transaction list */}
          <div className="space-y-2">
            {transacoes.map((t, i) => (
              <Card
                key={i}
                className={`p-3 md:p-4 bg-card border-border flex items-center gap-3 animate-slide-up transition-opacity ${!t.selected ? 'opacity-50' : ''}`}
              >
                <Checkbox
                  checked={t.selected}
                  onCheckedChange={() => toggleItem(i)}
                />
                <div
                  className="w-2 h-10 rounded-full shrink-0"
                  style={{ backgroundColor: CATEGORIA_CORES[t.categoria] || '#6B7280' }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {t.descricao}
                    {t.parcelas_total && t.parcelas_total > 1 && (
                      <span className="text-muted-foreground ml-1">
                        ({t.parcela_atual}/{t.parcelas_total})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {t.categoria}
                    </Badge>
                    {t.forma_pagamento && (
                      <Badge variant="secondary" className="text-xs">
                        {t.forma_pagamento}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{t.data}</span>
                  </div>
                </div>
                <span
                  className={`text-sm font-display font-bold shrink-0 ${t.tipo === 'receita' ? 'text-success' : 'text-destructive'}`}
                >
                  {t.tipo === 'receita' ? '+' : '-'}{formatCurrency(t.valor)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(i)}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>

          {/* Save button */}
          <Button
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
            className="w-full"
            size="lg"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Salvar {selectedCount} transações
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
