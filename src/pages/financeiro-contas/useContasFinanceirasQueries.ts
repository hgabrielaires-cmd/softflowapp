import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ContaFinanceira } from "../financeiro-parametros/types";
import type { ExtratoFiltros, Movimentacao } from "./types";
import { TODAS } from "./constants";
import { efeitoNaConta } from "./helpers";

/** Contas financeiras ativas (opcionalmente filtradas por filial). */
export function useContasAtivasQuery(filialId: string) {
  return useQuery({
    queryKey: ["fin_contas_ativas", filialId],
    queryFn: async () => {
      let q = supabase.from("fin_contas_financeiras").select("*").eq("ativo", true).order("nome");
      if (filialId !== TODAS) q = q.eq("filial_id", filialId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ContaFinanceira[];
    },
  });
}

/** Saldo atual + entradas/saídas do mês corrente de cada conta. */
export function useSaldosContasQuery(contas: ContaFinanceira[]) {
  const ids = contas.map((c) => c.id).join(",");
  return useQuery({
    enabled: contas.length > 0,
    queryKey: ["fin_saldos_contas", ids],
    queryFn: async () => {
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
      const hojeISO = hoje.toISOString().slice(0, 10);

      const { data: movsMes, error: errMovs } = await supabase
        .from("fin_movimentacoes")
        .select("*")
        .gte("data_movimentacao", inicioMes)
        .lte("data_movimentacao", hojeISO);
      if (errMovs) throw errMovs;

      const saldos = await Promise.all(
        contas.map(async (c) => {
          const { data, error } = await supabase.rpc("fn_saldo_conta", { p_conta_id: c.id });
          if (error) throw error;
          const doMes = ((movsMes || []) as Movimentacao[]).filter(
            (m) => m.conta_financeira_id === c.id || m.conta_destino_id === c.id,
          );
          let entradas = 0;
          let saidas = 0;
          doMes.forEach((m) => {
            const ef = efeitoNaConta(m, c.id);
            if (ef >= 0) entradas += ef;
            else saidas += Math.abs(ef);
          });
          return {
            id: c.id,
            nome: c.nome,
            tipo: c.tipo,
            banco: c.banco,
            saldo: Number(data ?? 0),
            entradasMes: entradas,
            saidasMes: saidas,
          };
        }),
      );
      return saldos;
    },
  });
}

/** Movimentações do período + saldo anterior ao início do período. */
export function useExtratoQuery(filtros: ExtratoFiltros) {
  return useQuery({
    queryKey: ["fin_movimentacoes", filtros],
    queryFn: async () => {
      let q = supabase
        .from("fin_movimentacoes")
        .select("*")
        .gte("data_movimentacao", filtros.data_inicio)
        .lte("data_movimentacao", filtros.data_fim)
        .order("data_movimentacao", { ascending: true })
        .order("created_at", { ascending: true });

      if (filtros.conta_id !== TODAS) {
        q = q.or(`conta_financeira_id.eq.${filtros.conta_id},conta_destino_id.eq.${filtros.conta_id}`);
      }
      if (filtros.filial_id !== TODAS) q = q.eq("filial_id", filtros.filial_id);
      if (filtros.tipo !== TODAS) q = q.eq("tipo", filtros.tipo);

      const { data, error } = await q;
      if (error) throw error;

      // Saldo anterior: só faz sentido quando há uma conta selecionada
      let saldoAnterior = 0;
      if (filtros.conta_id !== TODAS) {
        const diaAnterior = new Date(filtros.data_inicio + "T00:00:00");
        diaAnterior.setDate(diaAnterior.getDate() - 1);
        const { data: saldo, error: errSaldo } = await supabase.rpc("fn_saldo_conta", {
          p_conta_id: filtros.conta_id,
          p_data: diaAnterior.toISOString().slice(0, 10),
        });
        if (errSaldo) throw errSaldo;
        saldoAnterior = Number(saldo ?? 0);
      }

      return { movimentacoes: (data || []) as Movimentacao[], saldoAnterior };
    },
  });
}

/** Planos de conta que aceitam lançamento, por tipo. */
export function usePlanoContasLancamentoQuery() {
  return useQuery({
    queryKey: ["fin_plano_contas_lancamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_plano_contas")
        .select("id, codigo, nome, tipo")
        .eq("ativo", true)
        .eq("aceita_lancamento", true)
        .order("codigo");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useFiliaisContasQuery() {
  return useQuery({
    queryKey: ["fin_contas_filiais"],
    queryFn: async () => {
      const { data, error } = await supabase.from("filiais").select("id, nome").eq("ativa", true).order("nome");
      if (error) throw error;
      return data || [];
    },
  });
}
