import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmOportunidade, CrmFunilSimples, CrmEtapaSimples } from "./types";

export function useCrmPipelineQueries(funilId?: string) {
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
    queryKey: ["crm_oportunidades", funilId],
    enabled: !!funilId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_oportunidades")
        .select("*, clientes(nome_fantasia, apelido, filial_id)")
        .eq("funil_id", funilId!)
        .eq("status", "aberta")
        .order("ordem");
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
      return (data || []).map(d => ({
        ...d,
        campos_personalizados: (d.campos_personalizados || {}) as Record<string, string>,
        profiles: d.responsavel_id && profilesMap[d.responsavel_id]
          ? { full_name: profilesMap[d.responsavel_id] }
          : null,
      })) as CrmOportunidade[];
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
