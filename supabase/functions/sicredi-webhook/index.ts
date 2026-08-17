// supabase/functions/sicredi-webhook/index.ts
//
// Recebe as notificações de movimentação de boleto enviadas pelo Sicredi
// (Manual da API de Cobrança 4.0 — "API de Recebimentos de eventos Webhook").
//
// Regras da API Sicredi:
//   - endpoint precisa responder HTTP 200 em até 10 segundos
//   - certificado HTTPS não pode ser autoassinado
//
// Segurança: a API de Webhook do Sicredi hoje não envia assinatura própria.
// Protegemos com um token próprio na query string (falha FECHADA) e
// deduplicamos por "idEventoWebhook".

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_TOKEN = Deno.env.get("SICREDI_WEBHOOK_TOKEN") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const EVENTOS_LIQUIDACAO = new Set([
  "LIQUIDACAO_PIX",
  "LIQUIDACAO_REDE",
  "LIQUIDACAO_COMPE_H5",
  "LIQUIDACAO_COMPE_H6",
  "LIQUIDACAO_COMPE_H8",
  "LIQUIDACAO_CARTORIO",
  "AVISO_PAGAMENTO_COMPE",
]);

const EVENTOS_ESTORNO = new Set(["ESTORNO_LIQUIDACAO_REDE"]);

// dataEvento vem como array [ano, mes, dia, hora, min, seg, nano]
function arrayParaData(arr: unknown): string | null {
  if (!Array.isArray(arr) || arr.length < 3) return null;
  const [ano, mes, dia, hora = 0, min = 0, seg = 0] = arr as number[];
  return new Date(Date.UTC(ano, mes - 1, dia, hora, min, seg)).toISOString();
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const tokenRecebido = new URL(request.url).searchParams.get("token");
  if (!WEBHOOK_TOKEN || tokenRecebido !== WEBHOOK_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return new Response("Bad Request", { status: 400 });
  }

  const idEventoWebhook: string | null = payload.idEventoWebhook ?? null;

  // Idempotência: o Sicredi pode reentregar o mesmo evento.
  if (idEventoWebhook) {
    const { data: existente } = await supabase
      .from("sicredi_webhook_eventos")
      .select("id")
      .eq("id_evento_webhook", idEventoWebhook)
      .maybeSingle();

    if (existente) {
      return new Response(JSON.stringify({ ok: true, duplicado: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  await supabase.from("sicredi_webhook_eventos").insert({
    payload,
    id_evento_webhook: idEventoWebhook,
    nosso_numero: payload.nossoNumero ?? null,
    movimento: payload.movimento ?? null,
    recebido_em: new Date().toISOString(),
  });

  const nossoNumero: string | undefined = payload.nossoNumero;
  const movimento: string | undefined = payload.movimento;

  if (nossoNumero && movimento) {
    const dataEvento = arrayParaData(payload.dataEvento);
    const dataPagamento = dataEvento
      ? dataEvento.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    if (EVENTOS_LIQUIDACAO.has(movimento) || EVENTOS_ESTORNO.has(movimento)) {
      await supabase
        .from("sicredi_boletos")
        .update({
          status: EVENTOS_LIQUIDACAO.has(movimento) ? "LIQUIDADO" : "ESTORNADO",
          liquidado_em: dataEvento ?? new Date().toISOString(),
          valor_liquidacao: payload.valorLiquidacao ? Number(payload.valorLiquidacao) : null,
          movimento_webhook: movimento,
        })
        .eq("nosso_numero", nossoNumero);
    }

    if (EVENTOS_LIQUIDACAO.has(movimento)) {
      await supabase
        .from("faturas")
        .update({ status: "Pago", data_pagamento: dataPagamento })
        .eq("boleto_nosso_numero", nossoNumero);
    }

    if (EVENTOS_ESTORNO.has(movimento)) {
      await supabase
        .from("faturas")
        .update({ status: "Pendente", data_pagamento: null })
        .eq("boleto_nosso_numero", nossoNumero);
    }
  }

  // Sicredi exige HTTP 200 em até 10s para considerar o evento entregue
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
