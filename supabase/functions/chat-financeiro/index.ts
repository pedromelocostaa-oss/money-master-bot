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

    // Get user's transactions for context
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

    // Fetch last 6 months of transactions
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const startDate = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

    const { data: transacoes } = await supabase
      .from("transacoes")
      .select("*")
      .gte("data", startDate)
      .order("data", { ascending: false })
      .limit(500);

    // Build financial summary
    const resumo = buildFinancialSummary(transacoes || []);

    const systemPrompt = `Você é um consultor financeiro pessoal sênior e especialista em investimentos. Seu nome é FinBot.

Você tem acesso aos dados financeiros do usuário dos últimos 6 meses:

${resumo}

Suas responsabilidades:
- Analisar padrões de gastos e identificar oportunidades de economia
- Sugerir estratégias de investimento adequadas ao perfil
- Dar feedback direto e acionável sobre a saúde financeira
- Alertar sobre gastos excessivos em categorias específicas
- Sugerir metas financeiras realistas
- Responder dúvidas sobre finanças pessoais e investimentos

Regras:
- Sempre responda em português brasileiro
- Use valores em R$ (Real)
- Seja direto, prático e empático
- Quando der sugestões de investimento, mencione que não é recomendação formal
- Use emojis com moderação para tornar a conversa mais agradável
- Formate números como moeda brasileira (ex: R$ 1.234,56)

${action === 'analyze' ? 'O usuário acabou de abrir a aba de análise. Faça uma análise completa e detalhada dos gastos dele, identificando padrões, pontos de atenção e sugestões práticas. Seja proativo e específico.' : ''}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error: " + response.status);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-financeiro error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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

  let summary = "RESUMO FINANCEIRO (últimos 6 meses):\n\n";

  Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .forEach(([month, data]) => {
      summary += `📅 ${month}:\n`;
      summary += `  Receitas: R$ ${data.receitas.toFixed(2)}\n`;
      summary += `  Gastos: R$ ${data.gastos.toFixed(2)}\n`;
      summary += `  Saldo: R$ ${(data.receitas - data.gastos).toFixed(2)}\n`;
      summary += `  Gastos por categoria:\n`;
      Object.entries(data.categorias)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, val]) => {
          summary += `    - ${cat}: R$ ${val.toFixed(2)}\n`;
        });
      summary += "\n";
    });

  const totalReceitas = Object.values(byMonth).reduce((s, m) => s + m.receitas, 0);
  const totalGastos = Object.values(byMonth).reduce((s, m) => s + m.gastos, 0);
  summary += `TOTAIS DO PERÍODO:\n`;
  summary += `  Total receitas: R$ ${totalReceitas.toFixed(2)}\n`;
  summary += `  Total gastos: R$ ${totalGastos.toFixed(2)}\n`;
  summary += `  Saldo acumulado: R$ ${(totalReceitas - totalGastos).toFixed(2)}\n`;

  return summary;
}
