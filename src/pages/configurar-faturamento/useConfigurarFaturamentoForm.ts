// ─── Form/save hook for Configurar Faturamento ───────────────────────────

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { ContratoEspelho, ConfigFaturamentoForm, ContratoFinanceiroBase } from "./types";
import { validateConfigForm } from "./helpers";

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
      const isSubRegistro = !!espelho.contrato_origem_id && !!contratoFinanceiroBase;
      const isUpgrade = tipoPedido === "Upgrade";
      const isDowngrade = tipoPedido === "Downgrade";
      const isModuloAdicional = tipoPedido === "Módulo Adicional" || tipoPedido === "Aditivo";
      const isOA = espelho.tipo === "OA";

      if (isSubRegistro) {
        // ═══════════════════════════════════════════════════
        // SUB-REGISTRO: Upgrade, Downgrade, Módulo ou OA
        // Atualiza o contrato financeiro BASE existente
        // ═══════════════════════════════════════════════════
        await handleSubRegistro(form, espelho, contratoFinanceiroBase, {
          isUpgrade, isDowngrade, isModuloAdicional, isOA,
        });
      } else {
        // ═══════════════════════════════════════════════════
        // CONTRATO NOVO: Criar contrato financeiro base
        // ═══════════════════════════════════════════════════
        await handleContratoNovo(form, espelho);
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

    // Criar contrato financeiro base
    const { data: cf, error: cfErr } = await supabase
      .from("contratos_financeiros")
      .insert({
        contrato_id: espelho.id,
        contrato_base_id: null, // ele mesmo é o base
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
      })
      .select("id")
      .single();

    if (cfErr || !cf) throw new Error("Erro ao criar contrato financeiro: " + (cfErr?.message || ""));

    // Criar parcelas de implantação se valor > 0
    if (form.valor_implantacao > 0) {
      const valorParcela = Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100;
      await supabase.from("parcelas_implantacao").insert({
        contrato_financeiro_id: cf.id,
        contrato_origem_id: espelho.id,
        descricao: `Implantação ${espelho.plano?.nome || "Contrato"}`,
        valor_total: form.valor_implantacao,
        numero_parcelas: form.parcelas_implantacao,
        valor_por_parcela: valorParcela,
        parcelas_pagas: 0,
        status: "pendente",
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
    await supabase.from("contrato_financeiro_historico").insert({
      contrato_financeiro_id: cf.id,
      tipo: "criacao",
      descricao: `Contrato financeiro criado — ${espelho.numero_exibicao}`,
      dados_novos: {
        valor_mensalidade: form.valor_mensalidade,
        valor_implantacao: form.valor_implantacao,
        parcelas: form.parcelas_implantacao,
        plano: espelho.plano?.nome,
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
      // ── REGRA 1/2: Atualizar mensalidade e plano no base ──
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

      // Inserir nova parcela de implantação se houver
      if (form.valor_implantacao > 0) {
        const valorParcela = Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100;
        await supabase.from("parcelas_implantacao").insert({
          contrato_financeiro_id: base.id,
          contrato_origem_id: espelho.id,
          descricao: `Implantação ${isUpgrade ? "Upgrade" : "Downgrade"} ${espelho.plano?.nome || ""}`,
          valor_total: form.valor_implantacao,
          numero_parcelas: form.parcelas_implantacao,
          valor_por_parcela: valorParcela,
          parcelas_pagas: 0,
          status: "pendente",
        });
      }

      // Registrar histórico
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
        },
        contrato_origem_id: espelho.id,
      });
    }

    if (isModuloAdicional) {
      // ── REGRA 3: Inserir módulos no contrato financeiro BASE ──
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

      // Implantação de módulos (se houver)
      if (form.valor_implantacao > 0) {
        const valorParcela = Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100;
        await supabase.from("parcelas_implantacao").insert({
          contrato_financeiro_id: base.id,
          contrato_origem_id: espelho.id,
          descricao: `Implantação Módulo Adicional`,
          valor_total: form.valor_implantacao,
          numero_parcelas: form.parcelas_implantacao,
          valor_por_parcela: valorParcela,
          parcelas_pagas: 0,
          status: "pendente",
        });
      }

      // Histórico
      await supabase.from("contrato_financeiro_historico").insert({
        contrato_financeiro_id: base.id,
        tipo: "modulo_adicional",
        descricao: `Módulos adicionais: ${form.modulos.map(m => m.nome).join(", ")}`,
        dados_novos: { modulos: form.modulos.map(m => ({ nome: m.nome, valor_mensal: m.valor_mensal })) },
        contrato_origem_id: espelho.id,
      });
    }

    if (isOA) {
      // ── REGRA 4: Inserir OA vinculada ao base ──
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

      // Histórico
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
    // Verificar duplicidade
    // Validar duplicidade pelo contrato financeiro base (não pelo contrato assinado)
    const { data: existing } = await supabase
      .from("faturas")
      .select("id")
      .eq("contrato_id", (await supabase.from("contratos_financeiros").select("contrato_id").eq("id", contratoFinanceiroId).single()).data?.contrato_id || "")
      .eq("referencia_mes", mesRef)
      .eq("referencia_ano", anoRef)
      .maybeSingle();

    if (existing) {
      console.warn("Fatura já existe para este mês/ano");
      return;
    }

    // Buscar dados atualizados do contrato financeiro
    const { data: cf } = await supabase
      .from("contratos_financeiros")
      .select("*")
      .eq("id", contratoFinanceiroId)
      .single();

    if (!cf) throw new Error("Contrato financeiro não encontrado");

    let valorTotal = cf.valor_mensalidade;

    // Buscar parcelas pendentes
    const { data: parcelas } = await supabase
      .from("parcelas_implantacao")
      .select("*")
      .eq("contrato_financeiro_id", contratoFinanceiroId)
      .eq("status", "pendente");

    for (const p of (parcelas || [])) {
      valorTotal += p.valor_por_parcela;
      // Atualizar parcela
      const novasPagas = (p.parcelas_pagas || 0) + 1;
      const novoStatus = novasPagas >= p.numero_parcelas ? "quitada" : "pendente";
      await supabase.from("parcelas_implantacao").update({
        parcelas_pagas: novasPagas,
        status: novoStatus,
      }).eq("id", p.id);
    }

    // Buscar módulos ativos
    const { data: modulos } = await supabase
      .from("contrato_financeiro_modulos")
      .select("*")
      .eq("contrato_financeiro_id", contratoFinanceiroId)
      .eq("ativo", true);

    for (const m of (modulos || [])) {
      valorTotal += m.valor_mensal;
    }

    // Buscar OAs do mês
    const { data: oas } = await supabase
      .from("contrato_financeiro_oas")
      .select("*")
      .eq("contrato_financeiro_id", contratoFinanceiroId)
      .eq("mes_referencia", mesRef)
      .eq("ano_referencia", anoRef)
      .eq("faturada", false);

    for (const oa of (oas || [])) {
      valorTotal += oa.valor;
      await supabase.from("contrato_financeiro_oas").update({ faturada: true }).eq("id", oa.id);
    }

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

    // Integração Asaas
    const filialId = cf.filial_id;
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
        toast.warning("Faturamento criado localmente. Cobrança não foi gerada — verifique a integração.");
      }
    }
  }

  return { saving, handleSave };
}
