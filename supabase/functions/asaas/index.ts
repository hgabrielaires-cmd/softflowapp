// ─── Edge Function: Asaas Integration (Multi-filial) ──────────────────────
// Reads Asaas API key per branch from asaas_config table
// Handles: create customer, create charge (boleto/pix)

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
    } else if (billingType === "PIX") {
      const pixData = await asaasFetch(baseUrl, apiKey, `/payments/${paymentId}/pixQrCode`, "GET");
      details.asaas_pix_qrcode = pixData?.payload || null;
      details.asaas_pix_image = pixData?.encodedImage || null;
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
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!
    ).auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, filialId, ...params } = await req.json();

    if (!filialId) {
      return new Response(JSON.stringify({ error: "filialId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Asaas config for this branch
    const { apiKey, baseUrl } = await getAsaasConfig(supabaseAdmin, filialId);

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
          await supabaseAdmin
            .from("faturas")
            .update({
              asaas_payment_id: payment.id,
              asaas_url: payment.invoiceUrl || payment.bankSlipUrl || null,
            })
            .eq("id", params.faturaId);
        }

        result = { customer, payment };
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
