import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useSaldosContas } from '@/hooks/useContas';
import { useHideValues } from '@/hooks/useHideValues';
import { formatCurrency } from '@/lib/formatters';
import { Wallet, ChevronDown, Briefcase, User } from 'lucide-react';

export default function PatrimonioCard() {
  const { data: saldos, isLoading } = useSaldosContas();
  const { mask } = useHideValues();
  const [expanded, setExpanded] = useState(false);

  const total = saldos?.reduce((s, c) => s + c.saldo_atual, 0) || 0;

  if (isLoading) {
    return <Card className="p-5 bg-card border-border h-32 animate-pulse" />;
  }

  return (
    <div className="animate-slide-up">
      <div className="rounded-2xl p-6 bg-gradient-to-br from-primary to-[#5AC8FA] shadow-[0_4px_20px_rgba(0,122,255,0.25)] flex items-center justify-between">
        <div>
          <p className="text-sm text-white/70 font-medium mb-2">Patrimônio Total</p>
          <p className="text-[32px] font-bold text-white tracking-tight leading-none">
            {mask(formatCurrency(total))}
          </p>
          <p className="text-xs text-white/60 mt-1.5">{saldos?.length || 0} contas ativas</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-[18px] bg-white/20 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          {saldos && saldos.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-[11px] text-white/70 hover:text-white transition-colors"
            >
              {expanded ? 'Recolher' : 'Detalhes'}
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {expanded && saldos && saldos.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/20 space-y-1.5 animate-fade-in">
          {saldos.map(c => {
            const Icon = c.tipo === 'pj' ? Briefcase : User;
            return (
              <div key={c.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${c.cor || '#6B7280'}20` }}
                  >
                    <Icon className="w-3 h-3" style={{ color: c.cor || '#6B7280' }} />
                  </div>
                  <span className="text-xs text-white/80 truncate">{c.nome}</span>
                </div>
                <span className={`text-xs font-medium tabular-nums shrink-0 ${c.saldo_atual >= 0 ? 'text-white' : 'text-red-200'}`}>
                  {mask(formatCurrency(c.saldo_atual))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
