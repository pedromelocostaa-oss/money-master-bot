import { useState, useMemo } from 'react';
import { useTransacoes } from '@/hooks/useFinancas';
import { formatCurrency, formatMonthYear } from '@/lib/formatters';
import { CATEGORIA_CORES } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, Percent, CalendarRange } from 'lucide-react';
import { FaturaInfo } from '@/components/FaturaInfo';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transacao } from '@/hooks/useFinancas';

type ViewMode = 'range' | 'month';
type RangeOption = '3m' | '6m' | '1y';

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
    <Card className="p-4 bg-card border-border animate-slide-up">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-muted-foreground">{title}</span>
        <Icon className={`w-4 h-4 ${colorMap[variant]}`} />
      </div>
      <p className={`text-lg md:text-xl font-display font-bold ${colorMap[variant]}`}>
        {value}
      </p>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-popover border border-border rounded-lg p-3 shadow-xl">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

function useTransacoesRange(months: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['transacoes-range', user?.id, months],
    queryFn: async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
      const start = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('transacoes')
        .select('*')
        .gte('data', start)
        .order('data', { ascending: true });

      if (error) throw error;
      return data as Transacao[];
    },
    enabled: !!user,
  });
}

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('range');
  const [rangeOption, setRangeOption] = useState<RangeOption>('6m');

  // Month-by-month controls
  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth());
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());

  const rangeMonths = rangeOption === '3m' ? 3 : rangeOption === '6m' ? 6 : 12;
  const { data: rangeData, isLoading: loadingRange } = useTransacoesRange(rangeMonths);
  const { data: monthData, isLoading: loadingMonth } = useTransacoes(selectedMes, selectedAno);

  const activeData = viewMode === 'range' ? rangeData : monthData;
  const isLoading = viewMode === 'range' ? loadingRange : loadingMonth;

  // Metrics for the current view
  const metrics = useMemo(() => {
    if (!activeData) return { receitas: 0, gastos: 0, saldo: 0, percentual: 0 };

    let data: Transacao[];
    if (viewMode === 'month') {
      data = activeData;
    } else {
      // For range mode, show current month metrics
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      data = activeData.filter(t => t.data.startsWith(thisMonth));
    }

    const receitas = data.filter(t => t.tipo === 'receita').reduce((s, t) => s + Number(t.valor), 0);
    const gastos = data.filter(t => t.tipo === 'gasto').reduce((s, t) => s + Number(t.valor), 0);
    return {
      receitas,
      gastos,
      saldo: receitas - gastos,
      percentual: receitas > 0 ? (gastos / receitas) * 100 : 0,
    };
  }, [activeData, viewMode, selectedMes, selectedAno]);

  // Bar chart data
  const barData = useMemo(() => {
    if (!activeData) return [];

    if (viewMode === 'month') {
      // Group by week for single month view
      const weeks: Record<string, { receitas: number; gastos: number; label: string }> = {};
      const daysInMonth = new Date(selectedAno, selectedMes + 1, 0).getDate();

      for (let w = 0; w < 5; w++) {
        const startDay = w * 7 + 1;
        const endDay = Math.min(startDay + 6, daysInMonth);
        if (startDay > daysInMonth) break;
        weeks[`w${w}`] = {
          receitas: 0,
          gastos: 0,
          label: `${startDay}-${endDay}`,
        };
      }

      activeData.forEach(t => {
        const day = new Date(t.data + 'T12:00:00').getDate();
        const weekIdx = Math.min(Math.floor((day - 1) / 7), 4);
        const key = `w${weekIdx}`;
        if (weeks[key]) {
          if (t.tipo === 'receita') weeks[key].receitas += Number(t.valor);
          else weeks[key].gastos += Number(t.valor);
        }
      });

      return Object.values(weeks);
    }

    // Range mode - group by month
    const months: Record<string, { receitas: number; gastos: number; label: string }> = {};

    for (let i = rangeMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const monthName = format(d, 'MMM', { locale: ptBR });
      months[key] = {
        receitas: 0,
        gastos: 0,
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      };
    }

    activeData.forEach(t => {
      const d = new Date(t.data + 'T12:00:00');
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (months[key]) {
        if (t.tipo === 'receita') months[key].receitas += Number(t.valor);
        else months[key].gastos += Number(t.valor);
      }
    });

    return Object.values(months);
  }, [activeData, viewMode, rangeMonths, selectedMes, selectedAno]);

  // Donut data
  const donutData = useMemo(() => {
    if (!activeData) return [];

    let data: Transacao[];
    if (viewMode === 'month') {
      data = activeData;
    } else {
      const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      data = activeData.filter(t => t.data.startsWith(thisMonth));
    }

    const cats: Record<string, number> = {};
    data.filter(t => t.tipo === 'gasto').forEach(t => {
      cats[t.categoria] = (cats[t.categoria] || 0) + Number(t.valor);
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [activeData, viewMode, selectedMes, selectedAno]);

  const monthOptions = useMemo(() => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(selectedAno, i, 1);
      const label = format(d, 'MMMM', { locale: ptBR });
      options.push({ value: i, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }, [selectedAno]);

  // Get the label for the metrics section
  const metricsLabel = viewMode === 'month'
    ? monthOptions.find(m => m.value === selectedMes)?.label + ` ${selectedAno}`
    : 'Mês atual';

  if (isLoading) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>

        {/* View mode controls */}
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('range')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'range'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Histórico
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mês a mês
            </button>
          </div>

          {viewMode === 'range' && (
            <div className="flex bg-secondary rounded-lg p-0.5">
              {(['3m', '6m', '1y'] as RangeOption[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setRangeOption(opt)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    rangeOption === opt
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {opt === '3m' ? '3M' : opt === '6m' ? '6M' : '1A'}
                </button>
              ))}
            </div>
          )}

          {viewMode === 'month' && (
            <div className="flex gap-1.5">
              <Select value={String(selectedMes)} onValueChange={(v) => setSelectedMes(Number(v))}>
                <SelectTrigger className="w-32 bg-secondary border-border h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(selectedAno)} onValueChange={(v) => setSelectedAno(Number(v))}>
                <SelectTrigger className="w-20 bg-secondary border-border h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div>
        <p className="text-xs text-muted-foreground mb-2.5 flex items-center gap-1.5">
          <CalendarRange className="w-3 h-3" />
          {metricsLabel}
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard title="Receitas" value={formatCurrency(metrics.receitas)} icon={ArrowUpRight} variant="success" />
          <MetricCard title="Gastos" value={formatCurrency(metrics.gastos)} icon={ArrowDownRight} variant="destructive" />
          <MetricCard title="Saldo" value={formatCurrency(metrics.saldo)} icon={Wallet} variant={metrics.saldo >= 0 ? 'success' : 'destructive'} />
          <MetricCard title="Comprometido" value={`${metrics.percentual.toFixed(1)}%`} icon={Percent} variant={metrics.percentual > 90 ? 'destructive' : metrics.percentual > 70 ? 'warning' : 'default'} />
        </div>
      </div>

      {/* Fatura info */}
      <FaturaInfo />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 bg-card border-border">
          <h3 className="text-xs font-medium text-muted-foreground mb-4">
            {viewMode === 'month' ? 'Receitas vs Gastos (por semana)' : `Receitas vs Gastos (${rangeOption === '3m' ? '3 meses' : rangeOption === '6m' ? '6 meses' : '1 ano'})`}
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 14% 16%)" />
              <XAxis dataKey="label" tick={{ fill: 'hsl(215 12% 52%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(215 12% 52%)', fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(160 64% 40%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="hsl(0 72% 51%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4 bg-card border-border">
          <h3 className="text-xs font-medium text-muted-foreground mb-4">
            Gastos por categoria {viewMode === 'month' ? '' : '(mês atual)'}
          </h3>
          {donutData.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">
              Sem gastos neste período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
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
                    fontSize: '12px',
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
