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

// ── Asaas helpers ─────────────────────────────────────────────────────────

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
  if (contrato.asaas_customer_id) return contrato.asaas_customer_id;

  const cpf = cliente.cnpj_cpf.replace(/\D/g, "");
  const existing = await asaasFetch(baseUrl, apiKey, `/customers?cpfCnpj=${encodeURIComponent(cpf)}`, "GET");
  if (existing?.data?.length > 0) {
    const customerId = existing.data[0].id;
    await supabase.from("contratos_financeiros").update({ asaas_customer_id: customerId }).eq("id", contrato.id);
    return customerId;
  }

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

// ── WhatsApp notification ─────────────────────────────────────────────────

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

  // Resolve instance_name from setor "Financeiro"
  const { data: setorFinanceiro } = await supabase
    .from("setores")
    .select("instance_name")
    .ilike("nome", "financeiro")
    .eq("ativo", true)
    .maybeSingle();

  const instanceName = setorFinanceiro?.instance_name || "Softflow_WhatsApp";

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
    text = `Olá ${nomeContato}! 👋\n\nA fatura está disponível:\n\nEmpresa: ${params.nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${dataFmt}*\n\n🔗 Acesse o boleto: ${params.asaasUrl || "—"}\n\nLinha digitável:\n${params.asaasBarcode || "—"}${params.asaasPix ? `\n\n💠 PIX Copia e Cola:\n${params.asaasPix}` : ""}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
  }

  let formattedNumber = phone.replace(/\D/g, "");
  if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
  if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

  const baseUrl = whatsConfig.server_url.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", apikey: whatsConfig.token };

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
}

// ── Process single contract ───────────────────────────────────────────────

interface ProcessResult {
  contrato_financeiro_id: string;
  cliente_nome: string;
  status: "sucesso" | "erro" | "ja_faturado";
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
    // 1. Idempotency: check by contrato_financeiro_id
    const { data: existing } = await supabase
      .from("faturas")
      .select("id")
      .eq("contrato_financeiro_id", contrato.id)
      .eq("referencia_mes", mes)
      .eq("referencia_ano", ano)
      .eq("gerado_automaticamente", true)
      .maybeSingle();

    if (existing) {
      return { contrato_financeiro_id: contrato.id, cliente_nome: clienteNome, status: "ja_faturado", valor: 0 };
    }

    // 2. Calculate consolidated value
    let valorTotal = contrato.valor_mensalidade || 0;

    // 2b. Implantação parcels
    let parcelaImplantacao = 0;
    if (contrato.valor_implantacao > 0 && contrato.parcelas_implantacao > 0) {
      if ((contrato.parcelas_pagas || 0) < contrato.parcelas_implantacao) {
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
      return { contrato_financeiro_id: contrato.id, cliente_nome: clienteNome, status: "ja_faturado", valor: 0 };
    }

    // 3. Calculate due date
    const diaVenc = contrato.dia_vencimento || 10;
    const dueDate = `${ano}-${String(mes).padStart(2, "0")}-${String(Math.min(diaVenc, 28)).padStart(2, "0")}`;

    // 4. Determine billing type
    const formaPagamento = contrato.forma_pagamento === "Ambos"
      ? "BOLETO"
      : (contrato.forma_pagamento || "BOLETO");

    // 5. Get plano name for description
    let planoNome = "Sem plano";
    if (contrato.plano_id) {
      const { data: plano } = await supabase
        .from("planos")
        .select("nome")
        .eq("id", contrato.plano_id)
        .maybeSingle();
      if (plano?.nome) planoNome = plano.nome;
    }

    // 6. Create invoice
    const { data: fatura, error: faturaError } = await supabase
      .from("faturas")
      .insert({
        cliente_id: contrato.cliente_id,
        contrato_id: contrato.contrato_id,
        contrato_financeiro_id: contrato.id,
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
        forma_pagamento: formaPagamento,
        gerado_automaticamente: true,
        observacoes: `Softplus — ${planoNome} — ${String(mes).padStart(2, "0")}/${ano}`,
      })
      .select("id, numero_fatura")
      .single();

    if (faturaError) throw new Error(`Erro ao criar fatura: ${faturaError.message}`);

    // 7. Asaas integration (non-blocking)
    const asaasConfig = contrato.filial_id
      ? await getAsaasConfig(supabase, contrato.filial_id)
      : null;

    if (asaasConfig) {
      try {
        const cliente = contrato.clientes;
        const customerId = await ensureAsaasCustomer(
          asaasConfig.baseUrl, asaasConfig.apiKey, supabase, contrato, cliente
        );

        const billingType = formaPagamento === "PIX" ? "PIX" : "BOLETO";
        const payment = await asaasFetch(asaasConfig.baseUrl, asaasConfig.apiKey, "/payments", "POST", {
          customer: customerId,
          billingType,
          value: valorTotal,
          dueDate,
          description: `Softplus — ${planoNome} — ${String(mes).padStart(2, "0")}/${ano} — ${clienteNome}`,
          externalReference: fatura.id,
        });

        const asaasUpdate: Record<string, unknown> = {
          asaas_payment_id: payment.id,
          asaas_url: payment.invoiceUrl || payment.bankSlipUrl || null,
          asaas_bank_slip_url: payment.bankSlipUrl || null,
        };

        try {
          if (billingType === "BOLETO") {
            const boletoData = await asaasFetch(asaasConfig.baseUrl, asaasConfig.apiKey, `/payments/${payment.id}/identificationField`, "GET");
            if (boletoData?.identificationField) asaasUpdate.asaas_barcode = boletoData.identificationField;
          }
          // Always fetch PIX QR Code (Asaas generates PIX for all payment types)
          try {
            const pixData = await asaasFetch(asaasConfig.baseUrl, asaasConfig.apiKey, `/payments/${payment.id}/pixQrCode`, "GET");
            if (pixData?.payload) asaasUpdate.asaas_pix_qrcode = pixData.payload;
            if (pixData?.encodedImage) asaasUpdate.asaas_pix_image = pixData.encodedImage;
          } catch (_pixErr) {
            console.warn(`PIX QR not available for payment ${payment.id}`);
          }
        } catch (detailErr) {
          console.warn(`Failed to fetch payment details for ${payment.id}:`, detailErr);
        }

        await supabase.from("faturas").update(asaasUpdate).eq("id", fatura.id);

        // Send WhatsApp notification (non-blocking)
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
        // Fatura created, Asaas failed — log but don't revert
      }
    }

    // 8. Post-processing: increment parcelas_pagas
    if (parcelaImplantacao > 0) {
      const novasPagas = (contrato.parcelas_pagas || 0) + 1;
      await supabase
        .from("contratos_financeiros")
        .update({ parcelas_pagas: novasPagas })
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
    // Auth: accept Bearer JWT or service role key
    const authHeader = req.headers.get("authorization");
    const supabase = getSupabaseAdmin();
    let authenticated = false;

    if (authHeader) {
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
      .eq("status", "Ativo")
      .not("filial_id", "is", null);

    if (contratosError) {
      throw new Error(`Erro ao buscar contratos: ${contratosError.message}`);
    }

    if (!contratos || contratos.length === 0) {
      // Log empty run
      await supabase.from("faturamento_cron_logs").insert({
        mes, ano,
        total_contratos: 0, total_faturados: 0, total_erros: 0, total_ja_faturados: 0,
        detalhes: [],
      });

      return new Response(JSON.stringify({
        mes, ano,
        total_contratos: 0, total_faturados: 0, total_erros: 0, total_ja_faturados: 0,
        resultados: [],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Process each base contract
    const resultados: ProcessResult[] = [];

    for (const contrato of contratos) {
      if (contrato.tipo !== "Base" && contrato.tipo !== "base") {
        continue;
      }
      const result = await processContrato(supabase, contrato, mes, ano);
      resultados.push(result);
    }

    const total_faturados = resultados.filter(r => r.status === "sucesso").length;
    const total_erros = resultados.filter(r => r.status === "erro").length;
    const total_ja_faturados = resultados.filter(r => r.status === "ja_faturado").length;

    console.log(`Concluído: ${total_faturados} geradas, ${total_erros} erros, ${total_ja_faturados} já faturados`);

    // 3. Log execution to faturamento_cron_logs
    await supabase.from("faturamento_cron_logs").insert({
      mes,
      ano,
      total_contratos: resultados.length,
      total_faturados,
      total_erros,
      total_ja_faturados,
      detalhes: resultados,
    });

    return new Response(JSON.stringify({
      mes,
      ano,
      total_contratos: resultados.length,
      total_faturados,
      total_erros,
      total_ja_faturados,
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
