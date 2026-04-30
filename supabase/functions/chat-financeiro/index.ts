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
      return new Response(JSON.stringify({ type: "error", error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: transacoes } = await supabase
      .from("transacoes")
      .select("*")
      .gte("data", startDate)
      .order("data", { ascending: false })
      .limit(500);

    const txList = transacoes || [];
    const resumo = buildFinancialSummary(txList);
    const txDetalhes = buildTransactionList(txList);

    const systemPrompt = `Você é o FinBot, assistente financeiro pessoal. Você analisa finanças E gerencia lançamentos diretamente.

DADOS FINANCEIROS (últimos 6 meses):
${resumo}

LISTA COMPLETA DE TRANSAÇÕES (com IDs):
${txDetalhes}

========================================
REGRAS DE RESPOSTA — MUITO IMPORTANTE:

Para respostas normais (análise, perguntas, explicações): responda em texto livre em português.

Quando o usuário pedir para CRIAR, DELETAR ou ATUALIZAR transações, responda SOMENTE com um bloco JSON válido, sem nenhum texto antes ou depois:

Para DELETAR:
{"action":"deletar","ids":["id1","id2"],"mensagem":"Descrição clara do que será excluído"}

Para CRIAR:
{"action":"criar","transacao":{"descricao":"Nome","valor":100.00,"data":"2026-05-01","tipo":"gasto","categoria":"Alimentação","forma_pagamento":"Cartão de crédito"},"mensagem":"Descrição do que será criado"}

Para ATUALIZAR:
{"action":"atualizar","ids":["id1"],"transacao":{"descricao":"Novo nome","valor":50.00},"mensagem":"Descrição da atualização"}

REGRAS GERAIS:
- Responda sempre em português brasileiro
- Use R$ para valores
- Categorias válidas para gastos: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Vestuário, Assinaturas, Outros
- Categorias válidas para receitas: Salário, Freelance, Investimentos, Outros
- Formas de pagamento: Cartão de crédito, Débito, Pix, Dinheiro
- Datas no formato YYYY-MM-DD
- Se não encontrar o ID exato de uma transação, pergunte mais detalhes antes de agir
- Se o usuário pedir para deletar duplicatas, identifique os IDs duplicados na lista e retorne o JSON de delete com todos os IDs a remover de uma vez
========================================

${action === 'analyze' ? 'Faça uma análise completa e detalhada dos gastos, identificando padrões, pontos de atenção e sugestões práticas.' : ''}`;

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
      throw new Error(`AI gateway error: ${response.status}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error("Resposta inválida do gateway de IA");
    }

    const content: string = data.choices?.[0]?.message?.content || "";

    // Check if response is a JSON action
    const trimmed = content.trim();
    if (trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.action) {
          return new Response(JSON.stringify({
            type: "action",
            acao: parsed.action,
            ids: parsed.ids || [],
            transacao: parsed.transacao || null,
            mensagem: parsed.mensagem || "Confirmar operação?",
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {
        // Not valid JSON action, fall through to text response
      }
    }

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
