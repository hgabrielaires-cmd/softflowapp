import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmOportunidade, CrmFunilSimples, CrmEtapaSimples } from "./types";

export function useCrmPipelineQueries(funilId?: string, statusFilter: string = "em_andamento") {
  const funisQuery = useQuery({
    queryKey: ["crm_funis_pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_funis")
        .select("id, nome, ordem, ativo, exibe_cliente")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as CrmFunilSimples[];
    },
  });

  const etapasQuery = useQuery({
    queryKey: ["crm_etapas_pipeline", funilId],
    enabled: !!funilId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_etapas")
        .select("id, funil_id, nome, cor, ordem, ativo")
        .eq("funil_id", funilId!)
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as CrmEtapaSimples[];
    },
  });

  const oportunidadesQuery = useQuery({
    queryKey: ["crm_oportunidades", funilId, statusFilter],
    enabled: !!funilId,
    queryFn: async () => {
      let q = supabase
        .from("crm_oportunidades")
        .select("*, clientes(nome_fantasia, apelido, filial_id)")
        .eq("funil_id", funilId!);

      if (statusFilter === "em_andamento") {
        q = q.eq("status", "aberta");
      } else if (statusFilter === "perdido") {
        q = q.eq("status", "perdido");
      } else if (statusFilter === "ganho") {
        q = q.eq("status", "ganho");
      }
      // else "todos" → no filter

      const { data, error } = await q.order("ordem");
      if (error) throw error;
      const ids = [...new Set((data || []).map(d => d.responsavel_id).filter(Boolean))] as string[];
      let profilesMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(p => [p.user_id, p.full_name]));
        }
      }
      // Fetch tarefas status per oportunidade
      const opIds = (data || []).map(d => d.id);
      let tarefasMap: Record<string, { total: number; vencidas: number }> = {};
      if (opIds.length > 0) {
        const { data: tarefas } = await supabase
          .from("crm_tarefas")
          .select("oportunidade_id, data_reuniao, concluido_em")
          .in("oportunidade_id", opIds);
        if (tarefas) {
          const now = new Date();
          tarefas.forEach(t => {
            if (!tarefasMap[t.oportunidade_id]) tarefasMap[t.oportunidade_id] = { total: 0, vencidas: 0 };
            tarefasMap[t.oportunidade_id].total++;
            if (!t.concluido_em && t.data_reuniao && new Date(t.data_reuniao) < now) {
              tarefasMap[t.oportunidade_id].vencidas++;
            }
          });
        }
      }
      // Fetch product totals per oportunidade
      let prodTotalsMap: Record<string, { impl: number; mens: number }> = {};
      if (opIds.length > 0) {
        const { data: prods } = await supabase
          .from("crm_oportunidade_produtos")
          .select("oportunidade_id, valor_implantacao, valor_mensalidade, quantidade")
          .in("oportunidade_id", opIds);
        if (prods) {
          prods.forEach(p => {
            if (!prodTotalsMap[p.oportunidade_id]) prodTotalsMap[p.oportunidade_id] = { impl: 0, mens: 0 };
            prodTotalsMap[p.oportunidade_id].impl += (p.valor_implantacao || 0) * (p.quantidade || 1);
            prodTotalsMap[p.oportunidade_id].mens += (p.valor_mensalidade || 0) * (p.quantidade || 1);
          });
        }
      }
      return (data || []).map(d => {
        const info = tarefasMap[d.id];
        let tarefas_status: "sem_tarefa" | "vencida" | "ok" = "sem_tarefa";
        if (info && info.total > 0) {
          tarefas_status = info.vencidas > 0 ? "vencida" : "ok";
        }
        const raw = prodTotalsMap[d.id] || { impl: 0, mens: 0 };
        const di = (d as any).desconto_implantacao || 0;
        const dit = (d as any).desconto_implantacao_tipo || "R$";
        const dm = (d as any).desconto_mensalidade || 0;
        const dmt = (d as any).desconto_mensalidade_tipo || "R$";
        const descImpl = dit === "%" ? raw.impl * di / 100 : di;
        const descMens = dmt === "%" ? raw.mens * dm / 100 : dm;
        return {
          ...d,
          campos_personalizados: (d.campos_personalizados || {}) as Record<string, string>,
          profiles: d.responsavel_id && profilesMap[d.responsavel_id]
            ? { full_name: profilesMap[d.responsavel_id] }
            : null,
          tarefas_status,
          total_implantacao: Math.max(0, raw.impl - descImpl),
          total_mensalidade: Math.max(0, raw.mens - descMens),
        };
      }) as CrmOportunidade[];
    },
  });

  const responsaveisQuery = useQuery({
    queryKey: ["crm_responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return data || [];
    },
  });

  const segmentosQuery = useQuery({
    queryKey: ["crm_segmentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("segmentos")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return (data || []) as { id: string; nome: string }[];
    },
  });

  const clientesQuery = useQuery({
    queryKey: ["crm_clientes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("id, nome_fantasia")
        .eq("ativo", true)
        .order("nome_fantasia");
      if (error) throw error;
      return (data || []) as { id: string; nome_fantasia: string }[];
    },
  });

  const cargosQuery = useQuery({
    queryKey: ["crm_cargos_ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_cargos")
        .select("id, nome")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return (data || []) as { id: string; nome: string }[];
    },
  });

  return { funisQuery, etapasQuery, oportunidadesQuery, responsaveisQuery, segmentosQuery, clientesQuery, cargosQuery };
}
