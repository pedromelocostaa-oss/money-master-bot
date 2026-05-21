import { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Check, Trash2, X, Maximize2, Minimize2, CreditCard, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { CATEGORIA_CORES } from '@/lib/constants';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface ImportarTextoProps {
  onClose: () => void;
}

const now = new Date();

function buildMonthOptions() {
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
    const label = format(d, 'MMMM yyyy', { locale: ptBR });
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      mes: d.getMonth(),
      ano: d.getFullYear(),
    };
  });
}

export default function ImportarTexto({ onClose }: ImportarTextoProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [texto, setTexto] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transacoes, setTransacoes] = useState<ParsedTransacao[]>([]);
  const [expanded, setExpanded] = useState(false);

  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthValue = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const [importMode, setImportMode] = useState<'pix' | 'cartao'>('pix');
  const [targetMonth, setTargetMonth] = useState(currentMonthValue);
  const [tipoOverride, setTipoOverride] = useState<'auto' | 'gasto' | 'receita'>('auto');

  const handleImportModeChange = (mode: 'pix' | 'cartao') => {
    setImportMode(mode);
    setTargetMonth(mode === 'cartao' ? nextMonthValue : currentMonthValue);
  };

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

    const [targetAno, targetMesStr] = targetMonth.split('-');
    const ano = parseInt(targetAno);
    const mes = parseInt(targetMesStr) - 1;

    setSaving(true);
    try {
      const rows = selected.map(t => {
        const parsedDate = t.data ? new Date(t.data + 'T12:00:00') : null;
        const originalDay = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getDate() : 1;
        const daysInTargetMonth = new Date(ano, mes + 1, 0).getDate();
        const day = Math.min(originalDay, daysInTargetMonth);
        const overriddenDate = `${targetAno}-${targetMesStr}-${String(day).padStart(2, '0')}`;

        return {
          descricao: t.descricao,
          valor: t.valor,
          data: overriddenDate,
          tipo: tipoOverride !== 'auto' ? tipoOverride : t.tipo,
          categoria: t.categoria,
          forma_pagamento: t.forma_pagamento || null,
          parcela_atual: t.parcela_atual || null,
          parcelas_total: t.parcelas_total || null,
          user_id: user.id,
        };
      });

      const { error } = await supabase.from('transacoes').insert(rows);
      if (error) throw error;

      toast.success(`${selected.length} transações salvas!`);
      setTransacoes([]);
      setTexto('');
      onClose();
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-6meses'] });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const selectedCount = transacoes.filter(t => t.selected).length;
  const totalGastos = transacoes.filter(t => t.selected && (tipoOverride === 'gasto' || (tipoOverride === 'auto' && t.tipo === 'gasto'))).reduce((s, t) => s + t.valor, 0);
  const totalReceitas = transacoes.filter(t => t.selected && (tipoOverride === 'receita' || (tipoOverride === 'auto' && t.tipo === 'receita'))).reduce((s, t) => s + t.valor, 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Importar via IA</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cole sua fatura, extrato ou lista de gastos
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-muted-foreground hover:text-foreground -mr-2">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Payment mode toggle */}
      <div className="space-y-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tipo de importação</p>
        <div className="flex bg-secondary rounded-lg p-0.5 h-9">
          <button
            type="button"
            onClick={() => handleImportModeChange('pix')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md text-[11px] font-medium transition-all ${
              importMode === 'pix'
                ? 'bg-success/20 text-success'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Banknote className="w-3 h-3" />
            Pix / Débito
          </button>
          <button
            type="button"
            onClick={() => handleImportModeChange('cartao')}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md text-[11px] font-medium transition-all ${
              importMode === 'cartao'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            Cartão de crédito
          </button>
        </div>
        {importMode === 'cartao' && (
          <p className="text-[10px] text-blue-400/80">
            Despesas no cartão entram no mês seguinte (quando a fatura é paga)
          </p>
        )}
      </div>

      {/* Month & type selectors */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[160px] space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Mês de referência</p>
          <Select value={targetMonth} onValueChange={setTargetMonth}>
            <SelectTrigger className="bg-secondary border-border h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[140px] space-y-1">
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Tipo</p>
          <div className="flex bg-secondary rounded-lg p-0.5 h-9">
            {(['auto', 'gasto', 'receita'] as const).map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => setTipoOverride(opt)}
                className={`flex-1 rounded-md text-[11px] font-medium transition-all ${
                  tipoOverride === opt
                    ? opt === 'gasto'
                      ? 'bg-destructive/20 text-destructive'
                      : opt === 'receita'
                      ? 'bg-success/20 text-success'
                      : 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {opt === 'auto' ? 'Auto' : opt === 'gasto' ? 'Gasto' : 'Receita'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={"Cole aqui sua fatura ou lista...\nEx: Supermercado EPA — R$ 32,76\nUber — R$ 12,27"}
          rows={expanded ? 20 : 5}
          className="bg-secondary border-border resize-none text-sm pr-10 transition-all duration-200"
        />
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
          aria-label={expanded ? 'Recolher campo' : 'Expandir campo'}
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      <Button
        onClick={handleParse}
        disabled={parsing || !texto.trim()}
        className="w-full"
        size="sm"
      >
        {parsing ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            Analisando...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Analisar com IA
          </>
        )}
      </Button>

      {parsing && (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      )}

      {transacoes.length > 0 && !parsing && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 border-y border-border">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={transacoes.every(t => t.selected)}
                onCheckedChange={toggleAll}
              />
              <span className="text-xs text-muted-foreground">
                {selectedCount}/{transacoes.length}
              </span>
            </div>
            <div className="flex gap-3 text-xs">
              {totalGastos > 0 && (
                <span className="text-destructive font-medium">-{formatCurrency(totalGastos)}</span>
              )}
              {totalReceitas > 0 && (
                <span className="text-success font-medium">+{formatCurrency(totalReceitas)}</span>
              )}
            </div>
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {transacoes.map((t, i) => {
              const displayTipo = tipoOverride !== 'auto' ? tipoOverride : t.tipo;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/50 transition-opacity ${!t.selected ? 'opacity-40' : ''}`}
                >
                  <Checkbox checked={t.selected} onCheckedChange={() => toggleItem(i)} />
                  <div
                    className="w-1.5 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORIA_CORES[t.categoria] || 'hsl(var(--muted-foreground))' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {t.descricao}
                      {t.parcelas_total && t.parcelas_total > 1 && (
                        <span className="text-muted-foreground ml-1">({t.parcela_atual}/{t.parcelas_total})</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{t.categoria}</span>
                      {tipoOverride !== 'auto' && (
                        <span className={`text-[10px] font-semibold ${tipoOverride === 'gasto' ? 'text-destructive' : 'text-success'}`}>
                          · {tipoOverride}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-display font-bold shrink-0 ${displayTipo === 'receita' ? 'text-success' : 'text-destructive'}`}>
                    {displayTipo === 'receita' ? '+' : '-'}{formatCurrency(t.valor)}
                  </span>
                  <button onClick={() => removeItem(i)} className="text-muted-foreground hover:text-destructive transition-colors p-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || selectedCount === 0}
            className="w-full"
            size="sm"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 mr-2" />
                Salvar {selectedCount} transações em {monthOptions.find(m => m.value === targetMonth)?.label}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
