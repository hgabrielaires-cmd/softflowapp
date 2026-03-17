// ─── Form/save hook for Configurar Faturamento ───────────────────────────

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { ContratoEspelho, ConfigFaturamentoForm, ContratoFinanceiroBase } from "./types";
import { validateConfigForm } from "./helpers";
import { enviarFaturaWhatsApp } from "@/lib/enviarFaturaWhatsApp";

export function useConfigurarFaturamentoForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  async function handleSave(
    form: ConfigFaturamentoForm,
    espelho: ContratoEspelho,
    contratoFinanceiroBase: ContratoFinanceiroBase | null
  ) {
    const err = validateConfigForm(form, espelho.tipo);
    if (err) { toast.error(err); return; }

    setSaving(true);
    try {
      const tipoPedido = espelho.pedido?.tipo_pedido || "";
      // Correção 3: force_novo overrides isSubRegistro
      const isSubRegistro = !!espelho.contrato_origem_id && !!contratoFinanceiroBase && !form.force_novo;
      const isUpgrade = tipoPedido === "Upgrade";
      const isDowngrade = tipoPedido === "Downgrade";
      const isModuloAdicional = tipoPedido === "Módulo Adicional" || tipoPedido === "Aditivo";
      const isOA = espelho.tipo === "OA";

      if (isSubRegistro) {
        await handleSubRegistro(form, espelho, contratoFinanceiroBase!, {
          isUpgrade, isDowngrade, isModuloAdicional, isOA,
        });
      } else {
        await handleContratoNovo(form, espelho);
      }

      // Log force_novo override in history if used
      if (form.force_novo && espelho.contrato_origem_id) {
        // This is logged as part of handleContratoNovo's history
      }

      toast.success("Faturamento configurado com sucesso!");
      navigate("/faturamento");
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ─── CONTRATO NOVO (REGRA 5) ───────────────────────────────────────────
  async function handleContratoNovo(form: ConfigFaturamentoForm, espelho: ContratoEspelho) {
    const filialId = espelho.pedido?.filial_id || espelho.cliente?.filial_id || null;

    // Correção 4: implantacao_ja_cobrada
    const implJaCobrada = form.implantacao_ja_cobrada;

    // Criar contrato financeiro base
    const { data: cf, error: cfErr } = await supabase
      .from("contratos_financeiros")
      .insert({
        contrato_id: espelho.id,
        contrato_base_id: null,
        cliente_id: espelho.cliente.id,
        filial_id: filialId,
        plano_id: espelho.plano?.id || null,
        pedido_id: espelho.pedido?.id || null,
        tipo: "Contrato Inicial",
        valor_mensalidade: form.valor_mensalidade,
        dia_vencimento: form.dia_vencimento,
        forma_pagamento: form.forma_pagamento,
        data_inicio: `${form.ano_inicio}-${String(form.mes_inicio).padStart(2, "0")}-01`,
        valor_implantacao: form.valor_implantacao,
        parcelas_implantacao: form.parcelas_implantacao,
        parcelas_pagas: 0,
        email_cobranca: form.email_cobranca || null,
        whatsapp_cobranca: form.whatsapp_cobranca || null,
        observacoes: form.observacoes || null,
        status: "Ativo",
        implantacao_ja_cobrada: implJaCobrada,
      })
      .select("id")
      .single();

    if (cfErr || !cf) throw new Error("Erro ao criar contrato financeiro: " + (cfErr?.message || ""));

    // Criar parcelas de implantação
    if (form.valor_implantacao > 0) {
      const valorParcela = Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100;
      await supabase.from("parcelas_implantacao").insert({
        contrato_financeiro_id: cf.id,
        contrato_origem_id: espelho.id,
        descricao: `Implantação ${espelho.plano?.nome || "Contrato"}`,
        valor_total: form.valor_implantacao,
        numero_parcelas: form.parcelas_implantacao,
        valor_por_parcela: valorParcela,
        parcelas_pagas: implJaCobrada ? form.parcelas_implantacao : 0,
        status: implJaCobrada ? "quitada" : "pendente",
        observacao: implJaCobrada ? "Quitada no sistema anterior" : null,
      });
    }

    // Inserir módulos
    if (form.modulos.length > 0) {
      const modulosPayload = form.modulos.map((m) => ({
        contrato_financeiro_id: cf.id,
        nome: m.nome,
        valor_mensal: m.valor_mensal,
        data_inicio: m.data_inicio,
        ativo: true,
      }));
      await supabase.from("contrato_financeiro_modulos").insert(modulosPayload);
    }

    // Registrar histórico
    const historicoDesc = form.force_novo
      ? `Contrato financeiro criado (base faturado externamente) — ${espelho.numero_exibicao}`
      : `Contrato financeiro criado — ${espelho.numero_exibicao}`;

    await supabase.from("contrato_financeiro_historico").insert({
      contrato_financeiro_id: cf.id,
      tipo: "criacao",
      descricao: historicoDesc,
      dados_novos: {
        valor_mensalidade: form.valor_mensalidade,
        valor_implantacao: form.valor_implantacao,
        parcelas: form.parcelas_implantacao,
        plano: espelho.plano?.nome,
        implantacao_ja_cobrada: implJaCobrada,
        force_novo: form.force_novo || false,
      },
      contrato_origem_id: espelho.id,
    });

    // Gerar primeira fatura consolidada
    await gerarFaturaConsolidada(cf.id, form.mes_inicio, form.ano_inicio, espelho, form);
  }

  // ─── SUB-REGISTRO (REGRAS 1-4) ─────────────────────────────────────────
  async function handleSubRegistro(
    form: ConfigFaturamentoForm,
    espelho: ContratoEspelho,
    base: ContratoFinanceiroBase,
    flags: { isUpgrade: boolean; isDowngrade: boolean; isModuloAdicional: boolean; isOA: boolean }
  ) {
    const { isUpgrade, isDowngrade, isModuloAdicional, isOA } = flags;

    if (isUpgrade || isDowngrade) {
      const dadosAnteriores = {
        valor_mensalidade: base.valor_mensalidade,
        plano_id: base.plano_id,
        plano_nome: base.plano_nome,
      };

      await supabase
        .from("contratos_financeiros")
        .update({
          valor_mensalidade: form.valor_mensalidade,
          plano_id: espelho.plano?.id || base.plano_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", base.id);

      // Inserir nova parcela de implantação se houver (e não já cobrada)
      if (form.valor_implantacao > 0) {
        const implJaCobrada = form.implantacao_ja_cobrada;
        const valorParcela = Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100;
        await supabase.from("parcelas_implantacao").insert({
          contrato_financeiro_id: base.id,
          contrato_origem_id: espelho.id,
          descricao: `Implantação ${isUpgrade ? "Upgrade" : "Downgrade"} ${espelho.plano?.nome || ""}`,
          valor_total: form.valor_implantacao,
          numero_parcelas: form.parcelas_implantacao,
          valor_por_parcela: valorParcela,
          parcelas_pagas: implJaCobrada ? form.parcelas_implantacao : 0,
          status: implJaCobrada ? "quitada" : "pendente",
          observacao: implJaCobrada ? "Quitada no sistema anterior" : null,
        });
      }

      await supabase.from("contrato_financeiro_historico").insert({
        contrato_financeiro_id: base.id,
        tipo: isUpgrade ? "upgrade" : "downgrade",
        descricao: `${isUpgrade ? "Upgrade" : "Downgrade"} — ${base.plano_nome || "Plano anterior"} → ${espelho.plano?.nome || "Novo plano"}`,
        dados_anteriores: dadosAnteriores,
        dados_novos: {
          valor_mensalidade: form.valor_mensalidade,
          plano_id: espelho.plano?.id,
          plano_nome: espelho.plano?.nome,
          valor_implantacao: form.valor_implantacao,
          parcelas: form.parcelas_implantacao,
          implantacao_ja_cobrada: form.implantacao_ja_cobrada,
        },
        contrato_origem_id: espelho.id,
      });
    }

    if (isModuloAdicional) {
      if (form.modulos.length > 0) {
        const modulosPayload = form.modulos.map((m) => ({
          contrato_financeiro_id: base.id,
          nome: m.nome,
          valor_mensal: m.valor_mensal,
          data_inicio: m.data_inicio,
          ativo: true,
        }));
        await supabase.from("contrato_financeiro_modulos").insert(modulosPayload);
      }

      if (form.valor_implantacao > 0) {
        const implJaCobrada = form.implantacao_ja_cobrada;
        const valorParcela = Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100;
        await supabase.from("parcelas_implantacao").insert({
          contrato_financeiro_id: base.id,
          contrato_origem_id: espelho.id,
          descricao: `Implantação Módulo Adicional`,
          valor_total: form.valor_implantacao,
          numero_parcelas: form.parcelas_implantacao,
          valor_por_parcela: valorParcela,
          parcelas_pagas: implJaCobrada ? form.parcelas_implantacao : 0,
          status: implJaCobrada ? "quitada" : "pendente",
          observacao: implJaCobrada ? "Quitada no sistema anterior" : null,
        });
      }

      await supabase.from("contrato_financeiro_historico").insert({
        contrato_financeiro_id: base.id,
        tipo: "modulo_adicional",
        descricao: `Módulos adicionais: ${form.modulos.map(m => m.nome).join(", ")}`,
        dados_novos: { modulos: form.modulos.map(m => ({ nome: m.nome, valor_mensal: m.valor_mensal })) },
        contrato_origem_id: espelho.id,
      });
    }

    if (isOA) {
      if (form.oa_valor > 0) {
        await supabase.from("contrato_financeiro_oas").insert({
          contrato_financeiro_id: base.id,
          contrato_oa_id: espelho.id,
          descricao: form.oa_descricao || "Ordem de Atendimento",
          valor: form.oa_valor,
          mes_referencia: form.oa_mes_referencia,
          ano_referencia: form.oa_ano_referencia,
          observacoes: form.oa_observacao || null,
          faturada: false,
        });
      }

      await supabase.from("contrato_financeiro_historico").insert({
        contrato_financeiro_id: base.id,
        tipo: "oa",
        descricao: `OA: ${form.oa_descricao || "Ordem de Atendimento"} — ${form.oa_mes_referencia}/${form.oa_ano_referencia}`,
        dados_novos: { valor: form.oa_valor, descricao: form.oa_descricao },
        contrato_origem_id: espelho.id,
      });
    }

    // Marcar o contrato aditivo como "Ativo"
    await supabase
      .from("contratos")
      .update({ status: "Ativo" })
      .eq("id", espelho.id);
  }

  // ─── GERAR FATURA CONSOLIDADA ─────────────────────────────────────────
  async function gerarFaturaConsolidada(
    contratoFinanceiroId: string,
    mesRef: number,
    anoRef: number,
    espelho: ContratoEspelho,
    form: ConfigFaturamentoForm
  ) {
    const { data: cfBase } = await supabase
      .from("contratos_financeiros")
      .select("contrato_id")
      .eq("id", contratoFinanceiroId)
      .single();

    const baseContratoId = cfBase?.contrato_id || espelho.id;

    const { data: existing } = await supabase
      .from("faturas")
      .select("id")
      .eq("contrato_id", baseContratoId)
      .eq("referencia_mes", mesRef)
      .eq("referencia_ano", anoRef)
      .maybeSingle();

    if (existing) {
      console.warn("Fatura já existe para este mês/ano");
      return;
    }

    const { data: cf } = await supabase
      .from("contratos_financeiros")
      .select("*")
      .eq("id", contratoFinanceiroId)
      .single();

    if (!cf) throw new Error("Contrato financeiro não encontrado");

    let valorTotal = cf.valor_mensalidade;

    // ── FASE 1: Buscar dados (somente leitura) ──────────────────────
    // Correção 4: Only include pending (not already paid) implantation installments
    const { data: parcelas } = await supabase
      .from("parcelas_implantacao")
      .select("*")
      .eq("contrato_financeiro_id", contratoFinanceiroId)
      .eq("status", "pendente");

    const parcelasUpdate: { id: string; novasPagas: number; novoStatus: string }[] = [];
    for (const p of (parcelas || [])) {
      valorTotal += p.valor_por_parcela;
      const novasPagas = (p.parcelas_pagas || 0) + 1;
      const novoStatus = novasPagas >= p.numero_parcelas ? "quitada" : "pendente";
      parcelasUpdate.push({ id: p.id, novasPagas, novoStatus });
    }

    const { data: modulos } = await supabase
      .from("contrato_financeiro_modulos")
      .select("*")
      .eq("contrato_financeiro_id", contratoFinanceiroId)
      .eq("ativo", true);

    for (const m of (modulos || [])) {
      valorTotal += m.valor_mensal;
    }

    const { data: oas } = await supabase
      .from("contrato_financeiro_oas")
      .select("*")
      .eq("contrato_financeiro_id", contratoFinanceiroId)
      .eq("mes_referencia", mesRef)
      .eq("ano_referencia", anoRef)
      .eq("faturada", false);

    const oaIds: string[] = [];
    for (const oa of (oas || [])) {
      valorTotal += oa.valor;
      oaIds.push(oa.id);
    }

    // ── FASE 2: Criar fatura ────────────────────────────────────────
    const formaPagFatura = cf.forma_pagamento === "Ambos" ? "Boleto" : cf.forma_pagamento;
    const dataVencimento = `${anoRef}-${String(mesRef).padStart(2, "0")}-${String(cf.dia_vencimento).padStart(2, "0")}`;

    const { data: faturaData, error: faturaErr } = await supabase.from("faturas").insert({
      cliente_id: cf.cliente_id,
      contrato_id: cf.contrato_id,
      filial_id: cf.filial_id,
      valor: valorTotal,
      valor_desconto: 0,
      valor_final: valorTotal,
      data_vencimento: dataVencimento,
      tipo: "Mensalidade",
      forma_pagamento: formaPagFatura,
      referencia_mes: mesRef,
      referencia_ano: anoRef,
      status: "Pendente",
      observacoes: `Fatura consolidada — Ref. ${String(mesRef).padStart(2, "0")}/${anoRef}`,
    }).select("id").single();

    if (faturaErr || !faturaData) throw new Error("Erro ao criar fatura: " + (faturaErr?.message || ""));

    // ── FASE 3: Integração Asaas ────────────────────────────────────
    const filialId = cf.filial_id;
    let asaasOk = true;
    if (filialId) {
      try {
        const billingType = formaPagFatura === "Pix" ? "PIX" : "BOLETO";
        await supabase.functions.invoke("asaas", {
          body: {
            action: "create_customer_and_payment",
            filialId,
            customerName: espelho.cliente.razao_social || espelho.cliente.nome_fantasia,
            cpfCnpj: espelho.cliente.cnpj_cpf,
            email: form.email_cobranca || espelho.cliente.email,
            phone: form.whatsapp_cobranca || espelho.cliente.telefone,
            clienteId: espelho.cliente.id,
            contratoFinanceiroId: contratoFinanceiroId,
            faturaId: faturaData.id,
            billingType,
            value: valorTotal,
            dueDate: dataVencimento,
            description: `Softflow — ${espelho.numero_exibicao} — Ref. ${String(mesRef).padStart(2, "0")}/${anoRef}`,
          },
        });
      } catch (asaasError) {
        console.error("Asaas call failed:", asaasError);
        asaasOk = false;
      }
    }

    if (!asaasOk && filialId) {
      await supabase.from("faturas").delete().eq("id", faturaData.id);
      toast.error("Falha ao gerar cobrança no Asaas. Fatura não foi criada. Tente novamente.");
      throw new Error("Asaas integration failed — rollback applied");
    }

    // ── FASE 4: Commit ──────
    for (const pu of parcelasUpdate) {
      await supabase.from("parcelas_implantacao").update({
        parcelas_pagas: pu.novasPagas,
        status: pu.novoStatus,
      }).eq("id", pu.id);
    }

    for (const oaId of oaIds) {
      await supabase.from("contrato_financeiro_oas").update({ faturada: true }).eq("id", oaId);
    }

    // ── FASE 5: Enviar fatura pelo WhatsApp (setor Financeiro) ──────
    try {
      // Recarregar a fatura completa com dados do Asaas já salvos
      const { data: faturaCompleta } = await supabase
        .from("faturas")
        .select("id, cliente_id, filial_id, valor_final, data_vencimento, forma_pagamento, asaas_payment_id, asaas_url, asaas_barcode, asaas_pix_qrcode")
        .eq("id", faturaData.id)
        .single();

      if (faturaCompleta) {
        const resultado = await enviarFaturaWhatsApp({
          id: faturaCompleta.id,
          cliente_id: faturaCompleta.cliente_id,
          filial_id: faturaCompleta.filial_id,
          valor_final: faturaCompleta.valor_final,
          data_vencimento: faturaCompleta.data_vencimento,
          forma_pagamento: faturaCompleta.forma_pagamento,
          asaas_payment_id: faturaCompleta.asaas_payment_id,
          asaas_url: faturaCompleta.asaas_url,
          asaas_barcode: faturaCompleta.asaas_barcode,
          asaas_pix_qrcode: faturaCompleta.asaas_pix_qrcode,
        });
        if (resultado.ok) {
          toast.success("Fatura enviada ao cliente via WhatsApp!");
        } else {
          console.warn("WhatsApp não enviado:", resultado.error);
          toast.warning("Fatura criada, mas o WhatsApp não foi enviado: " + (resultado.error || ""));
        }
      }
    } catch (whatsErr) {
      console.error("Erro ao disparar WhatsApp da fatura:", whatsErr);
      // Não bloqueia o fluxo — fatura já foi criada
    }
  }

  return { saving, handleSave };
}
