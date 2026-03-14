// ─── Query hook for Configurar Faturamento ────────────────────────────────

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ContratoEspelho, ContratoFinanceiroBase, ModuloAdicionalPedido } from "./types";

export function useConfigurarFaturamentoQueries(contratoId: string | undefined) {
  const [espelho, setEspelho] = useState<ContratoEspelho | null>(null);
  const [contratoFinanceiroBase, setContratoFinanceiroBase] = useState<ContratoFinanceiroBase | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContrato = useCallback(async () => {
    if (!contratoId) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("contratos")
      .select(`
        id, numero_exibicao, tipo, status, updated_at, contrato_origem_id,
        clientes(id, nome_fantasia, razao_social, cnpj_cpf, email, telefone, filial_id),
        planos(id, nome, valor_mensalidade_padrao, valor_implantacao_padrao),
        pedidos(
          id, tipo_pedido,
          valor_mensalidade, valor_mensalidade_final,
          valor_implantacao, valor_implantacao_final,
          pagamento_implantacao_parcelas, pagamento_implantacao_forma,
          pagamento_mensalidade_forma, filial_id,
          modulos_adicionais, servicos_pedido
        ),
        contratos_zapsign(sign_url, status)
      `)
      .eq("id", contratoId)
      .single();

    if (error || !data) {
      toast.error("Contrato não encontrado");
      setLoading(false);
      return;
    }

    // Load contrato base info if it's a sub-record
    let contratoBase = null;
    if (data.contrato_origem_id) {
      const { data: base } = await supabase
        .from("contratos")
        .select("numero_exibicao, clientes(nome_fantasia)")
        .eq("id", data.contrato_origem_id)
        .single();
      if (base) {
        contratoBase = {
          numero_exibicao: base.numero_exibicao,
          cliente_nome: (base.clientes as any)?.nome_fantasia || "—",
        };
      }
    }

    const c = data as any;
    const mapped: ContratoEspelho = {
      id: c.id,
      numero_exibicao: c.numero_exibicao,
      tipo: c.tipo,
      status: c.status,
      updated_at: c.updated_at,
      contrato_origem_id: c.contrato_origem_id,
      cliente: {
        id: c.clientes?.id || "",
        nome_fantasia: c.clientes?.nome_fantasia || "",
        razao_social: c.clientes?.razao_social || null,
        cnpj_cpf: c.clientes?.cnpj_cpf || "",
        email: c.clientes?.email || null,
        telefone: c.clientes?.telefone || null,
        filial_id: c.clientes?.filial_id || null,
      },
      plano: c.planos ? {
        id: c.planos.id,
        nome: c.planos.nome,
        valor_mensalidade_padrao: c.planos.valor_mensalidade_padrao,
        valor_implantacao_padrao: c.planos.valor_implantacao_padrao,
      } : null,
      pedido: c.pedidos ? {
        id: c.pedidos.id,
        tipo_pedido: c.pedidos.tipo_pedido,
        valor_mensalidade: c.pedidos.valor_mensalidade,
        valor_mensalidade_final: c.pedidos.valor_mensalidade_final,
        valor_implantacao: c.pedidos.valor_implantacao,
        valor_implantacao_final: c.pedidos.valor_implantacao_final,
        pagamento_implantacao_parcelas: c.pedidos.pagamento_implantacao_parcelas,
        pagamento_implantacao_forma: c.pedidos.pagamento_implantacao_forma,
        pagamento_mensalidade_forma: c.pedidos.pagamento_mensalidade_forma,
        filial_id: c.pedidos.filial_id || null,
        modulos_adicionais: Array.isArray(c.pedidos.modulos_adicionais)
          ? c.pedidos.modulos_adicionais as ModuloAdicionalPedido[]
          : null,
        servicos_pedido: Array.isArray(c.pedidos.servicos_pedido)
          ? c.pedidos.servicos_pedido
          : null,
      } : null,
      zapsign: c.contratos_zapsign ? {
        sign_url: c.contratos_zapsign.sign_url,
        status: c.contratos_zapsign.status,
      } : null,
      contrato_base: contratoBase,
    };

    setEspelho(mapped);

    // ─── Buscar contrato financeiro base (se for sub-registro) ──────────
    if (mapped.contrato_origem_id) {
      await loadContratoFinanceiroBase(mapped.contrato_origem_id);
    }

    setLoading(false);
  }, [contratoId]);

  async function loadContratoFinanceiroBase(contratoOrigemId: string) {
    // Buscar o contrato financeiro vinculado ao contrato base
    const { data: cf } = await supabase
      .from("contratos_financeiros")
      .select("id, contrato_id, cliente_id, plano_id, valor_mensalidade, dia_vencimento, forma_pagamento, data_inicio, status, filial_id, planos(nome)")
      .eq("contrato_id", contratoOrigemId)
      .eq("status", "Ativo")
      .maybeSingle();

    if (!cf) {
      // Sem contrato financeiro base ainda — pode ser contrato novo
      setContratoFinanceiroBase(null);
      return;
    }

    // Buscar parcelas pendentes
    const { data: parcelas } = await supabase
      .from("parcelas_implantacao")
      .select("*")
      .eq("contrato_financeiro_id", cf.id)
      .eq("status", "pendente");

    // Buscar módulos ativos
    const { data: modulos } = await supabase
      .from("contrato_financeiro_modulos")
      .select("*")
      .eq("contrato_financeiro_id", cf.id)
      .eq("ativo", true);

    // Buscar OAs pendentes
    const { data: oas } = await supabase
      .from("contrato_financeiro_oas")
      .select("*")
      .eq("contrato_financeiro_id", cf.id)
      .eq("faturada", false);

    setContratoFinanceiroBase({
      id: cf.id,
      contrato_id: cf.contrato_id,
      cliente_id: cf.cliente_id,
      plano_id: cf.plano_id,
      valor_mensalidade: cf.valor_mensalidade,
      dia_vencimento: cf.dia_vencimento,
      forma_pagamento: cf.forma_pagamento,
      data_inicio: cf.data_inicio,
      status: cf.status,
      filial_id: cf.filial_id,
      plano_nome: (cf.planos as any)?.nome || undefined,
      parcelas_pendentes: (parcelas || []).map((p: any) => ({
        id: p.id,
        descricao: p.descricao,
        valor_total: p.valor_total,
        numero_parcelas: p.numero_parcelas,
        valor_por_parcela: p.valor_por_parcela,
        parcelas_pagas: p.parcelas_pagas,
        status: p.status,
      })),
      modulos_ativos: (modulos || []).map((m: any) => ({
        id: m.id,
        nome: m.nome,
        valor_mensal: m.valor_mensal,
        data_inicio: m.data_inicio,
        ativo: m.ativo,
      })),
      oas_pendentes: (oas || []).map((o: any) => ({
        id: o.id,
        descricao: o.descricao,
        valor: o.valor,
        mes_referencia: o.mes_referencia,
        ano_referencia: o.ano_referencia,
        faturada: o.faturada,
      })),
    });
  }

  useEffect(() => { loadContrato(); }, [loadContrato]);

  return { espelho, contratoFinanceiroBase, loading, reload: loadContrato };
}
