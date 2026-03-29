import { useMemo } from 'react';
import { useTransacoesMesAtual, useLimites } from '@/hooks/useFinancas';
import { CATEGORIAS_GASTO, CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Calendar, Target, Zap } from 'lucide-react';

export default function Projecao() {
  const { data: transacoes, isLoading: loadingTx } = useTransacoesMesAtual();
  const { data: limites, isLoading: loadingLim } = useLimites();

  const projecao = useMemo(() => {
    if (!transacoes) return null;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysPassed = now.getDate();
    const daysRemaining = daysInMonth - daysPassed;

    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const gastos = transacoes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0);

    const gastoProjetado = daysPassed > 0 ? (gastos / daysPassed) * daysInMonth : 0;
    const saldoProjetado = receitas - gastoProjetado;
    const gastoDiarioPermitido = daysRemaining > 0 ? Math.max(0, (receitas - gastos) / daysRemaining) : 0;

    const gastosPorCategoria: Record<string, number> = {};
    transacoes.filter(t => t.tipo === 'gasto').forEach(t => {
      gastosPorCategoria[t.categoria] = (gastosPorCategoria[t.categoria] || 0) + Number(t.valor);
    });

    const categoriasRisco = CATEGORIAS_GASTO
      .map(cat => {
        const gasto = gastosPorCategoria[cat] || 0;
        const limite = limites?.find(l => l.categoria === cat)?.limite_mensal || 0;
        if (limite === 0) return null;
        const projetado = daysPassed > 0 ? (gasto / daysPassed) * daysInMonth : 0;
        const risco = projetado / limite;
        return risco > 0.8 ? { categoria: cat, gasto, limite, projetado, risco } : null;
      })
      .filter(Boolean) as { categoria: string; gasto: number; limite: number; projetado: number; risco: number }[];

    let dica: { tipo: 'positivo' | 'apertado' | 'estourado'; texto: string };
    const percentualComprometido = receitas > 0 ? (gastoProjetado / receitas) * 100 : 0;

    if (percentualComprometido <= 70) {
      dica = { tipo: 'positivo', texto: 'Você está no caminho certo! Seus gastos estão controlados e há margem confortável até o fim do mês.' };
    } else if (percentualComprometido <= 100) {
      dica = { tipo: 'apertado', texto: `Atenção: projeção de ${percentualComprometido.toFixed(0)}% da receita comprometida. Reduza gastos nos próximos dias.` };
    } else {
      dica = { tipo: 'estourado', texto: 'Alerta: gastos projetados ultrapassam sua receita. Revise urgentemente suas despesas.' };
    }

    return { gastos, receitas, gastoProjetado, saldoProjetado, gastoDiarioPermitido, categoriasRisco, dica, daysPassed, daysInMonth, daysRemaining, percentualComprometido };
  }, [transacoes, limites]);

  if (loadingTx || loadingLim) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-24 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!projecao) return null;

  const dicaConfig = {
    positivo: { border: 'border-success/30 bg-success/5', icon: TrendingUp, color: 'text-success', label: 'Tudo certo!' },
    apertado: { border: 'border-warning/30 bg-warning/5', icon: AlertTriangle, color: 'text-warning', label: 'Atenção' },
    estourado: { border: 'border-destructive/30 bg-destructive/5', icon: TrendingDown, color: 'text-destructive', label: 'Alerta' },
  };

  const dc = dicaConfig[projecao.dica.tipo];
  const DicaIcon = dc.icon;

  // Progress bar for month
  const monthProgress = (projecao.daysPassed / projecao.daysInMonth) * 100;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Projeção</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Dia {projecao.daysPassed} de {projecao.daysInMonth} · {projecao.daysRemaining} dias restantes
        </p>
      </div>

      {/* Month progress */}
      <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-primary/60 transition-all"
          style={{ width: `${monthProgress}%` }}
        />
      </div>

      {/* Insight card */}
      <Card className={`p-4 border ${dc.border}`}>
        <div className="flex gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
            projecao.dica.tipo === 'positivo' ? 'bg-success/10' :
            projecao.dica.tipo === 'apertado' ? 'bg-warning/10' : 'bg-destructive/10'
          }`}>
            <DicaIcon className={`w-4 h-4 ${dc.color}`} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${dc.color} flex items-center gap-1.5`}>
              <Lightbulb className="w-3.5 h-3.5" /> {dc.label}
            </p>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{projecao.dica.texto}</p>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gasto projetado</span>
          </div>
          <p className="text-xl font-display font-bold text-destructive tracking-tight">
            {formatCurrency(projecao.gastoProjetado)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Atual: {formatCurrency(projecao.gastos)}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${projecao.saldoProjetado >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
              <Target className={`w-4 h-4 ${projecao.saldoProjetado >= 0 ? 'text-success' : 'text-destructive'}`} />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Saldo projetado</span>
          </div>
          <p className={`text-xl font-display font-bold tracking-tight ${projecao.saldoProjetado >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(projecao.saldoProjetado)}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diário permitido</span>
          </div>
          <p className="text-xl font-display font-bold text-primary tracking-tight">
            {formatCurrency(projecao.gastoDiarioPermitido)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            por dia nos próximos {projecao.daysRemaining}d
          </p>
        </Card>
      </div>

      {/* Risk categories */}
      {projecao.categoriasRisco.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Categorias com risco de estouro
          </h2>
          <div className="space-y-2">
            {projecao.categoriasRisco.map(c => {
              const percent = Math.min((c.gasto / c.limite) * 100, 100);
              return (
                <Card
                  key={c.categoria}
                  className="p-4 bg-card border-border animate-slide-up"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORIA_CORES[c.categoria] }} />
                      <span className="text-sm font-medium text-foreground">{c.categoria}</span>
                    </div>
                    <span className={`text-sm font-display font-bold ${c.risco > 1 ? 'text-destructive' : 'text-warning'}`}>
                      {(c.risco * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden mb-2">
                    <div
                      className={`absolute left-0 top-0 h-full rounded-full transition-all ${c.risco > 1 ? 'bg-destructive' : 'bg-warning'}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>Gasto: {formatCurrency(c.gasto)}</span>
                    <span>Limite: {formatCurrency(c.limite)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
