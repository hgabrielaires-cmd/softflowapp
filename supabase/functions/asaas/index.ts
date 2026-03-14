// ─── Edge Function: Asaas Integration ─────────────────────────────────────
// Handles: create customer, create charge (boleto/pix)
// Follows Softflow security rules: JWT auth, CORS, error handling

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Sandbox URL — trocar para https://api.asaas.com/v3 em produção
const ASAAS_BASE = "https://sandbox.asaas.com/api/v3";

async function asaasFetch(path: string, method: string, body?: unknown) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada");

  const res = await fetch(`${ASAAS_BASE}${path}`, {
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

function getSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

// ── Handlers ──────────────────────────────────────────────────────────────

async function createCustomer(payload: {
  name: string;
  cpfCnpj: string;
  email?: string;
  phone?: string;
  externalReference?: string;
}) {
  // Verificar se já existe pelo CPF/CNPJ
  const existing = await asaasFetch(
    `/customers?cpfCnpj=${encodeURIComponent(payload.cpfCnpj)}`,
    "GET"
  );
  if (existing?.data?.length > 0) {
    return existing.data[0];
  }

  return await asaasFetch("/customers", "POST", {
    name: payload.name,
    cpfCnpj: payload.cpfCnpj.replace(/\D/g, ""),
    email: payload.email || undefined,
    phone: payload.phone?.replace(/\D/g, "") || undefined,
    externalReference: payload.externalReference || undefined,
    notificationDisabled: false,
  });
}

async function createPayment(payload: {
  customer: string;
  billingType: string;
  value: number;
  dueDate: string;
  description?: string;
  externalReference?: string;
}) {
  return await asaasFetch("/payments", "POST", {
    customer: payload.customer,
    billingType: payload.billingType, // BOLETO, PIX, UNDEFINED
    value: payload.value,
    dueDate: payload.dueDate,
    description: payload.description || "Fatura Softflow",
    externalReference: payload.externalReference || undefined,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar JWT
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

    const { action, ...params } = await req.json();

    let result: unknown;

    switch (action) {
      case "create_customer": {
        result = await createCustomer(params);
        break;
      }

      case "create_payment": {
        result = await createPayment(params);
        break;
      }

      case "create_customer_and_payment": {
        // Fluxo completo: cria cliente + cobrança + atualiza banco
        const customer = await createCustomer({
          name: params.customerName,
          cpfCnpj: params.cpfCnpj,
          email: params.email,
          phone: params.phone,
          externalReference: params.clienteId,
        });

        // Atualizar asaas_customer_id no contrato financeiro
        if (params.contratoFinanceiroId) {
          await supabaseAdmin
            .from("contratos_financeiros")
            .update({ asaas_customer_id: customer.id })
            .eq("id", params.contratoFinanceiroId);
        }

        const payment = await createPayment({
          customer: customer.id,
          billingType: params.billingType || "BOLETO",
          value: params.value,
          dueDate: params.dueDate,
          description: params.description,
          externalReference: params.faturaId,
        });

        // Atualizar fatura com IDs do Asaas
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
