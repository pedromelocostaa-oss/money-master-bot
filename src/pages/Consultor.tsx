import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Bot, User, Sparkles, Check, X, AlertTriangle, Plus, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';
import ReactMarkdown from 'react-markdown';

type Msg = {
  role: 'user' | 'assistant';
  content: string;
};

type PendingAction = {
  acao: 'criar' | 'deletar' | 'atualizar';
  ids: string[];
  transacao: Record<string, any> | null;
  mensagem: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-financeiro`;

async function sendToAI(messages: Msg[], action?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const resp = await fetch(CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages, action }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(err.error || `Erro ${resp.status}`);
  }

  return resp.json();
}

const actionIcon = {
  criar: <Plus className="w-4 h-4 text-success" />,
  deletar: <Trash2 className="w-4 h-4 text-destructive" />,
  atualizar: <Pencil className="w-4 h-4 text-blue-400" />,
};

const actionLabel = {
  criar: 'Criar lançamento',
  deletar: 'Excluir lançamento(s)',
  atualizar: 'Atualizar lançamento',
};

const actionColor = {
  criar: 'border-success/30 bg-success/5',
  deletar: 'border-destructive/30 bg-destructive/5',
  atualizar: 'border-blue-400/30 bg-blue-400/5',
};

export default function Consultor() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [executing, setExecuting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pendingAction]);

  const addAssistantMsg = (content: string) => {
    setMessages(prev => [...prev, { role: 'assistant', content }]);
  };

  const sendMessage = async (text: string, action?: string) => {
    const userMsg: Msg = { role: 'user', content: text };
    const newMessages = action ? [userMsg] : [...messages, userMsg];
    if (!action) setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setPendingAction(null);

    try {
      const result = await sendToAI(newMessages, action);

      if (result.type === 'action') {
        setPendingAction({
          acao: result.acao,
          ids: result.ids || [],
          transacao: result.transacao || null,
          mensagem: result.mensagem,
        });
      } else if (result.type === 'text') {
        addAssistantMsg(result.content);
      } else if (result.type === 'error') {
        addAssistantMsg(`❌ ${result.error}`);
      }
    } catch (err: any) {
      addAssistantMsg(`❌ ${err.message || 'Erro ao conectar com a IA'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const executeAction = async () => {
    if (!pendingAction || !user) return;
    setExecuting(true);

    try {
      const { acao, ids, transacao } = pendingAction;

      if (acao === 'deletar') {
        if (!ids.length) throw new Error('Nenhum ID informado para exclusão');
        const { error } = await supabase.from('transacoes').delete().in('id', ids);
        if (error) throw error;
        toast.success(`${ids.length} transação(ões) excluída(s)!`);
        addAssistantMsg(`✅ Pronto! ${ids.length} transação(ões) excluída(s) com sucesso.`);

      } else if (acao === 'criar') {
        if (!transacao) throw new Error('Dados da transação não informados');
        const { error } = await supabase.from('transacoes').insert({
          ...transacao,
          user_id: user.id,
        } as any);
        if (error) throw error;
        toast.success('Transação criada!');
        addAssistantMsg(`✅ Lançamento **${transacao.descricao}** (${formatCurrency(transacao.valor)}) criado com sucesso!`);

      } else if (acao === 'atualizar') {
        if (!ids.length || !transacao) throw new Error('ID ou dados não informados para atualização');
        const { error } = await supabase.from('transacoes').update(transacao as any).in('id', ids);
        if (error) throw error;
        toast.success('Transação atualizada!');
        addAssistantMsg(`✅ Lançamento atualizado com sucesso!`);
      }

      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-6meses'] });
      queryClient.invalidateQueries({ queryKey: ['saldos-contas'] });

    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar ação');
      addAssistantMsg(`❌ Erro ao executar: ${err.message}`);
    } finally {
      setExecuting(false);
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    setPendingAction(null);
    addAssistantMsg('Ok, ação cancelada. Posso ajudar com mais alguma coisa?');
  };

  const handleAnalyze = () => {
    setHasAnalyzed(true);
    sendMessage('Analise meus gastos e me dê um feedback completo.', 'analyze');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    if (!hasAnalyzed) setHasAnalyzed(true);
    sendMessage(input.trim());
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-5.5rem)] animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Consultor IA</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Analisa e gerencia seus lançamentos via chat</p>
        </div>
        {!hasAnalyzed && (
          <Button onClick={handleAnalyze} className="gap-1.5 shadow-glow" size="sm">
            <Sparkles className="w-3.5 h-3.5" />
            Analisar meus gastos
          </Button>
        )}
      </div>

      <Card className="flex-1 bg-card border-border flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          {messages.length === 0 && !isLoading && !pendingAction && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-display font-bold text-foreground mb-1">FinBot</h3>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
                Seu assistente financeiro. Analiso seus gastos, identifico duplicatas e gerencio seus lançamentos via chat.
              </p>
              <div className="flex flex-wrap gap-2 mt-6 justify-center">
                {[
                  { text: 'Analisar meus gastos', icon: '📊', action: 'analyze' },
                  { text: 'Apagar duplicatas de abril', icon: '🗑️' },
                  { text: 'Adicionar lançamento', icon: '➕' },
                  { text: 'Quais gastos estão duplicados?', icon: '🔍' },
                ].map(q => (
                  <button
                    key={q.text}
                    onClick={() => {
                      setHasAnalyzed(true);
                      sendMessage(q.text, q.action);
                    }}
                    className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent transition-all border border-transparent hover:border-border"
                  >
                    <span>{q.icon}</span>
                    {q.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-md'
                  : 'bg-secondary text-foreground rounded-bl-md'
              }`}>
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm prose-invert max-w-none [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>h1]:text-base [&>h2]:text-sm [&>h3]:text-sm [&>li]:text-muted-foreground">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-foreground" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {/* Confirmation card */}
          {pendingAction && !isLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className={`max-w-[85%] rounded-2xl rounded-bl-md border p-4 space-y-3 ${actionColor[pendingAction.acao]}`}>
                <div className="flex items-center gap-2">
                  {actionIcon[pendingAction.acao]}
                  <span className="text-sm font-semibold text-foreground">{actionLabel[pendingAction.acao]}</span>
                </div>

                <p className="text-sm text-foreground leading-relaxed">{pendingAction.mensagem}</p>

                {pendingAction.acao === 'criar' && pendingAction.transacao && (
                  <div className="bg-background/50 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                    <p><span className="text-foreground font-medium">Descrição:</span> {pendingAction.transacao.descricao}</p>
                    <p><span className="text-foreground font-medium">Valor:</span> {formatCurrency(pendingAction.transacao.valor)}</p>
                    <p><span className="text-foreground font-medium">Data:</span> {pendingAction.transacao.data}</p>
                    <p><span className="text-foreground font-medium">Categoria:</span> {pendingAction.transacao.categoria}</p>
                    {pendingAction.transacao.forma_pagamento && (
                      <p><span className="text-foreground font-medium">Pagamento:</span> {pendingAction.transacao.forma_pagamento}</p>
                    )}
                  </div>
                )}

                {pendingAction.acao === 'deletar' && pendingAction.ids.length > 0 && (
                  <p className="text-xs text-muted-foreground">{pendingAction.ids.length} transação(ões) serão excluídas permanentemente.</p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={executeAction}
                    disabled={executing}
                    className={`gap-1.5 ${pendingAction.acao === 'deletar' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
                  >
                    {executing ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    Confirmar
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelAction} disabled={executing} className="gap-1.5">
                    <X className="w-3.5 h-3.5" />
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-border flex gap-2 bg-card">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: apaga o posto duplicado de abril, adiciona Wizmartmg R$ 89,90 no dia 28/04..."
            className="bg-secondary border-border resize-none min-h-[42px] max-h-[100px] text-sm rounded-xl"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="shrink-0 h-[42px] w-[42px] rounded-xl">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
