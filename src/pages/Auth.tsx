import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, TrendingUp, ArrowRight } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
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
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary/8 rounded-full blur-3xl" />
        
        <div className="relative z-10 px-12 max-w-md">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <TrendingUp className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">FinControl</h1>
          </div>
          
          <h2 className="text-2xl font-display font-semibold text-foreground mb-3">
            Suas finanças sob controle total
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Importe faturas com IA, acompanhe gastos em tempo real e receba insights personalizados para alcançar seus objetivos financeiros.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { emoji: '🤖', text: 'Importação inteligente de faturas' },
              { emoji: '📊', text: 'Dashboard com projeções em tempo real' },
              { emoji: '💬', text: 'Consultor financeiro com IA' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="text-lg">{item.emoji}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">FinControl</h1>
          </div>

          <div className="bg-card border border-border rounded-2xl p-7 shadow-xl shadow-black/10">
            <h2 className="text-xl font-display font-bold text-foreground mb-1">
              {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isLogin ? 'Entre para acessar seu painel' : 'Comece a controlar suas finanças'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground text-sm">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-secondary border-border h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground text-sm">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-secondary border-border h-11"
                />
              </div>

              <Button type="submit" className="w-full h-11 font-medium" disabled={loading}>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isLogin ? 'Entrar' : 'Criar conta'}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
                <span className="font-medium text-foreground hover:text-primary">
                  {isLogin ? 'Criar uma' : 'Entrar'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
