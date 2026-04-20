import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, BarChart2, Upload, MessageSquare, CreditCard, Target, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'mmb-tour-done';

const steps = [
  {
    icon: BarChart2,
    title: 'Bem-vindo ao FinControl!',
    description: 'Seu painel financeiro pessoal. Veja receitas, gastos e tendências do mês em um único lugar.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Upload,
    title: 'Importe sua fatura com IA',
    description: 'Vá em Lançamentos → Importar. Cole o texto da sua fatura e a IA categoriza tudo automaticamente.',
    color: 'bg-blue-500/10 text-blue-400',
  },
  {
    icon: CreditCard,
    title: 'Cadastre suas contas e cartões',
    description: 'Em Contas, adicione seu banco e cartões de crédito. Assim seus lançamentos ficam organizados por origem.',
    color: 'bg-emerald-500/10 text-emerald-400',
  },
  {
    icon: Target,
    title: 'Defina limites por categoria',
    description: 'Em Categorias, configure limites mensais (Alimentação, Lazer...). Receba alertas antes de ultrapassar.',
    color: 'bg-amber-500/10 text-amber-400',
  },
  {
    icon: MessageSquare,
    title: 'Consultor financeiro com IA',
    description: 'Acesse o Chat para perguntas como "Onde estou gastando mais?" ou "Como posso economizar este mês?".',
    color: 'bg-purple-500/10 text-purple-400',
  },
];

export function OnboardingTour() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(s => s + 1);
    } else {
      close();
    }
  };

  if (!visible) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl shadow-black/30 p-6 animate-scale-in">
        {/* Close */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step dots */}
        <div className="flex gap-1.5 mb-5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'bg-primary w-6' : i < step ? 'bg-primary/40 w-3' : 'bg-muted w-3'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl ${current.color} flex items-center justify-center mb-4`}>
          <Icon className="w-7 h-7" />
        </div>

        {/* Content */}
        <h2 className="text-lg font-display font-bold text-foreground mb-2">{current.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-6">{current.description}</p>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={close}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Pular tour
          </button>
          <Button onClick={next} size="sm" className="gap-1.5">
            {step < steps.length - 1 ? (
              <>Próximo <ChevronRight className="w-3.5 h-3.5" /></>
            ) : (
              'Começar!'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
