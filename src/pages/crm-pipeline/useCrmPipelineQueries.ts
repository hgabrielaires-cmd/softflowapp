import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmOportunidade, CrmFunilSimples, CrmEtapaSimples } from "./types";

export function useCrmPipelineQueries(funilId?: string) {
  const funisQuery = useQuery({
    queryKey: ["crm_funis_pipeline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_funis")
        .select("id, nome, ordem, ativo")
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
        .select("*, clientes(nome_fantasia, apelido), profiles:responsavel_id(full_name)")
        .eq("funil_id", funilId!)
        .eq("status", "aberta")
        .order("ordem");
      if (error) throw error;
      return (data || []) as CrmOportunidade[];
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

  return { funisQuery, etapasQuery, oportunidadesQuery, responsaveisQuery };
}
