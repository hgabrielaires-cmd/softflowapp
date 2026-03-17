// ─── Edge Function: Sincronizar Faturas Asaas ─────────────────────────────
// Verifica status de pagamentos no Asaas e atualiza faturas pendentes/vencidas
// Execução: cron diário 07:00 BRT ou chamada manual

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

async function getAsaasConfig(supabaseAdmin: any, filialId: string) {
  const { data, error } = await supabaseAdmin
    .from("asaas_config")
    .select("token, ambiente, ativo")
    .eq("filial_id", filialId)
    .eq("ativo", true)
    .maybeSingle();

  if (error || !data) return null;

  const baseUrl = data.ambiente === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

  return { apiKey: data.token, baseUrl };
}

function mapAsaasStatus(asaasStatus: string): { status: string | null; dataPagamento: boolean } {
  switch (asaasStatus) {
    case "RECEIVED":
    case "RECEIVED_IN_CASH":
    case "CONFIRMED":
      return { status: "Pago", dataPagamento: true };
    case "OVERDUE":
      return { status: "Vencido", dataPagamento: false };
    case "REFUNDED":
    case "REFUND_REQUESTED":
    case "CHARGEBACK_REQUESTED":
    case "CHARGEBACK_DISPUTE":
    case "DUNNING_REQUESTED":
      return { status: "Cancelado", dataPagamento: false };
    case "PENDING":
    case "AWAITING_RISK_ANALYSIS":
      return { status: null, dataPagamento: false }; // manter como está
    default:
      return { status: null, dataPagamento: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: aceita JWT de usuário OU anon key para cron
    const authHeader = req.headers.get("authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      // Aceitar anon key (cron) ou validar JWT
      if (token !== anonKey) {
        const userClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!
        );
        const { error: authError } = await userClient.auth.getUser(token);
        if (authError) {
          return new Response(JSON.stringify({ error: "Não autorizado" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    const supabase = getSupabaseAdmin();
    const today = new Date().toISOString().split("T")[0];

    // Buscar faturas pendentes com asaas_payment_id e vencidas/do dia
    const { data: faturas, error: fatErr } = await supabase
      .from("faturas")
      .select("id, asaas_payment_id, status, filial_id, data_vencimento")
      .eq("status", "Pendente")
      .not("asaas_payment_id", "is", null)
      .lte("data_vencimento", today)
      .order("data_vencimento", { ascending: true })
      .limit(200);

    if (fatErr) throw new Error("Erro ao buscar faturas: " + fatErr.message);
    if (!faturas || faturas.length === 0) {
      return new Response(JSON.stringify({ ok: true, total: 0, updated: 0, errors: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache de configs por filial
    const configCache: Record<string, { apiKey: string; baseUrl: string } | null> = {};
    let updated = 0;
    let errors = 0;
    const results: { faturaId: string; from: string; to: string }[] = [];

    // Processar em batches de 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < faturas.length; i += BATCH_SIZE) {
      const batch = faturas.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(batch.map(async (f) => {
        try {
          if (!f.filial_id || !f.asaas_payment_id) return;

          // Obter config da filial (com cache)
          if (!(f.filial_id in configCache)) {
            configCache[f.filial_id] = await getAsaasConfig(supabase, f.filial_id);
          }
          const config = configCache[f.filial_id];
          if (!config) return;

          // Consultar status no Asaas
          const res = await fetch(`${config.baseUrl}/payments/${f.asaas_payment_id}`, {
            headers: {
              "Content-Type": "application/json",
              access_token: config.apiKey,
            },
          });

          if (!res.ok) {
            console.warn(`Asaas API error for ${f.asaas_payment_id}: ${res.status}`);
            errors++;
            return;
          }

          const payment = await res.json();
          const mapped = mapAsaasStatus(payment.status);

          if (mapped.status && mapped.status !== f.status) {
            const updatePayload: Record<string, unknown> = { status: mapped.status };
            if (mapped.dataPagamento) {
              updatePayload.data_pagamento =
                payment.confirmedDate || payment.paymentDate || payment.clientPaymentDate || today;
            }

            await supabase.from("faturas").update(updatePayload).eq("id", f.id);

            // Registrar no log
            await supabase.from("faturamento_sync_log").insert({
              fatura_id: f.id,
              asaas_payment_id: f.asaas_payment_id,
              status_anterior: f.status,
              status_novo: mapped.status,
            });

            updated++;
            results.push({ faturaId: f.id, from: f.status, to: mapped.status });
            console.log(`Fatura ${f.id}: ${f.status} → ${mapped.status} (Asaas: ${payment.status})`);
          }
        } catch (err) {
          errors++;
          console.error(`Erro ao sincronizar fatura ${f.id}:`, err instanceof Error ? err.message : err);
        }
      }));
    }

    console.log(`Sincronização concluída: ${faturas.length} verificadas, ${updated} atualizadas, ${errors} erros`);

    return new Response(JSON.stringify({
      ok: true,
      total: faturas.length,
      updated,
      errors,
      results,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("sincronizar-faturas-asaas error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
