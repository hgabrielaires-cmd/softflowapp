// ─── Edge Function: Geração Automática de Faturas Mensais ────────────────
// Consolida mensalidade + módulos + OAs + parcelas de implantação
// Gera cobrança no Asaas e registra log de cada operação

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

interface AsaasConfig {
  apiKey: string;
  baseUrl: string;
}

async function getAsaasConfig(supabase: any, filialId: string): Promise<AsaasConfig | null> {
  const { data } = await supabase
    .from("asaas_config")
    .select("token, ambiente, ativo")
    .eq("filial_id", filialId)
    .eq("ativo", true)
    .maybeSingle();

  if (!data?.token) return null;

  const baseUrl = data.ambiente === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

  return { apiKey: data.token, baseUrl };
}

async function asaasFetch(baseUrl: string, apiKey: string, path: string, method: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", access_token: apiKey },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Asaas [${res.status}]: ${data?.errors?.[0]?.description || JSON.stringify(data)}`);
  }
  return data;
}

async function ensureAsaasCustomer(
  baseUrl: string, apiKey: string, supabase: any,
  contrato: any, cliente: any
): Promise<string> {
  // Reuse existing customer ID
  if (contrato.asaas_customer_id) return contrato.asaas_customer_id;

  // Check if customer exists by cpfCnpj
  const cpf = cliente.cnpj_cpf.replace(/\D/g, "");
  const existing = await asaasFetch(baseUrl, apiKey, `/customers?cpfCnpj=${encodeURIComponent(cpf)}`, "GET");
  if (existing?.data?.length > 0) {
    const customerId = existing.data[0].id;
    await supabase.from("contratos_financeiros").update({ asaas_customer_id: customerId }).eq("id", contrato.id);
    return customerId;
  }

  // Create new customer
  const created = await asaasFetch(baseUrl, apiKey, "/customers", "POST", {
    name: cliente.razao_social || cliente.nome_fantasia,
    cpfCnpj: cpf,
    email: contrato.email_cobranca || cliente.email || undefined,
    phone: contrato.whatsapp_cobranca?.replace(/\D/g, "") || cliente.telefone?.replace(/\D/g, "") || undefined,
    externalReference: cliente.id,
    notificationDisabled: false,
  });

  await supabase.from("contratos_financeiros").update({ asaas_customer_id: created.id }).eq("id", contrato.id);
  return created.id;
}

// ── WhatsApp notification for generated invoices ──────────────────────────

async function sendWhatsAppForFatura(
  supabase: any,
  params: {
    faturaId: string;
    clienteId: string;
    nomeFantasia: string;
    valor: number;
    dataVencimento: string;
    billingType: string;
    asaasUrl: string | null;
    asaasBarcode: string | null;
    asaasPix: string | null;
  }
) {
  const { data: whatsConfig } = await supabase
    .from("integracoes_config")
    .select("server_url, token, ativo")
    .eq("nome", "whatsapp")
    .maybeSingle();

  if (!whatsConfig?.ativo || !whatsConfig?.server_url || !whatsConfig?.token) return;

  // Get decisor contact
  const { data: decisor } = await supabase
    .from("cliente_contatos")
    .select("telefone, nome")
    .eq("cliente_id", params.clienteId)
    .eq("decisor", true)
    .eq("ativo", true)
    .maybeSingle();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("telefone")
    .eq("id", params.clienteId)
    .maybeSingle();

  const phone = decisor?.telefone || cliente?.telefone;
  if (!phone) return;

  const nomeContato = decisor?.nome || params.nomeFantasia;
  const valorFmt = params.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const dataFmt = new Date(params.dataVencimento + "T12:00:00").toLocaleDateString("pt-BR");

  let text = "";
  if (params.billingType === "PIX") {
    text = `Olá ${nomeContato}! 👋\n\nSua fatura está disponível:\n\nEmpresa: ${params.nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${dataFmt}*\n\n💠 PIX Copia e Cola:\n${params.asaasPix || "—"}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
  } else {
    text = `Olá ${nomeContato}! 👋\n\nA fatura está disponível:\n\nEmpresa: ${params.nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${dataFmt}*\n\n🔗 Acesse o boleto: ${params.asaasUrl || "—"}\n\nLinha digitável:\n${params.asaasBarcode || "—"}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
  }

  let formattedNumber = phone.replace(/\D/g, "");
  if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
  if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

  const baseUrl = whatsConfig.server_url.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", apikey: whatsConfig.token };
  const instanceName = "Softflow_WhatsApp";

  let res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ number: formattedNumber, text }),
  });

  if (!res.ok && formattedNumber.length === 13 && formattedNumber.startsWith("55")) {
    const withoutNinth = formattedNumber.slice(0, 4) + formattedNumber.slice(5);
    const res2 = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: withoutNinth, text }),
    });
    if (res2.ok) res = res2;
  }

  await supabase.from("notificacoes_cobranca_log").insert({
    fatura_id: params.faturaId,
    cliente_id: params.clienteId,
    tipo_gatilho: "fatura_gerada",
    canal: "whatsapp",
    status_envio: res.ok ? "enviado" : "erro",
  });

  console.log(`WhatsApp fatura ${params.faturaId}: ${res.ok ? "OK" : "FAILED"}`);
}

interface ProcessResult {
  contrato_financeiro_id: string;
  cliente_nome: string;
  status: "sucesso" | "erro" | "pulado";
  valor: number;
  erro?: string;
  fatura_id?: string;
}

async function processContrato(
  supabase: any,
  contrato: any,
  mes: number,
  ano: number
): Promise<ProcessResult> {
  const clienteNome = contrato.clientes?.nome_fantasia || "Desconhecido";

  try {
    // 1. Check idempotency — skip if invoice already exists for this period
    const { data: existing } = await supabase
      .from("faturas")
      .select("id")
      .eq("contrato_id", contrato.contrato_id)
      .eq("referencia_mes", mes)
      .eq("referencia_ano", ano)
      .eq("gerado_automaticamente", true)
      .maybeSingle();

    if (existing) {
      return { contrato_financeiro_id: contrato.id, cliente_nome: clienteNome, status: "pulado", valor: 0 };
    }

    // 2. Calculate consolidated value
    let valorTotal = contrato.valor_mensalidade || 0;

    // 2b. Implantação parcels
    let parcelaImplantacao = 0;
    if (contrato.valor_implantacao > 0 && contrato.parcelas_implantacao > 0) {
      if (contrato.parcelas_pagas < contrato.parcelas_implantacao) {
        parcelaImplantacao = contrato.valor_implantacao / contrato.parcelas_implantacao;
        valorTotal += parcelaImplantacao;
      }
    }

    // 2c. Active modules
    const { data: modulos } = await supabase
      .from("contrato_financeiro_modulos")
      .select("valor_mensal")
      .eq("contrato_financeiro_id", contrato.id)
      .eq("ativo", true);

    const valorModulos = (modulos || []).reduce((sum: number, m: any) => sum + (m.valor_mensal || 0), 0);
    valorTotal += valorModulos;

    // 2d. OAs for this month not yet billed
    const { data: oas } = await supabase
      .from("contrato_financeiro_oas")
      .select("id, valor")
      .eq("contrato_financeiro_id", contrato.id)
      .eq("mes_referencia", mes)
      .eq("ano_referencia", ano)
      .eq("faturada", false);

    const valorOas = (oas || []).reduce((sum: number, o: any) => sum + (o.valor || 0), 0);
    valorTotal += valorOas;

    if (valorTotal <= 0) {
      return { contrato_financeiro_id: contrato.id, cliente_nome: clienteNome, status: "pulado", valor: 0 };
    }

    // 3. Calculate due date
    const diaVenc = contrato.dia_vencimento || 10;
    const dueDate = `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(diaVenc, 28)).padStart(2, "0")}`;

    // 4. Create invoice in faturas
    const { data: fatura, error: faturaError } = await supabase
      .from("faturas")
      .insert({
        cliente_id: contrato.cliente_id,
        contrato_id: contrato.contrato_id,
        filial_id: contrato.filial_id,
        tipo: "Mensalidade",
        valor: valorTotal,
        valor_final: valorTotal,
        valor_desconto: 0,
        data_emissao: new Date().toISOString().split("T")[0],
        data_vencimento: dueDate,
        referencia_mes: mes,
        referencia_ano: ano,
        status: "Pendente",
        forma_pagamento: contrato.forma_pagamento || "BOLETO",
        gerado_automaticamente: true,
        observacoes: `Fatura gerada automaticamente — ${String(mes).padStart(2, "0")}/${ano}`,
      })
      .select("id, numero_fatura")
      .single();

    if (faturaError) throw new Error(`Erro ao criar fatura: ${faturaError.message}`);

    // 5. Asaas integration
    const asaasConfig = contrato.filial_id
      ? await getAsaasConfig(supabase, contrato.filial_id)
      : null;

    if (asaasConfig) {
      try {
        const cliente = contrato.clientes;
        const customerId = await ensureAsaasCustomer(
          asaasConfig.baseUrl, asaasConfig.apiKey, supabase, contrato, cliente
        );

        const billingType = contrato.forma_pagamento === "PIX" ? "PIX" : "BOLETO";
        const payment = await asaasFetch(asaasConfig.baseUrl, asaasConfig.apiKey, "/payments", "POST", {
          customer: customerId,
          billingType,
          value: valorTotal,
          dueDate,
          description: `Fatura ${fatura.numero_fatura} — ${clienteNome}`,
          externalReference: fatura.id,
        });

        // 6. Fetch payment details (barcode or pix)
        const asaasUpdate: Record<string, unknown> = {
          asaas_payment_id: payment.id,
          asaas_url: payment.invoiceUrl || payment.bankSlipUrl || null,
          asaas_bank_slip_url: payment.bankSlipUrl || null,
        };

        try {
          if (billingType === "BOLETO") {
            const boletoData = await asaasFetch(asaasConfig.baseUrl, asaasConfig.apiKey, `/payments/${payment.id}/identificationField`, "GET");
            if (boletoData?.identificationField) asaasUpdate.asaas_barcode = boletoData.identificationField;
          } else if (billingType === "PIX") {
            const pixData = await asaasFetch(asaasConfig.baseUrl, asaasConfig.apiKey, `/payments/${payment.id}/pixQrCode`, "GET");
            if (pixData?.payload) asaasUpdate.asaas_pix_qrcode = pixData.payload;
            if (pixData?.encodedImage) asaasUpdate.asaas_pix_image = pixData.encodedImage;
          }
        } catch (detailErr) {
          console.warn(`Failed to fetch payment details for ${payment.id}:`, detailErr);
        }

        await supabase.from("faturas").update(asaasUpdate).eq("id", fatura.id);

        // Send WhatsApp notification
        try {
          await sendWhatsAppForFatura(supabase, {
            faturaId: fatura.id,
            clienteId: contrato.cliente_id,
            nomeFantasia: clienteNome,
            valor: valorTotal,
            dataVencimento: dueDate,
            billingType,
            asaasUrl: asaasUpdate.asaas_url as string | null,
            asaasBarcode: (asaasUpdate.asaas_barcode as string) || null,
            asaasPix: (asaasUpdate.asaas_pix_qrcode as string) || null,
          });
        } catch (whatsErr) {
          console.warn("WhatsApp notification failed (non-blocking):", whatsErr);
        }
      } catch (asaasErr: unknown) {
        const msg = asaasErr instanceof Error ? asaasErr.message : "Erro Asaas";
        console.warn(`Asaas error for contrato ${contrato.id}: ${msg}`);
        // Invoice was created, Asaas just failed — log but don't fail the whole process
      }
    }

    // 7. Post-processing: increment parcelas_pagas
    if (parcelaImplantacao > 0) {
      await supabase
        .from("contratos_financeiros")
        .update({ parcelas_pagas: (contrato.parcelas_pagas || 0) + 1 })
        .eq("id", contrato.id);
    }

    // Mark OAs as billed
    if (oas && oas.length > 0) {
      const oaIds = oas.map((o: any) => o.id);
      await supabase.from("contrato_financeiro_oas").update({ faturada: true }).in("id", oaIds);
    }

    return {
      contrato_financeiro_id: contrato.id,
      cliente_nome: clienteNome,
      status: "sucesso",
      valor: valorTotal,
      fatura_id: fatura.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return {
      contrato_financeiro_id: contrato.id,
      cliente_nome: clienteNome,
      status: "erro",
      valor: 0,
      erro: message,
    };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: accept either Bearer JWT or CRON_SECRET
    const authHeader = req.headers.get("authorization");
    const supabase = getSupabaseAdmin();
    let authenticated = false;

    if (authHeader) {
      // Check if it's the service role key (cron) or a user JWT
      const token = authHeader.replace("Bearer ", "");

      // Try user auth
      const { data: { user } } = await createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!
      ).auth.getUser(token);

      if (user) authenticated = true;

      // Also accept service role (from pg_cron)
      if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) authenticated = true;
    }

    if (!authenticated) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request
    const body = await req.json().catch(() => ({}));
    const now = new Date();
    const mes = body.mes || (now.getMonth() + 1);
    const ano = body.ano || now.getFullYear();

    console.log(`Gerando faturas para ${String(mes).padStart(2, "0")}/${ano}`);

    // 1. Fetch active financial contracts with client data
    const { data: contratos, error: contratosError } = await supabase
      .from("contratos_financeiros")
      .select(`
        id, contrato_id, cliente_id, filial_id, plano_id, pedido_id,
        valor_mensalidade, valor_implantacao, parcelas_implantacao, parcelas_pagas,
        dia_vencimento, forma_pagamento, email_cobranca, whatsapp_cobranca,
        asaas_customer_id, contrato_base_id, tipo, status,
        clientes(id, nome_fantasia, razao_social, cnpj_cpf, email, telefone)
      `)
      .eq("status", "Ativo");

    if (contratosError) {
      throw new Error(`Erro ao buscar contratos: ${contratosError.message}`);
    }

    if (!contratos || contratos.length === 0) {
      return new Response(JSON.stringify({
        mes, ano,
        total: 0, geradas: 0, erros: 0, puladas: 0,
        resultados: [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Process each contract
    const resultados: ProcessResult[] = [];

    for (const contrato of contratos) {
      // Only process base contracts (sub-records are consolidated into the base)
      if (contrato.tipo !== "Base" && contrato.tipo !== "base") {
        continue;
      }

      const result = await processContrato(supabase, contrato, mes, ano);
      resultados.push(result);

      // 7. Log each result
      await supabase.from("faturamento_logs").insert({
        contrato_financeiro_id: contrato.id,
        mes,
        ano,
        status: result.status,
        valor: result.valor,
        fatura_id: result.fatura_id || null,
        erro: result.erro || null,
      });
    }

    const geradas = resultados.filter(r => r.status === "sucesso").length;
    const erros = resultados.filter(r => r.status === "erro").length;
    const puladas = resultados.filter(r => r.status === "pulado").length;

    console.log(`Concluído: ${geradas} geradas, ${erros} erros, ${puladas} puladas`);

    return new Response(JSON.stringify({
      mes,
      ano,
      total: resultados.length,
      geradas,
      erros,
      puladas,
      resultados,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("gerar-faturas-mensais error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
