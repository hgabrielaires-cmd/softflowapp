import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TODAS } from "./constants";
import { hojeISO } from "./helpers";
import type { DreLancamento, DrePeriodo, DreSaldoConta, PlanoConta } from "./types";

export function useFiliaisDreQuery() {
  return useQuery({
    queryKey: ["dre_filiais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("filiais").select("id, nome").eq("ativa", true).order("nome");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useContasDreQuery(filialId: string) {
  return useQuery({
    queryKey: ["dre_contas", filialId],
    queryFn: async () => {
      let q = supabase.from("fin_contas_financeiras").select("id, nome, filial_id").eq("ativo", true).order("nome");
      if (filialId !== TODAS) q = q.eq("filial_id", filialId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as { id: string; nome: string; filial_id: string | null }[];
    },
  });
}

/** Saldo atual de cada conta (RPC fn_saldo_conta), atualizado a cada 30s. */
export function useSaldosAtuaisQuery(contas: { id: string; nome: string }[]) {
  const hoje = hojeISO();
  return useQuery({
    enabled: contas.length > 0,
    refetchInterval: 30_000,
    queryKey: ["dre_saldos", contas.map((c) => c.id).join(","), hoje],
    queryFn: async () => {
      const saldos = await Promise.all(
        contas.map(async (c) => {
          const { data, error } = await supabase.rpc("fn_saldo_conta", { p_conta_id: c.id, p_data: hoje });
          if (error) throw error;
          return { id: c.id, nome: c.nome, saldo: Number(data ?? 0) } as DreSaldoConta;
        }),
      );
      return saldos;
    },
  });
}

export function usePlanoContasDreQuery() {
  return useQuery({
    queryKey: ["dre_plano_contas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_plano_contas")
        .select("id, codigo, nome, tipo, parent_id, nivel")
        .order("codigo");
      if (error) throw error;
      return (data || []) as PlanoConta[];
    },
  });
}

type ContaMap = Record<string, string>;

function mapMovimentacao(m: any, contas: ContaMap): DreLancamento {
  return {
    id: m.id,
    data: String(m.data_movimentacao).slice(0, 10),
    valor: Number(m.valor || 0),
    descricao: m.descricao,
    plano_conta_id: m.plano_conta_id,
    plano_codigo: m.plano?.codigo ?? null,
    plano_nome: m.plano?.nome ?? null,
    conta_financeira_id: m.conta_financeira_id,
    conta_nome: contas[m.conta_financeira_id] ?? null,
    anexo_url: m.anexo_url ?? null,
    fornecedor: m.fornecedor?.nome_fantasia ?? null,
    cnpj_cpf: m.fornecedor?.cnpj_cpf ?? null,
    origem_tipo: String(m.origem ?? "manual"),
  };
}

/** Entradas do período (receitas do livro caixa). */
export function useReceitasDreQuery(filialId: string, periodo: DrePeriodo, contas: ContaMap) {
  return useQuery({
    queryKey: ["dre_receitas", filialId, periodo, Object.keys(contas).length],
    queryFn: async () => {
      let q = supabase
        .from("fin_movimentacoes")
        .select("*, plano:fin_plano_contas(codigo, nome), fornecedor:fornecedores(nome_fantasia, cnpj_cpf)")
        .eq("tipo", "entrada")
        // ajustes manuais de saldo não são receita
        .or("categoria.is.null,categoria.neq.ajuste")
        .gte("data_movimentacao", periodo.inicio)
        .lte("data_movimentacao", periodo.fim)
        .order("data_movimentacao", { ascending: false });
      if (filialId !== TODAS) q = q.eq("filial_id", filialId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((m) => mapMovimentacao(m, contas));
    },
  });
}

/** Despesas pagas + saídas avulsas do livro caixa, combinadas. */
export function useDespesasDreQuery(filialId: string, periodo: DrePeriodo, contas: ContaMap) {
  return useQuery({
    queryKey: ["dre_despesas", filialId, periodo, Object.keys(contas).length],
    queryFn: async () => {
      let qDespesas = supabase
        .from("fin_despesas")
        .select(
          "id, valor, valor_pago, data_pagamento, descricao, plano_conta_id, conta_financeira_id, anexo_url, plano:fin_plano_contas(codigo, nome), fornecedor:fornecedores(nome_fantasia, cnpj_cpf)",
        )
        .eq("status", "pago")
        .gte("data_pagamento", periodo.inicio)
        .lte("data_pagamento", periodo.fim);
      if (filialId !== TODAS) qDespesas = qDespesas.eq("filial_id", filialId);

      let qSaidas = supabase
        .from("fin_movimentacoes")
        .select("*, plano:fin_plano_contas(codigo, nome), fornecedor:fornecedores(nome_fantasia, cnpj_cpf)")
        .eq("tipo", "saida")
        .neq("origem", "despesa")
        .gte("data_movimentacao", periodo.inicio)
        .lte("data_movimentacao", periodo.fim);
      if (filialId !== TODAS) qSaidas = qSaidas.eq("filial_id", filialId);

      const [resDespesas, resSaidas] = await Promise.all([qDespesas, qSaidas]);
      if (resDespesas.error) throw resDespesas.error;
      if (resSaidas.error) throw resSaidas.error;

      const despesas: DreLancamento[] = (resDespesas.data || []).map((d: any) => ({
        id: d.id,
        data: String(d.data_pagamento).slice(0, 10),
        valor: Number(d.valor_pago ?? d.valor ?? 0),
        descricao: d.descricao,
        plano_conta_id: d.plano_conta_id,
        plano_codigo: d.plano?.codigo ?? null,
        plano_nome: d.plano?.nome ?? null,
        conta_financeira_id: d.conta_financeira_id,
        conta_nome: contas[d.conta_financeira_id] ?? null,
        anexo_url: d.anexo_url ?? null,
        fornecedor: d.fornecedor?.nome_fantasia ?? null,
        cnpj_cpf: d.fornecedor?.cnpj_cpf ?? null,
        origem_tipo: "despesa",
      }));

      const saidas = (resSaidas.data || []).map((m) => mapMovimentacao(m, contas));

      return [...despesas, ...saidas].sort((a, b) => (a.data < b.data ? 1 : -1));
    },
  });
}

/** Hook agregador do DRE. */
export function useDRE(filialId: string, periodo: DrePeriodo) {
  const contasQuery = useContasDreQuery(filialId);
  const contas = contasQuery.data ?? [];
  const contasMap: ContaMap = Object.fromEntries(contas.map((c) => [c.id, c.nome]));

  const saldosQuery = useSaldosAtuaisQuery(contas);
  const planosQuery = usePlanoContasDreQuery();
  const receitasQuery = useReceitasDreQuery(filialId, periodo, contasMap);
  const despesasQuery = useDespesasDreQuery(filialId, periodo, contasMap);

  return {
    contas,
    saldos: saldosQuery.data ?? [],
    planos: planosQuery.data ?? [],
    receitas: receitasQuery.data ?? [],
    despesas: despesasQuery.data ?? [],
    isLoading: contasQuery.isLoading || receitasQuery.isLoading || despesasQuery.isLoading || planosQuery.isLoading,
    isFetching: saldosQuery.isFetching || receitasQuery.isFetching || despesasQuery.isFetching,
    refetch: () => {
      saldosQuery.refetch();
      receitasQuery.refetch();
      despesasQuery.refetch();
    },
  };
}
