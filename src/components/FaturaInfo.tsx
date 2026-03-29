import { CreditCard, CalendarClock, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

export function FaturaInfo() {
  const hoje = new Date();
  const dia = hoje.getDate();

  const isAntesDoFechamento = dia <= 2;
  const proximoFechamento = new Date(hoje.getFullYear(), hoje.getMonth() + (isAntesDoFechamento ? 0 : 1), 2);
  const proximoPagamento = new Date(hoje.getFullYear(), hoje.getMonth() + (isAntesDoFechamento ? 0 : 1), 8);
  const diasParaFechamento = Math.ceil((proximoFechamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  const diasParaPagamento = Math.ceil((proximoPagamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  const formatDia = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const isUrgent = diasParaFechamento <= 2;

  return (
    <Card className={`p-4 border ${isUrgent ? 'border-warning/30 bg-warning/5' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isUrgent ? 'bg-warning/10' : 'bg-primary/10'}`}>
          <CreditCard className={`w-4 h-4 ${isUrgent ? 'text-warning' : 'text-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">Cartão de crédito</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CalendarClock className="w-3 h-3" />
              Fecha <strong className="text-foreground font-medium">dia 2</strong>
              <span className="text-muted-foreground">
                · {diasParaFechamento === 0 ? 'hoje!' : `em ${diasParaFechamento}d`}
              </span>
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Vence <strong className="text-foreground font-medium">dia 8</strong>
              <span className="text-muted-foreground">
                · {diasParaPagamento === 0 ? 'hoje!' : `em ${diasParaPagamento}d`}
              </span>
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
