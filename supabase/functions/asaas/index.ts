// ─── Edge Function: Asaas Integration (Multi-filial) ──────────────────────
// Reads Asaas API key per branch from asaas_config table
// Handles: create customer, create charge (boleto/pix)
// After payment: sends WhatsApp notification via Evolution API

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

  if (error || !data) {
    throw new Error(`Configuração Asaas não encontrada para esta filial. Configure em Integrações.`);
  }
  if (!data.token) {
    throw new Error("Token Asaas não configurado para esta filial.");
  }

  const baseUrl = data.ambiente === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

  return { apiKey: data.token, baseUrl };
}

async function asaasFetch(baseUrl: string, apiKey: string, path: string, method: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Asaas error:", JSON.stringify(data));
    throw new Error(
      `Asaas [${res.status}]: ${data?.errors?.[0]?.description || JSON.stringify(data)}`
    );
  }
  return data;
}

// ── WhatsApp Notification ─────────────────────────────────────────────────

async function sendWhatsAppFaturaNotification(
  supabaseAdmin: any,
  params: {
    faturaId: string;
    clienteId: string;
    nomeDecisor: string;
    nomeFantasia: string;
    valor: number;
    dataVencimento: string;
    billingType: string;
    asaasUrl: string | null;
    asaasBarcode: string | null;
    asaasPix: string | null;
  }
) {
  try {
    // Get WhatsApp config
    const { data: whatsConfig } = await supabaseAdmin
      .from("integracoes_config")
      .select("server_url, token, ativo")
      .eq("nome", "whatsapp")
      .maybeSingle();

    if (!whatsConfig?.ativo || !whatsConfig?.server_url || !whatsConfig?.token) {
      console.log("WhatsApp integration not active, skipping notification");
      return;
    }

    // Get client phone for billing
    const { data: cliente } = await supabaseAdmin
      .from("clientes")
      .select("telefone")
      .eq("id", params.clienteId)
      .maybeSingle();

    // Try to get decisor contact phone
    const { data: decisor } = await supabaseAdmin
      .from("cliente_contatos")
      .select("telefone, nome")
      .eq("cliente_id", params.clienteId)
      .eq("decisor", true)
      .eq("ativo", true)
      .maybeSingle();

    const phone = decisor?.telefone || cliente?.telefone;
    if (!phone) {
      console.log("No phone number found for client, skipping WhatsApp");
      return;
    }

    const valorFmt = params.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const nomeContato = decisor?.nome || params.nomeDecisor || params.nomeFantasia;

    let text = "";
    if (params.billingType === "PIX") {
      text = `Olá ${nomeContato}! 👋\n\nSua fatura está disponível:\n\nEmpresa: ${params.nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${params.dataVencimento}*\n\n💠 PIX Copia e Cola:\n${params.asaasPix || "—"}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
    } else {
      text = `Olá ${nomeContato}! 👋\n\nA fatura está disponível:\n\nEmpresa: ${params.nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${params.dataVencimento}*\n\n🔗 Acesse o boleto: ${params.asaasUrl || "—"}\n\nLinha digitável:\n${params.asaasBarcode || "—"}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
    }

    // Send via Evolution API edge function
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Call evolution-api directly (same Supabase instance)
    let formattedNumber = phone.replace(/\D/g, "");
    if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
    if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

    const baseUrl = whatsConfig.server_url.replace(/\/+$/, "");
    const headers = {
      "Content-Type": "application/json",
      apikey: whatsConfig.token,
    };

    // Resolve instance name from config or default
    const instanceName = "Softflow_WhatsApp";

    const sendRes = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: formattedNumber, text }),
    });

    const sendResult = await sendRes.json();

    // Retry without 9th digit for BR numbers
    if (!sendRes.ok && formattedNumber.length === 13 && formattedNumber.startsWith("55")) {
      const withoutNinth = formattedNumber.slice(0, 4) + formattedNumber.slice(5);
      const res2 = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ number: withoutNinth, text }),
      });
      if (!res2.ok) {
        console.warn("WhatsApp send failed (both attempts):", JSON.stringify(sendResult));
      }
    }

    // Log the notification
    await supabaseAdmin.from("notificacoes_cobranca_log").insert({
      fatura_id: params.faturaId,
      cliente_id: params.clienteId,
      tipo_gatilho: "fatura_gerada",
      canal: "whatsapp",
      status_envio: sendRes.ok ? "enviado" : "erro",
    });

    console.log(`WhatsApp notification sent for fatura ${params.faturaId}: ${sendRes.ok ? "OK" : "FAILED"}`);
  } catch (err) {
    console.warn("WhatsApp notification error (non-blocking):", err instanceof Error ? err.message : err);
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────

async function createCustomer(baseUrl: string, apiKey: string, payload: {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  externalReference?: string;
}) {
  const existing = await asaasFetch(baseUrl, apiKey,
    `/customers?cpfCnpj=${encodeURIComponent(payload.cpfCnpj)}`, "GET"
  );
  if (existing?.data?.length > 0) {
    return existing.data[0];
  }

  return await asaasFetch(baseUrl, apiKey, "/customers", "POST", {
    name: payload.name,
    cpfCnpj: payload.cpfCnpj.replace(/\D/g, ""),
    email: payload.email || undefined,
    phone: payload.phone?.replace(/\D/g, "") || undefined,
    externalReference: payload.externalReference || undefined,
    notificationDisabled: false,
  });
}

async function createPayment(baseUrl: string, apiKey: string, payload: {
  customer: string;
  billingType: string;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}) {
  return await asaasFetch(baseUrl, apiKey, "/payments", "POST", {
    customer: payload.customer,
    billingType: payload.billingType,
    value: payload.value,
    dueDate: payload.dueDate,
    description: payload.description || "Fatura Softflow",
    externalReference: payload.externalReference || undefined,
  });
}

async function fetchPaymentDetails(baseUrl: string, apiKey: string, paymentId: string, billingType: string) {
  const details: Record<string, string | null> = {};

  try {
    if (billingType === "BOLETO") {
      const boletoData = await asaasFetch(baseUrl, apiKey, `/payments/${paymentId}/identificationField`, "GET");
      details.asaas_barcode = boletoData?.identificationField || null;
    }
    // Always fetch PIX QR Code (Asaas generates PIX for all payment types)
    try {
      const pixData = await asaasFetch(baseUrl, apiKey, `/payments/${paymentId}/pixQrCode`, "GET");
      details.asaas_pix_qrcode = pixData?.payload || null;
      details.asaas_pix_image = pixData?.encodedImage || null;
    } catch (_pixErr) {
      console.warn(`PIX QR not available for payment ${paymentId}`);
    }
  } catch (err) {
    console.warn(`Failed to fetch payment details for ${paymentId}:`, err);
  }

  return details;
}

// ── Main ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, filialId, filial_id, ...params } = await req.json();
    const effectiveFilialId = filialId || filial_id;

    if (!effectiveFilialId) {
      return new Response(JSON.stringify({ error: "filialId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Asaas config for this branch
    const asaasConf = await getAsaasConfig(supabaseAdmin, effectiveFilialId);
    const { apiKey, baseUrl } = asaasConf;
    const ambiente = baseUrl.includes("sandbox") ? "sandbox" : "production";

    let result: unknown;

    switch (action) {
      case "create_customer": {
        result = await createCustomer(baseUrl, apiKey, params);
        break;
      }

      case "create_payment": {
        result = await createPayment(baseUrl, apiKey, params);
        break;
      }

      case "create_customer_and_payment": {
        const customer = await createCustomer(baseUrl, apiKey, {
          name: params.customerName,
          cpfCnpj: params.cpfCnpj,
          email: params.email,
          phone: params.phone,
          externalReference: params.clienteId,
        });

        if (params.contratoFinanceiroId) {
          await supabaseAdmin
            .from("contratos_financeiros")
            .update({ asaas_customer_id: customer.id })
            .eq("id", params.contratoFinanceiroId);
        }

        const payment = await createPayment(baseUrl, apiKey, {
          customer: customer.id,
          billingType: params.billingType || "BOLETO",
          value: params.value,
          dueDate: params.dueDate,
          description: params.description,
          externalReference: params.faturaId,
        });

        if (params.faturaId) {
          const billingType = params.billingType || "BOLETO";
          const paymentDetails = await fetchPaymentDetails(baseUrl, apiKey, payment.id, billingType);

          await supabaseAdmin
            .from("faturas")
            .update({
              asaas_payment_id: payment.id,
              asaas_url: payment.invoiceUrl || payment.bankSlipUrl || null,
              asaas_bank_slip_url: payment.bankSlipUrl || null,
              ...paymentDetails,
            })
            .eq("id", params.faturaId);

          // Send WhatsApp notification after successful payment creation
          const dataVenc = params.dueDate
            ? new Date(params.dueDate + "T12:00:00").toLocaleDateString("pt-BR")
            : "—";

          await sendWhatsAppFaturaNotification(supabaseAdmin, {
            faturaId: params.faturaId,
            clienteId: params.clienteId,
            nomeDecisor: params.customerName || "",
            nomeFantasia: params.customerName || "",
            valor: params.value,
            dataVencimento: dataVenc,
            billingType: billingType,
            asaasUrl: payment.invoiceUrl || payment.bankSlipUrl || null,
            asaasBarcode: paymentDetails.asaas_barcode || null,
            asaasPix: paymentDetails.asaas_pix_qrcode || null,
          });
        }

        result = { customer, payment };
        break;
      }

      // ── Test actions ──────────────────────────────────────────────────
      case "test_connection": {
        const data = await asaasFetch(baseUrl, apiKey, "/customers?limit=1", "GET");
        result = { ok: true, ambiente, totalCount: data?.totalCount ?? 0 };
        break;
      }

      case "test_create_payment": {
        const payment = await createPayment(baseUrl, apiKey, {
          customer: params.customer,
          billingType: params.billingType,
          value: params.value,
          dueDate: params.dueDate,
          description: params.description || "Teste Softflow",
        });
        const details = await fetchPaymentDetails(baseUrl, apiKey, payment.id, params.billingType);
        result = { payment, details };
        break;
      }

      case "test_receive_in_cash": {
        const res = await fetch(`${baseUrl}/payments/${params.paymentId}/receiveInCash`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            access_token: apiKey,
          },
          body: JSON.stringify({
            paymentDate: new Date().toISOString().split("T")[0],
            value: 1.00,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(`Asaas [${res.status}]: ${data?.errors?.[0]?.description || JSON.stringify(data)}`);
        }
        result = { payment: data };
        break;
      }

      case "test_check_webhook": {
        if (!params.paymentId) {
          throw new Error("paymentId é obrigatório");
        }

        const { data: events, error: eventsError } = await supabaseAdmin
          .from("asaas_webhook_events")
          .select("id, event_id, event_type, processed_at")
          .like("event_id", `%${params.paymentId}`)
          .order("processed_at", { ascending: false })
          .limit(10);

        if (eventsError) {
          throw new Error(eventsError.message);
        }

        result = {
          webhookReceived: (events?.length ?? 0) > 0,
          events: events ?? [],
        };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("asaas edge function error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
