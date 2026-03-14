// ─── Form/save hook for Configurar Faturamento ───────────────────────────

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import type { ContratoEspelho, ConfigFaturamentoForm } from "./types";
import { validateConfigForm } from "./helpers";

export function useConfigurarFaturamentoForm() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  async function handleSave(form: ConfigFaturamentoForm, espelho: ContratoEspelho) {
    const err = validateConfigForm(form, espelho.tipo);
    if (err) { toast.error(err); return; }

    setSaving(true);
    try {
      // Buscar contrato_base financeiro se for sub-registro
      let contratoBaseFinanceiroId: string | null = null;
      if (espelho.contrato_origem_id) {
        const { data: baseFinanceiro } = await supabase
          .from("contratos_financeiros")
          .select("id")
          .eq("contrato_id", espelho.contrato_origem_id)
          .maybeSingle();
        contratoBaseFinanceiroId = baseFinanceiro?.id || null;
      }

      // PASSO A — Criar contrato financeiro
      const { data: cf, error: cfErr } = await supabase
        .from("contratos_financeiros")
        .insert({
          contrato_id: espelho.id,
          contrato_base_id: contratoBaseFinanceiroId,
          cliente_id: espelho.cliente.id,
          filial_id: null, // será preenchido futuramente
          plano_id: espelho.plano?.id || null,
          pedido_id: espelho.pedido?.id || null,
          tipo: espelho.pedido?.tipo_pedido
            ? (espelho.tipo === "OA" ? "OA" : espelho.pedido.tipo_pedido)
            : "Contrato Inicial",
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

      if (cfErr || !cf) {
        toast.error("Erro ao criar contrato financeiro: " + (cfErr?.message || ""));
        setSaving(false);
        return;
      }

      // Inserir módulos adicionais
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

      // Inserir OA se aplicável
      if (espelho.tipo === "OA" && form.oa_valor > 0) {
        await supabase.from("contrato_financeiro_oas").insert({
          contrato_financeiro_id: cf.id,
          contrato_oa_id: espelho.id,
          descricao: form.oa_descricao,
          valor: form.oa_valor,
          mes_referencia: form.oa_mes_referencia,
          ano_referencia: form.oa_ano_referencia,
          observacoes: form.oa_observacao || null,
          faturada: false,
        });
      }

      // PASSO B — Criar primeira fatura
      const dataVencimento = `${form.ano_inicio}-${String(form.mes_inicio).padStart(2, "0")}-${String(form.dia_vencimento).padStart(2, "0")}`;

      let valorTotal = form.valor_mensalidade;

      // Somar parcela de implantação se houver
      if (form.valor_implantacao > 0) {
        valorTotal += Math.round((form.valor_implantacao / form.parcelas_implantacao) * 100) / 100;
      }

      // Somar módulos
      for (const mod of form.modulos) {
        valorTotal += mod.valor_mensal;
      }

      // Somar OA se for no mês de início
      if (form.oa_valor > 0 && form.oa_mes_referencia === form.mes_inicio && form.oa_ano_referencia === form.ano_inicio) {
        valorTotal += form.oa_valor;
      }

      await supabase.from("faturas").insert({
        cliente_id: espelho.cliente.id,
        contrato_id: espelho.id,
        valor: valorTotal,
        valor_desconto: 0,
        valor_final: valorTotal,
        data_vencimento: dataVencimento,
        tipo: "Mensalidade",
        forma_pagamento: form.forma_pagamento === "Ambos" ? "Boleto" : form.forma_pagamento,
        referencia_mes: form.mes_inicio,
        referencia_ano: form.ano_inicio,
        status: "Pendente",
        observacoes: `Fatura gerada automaticamente — Configuração de faturamento`,
      });

      // PASSO D — Atualizar contrato para status "Faturado"
      // (O contrato permanece "Assinado" no fluxo ZapSign, 
      //  mas agora tem contrato financeiro e some da fila)

      toast.success("Faturamento configurado com sucesso! Primeira fatura gerada.");
      navigate("/faturamento");
    } catch (err: any) {
      toast.error("Erro inesperado: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return { saving, handleSave };
}
