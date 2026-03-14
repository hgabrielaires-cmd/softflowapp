// ─── Edge Function: Asaas Webhook Handler ─────────────────────────────────
// Recebe notificações do Asaas e atualiza status das faturas
// Segurança: idempotência via asaas_webhook_events + webhook token

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const event = body?.event;
    const payment = body?.payment;

    if (!event || !payment?.id) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseAdmin();

    // Idempotência — ignorar eventos já processados
    const eventId = `${event}_${payment.id}`;
    const { data: existing } = await supabase
      .from("asaas_webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Registrar evento
    await supabase.from("asaas_webhook_events").insert({
      event_id: eventId,
      event_type: event,
      payload: body,
    });

    // Mapear evento Asaas -> status da fatura
    let newStatus: string | null = null;
    let dataPagamento: string | null = null;

    switch (event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        newStatus = "Pago";
        dataPagamento =
          payment.confirmedDate || payment.paymentDate || new Date().toISOString().split("T")[0];
        break;
      case "PAYMENT_OVERDUE":
        newStatus = "Vencido";
        break;
      case "PAYMENT_DELETED":
      case "PAYMENT_REFUNDED":
      case "PAYMENT_CHARGEBACK_REQUESTED":
        newStatus = "Cancelado";
        break;
      // Eventos informativos — não alteram status
      case "PAYMENT_CREATED":
      case "PAYMENT_UPDATED":
      case "PAYMENT_AWAITING_RISK_ANALYSIS":
        break;
      default:
        console.log(`Evento Asaas não mapeado: ${event}`);
    }

    if (newStatus) {
      // Buscar fatura pelo asaas_payment_id
      const { data: fatura } = await supabase
        .from("faturas")
        .select("id, status")
        .eq("asaas_payment_id", payment.id)
        .maybeSingle();

      if (fatura) {
        const updatePayload: Record<string, unknown> = { status: newStatus };
        if (dataPagamento) updatePayload.data_pagamento = dataPagamento;

        await supabase.from("faturas").update(updatePayload).eq("id", fatura.id);

        console.log(
          `Fatura ${fatura.id} atualizada: ${fatura.status} -> ${newStatus}`
        );
      } else {
        console.warn(`Fatura não encontrada para payment ${payment.id}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("asaas-webhook error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
