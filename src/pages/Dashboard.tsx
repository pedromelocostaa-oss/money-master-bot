import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransacoes } from '@/hooks/useFinancas';
import { formatCurrency } from '@/lib/formatters';
import { CATEGORIA_CORES } from '@/lib/constants';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { FaturaInfo } from '@/components/FaturaInfo';
import PatrimonioCard from '@/components/PatrimonioCard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Transacao } from '@/hooks/useFinancas';

type ViewMode = 'range' | 'month';
type RangeOption = '3m' | '6m' | '1y';

function MetricCard({ title, value, icon: Icon, variant, subtitle, onClick }: {
  title: string;
  value: string;
  icon: any;
  variant: 'success' | 'destructive' | 'default' | 'warning';
  subtitle?: string;
  onClick?: () => void;
}) {
  const styles = {
    success: { text: 'text-success', bg: 'bg-success/10', icon: 'text-success' },
    destructive: { text: 'text-destructive', bg: 'bg-destructive/10', icon: 'text-destructive' },
    default: { text: 'text-foreground', bg: 'bg-muted', icon: 'text-muted-foreground' },
    warning: { text: 'text-warning', bg: 'bg-warning/10', icon: 'text-warning' },
  };
  const s = styles[variant];

  return (
    <Card
      className={`p-4 bg-card border-border animate-slide-up hover:border-border/80 transition-colors ${onClick ? 'cursor-pointer hover:bg-accent/30' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${s.icon}`} />
        </div>
      </div>
      <p className={`text-xl md:text-2xl font-display font-bold ${s.text} tracking-tight`}>
        {value}
      </p>
      {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-popover border border-border rounded-xl p-3 shadow-2xl shadow-black/20">
      <p className="text-xs font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs flex items-center gap-1.5" style={{ color: entry.color }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
};

// No external labels — we use a legend list below the chart

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
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [rangeOption, setRangeOption] = useState<RangeOption>('6m');

  const now = new Date();
  const [selectedMes, setSelectedMes] = useState(now.getMonth());
  const [selectedAno, setSelectedAno] = useState(now.getFullYear());

  const rangeMonths = rangeOption === '3m' ? 3 : rangeOption === '6m' ? 6 : 12;
  const { data: rangeData, isLoading: loadingRange } = useTransacoesRange(rangeMonths);
  const { data: monthData, isLoading: loadingMonth } = useTransacoes(selectedMes, selectedAno);

  const activeData = viewMode === 'range' ? rangeData : monthData;
  const isLoading = viewMode === 'range' ? loadingRange : loadingMonth;

  const navigateMonth = (dir: number) => {
    let m = selectedMes + dir;
    let y = selectedAno;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setSelectedMes(m);
    setSelectedAno(y);
  };

  const metrics = useMemo(() => {
    if (!activeData) return { receitas: 0, gastos: 0, saldo: 0, percentual: 0 };
    let data: Transacao[];
    if (viewMode === 'month') {
      data = activeData;
    } else {
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
  }, [activeData, viewMode]);

  const barData = useMemo(() => {
    if (!activeData) return [];
    if (viewMode === 'month') {
      const weeks: Record<string, { receitas: number; gastos: number; label: string }> = {};
      const daysInMonth = new Date(selectedAno, selectedMes + 1, 0).getDate();
      for (let w = 0; w < 5; w++) {
        const startDay = w * 7 + 1;
        const endDay = Math.min(startDay + 6, daysInMonth);
        if (startDay > daysInMonth) break;
        weeks[`w${w}`] = { receitas: 0, gastos: 0, label: `${startDay}-${endDay}` };
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
    const months: Record<string, { receitas: number; gastos: number; label: string }> = {};
    for (let i = rangeMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const monthName = format(d, 'MMM', { locale: ptBR });
      months[key] = { receitas: 0, gastos: 0, label: monthName.charAt(0).toUpperCase() + monthName.slice(1) };
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

  const metricsLabel = viewMode === 'month'
    ? monthOptions.find(m => m.value === selectedMes)?.label + ` ${selectedAno}`
    : 'Mês atual';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            <CalendarRange className="w-3 h-3" />
            {metricsLabel}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View mode toggle */}
          <div className="flex bg-secondary rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'month'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Mês a mês
            </button>
            <button
              onClick={() => setViewMode('range')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'range'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Histórico
            </button>
          </div>

          {viewMode === 'range' && (
            <div className="flex bg-secondary rounded-lg p-1">
              {(['3m', '6m', '1y'] as RangeOption[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => setRangeOption(opt)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <Select value={String(selectedMes)} onValueChange={(v) => setSelectedMes(Number(v))}>
                <SelectTrigger className="w-28 bg-secondary border-border h-8 text-xs">
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
              <button
                onClick={() => navigateMonth(1)}
                className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Patrimônio total (todas as contas) */}
      <PatrimonioCard />

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          title="Receitas"
          value={formatCurrency(metrics.receitas)}
          icon={ArrowUpRight}
          variant="success"
          onClick={() => navigate(`/lancamentos?mes=${selectedMes}&ano=${selectedAno}&tipo=receita`)}
        />
        <MetricCard
          title="Gastos"
          value={formatCurrency(metrics.gastos)}
          icon={ArrowDownRight}
          variant="destructive"
          onClick={() => navigate(`/lancamentos?mes=${selectedMes}&ano=${selectedAno}&tipo=gasto`)}
        />
        <MetricCard
          title="Resultado do mês"
          value={formatCurrency(metrics.saldo)}
          icon={Wallet}
          variant={metrics.saldo >= 0 ? 'success' : 'destructive'}
          subtitle={metrics.saldo >= 0 ? 'Receitas − gastos (positivo)' : 'Receitas − gastos (negativo)'}
        />
        <MetricCard
          title="Comprometido"
          value={`${metrics.percentual.toFixed(1)}%`}
          icon={TrendingUp}
          variant={metrics.percentual > 90 ? 'destructive' : metrics.percentual > 70 ? 'warning' : 'default'}
          subtitle={`da receita usada`}
        />
      </div>

      {/* Fatura info */}
      <FaturaInfo />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 bg-card border-border">
          <h3 className="text-sm font-semibold text-foreground mb-1">
            {viewMode === 'month' ? 'Receitas vs Gastos' : 'Evolução'}
          </h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            {viewMode === 'month' ? 'Por semana' : `Últimos ${rangeOption === '3m' ? '3 meses' : rangeOption === '6m' ? '6 meses' : '12 meses'}`}
          </p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 12% 20%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'hsl(215 15% 68%)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(215 15% 68%)', fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(225 12% 14%)' }} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              <Bar dataKey="receitas" name="Receitas" fill="hsl(160 64% 44%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="hsl(0 72% 56%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5 bg-card border-border">
          <h3 className="text-sm font-semibold text-foreground mb-1">Gastos por categoria</h3>
          <p className="text-[11px] text-muted-foreground mb-4">
            {viewMode === 'month' ? monthOptions.find(m => m.value === selectedMes)?.label : 'Mês atual'}
          </p>
          {donutData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
              <Wallet className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Sem gastos neste período</p>
            </div>
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                  >
                    {donutData.map((entry) => (
                      <Cell key={entry.name} fill={CATEGORIA_CORES[entry.name] || '#6B7280'} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const entry = payload[0];
                      const color = entry.payload?.fill || 'hsl(210 25% 95%)';
                      return (
                        <div className="bg-popover border border-border rounded-xl p-3 shadow-2xl shadow-black/20">
                          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color }}>
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            {entry.name}: {formatCurrency(entry.value as number)}
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend list */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-3 px-1">
                {donutData.map((entry) => {
                  const total = donutData.reduce((s, e) => s + e.value, 0);
                  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
                  return (
                    <div key={entry.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: CATEGORIA_CORES[entry.name] || '#6B7280' }} />
                      <span className="text-muted-foreground truncate flex-1">{entry.name}</span>
                      <span className="text-foreground font-medium tabular-nums">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
