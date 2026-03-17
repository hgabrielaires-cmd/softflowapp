// ─── Utilitário compartilhado: Enviar fatura via WhatsApp (setor Financeiro) ──

import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";

interface FaturaParaEnvio {
  id: string;
  cliente_id: string;
  filial_id: string | null;
  valor_final: number;
  data_vencimento: string;
  forma_pagamento: string | null;
  asaas_payment_id: string | null;
  asaas_url: string | null;
  asaas_barcode: string | null;
  asaas_pix_qrcode: string | null;
}

/**
 * Envia a fatura via WhatsApp pelo setor Financeiro.
 * Busca contato decisor, instância do setor e monta a mensagem com PIX.
 * Não lança erro — retorna { ok, error } para o chamador decidir.
 */
export async function enviarFaturaWhatsApp(fatura: FaturaParaEnvio): Promise<{ ok: boolean; error?: string }> {
  try {
    if (!fatura.cliente_id) return { ok: false, error: "Fatura sem cliente vinculado" };

    // 1. Dados do cliente
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nome_fantasia, telefone")
      .eq("id", fatura.cliente_id)
      .single();

    // 2. Contato decisor
    const { data: decisor } = await supabase
      .from("cliente_contatos")
      .select("telefone, nome")
      .eq("cliente_id", fatura.cliente_id)
      .eq("decisor", true)
      .eq("ativo", true)
      .maybeSingle();

    const phone = decisor?.telefone || cliente?.telefone;
    if (!phone) return { ok: false, error: "Nenhum telefone encontrado para o cliente" };

    // 3. Config WhatsApp
    const { data: whatsConfig } = await supabase
      .from("integracoes_config")
      .select("server_url, token, ativo")
      .eq("nome", "whatsapp")
      .maybeSingle();

    if (!whatsConfig?.ativo || !whatsConfig?.server_url || !whatsConfig?.token) {
      return { ok: false, error: "Integração WhatsApp não configurada" };
    }

    // 4. Instância do setor Financeiro
    const { data: setorFinanceiro } = await supabase
      .from("setores")
      .select("instance_name")
      .ilike("nome", "financeiro")
      .eq("ativo", true)
      .maybeSingle();

    const instanceName = setorFinanceiro?.instance_name || "Softflow_WhatsApp";

    // 5. Dados formatados
    const nomeContato = decisor?.nome || cliente?.nome_fantasia || "Cliente";
    const nomeFantasia = cliente?.nome_fantasia || "—";
    const valorFmt = fatura.valor_final.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const dataFmt = format(parseISO(fatura.data_vencimento), "dd/MM/yyyy");

    // 6. PIX — buscar se necessário
    let pixCode = fatura.asaas_pix_qrcode;
    if (!pixCode && fatura.asaas_payment_id && fatura.filial_id) {
      try {
        const { data: pixResult } = await supabase.functions.invoke("asaas", {
          body: {
            action: "fetch_pix",
            payment_id: fatura.asaas_payment_id,
            filial_id: fatura.filial_id,
          },
        });
        if (pixResult?.pix_qrcode) {
          pixCode = pixResult.pix_qrcode;
          await supabase.from("faturas").update({
            asaas_pix_qrcode: pixCode,
            asaas_pix_image: pixResult.pix_image || null,
          }).eq("id", fatura.id);
        }
      } catch (_pixErr) {
        console.warn("Could not fetch PIX code:", _pixErr);
      }
    }

    // 7. Montar mensagem
    const billingType = (fatura.forma_pagamento || "").toUpperCase().includes("PIX") ? "PIX" : "BOLETO";

    let text = "";
    if (billingType === "PIX") {
      text = `Olá ${nomeContato}! 👋\n\nSua fatura está disponível:\n\nEmpresa: ${nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${dataFmt}*\n\n💠 PIX Copia e Cola:\n${pixCode || "—"}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
    } else {
      text = `Olá ${nomeContato}! 👋\n\nA fatura está disponível:\n\nEmpresa: ${nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${dataFmt}*\n\n🔗 Acesse o boleto: ${fatura.asaas_url || "—"}\n\nLinha digitável:\n${fatura.asaas_barcode || "—"}${pixCode ? `\n\n💠 PIX Copia e Cola:\n${pixCode}` : ""}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
    }

    // 8. Formatar número
    let formattedNumber = phone.replace(/\D/g, "");
    if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
    if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

    // 9. Enviar
    const { error } = await supabase.functions.invoke("evolution-api", {
      body: {
        action: "send_text",
        instance_name: instanceName,
        number: formattedNumber,
        text,
      },
    });

    if (error) return { ok: false, error: error.message };

    return { ok: true };
  } catch (err: any) {
    console.error("Erro ao enviar fatura WhatsApp:", err);
    return { ok: false, error: err?.message || "Erro desconhecido" };
  }
}
