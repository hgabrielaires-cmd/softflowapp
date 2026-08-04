// ─── Edge Function: Conta Azul Sync ───────────────────────────────────────
// Importa recebíveis pagos da Conta Azul para fin_movimentacoes (entradas)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidToken } from "../_shared/contaazul.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function ymd(d: Date) {
  return d.toISOString().split("T")[0];
}

function resolvePeriodo(body: any): { inicio: string; fim: string } {
  if (body?.inicio && body?.fim) return { inicio: body.inicio, fim: body.fim };
  const hoje = new Date();
  switch (body?.periodo) {
    case "hoje":
      return { inicio: ymd(hoje), fim: ymd(hoje) };
    case "ontem": {
      const o = new Date(hoje.getTime() - 86400000);
      return { inicio: ymd(o), fim: ymd(o) };
    }
    case "semana": {
      const i = new Date(hoje.getTime() - 7 * 86400000);
      return { inicio: ymd(i), fim: ymd(hoje) };
    }
    default: {
      const i = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: ymd(i), fim: ymd(hoje) };
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const { inicio, fim } = resolvePeriodo(body);
  const filialId: string | null = body?.filial_id ?? null;

  try {
    // 1. Token válido (renova se expirado)
    const token = await getValidToken(supabase, filialId);
    if (!token?.access_token) {
      return json({ error: "Conta Azul não conectada" }, 400);
    }

    // 2. Conta financeira CONTA AZUL
    const { data: conta } = await supabase
      .from("fin_contas_financeiras")
      .select("id, filial_id")
      .ilike("nome", "%conta azul%")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();

    if (!conta) return json({ error: "Conta financeira 'CONTA AZUL' não encontrada" }, 400);

    // 3. Recebíveis pagos no período (API v2 — contas a receber)
    const BASE =
      "https://api-v2.contaazul.com/v1/financeiro/eventos-financeiros/contas-a-receber/buscar";
    const recebiveis: any[] = [];
    let pagina = 1;
    const tamanho = 100;

    while (pagina <= 50) {
      const params = new URLSearchParams({
        pagina: String(pagina),
        tamanho_pagina: String(tamanho),
        data_vencimento_de: inicio,
        data_vencimento_ate: fim,
        status: "RECEBIDO",
      });
      const res = await fetch(`${BASE}?${params}`, {
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          Accept: "application/json",
        },
      });
      const text = await res.text();
      if (!res.ok) {
        await supabase.from("contaazul_sync_log").insert({
          filial_id: filialId ?? token.filial_id, periodo_inicio: inicio, periodo_fim: fim,
          status: "erro", erro: `[${res.status}] ${text.slice(0, 500)}`,
        });
        return json({ error: "Falha na API Conta Azul", status: res.status, details: text }, res.status);
      }

      const parsed = JSON.parse(text || "{}");
      const itens: any[] = parsed.itens ?? [];
      recebiveis.push(...itens);
      const total = Number(parsed.itens_totais ?? itens.length);
      if (itens.length < tamanho || recebiveis.length >= total) break;
      pagina++;
    }


    let importados = 0;
    let ignorados = 0;

    for (const r of recebiveis) {
      const origemId = String(r.id ?? r.uuid ?? "");
      if (!origemId) { ignorados++; continue; }

      const { data: existente } = await supabase
        .from("fin_movimentacoes")
        .select("id")
        .eq("origem", "contaazul")
        .eq("origem_id", origemId)
        .maybeSingle();

      if (existente) { ignorados++; continue; }

      const valor = Number(r.pago ?? r.total ?? 0);
      const dataMov = String(r.data_vencimento ?? fim).split("T")[0];
      if (!valor) { ignorados++; continue; }

      const cliente = r.cliente?.nome ? ` — ${r.cliente.nome}` : "";

      const { error: insErr } = await supabase.from("fin_movimentacoes").insert({
        conta_financeira_id: conta.id,
        filial_id: filialId ?? token.filial_id ?? conta.filial_id,
        tipo: "entrada",
        valor,
        data_movimentacao: dataMov,
        descricao: `${r.descricao ?? "Recebimento Conta Azul"}${cliente}`,

        categoria: "receita_fatura",
        origem: "contaazul",
        origem_id: origemId,
      });

      if (insErr) { ignorados++; console.error("insert mov:", insErr.message); }
      else importados++;
    }

    await supabase.from("contaazul_sync_log").insert({
      filial_id: filialId ?? token.filial_id,
      periodo_inicio: inicio,
      periodo_fim: fim,
      registros_importados: importados,
      registros_ignorados: ignorados,
      status: "sucesso",
    });

    return json({ ok: true, periodo: { inicio, fim }, importados, ignorados, total: recebiveis.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("contaazul-sync:", message);
    await supabase.from("contaazul_sync_log").insert({
      filial_id: filialId, periodo_inicio: inicio, periodo_fim: fim, status: "erro", erro: message,
    });
    return json({ error: message }, 500);
  }
});
