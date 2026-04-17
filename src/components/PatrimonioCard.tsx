import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useSaldosContas } from '@/hooks/useContas';
import { formatCurrency } from '@/lib/formatters';
import { Wallet, ChevronDown, Briefcase, User } from 'lucide-react';

export default function PatrimonioCard() {
  const { data: saldos, isLoading } = useSaldosContas();
  const [expanded, setExpanded] = useState(false);

  const total = saldos?.reduce((s, c) => s + c.saldo_atual, 0) || 0;

  if (isLoading) {
    return <Card className="p-5 bg-card border-border h-32 animate-pulse" />;
  }

  return (
    <Card className="p-3 bg-card border-border animate-slide-up">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Wallet className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">
              Patrimônio total
            </p>
            <p className={`text-base md:text-lg font-display font-bold tracking-tight tabular-nums leading-tight ${total >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {formatCurrency(total)}
            </p>
          </div>
        </div>

        {saldos && saldos.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-accent shrink-0"
          >
            {expanded ? 'Recolher' : `${saldos.length} contas`}
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {saldos && saldos.length > 0 && (
        <>
          {/* Resumo compacto */}
          {!expanded && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border">
              {saldos.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center gap-1.5 text-xs">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: c.cor || 'hsl(var(--muted-foreground))' }}
                  />
                  <span className="text-muted-foreground">{c.nome}</span>
                  <span className={`font-medium tabular-nums ${c.saldo_atual >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                    {formatCurrency(c.saldo_atual)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Lista expandida */}
          {expanded && (
            <div className="mt-3 pt-3 border-t border-border space-y-2 animate-fade-in">
              {saldos.map(c => {
                const Icon = c.tipo === 'pj' ? Briefcase : User;
                return (
                  <div key={c.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${c.cor || '#6B7280'}20` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color: c.cor || '#6B7280' }} />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{c.nome}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {c.tipo === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-display font-bold tabular-nums ${c.saldo_atual >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                      {formatCurrency(c.saldo_atual)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setExpanded(v => !v)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            {expanded ? 'Recolher' : `Ver todas as contas (${saldos.length})`}
            <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </>
      )}
    </Card>
  );
}
