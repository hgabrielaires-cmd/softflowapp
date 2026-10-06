import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createOpenAI } from "npm:@ai-sdk/openai";
import { streamText } from "npm:ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, ...extra, "Content-Type": "application/json" } });

const INSTRUCTIONS = `Você é um engenheiro SRE especialista em PostgreSQL, Supabase e Deno Edge Functions.
Recebe métricas e logs de um servidor de um sistema web e deve identificar a causa provável de falhas de capacidade
(CPU, memória, disco/IOPS, conexões, consultas lentas, limites de rate, etc.).
Responda em português do Brasil, em Markdown, com no máximo ~500 palavras, nas seções:
## Diagnóstico (resumo em 1-2 frases)
## Causa provável (com nível de confiança: alta/média/baixa e evidências citadas dos dados)
## Outras hipóteses
## Ações recomendadas (imediatas e preventivas, numeradas, em ordem de prioridade)
## Dados adicionais úteis
Não invente números que não estejam nos dados.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: isAdmin } = await sb.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return json({ error: "Apenas administradores" }, 403);

    const { metricas, logs, contexto } = await req.json();
    const texto = [`CONTEXTO:\n${contexto || "-"}`, `MÉTRICAS:\n${metricas || "-"}`, `LOGS:\n${logs || "-"}`].join("\n\n");
    if (!metricas?.trim() && !logs?.trim()) return json({ error: "Informe métricas ou logs" }, 400);
    if (texto.length > 200_000) return json({ error: "Conteúdo muito grande (máx. 200 mil caracteres)" }, 400);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Lovable AI não configurado" }, 500);

    let runId = req.headers.get("X-Lovable-AIG-Run-ID")?.trim() || undefined;
    let upstreamStatus = 0;
    let upstreamBody = "";
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const h = new Headers(init?.headers);
        if (runId) h.set("X-Lovable-AIG-Run-ID", runId);
        const r = await fetch(input, { ...init, headers: h });
        runId ??= r.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
        if (!r.ok) { upstreamStatus = r.status; upstreamBody = await r.clone().text().catch(() => ""); }
        return r;
      },
    });

    let streamError: unknown = null;
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      instructions: INSTRUCTIONS,
      messages: [{ role: "user", content: texto }],
      abortSignal: req.signal,
      onError: ({ error }) => { streamError = error; },
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "medium",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    } as any);

    let analise = "";
    for await (const t of result.textStream) analise += t;
    const extra: Record<string, string> = runId ? { "X-Lovable-AIG-Run-ID": runId } : {};

    if (upstreamStatus || streamError) {
      let msg = "Falha ao consultar a IA";
      try { msg = JSON.parse(upstreamBody)?.error?.message || JSON.parse(upstreamBody)?.message || msg; } catch { /* */ }
      const status = upstreamStatus || 500;
      if (status === 402) msg = "Créditos de IA esgotados. Adicione créditos em Settings → Plans & credits.";
      if (status === 429) msg = "Limite de requisições atingido. Aguarde alguns instantes.";
      return json({ error: msg }, status, extra);
    }
    if (!analise.trim()) return json({ error: "A IA não retornou análise para esses dados." }, 502, extra);
    return json({ analise }, 200, extra);
  } catch (e) {
    if (req.signal.aborted) return json({ error: "Cancelado" }, 499);
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Erro" }, 500);
  }
});
