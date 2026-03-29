import { useMemo } from 'react';
import { useTransacoesMesAtual, useLimites } from '@/hooks/useFinancas';
import { CATEGORIAS_GASTO, CATEGORIA_CORES } from '@/lib/constants';
import { formatCurrency } from '@/lib/formatters';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, Calendar, Target } from 'lucide-react';

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

    // Categorias com risco de estouro
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

    // Dica contextual
    let dica: { tipo: 'positivo' | 'apertado' | 'estourado'; texto: string };
    const percentualComprometido = receitas > 0 ? (gastoProjetado / receitas) * 100 : 0;

    if (percentualComprometido <= 70) {
      dica = {
        tipo: 'positivo',
        texto: 'Você está no caminho certo! Seus gastos estão controlados e há margem confortável até o fim do mês.',
      };
    } else if (percentualComprometido <= 100) {
      dica = {
        tipo: 'apertado',
        texto: `Atenção: sua projeção indica que ${percentualComprometido.toFixed(0)}% da receita será comprometida. Tente reduzir gastos nos próximos dias.`,
      };
    } else {
      dica = {
        tipo: 'estourado',
        texto: 'Alerta: seus gastos projetados ultrapassam sua receita. Revise urgentemente suas despesas para evitar endividamento.',
      };
    }

    return {
      gastos,
      receitas,
      gastoProjetado,
      saldoProjetado,
      gastoDiarioPermitido,
      categoriasRisco,
      dica,
      daysPassed,
      daysInMonth,
      daysRemaining,
    };
  }, [transacoes, limites]);

  if (loadingTx || loadingLim) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Projeção</h1>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!projecao) return null;

  const dicaColors = {
    positivo: 'border-success/30 bg-success/5',
    apertado: 'border-warning/30 bg-warning/5',
    estourado: 'border-destructive/30 bg-destructive/5',
  };

  const dicaIcons = {
    positivo: TrendingUp,
    apertado: AlertTriangle,
    estourado: TrendingDown,
  };

  const DicaIcon = dicaIcons[projecao.dica.tipo];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Projeção</h1>
      <p className="text-sm text-muted-foreground">
        Baseado nos {projecao.daysPassed} dias já decorridos de {projecao.daysInMonth} neste mês.
      </p>

      {/* Dica contextual */}
      <Card className={`p-4 border ${dicaColors[projecao.dica.tipo]}`}>
        <div className="flex gap-3">
          <DicaIcon className={`w-5 h-5 shrink-0 mt-0.5 ${
            projecao.dica.tipo === 'positivo' ? 'text-success' :
            projecao.dica.tipo === 'apertado' ? 'text-warning' : 'text-destructive'
          }`} />
          <div>
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Dica
            </p>
            <p className="text-sm text-muted-foreground mt-1">{projecao.dica.texto}</p>
          </div>
        </div>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-destructive" />
            <span className="text-sm text-muted-foreground">Gasto projetado</span>
          </div>
          <p className="text-xl font-display font-bold text-destructive">
            {formatCurrency(projecao.gastoProjetado)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Gasto atual: {formatCurrency(projecao.gastos)}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-foreground" />
            <span className="text-sm text-muted-foreground">Saldo projetado</span>
          </div>
          <p className={`text-xl font-display font-bold ${projecao.saldoProjetado >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(projecao.saldoProjetado)}
          </p>
        </Card>

        <Card className="p-4 bg-card border-border animate-slide-up">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Gasto diário permitido</span>
          </div>
          <p className="text-xl font-display font-bold text-primary">
            {formatCurrency(projecao.gastoDiarioPermitido)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {projecao.daysRemaining} dias restantes
          </p>
        </Card>
      </div>

      {/* Categorias com risco */}
      {projecao.categoriasRisco.length > 0 && (
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Categorias com risco de estouro
          </h2>
          <div className="space-y-3">
            {projecao.categoriasRisco.map(c => (
              <Card key={c.categoria} className="p-4 bg-card border-border border-l-2 animate-slide-up" style={{ borderLeftColor: CATEGORIA_CORES[c.categoria] }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.categoria}</p>
                    <p className="text-xs text-muted-foreground">
                      Gasto atual: {formatCurrency(c.gasto)} · Projetado: {formatCurrency(c.projetado)} · Limite: {formatCurrency(c.limite)}
                    </p>
                  </div>
                  <span className={`text-sm font-display font-bold ${c.risco > 1 ? 'text-destructive' : 'text-warning'}`}>
                    {(c.risco * 100).toFixed(0)}%
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
