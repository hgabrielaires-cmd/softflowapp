// ─── Edge Function: Régua de Cobrança (Billing Reminders) ────────────────
// Runs daily via pg_cron. Checks pending invoices and sends WhatsApp reminders
// based on configurable rules per branch.

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

interface CobrancaConfig {
  regua_ativa: boolean;
  dias_lembrete_1: number;
  dias_lembrete_vencimento: boolean;
  dias_atraso_alerta: number;
  dias_atraso_suspensao: number;
}

const DEFAULT_CONFIG: CobrancaConfig = {
  regua_ativa: true,
  dias_lembrete_1: 5,
  dias_lembrete_vencimento: true,
  dias_atraso_alerta: 3,
  dias_atraso_suspensao: 5,
};

function diffDays(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

function fmtCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildMessage(
  tipo: string,
  nome: string,
  nomeFantasia: string,
  valor: number,
  dataVenc: string,
  link: string | null,
  billingType: string,
  barcode: string | null,
  pixCode: string | null,
): string {
  const valorFmt = fmtCurrency(valor);
  const dataFmt = fmtDate(dataVenc);
  const linkText = link || "—";
  const pixSection = pixCode ? `\n\n💠 PIX Copia e Cola:\n${pixCode}` : "";

  switch (tipo) {
    case "lembrete_5d":
      return `⏰ Olá ${nome}! Lembrete: sua fatura vence em 5 dias.\n\nEmpresa: ${nomeFantasia}\n💰 R$ ${valorFmt} — Vence em ${dataFmt}\n🔗 ${linkText}${pixSection}`;

    case "vencimento_dia":
      return `🔔 ${nome}, sua fatura vence *hoje*!\n\nEmpresa: ${nomeFantasia}\n💰 R$ ${valorFmt}\n🔗 ${linkText}${pixSection}`;

    case "atraso_3d":
      return `🔴 ${nome}, sua fatura está em atraso há 3 dias.\nRegularize para evitar suspensão do sistema.\n\nEmpresa: ${nomeFantasia}\n💰 R$ ${valorFmt}\n🔗 ${linkText}${pixSection}`;

    case "atraso_5d":
      return `🔴 ${nome}, sua fatura está em atraso há 5 dias.\nO travamento do sistema ocorre de maneira automática e pode atrapalhar sua operação.\n\nEmpresa: ${nomeFantasia}\n💰 R$ ${valorFmt}\n🔗 ${linkText}${pixSection}`;

    default:
      return `Olá ${nome}, sobre sua fatura de R$ ${valorFmt} com vencimento em ${dataFmt}.\n🔗 ${linkText}${pixSection}`;
  }
}

async function sendWhatsApp(
  serverUrl: string,
  apiKey: string,
  phone: string,
  text: string,
  instanceName: string = "Softflow_WhatsApp",
): Promise<boolean> {
  let formattedNumber = phone.replace(/\D/g, "");
  if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
  if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

  const baseUrl = serverUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", apikey: apiKey };

  let res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ number: formattedNumber, text }),
  });

  // Retry without 9th digit
  if (!res.ok && formattedNumber.length === 13 && formattedNumber.startsWith("55")) {
    const withoutNinth = formattedNumber.slice(0, 4) + formattedNumber.slice(5);
    const res2 = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers,
      body: JSON.stringify({ number: withoutNinth, text }),
    });
    if (res2.ok) res = res2;
  }

  return res.ok;
}

// ── Auth helper: accepts service role, cron secret, anon key, or valid JWT ──
async function authenticateRequest(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const cronSecret = Deno.env.get("CRON_SECRET") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  // System calls: service role, cron secret, or anon key (for pg_cron when vault is unavailable)
  if (serviceRoleKey && token === serviceRoleKey) return true;
  if (cronSecret && token === cronSecret) return true;
  if (anonKey && token === anonKey) return true;

  // User JWT validation
  try {
    const { data: { user } } = await createClient(
      Deno.env.get("SUPABASE_URL")!,
      anonKey
    ).auth.getUser(token);
    if (user) return true;
  } catch { /* invalid token */ }

  return false;
}

// ── Main ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authenticated = await authenticateRequest(req);
    if (!authenticated) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Régua de cobrança: iniciando processamento...");

    const supabase = getSupabaseAdmin();

    // Get WhatsApp config
    const { data: whatsConfig } = await supabase
      .from("integracoes_config")
      .select("server_url, token, ativo")
      .eq("nome", "whatsapp")
      .maybeSingle();

    if (!whatsConfig?.ativo || !whatsConfig?.server_url || !whatsConfig?.token) {
      console.log("WhatsApp integration not active");
      return new Response(JSON.stringify({ message: "WhatsApp não configurado", processados: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve instance_name from setor "Financeiro"
    const { data: setorFinanceiro } = await supabase
      .from("setores")
      .select("instance_name")
      .ilike("nome", "financeiro")
      .eq("ativo", true)
      .maybeSingle();

    const financeiroInstanceName = setorFinanceiro?.instance_name || "Softflow_WhatsApp";

    // Load all cobranca configs by filial
    const { data: configs } = await supabase
      .from("cobranca_config")
      .select("*");

    const configMap = new Map<string, CobrancaConfig>();
    (configs || []).forEach((c: any) => {
      configMap.set(c.filial_id, {
        regua_ativa: c.regua_ativa,
        dias_lembrete_1: c.dias_lembrete_1,
        dias_lembrete_vencimento: c.dias_lembrete_vencimento,
        dias_atraso_alerta: c.dias_atraso_alerta,
        dias_atraso_suspensao: c.dias_atraso_suspensao,
      });
    });

    function getConfig(filialId: string | null): CobrancaConfig {
      if (filialId && configMap.has(filialId)) return configMap.get(filialId)!;
      return DEFAULT_CONFIG;
    }

    // Fetch all pending invoices
    const { data: faturas, error: fatError } = await supabase
      .from("faturas")
      .select(`
        id, cliente_id, filial_id, valor_final, data_vencimento, status,
        forma_pagamento, asaas_url, asaas_barcode, asaas_pix_qrcode,
        clientes(nome_fantasia, telefone)
      `)
      .in("status", ["Pendente", "Vencido"]);

    if (fatError) throw new Error(`Erro ao buscar faturas: ${fatError.message}`);
    if (!faturas || faturas.length === 0) {
      console.log("Nenhuma fatura pendente encontrada");
      return new Response(JSON.stringify({ message: "Nenhuma fatura pendente", processados: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    let enviados = 0;
    let erros = 0;
    let pulados = 0;

    for (const fatura of faturas) {
      const config = getConfig(fatura.filial_id);
      if (!config.regua_ativa) { pulados++; continue; }

      const diff = diffDays(fatura.data_vencimento);
      let tipoGatilho: string | null = null;

      // Determine which trigger applies
      if (diff === config.dias_lembrete_1) {
        tipoGatilho = "lembrete_5d";
      } else if (diff === 0 && config.dias_lembrete_vencimento) {
        tipoGatilho = "vencimento_dia";
      } else if (diff === -config.dias_atraso_alerta) {
        tipoGatilho = "atraso_3d";
      } else if (diff === -config.dias_atraso_suspensao) {
        tipoGatilho = "atraso_5d";
      } else if (diff === -(config.dias_atraso_suspensao + 1)) {
        // 6 days after (suspensao + 1): mark as inadimplente
        tipoGatilho = "atraso_6d";
      }

      if (!tipoGatilho) { pulados++; continue; }

      // Check idempotency: already sent this trigger today?
      const { data: alreadySent } = await supabase
        .from("notificacoes_cobranca_log")
        .select("id")
        .eq("fatura_id", fatura.id)
        .eq("tipo_gatilho", tipoGatilho)
        .gte("enviado_em", today + "T00:00:00")
        .maybeSingle();

      if (alreadySent) { pulados++; continue; }

      // Re-check payment status right before sending (avoid race condition with webhook)
      const { data: freshFatura } = await supabase
        .from("faturas")
        .select("status")
        .eq("id", fatura.id)
        .single();

      if (freshFatura && !["Pendente", "Vencido"].includes(freshFatura.status)) {
        console.log(`Fatura ${fatura.id} já foi paga/cancelada (${freshFatura.status}), pulando`);
        pulados++;
        continue;
      }

      // Get decisor contact
      const { data: decisor } = await supabase
        .from("cliente_contatos")
        .select("telefone, nome")
        .eq("cliente_id", fatura.cliente_id)
        .eq("decisor", true)
        .eq("ativo", true)
        .maybeSingle();

      const phone = decisor?.telefone || (fatura.clientes as any)?.telefone;
      if (!phone) {
        console.warn(`No phone for client ${fatura.cliente_id}, skipping`);
        pulados++;
        continue;
      }

      const nomeContato = decisor?.nome || (fatura.clientes as any)?.nome_fantasia || "Cliente";
      const nomeFantasia = (fatura.clientes as any)?.nome_fantasia || "—";

      // Handle atraso_6d: also mark client as Inadimplente
      if (tipoGatilho === "atraso_6d") {
        await supabase
          .from("clientes")
          .update({ status_financeiro: "Inadimplente" })
          .eq("id", fatura.cliente_id);

        // Also update invoice status to Vencido if still Pendente
        if (fatura.status === "Pendente") {
          await supabase.from("faturas").update({ status: "Vencido" }).eq("id", fatura.id);
        }
      }

      // Also update overdue invoices
      if (diff < 0 && fatura.status === "Pendente") {
        await supabase.from("faturas").update({ status: "Vencido" }).eq("id", fatura.id);
      }

      const text = buildMessage(
        tipoGatilho,
        nomeContato,
        nomeFantasia,
        fatura.valor_final,
        fatura.data_vencimento,
        fatura.asaas_url,
        fatura.forma_pagamento || "BOLETO",
        fatura.asaas_barcode,
        fatura.asaas_pix_qrcode,
      );

      const sent = await sendWhatsApp(
        whatsConfig.server_url,
        whatsConfig.token,
        phone,
        text,
        financeiroInstanceName,
      );

      await supabase.from("notificacoes_cobranca_log").insert({
        fatura_id: fatura.id,
        cliente_id: fatura.cliente_id,
        tipo_gatilho: tipoGatilho,
        canal: "whatsapp",
        status_envio: sent ? "enviado" : "erro",
      });

      if (sent) enviados++;
      else erros++;
    }

    console.log(`Régua concluída: ${enviados} enviados, ${erros} erros, ${pulados} pulados`);

    return new Response(JSON.stringify({
      processados: faturas.length,
      enviados,
      erros,
      pulados,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("regua-cobranca error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
