import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PlanoConta, CentroCusto, FormaPagamento, ContaFinanceira } from "./types";

export function usePlanoContasQuery() {
  return useQuery({
    queryKey: ["fin_plano_contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_plano_contas")
        .select("*")
        .order("codigo");
      if (error) throw error;
      return (data || []) as PlanoConta[];
    },
  });
}

export function useCentrosCustoQuery() {
  return useQuery({
    queryKey: ["fin_centros_custo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_centros_custo")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data || []) as CentroCusto[];
    },
  });
}

export function useFormasPagamentoQuery() {
  return useQuery({
    queryKey: ["fin_formas_pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_formas_pagamento")
        .select("*")
        .order("ordem")
        .order("nome");
      if (error) throw error;
      return (data || []) as FormaPagamento[];
    },
  });
}

export function useContasFinanceirasQuery() {
  return useQuery({
    queryKey: ["fin_contas_financeiras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_contas_financeiras")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data || []) as ContaFinanceira[];
    },
  });
}

export function useFiliaisOptionsQuery() {
  return useQuery({
    queryKey: ["fin_param_filiais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("filiais")
        .select("id, nome")
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as { id: string; nome: string }[];
    },
  });
}
