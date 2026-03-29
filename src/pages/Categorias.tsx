import { useState } from 'react';
import { useTransacoesMesAtual, useLimites, useUpsertLimite } from '@/hooks/useFinancas';
import { CATEGORIAS_GASTO, CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Check, Loader2 } from 'lucide-react';

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

  const getLimite = (cat: string) => {
    return limites?.find(l => l.categoria === cat)?.limite_mensal || 0;
  };

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
        <h1 className="text-2xl font-display font-bold text-foreground">Categorias</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Categorias</h1>
      <p className="text-sm text-muted-foreground">
        Configure os limites mensais para cada categoria de gasto.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CATEGORIAS_GASTO.map(cat => {
          const gasto = gastosPorCategoria[cat] || 0;
          const limite = getLimite(cat);
          const percent = limite > 0 ? (gasto / limite) * 100 : 0;
          const isEditing = cat in editingLimits;

          let progressColor = 'bg-success';
          if (percent > 90) progressColor = 'bg-destructive';
          else if (percent > 70) progressColor = 'bg-warning';

          return (
            <Card key={cat} className="p-4 bg-card border-border animate-slide-up">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: CATEGORIA_CORES[cat] }}
                />
                <h3 className="text-sm font-medium text-foreground">{cat}</h3>
              </div>

              {limite > 0 ? (
                <>
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden mb-2">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full transition-all ${progressColor}`}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-3">
                    <span>{formatCurrency(gasto)} gasto</span>
                    <span>Limite: {formatCurrency(limite)}</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">
                  {formatCurrency(gasto)} gasto · Sem limite definido
                </p>
              )}

              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Limite mensal"
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
                    className="h-8"
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
