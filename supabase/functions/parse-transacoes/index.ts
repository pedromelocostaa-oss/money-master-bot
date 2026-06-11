import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { texto } = await req.json();
    if (!texto || typeof texto !== "string") {
      return new Response(JSON.stringify({ error: "Texto é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um assistente financeiro que extrai transações de textos em português brasileiro.

Dado um texto com lançamentos financeiros (faturas de cartão, extratos, listas manuais), extraia cada transação e retorne usando a tool "extract_transactions".

Regras:
- tipo: "gasto" para despesas/compras, "receita" para salários/rendimentos/estornos/cancelamentos
- categoria: escolha entre estas opções:
  Gastos: Alimentação, Moradia, Transporte, Saúde, Lazer, Educação, Vestuário, Assinaturas, Outros
  Receitas: Salário, Freelance, Investimentos, Outros
- valor: sempre positivo, mesmo para estornos
- data: formato YYYY-MM-DD. Se o texto não tiver ano, use ${new Date().getFullYear()}
- forma_pagamento: "Cartão de crédito", "Débito", "Pix", "Dinheiro", ou null se não souber
- descricao: limpe o nome do estabelecimento, deixando legível (ex: "Sup epa cento e vinte obelo horizontbr" → "Supermercado EPA")
- parcela_atual e parcelas_total: preencha se houver informação de parcelas (ex: "Parcela 2 de 5" → parcela_atual: 2, parcelas_total: 5)
- Se um valor for negativo no texto (estorno/cancelamento), marque como tipo "receita" com valor positivo`;

    const requestBody = JSON.stringify({
      model: "google/gemini-2.0-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: texto },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_transactions",
            description: "Retorna as transações extraídas do texto",
            parameters: {
              type: "object",
              properties: {
                transacoes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      descricao: { type: "string" },
                      valor: { type: "number" },
                      data: { type: "string", description: "YYYY-MM-DD" },
                      tipo: { type: "string", enum: ["gasto", "receita"] },
                      categoria: { type: "string" },
                      forma_pagamento: { type: "string", nullable: true },
                      parcela_atual: { type: "number", nullable: true },
                      parcelas_total: { type: "number", nullable: true },
                    },
                    required: ["descricao", "valor", "data", "tipo", "categoria"],
                  },
                },
              },
              required: ["transacoes"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_transactions" } },
    });

    let response: Response | null = null;
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: requestBody,
      });

      if (response.ok) break;

      // 503/502/504 = gateway temporariamente indisponível, vale tentar de novo
      const isRetryable = [502, 503, 504].includes(response.status);
      if (!isRetryable || attempt === maxAttempts) break;

      const delayMs = attempt * 1000;
      console.error(`AI gateway error ${response.status}, retrying in ${delayMs}ms (attempt ${attempt}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    if (!response!.ok) {
      const errText = await response!.text();
      console.error("AI gateway error:", response!.status, errText);
      if (response!.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response!.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if ([502, 503, 504].includes(response!.status)) {
        return new Response(JSON.stringify({ error: "Serviço de IA temporariamente indisponível. Tente novamente em instantes." }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error: " + response!.status);
    }

    const data = await response!.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-transacoes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
