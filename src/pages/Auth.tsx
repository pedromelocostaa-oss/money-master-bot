import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, TrendingUp, ArrowRight, ArrowLeft, Bot, BarChart2 } from 'lucide-react';
import { PlmccWordmark } from '@/components/PlmccWordmark';

type Mode = 'login' | 'signup' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        toast.success('E-mail enviado! Verifique sua caixa de entrada.');
        setMode('login');
      } else if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Login realizado com sucesso!');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Conta criada! Verifique seu e-mail para confirmar.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Painel esquerdo — branding ── */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-center px-14 py-16 bg-card border-r border-border/60">

        {/* Logo */}
        <div className="mb-14">
          <PlmccWordmark size={52} color="#C46A1F" />
        </div>

        {/* Headline */}
        <h2 className="text-[28px] font-display font-bold text-foreground leading-snug tracking-tight mb-4">
          Suas finanças sob controle total
        </h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
          Importe faturas com IA, acompanhe gastos em tempo real e receba insights personalizados para seus objetivos financeiros.
        </p>

        {/* Feature list */}
        <div className="space-y-4">
          {[
            { icon: Bot,        text: 'Importação inteligente de faturas via IA' },
            { icon: BarChart2,  text: 'Dashboard com métricas e projeções em tempo real' },
            { icon: TrendingUp, text: 'Consultor financeiro personalizado' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <div className="w-[34px] h-[34px] rounded-[10px] bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Painel direito — formulário ── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[348px] animate-slide-up">

          {/* Logo mobile */}
          <div className="flex items-center justify-center mb-8 lg:hidden">
            <PlmccWordmark size={44} color="#C46A1F" />
          </div>

          {/* Voltar (modo forgot) */}
          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao login
            </button>
          )}

          <h2 className="text-[22px] font-display font-bold text-foreground tracking-tight mb-1">
            {mode === 'login'  ? 'Bem-vindo de volta'  :
             mode === 'signup' ? 'Criar conta'         : 'Recuperar senha'}
          </h2>
          <p className="text-sm text-muted-foreground mb-7">
            {mode === 'login'  ? 'Entre para acessar seu painel'        :
             mode === 'signup' ? 'Comece a controlar suas finanças'     :
             'Enviaremos um link de redefinição para seu e-mail'}
          </p>

          {/* Card do form */}
          <div className="bg-card rounded-xl shadow-apple-md p-6">
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* E-mail */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm text-foreground">
                  E-mail
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="
                    h-11 bg-muted border-0 rounded-[10px]
                    text-foreground placeholder:text-muted-foreground/50
                    focus-visible:ring-2 focus-visible:ring-primary/40
                    transition-all
                  "
                />
              </div>

              {/* Senha */}
              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm text-foreground">
                      Senha
                    </Label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs text-primary hover:opacity-80 transition-opacity"
                      >
                        Esqueci minha senha
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="
                      h-11 bg-muted border-0 rounded-[10px]
                      text-foreground placeholder:text-muted-foreground/50
                      focus-visible:ring-2 focus-visible:ring-primary/40
                      transition-all
                    "
                  />
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="
                  w-full h-11 rounded-[11px] mt-2
                  bg-primary hover:bg-primary/90
                  text-primary-foreground text-[15px] font-semibold
                  transition-all shadow-apple-sm
                "
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {mode === 'login'  ? 'Entrar'      :
                     mode === 'signup' ? 'Criar conta' : 'Enviar link'}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Toggle login/signup */}
          {mode !== 'forgot' && (
            <p className="text-sm text-muted-foreground text-center mt-5">
              {mode === 'login' ? 'Não tem conta? ' : 'Já tem conta? '}
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-primary font-semibold hover:opacity-80 transition-opacity"
              >
                {mode === 'login' ? 'Criar uma' : 'Entrar'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
