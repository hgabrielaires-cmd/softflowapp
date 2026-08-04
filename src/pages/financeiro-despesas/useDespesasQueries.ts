import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DespesaRegistro, FornecedorOption } from "./types";

export function useFornecedoresOptionsQuery() {
  return useQuery({
    queryKey: ["despesas_fornecedores_options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome_fantasia, razao_social, cnpj_cpf, plano_conta_id")
        .eq("ativo", true)
        .order("nome_fantasia");
      if (error) throw error;
      return (data || []) as FornecedorOption[];
    },
  });
}

export function useDespesasQuery() {
  return useQuery({
    queryKey: ["fin_despesas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_despesas")
        .select(
          "id, grupo_id, filial_id, fornecedor_id, plano_conta_id, forma_pagamento_id, conta_financeira_id, valor, data_emissao, data_vencimento, descricao, status, parcela_numero, parcela_total, data_pagamento, valor_pago, juros_percentual, juros_valor, plano_conta_juros_id, created_at, fornecedores(nome_fantasia), fin_despesa_rateios(centro_custo_id)",
        )
        .order("data_vencimento", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as DespesaRegistro[];
    },
  });
}

/** Conta financeira padrão configurada em cada filial. */
export function useContasPadraoFiliaisQuery() {
  return useQuery({
    queryKey: ["filiais_conta_padrao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filiais")
        .select("id, conta_financeira_padrao_id")
        .eq("ativa", true);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((f: any) => {
        if (f.conta_financeira_padrao_id) map[f.id] = f.conta_financeira_padrao_id;
      });
      return map;
    },
  });
}
