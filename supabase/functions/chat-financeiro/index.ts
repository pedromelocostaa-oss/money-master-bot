import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, action } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch last 6 months of transactions WITH IDs so AI can reference them
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: transacoes } = await supabase
      .from("transacoes")
      .select("*")
      .gte("data", startDate)
      .order("data", { ascending: false })
      .limit(500);

    const txList = (transacoes || []);
    const resumo = buildFinancialSummary(txList);
    const txDetalhes = buildTransactionList(txList);

    const systemPrompt = `Você é o FinBot, assistente financeiro pessoal do usuário. Você pode analisar as finanças E gerenciar lançamentos diretamente.

DADOS FINANCEIROS (últimos 6 meses):
${resumo}

LISTA COMPLETA DE TRANSAÇÕES (com IDs para referência):
${txDetalhes}

CAPACIDADES:
- Analisar padrões de gastos e dar conselhos financeiros
- CRIAR novas transações
- DELETAR transações (inclusive duplicatas)
- ATUALIZAR transações existentes

COMO USAR AS FERRAMENTAS:
- Quando o usuário pedir para criar/deletar/atualizar, use a ferramenta "gerenciar_transacoes"
- Para deletar duplicatas, identifique os IDs duplicados e use a ferramenta com acao="deletar"
- Para criar, preencha todos os campos da transação
- A ferramenta retorna uma confirmação para o usuário aprovar antes de executar
- SEMPRE inclua uma mensagem clara explicando o que será feito

REGRAS:
- Responda sempre em português brasileiro
- Use R$ para valores
- Seja direto e prático
- Quando for executar ações, explique o que está fazendo
- Se não tiver certeza de qual transação deletar, pergunte mais detalhes
- Categorias válidas para gastos: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Vestuário, Assinaturas, Outros
- Categorias válidas para receitas: Salário, Freelance, Investimentos, Outros
- Formas de pagamento: Cartão de crédito, Débito, Pix, Dinheiro

${action === 'analyze' ? 'Faça uma análise completa e detalhada dos gastos, identificando padrões, pontos de atenção e sugestões práticas.' : ''}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "gerenciar_transacoes",
          description: "Cria, deleta ou atualiza transações financeiras do usuário. Use quando o usuário pedir para adicionar, remover ou editar lançamentos.",
          parameters: {
            type: "object",
            properties: {
              acao: {
                type: "string",
                enum: ["criar", "deletar", "atualizar"],
                description: "Tipo de operação a realizar"
              },
              ids: {
                type: "array",
                items: { type: "string" },
                description: "IDs das transações a deletar ou atualizar (obrigatório para deletar/atualizar)"
              },
              transacao: {
                type: "object",
                description: "Dados da transação para criar ou os campos a atualizar",
                properties: {
                  descricao: { type: "string" },
                  valor: { type: "number" },
                  data: { type: "string", description: "Formato YYYY-MM-DD" },
                  tipo: { type: "string", enum: ["gasto", "receita"] },
                  categoria: { type: "string" },
                  forma_pagamento: { type: "string", nullable: true }
                }
              },
              mensagem: {
                type: "string",
                description: "Mensagem clara para mostrar ao usuário explicando o que será feito, ex: 'Excluir 2 lançamentos duplicados do Posto de Combustíveis (R$ 150,00 cada) dos dias 05/04'"
              }
            },
            required: ["acao", "mensagem"]
          }
        }
      }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      if (response.status === 429) {
        return new Response(JSON.stringify({ type: "error", error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ type: "error", error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + response.status);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    // Check if AI wants to perform an action
    if (message?.tool_calls?.length > 0) {
      const toolCall = message.tool_calls[0];
      let args: any;
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        throw new Error("Erro ao processar ação da IA");
      }

      return new Response(JSON.stringify({
        type: "action",
        acao: args.acao,
        ids: args.ids || [],
        transacao: args.transacao || null,
        mensagem: args.mensagem || "Confirmar operação?",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Regular text response
    const content = message?.content || "";
    return new Response(JSON.stringify({ type: "text", content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("chat-financeiro error:", e);
    return new Response(JSON.stringify({ type: "error", error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function buildTransactionList(transacoes: any[]): string {
  if (!transacoes.length) return "Nenhuma transação encontrada.";
  return transacoes
    .map(t =>
      `ID:${t.id} | ${t.data} | ${t.tipo.toUpperCase()} | ${t.descricao} | R$${Number(t.valor).toFixed(2)} | ${t.categoria}${t.forma_pagamento ? ' | ' + t.forma_pagamento : ''}`
    )
    .join("\n");
}

function buildFinancialSummary(transacoes: any[]): string {
  if (!transacoes.length) return "O usuário ainda não tem transações registradas.";

  const byMonth: Record<string, { receitas: number; gastos: number; categorias: Record<string, number> }> = {};

  transacoes.forEach((t) => {
    const monthKey = t.data.substring(0, 7);
    if (!byMonth[monthKey]) byMonth[monthKey] = { receitas: 0, gastos: 0, categorias: {} };
    const val = Number(t.valor);
    if (t.tipo === "receita") {
      byMonth[monthKey].receitas += val;
    } else {
      byMonth[monthKey].gastos += val;
      byMonth[monthKey].categorias[t.categoria] = (byMonth[monthKey].categorias[t.categoria] || 0) + val;
    }
  });

  let summary = "RESUMO POR MÊS:\n";
  Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([month, data]) => {
      summary += `\n${month}: Receitas R$${data.receitas.toFixed(2)} | Gastos R$${data.gastos.toFixed(2)} | Saldo R$${(data.receitas - data.gastos).toFixed(2)}\n`;
      Object.entries(data.categorias)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, val]) => { summary += `  ${cat}: R$${val.toFixed(2)}\n`; });
    });

  const totalReceitas = Object.values(byMonth).reduce((s, m) => s + m.receitas, 0);
  const totalGastos = Object.values(byMonth).reduce((s, m) => s + m.gastos, 0);
  summary += `\nTOTAL 6 MESES: Receitas R$${totalReceitas.toFixed(2)} | Gastos R$${totalGastos.toFixed(2)} | Saldo R$${(totalReceitas - totalGastos).toFixed(2)}`;

  return summary;
}
