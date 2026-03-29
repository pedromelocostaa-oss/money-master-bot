import { useMemo } from 'react';
import { useTransacoesMesAtual, useTransacoes6Meses, useLimites } from '@/hooks/useFinancas';
import { formatCurrency, formatMonthYear } from '@/lib/formatters';
import { CATEGORIA_CORES } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Percent } from 'lucide-react';

function MetricCard({ title, value, icon: Icon, variant }: {
  title: string;
  value: string;
  icon: any;
  variant: 'success' | 'destructive' | 'default' | 'warning';
}) {
  const colorMap = {
    success: 'text-success',
    destructive: 'text-destructive',
    default: 'text-foreground',
    warning: 'text-warning',
  };

  return (
    <Card className="p-4 md:p-5 bg-card border-border animate-slide-up">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <Icon className={`w-4 h-4 ${colorMap[variant]}`} />
      </div>
      <p className={`text-xl md:text-2xl font-display font-bold ${colorMap[variant]}`}>
        {value}
      </p>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { data: transacoes, isLoading } = useTransacoesMesAtual();
  const { data: transacoes6m } = useTransacoes6Meses();

  const metrics = useMemo(() => {
    if (!transacoes) return { receitas: 0, gastos: 0, saldo: 0, percentual: 0 };
    const receitas = transacoes.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const gastos = transacoes.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0);
    return {
      receitas,
      gastos,
      saldo: receitas - gastos,
      percentual: receitas > 0 ? (gastos / receitas) * 100 : 0,
    };
  }, [transacoes]);

  const barData = useMemo(() => {
    if (!transacoes6m) return [];
    const months: Record<string, { receitas: number; gastos: number; label: string }> = {};
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      months[key] = {
        receitas: 0,
        gastos: 0,
        label: formatMonthYear(d).split(' ')[0].slice(0, 3).charAt(0).toUpperCase() +
               formatMonthYear(d).split(' ')[0].slice(0, 3).slice(1),
      };
    }

    transacoes6m.forEach(t => {
      const d = new Date(t.data);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (months[key]) {
        if (t.tipo === 'receita') months[key].receitas += Number(t.valor);
        else months[key].gastos += Number(t.valor);
      }
    });

    return Object.values(months);
  }, [transacoes6m]);

  const donutData = useMemo(() => {
    if (!transacoes) return [];
    const cats: Record<string, number> = {};
    transacoes.filter(t => t.tipo === 'gasto').forEach(t => {
      cats[t.categoria] = (cats[t.categoria] || 0) + Number(t.valor);
    });
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [transacoes]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Receitas" value={formatCurrency(metrics.receitas)} icon={ArrowUpRight} variant="success" />
        <MetricCard title="Gastos" value={formatCurrency(metrics.gastos)} icon={ArrowDownRight} variant="destructive" />
        <MetricCard title="Saldo" value={formatCurrency(metrics.saldo)} icon={Wallet} variant={metrics.saldo >= 0 ? 'success' : 'destructive'} />
        <MetricCard title="Comprometido" value={`${metrics.percentual.toFixed(1)}%`} icon={Percent} variant={metrics.percentual > 90 ? 'destructive' : metrics.percentual > 70 ? 'warning' : 'default'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 md:p-5 bg-card border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Receitas vs Gastos (6 meses)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" />
              <XAxis dataKey="label" tick={{ fill: 'hsl(215 12% 52%)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'hsl(215 12% 52%)', fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(160 64% 40%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 md:p-5 bg-card border-border">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Gastos por categoria</h3>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
              Sem gastos neste mês
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry) => (
                    <Cell key={entry.name} fill={CATEGORIA_CORES[entry.name] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: 'hsl(220 18% 12%)',
                    border: '1px solid hsl(220 14% 16%)',
                    borderRadius: '8px',
                    color: 'hsl(210 20% 92%)',
                  }}
                />
                <Legend
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
