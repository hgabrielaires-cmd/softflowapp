import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DespesaRegistro, FornecedorOption } from "./types";

export function useFornecedoresOptionsQuery() {
  return useQuery({
    queryKey: ["despesas_fornecedores_options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome_fantasia, razao_social, cnpj_cpf")
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
          "id, grupo_id, fornecedor_id, plano_conta_id, forma_pagamento_id, conta_financeira_id, valor, data_emissao, data_vencimento, descricao, status, parcela_numero, parcela_total, created_at, fornecedores(nome_fantasia), fin_despesa_rateios(centro_custo_id)",
        )
        .order("data_vencimento", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as DespesaRegistro[];
    },
  });
}
