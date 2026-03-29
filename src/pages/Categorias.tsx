import { useState } from 'react';
import { useTransacoesMesAtual, useLimites, useUpsertLimite } from '@/hooks/useFinancas';
import { CATEGORIAS_GASTO, CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, Loader2, AlertTriangle } from 'lucide-react';

export default function Categorias() {
  const { data: transacoes, isLoading: loadingTx } = useTransacoesMesAtual();
  const { data: limites, isLoading: loadingLimites } = useLimites();
  const upsertLimite = useUpsertLimite();
  const [editingLimits, setEditingLimits] = useState<Record<string, string>>({});

  const gastosPorCategoria = (transacoes || [])
    .filter(t => t.tipo === 'gasto')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.categoria] = (acc[t.categoria] || 0) + Number(t.valor);
      return acc;
    }, {});

  const getLimite = (cat: string) => limites?.find(l => l.categoria === cat)?.limite_mensal || 0;

  const handleSave = (cat: string) => {
    const value = parseFloat(editingLimits[cat]);
    if (isNaN(value) || value < 0) return;
    upsertLimite.mutate({ categoria: cat, limite_mensal: value }, {
      onSuccess: () => {
        setEditingLimits(prev => {
          const next = { ...prev };
          delete next[cat];
          return next;
        });
      },
    });
  };

  if (loadingTx || loadingLimites) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Categorias</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Defina limites mensais e acompanhe seus gastos por categoria
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIAS_GASTO.map(cat => {
          const gasto = gastosPorCategoria[cat] || 0;
          const limite = getLimite(cat);
          const percent = limite > 0 ? (gasto / limite) * 100 : 0;
          const isEditing = cat in editingLimits;
          const isOver = percent > 100;
          const isWarning = percent > 70 && percent <= 100;

          return (
            <Card
              key={cat}
              className={`p-4 bg-card border-border animate-slide-up transition-colors ${
                isOver ? 'border-destructive/30' : isWarning ? 'border-warning/20' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: CATEGORIA_CORES[cat] }}
                  />
                  <h3 className="text-sm font-semibold text-foreground">{cat}</h3>
                </div>
                {isOver && <AlertTriangle className="w-4 h-4 text-destructive" />}
              </div>

              {limite > 0 ? (
                <>
                  <div className="relative h-2.5 rounded-full bg-secondary overflow-hidden mb-2">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-destructive' : isWarning ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] mb-3">
                    <span className="text-muted-foreground">
                      <span className="text-foreground font-medium">{formatCurrency(gasto)}</span> gasto
                    </span>
                    <span className="text-muted-foreground">
                      de {formatCurrency(limite)}
                      {limite > 0 && (
                        <span className={`ml-1 font-medium ${isOver ? 'text-destructive' : isWarning ? 'text-warning' : 'text-success'}`}>
                          ({percent.toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-[11px] text-muted-foreground mb-3">
                  <span className="text-foreground font-medium">{formatCurrency(gasto)}</span> gasto · Sem limite definido
                </p>
              )}

              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={limite > 0 ? `Atual: ${formatCurrency(limite)}` : 'Definir limite'}
                  value={isEditing ? editingLimits[cat] : ''}
                  onChange={(e) => setEditingLimits(prev => ({ ...prev, [cat]: e.target.value }))}
                  onFocus={() => {
                    if (!isEditing) {
                      setEditingLimits(prev => ({ ...prev, [cat]: String(limite || '') }));
                    }
                  }}
                  className="bg-secondary border-border text-sm h-8"
                />
                {isEditing && (
                  <Button
                    size="sm"
                    onClick={() => handleSave(cat)}
                    disabled={upsertLimite.isPending}
                    className="h-8 px-3"
                  >
                    {upsertLimite.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
