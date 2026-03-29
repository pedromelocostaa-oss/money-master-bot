import { CreditCard, CalendarClock } from 'lucide-react';

export function FaturaInfo() {
  const hoje = new Date();
  const dia = hoje.getDate();

  // Fechamento dia 2, pagamento dia 8
  // Compras do dia 3 ao dia 2 do próximo mês = fatura seguinte
  const isAntesDoFechamento = dia <= 2;

  const proximoFechamento = new Date(hoje.getFullYear(), hoje.getMonth() + (isAntesDoFechamento ? 0 : 1), 2);
  const proximoPagamento = new Date(hoje.getFullYear(), hoje.getMonth() + (isAntesDoFechamento ? 0 : 1), 8);

  const diasParaFechamento = Math.ceil((proximoFechamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  const diasParaPagamento = Math.ceil((proximoPagamento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

  const formatDia = (d: Date) =>
    d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl bg-secondary/60 border border-border">
      <CreditCard className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground mb-1.5">Cartão de crédito</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarClock className="w-3 h-3" />
            Fecha dia <strong className="text-foreground">2</strong>
            {diasParaFechamento >= 0 && (
              <span className="text-muted-foreground">
                ({formatDia(proximoFechamento)}{diasParaFechamento === 0 ? ' — hoje!' : `, em ${diasParaFechamento}d`})
              </span>
            )}
          </span>
          <span className="flex items-center gap-1">
            Paga dia <strong className="text-foreground">8</strong>
            {diasParaPagamento >= 0 && (
              <span className="text-muted-foreground">
                ({formatDia(proximoPagamento)}{diasParaPagamento === 0 ? ' — hoje!' : `, em ${diasParaPagamento}d`})
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
