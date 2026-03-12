import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CrmFunil, CrmEtapa, CrmCampoPersonalizado } from "./types";

export function useCrmFunis() {
  return useQuery({
    queryKey: ["crm_funis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_funis")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return data as CrmFunil[];
    },
  });
}

export function useCrmEtapas(funilId?: string) {
  return useQuery({
    queryKey: ["crm_etapas", funilId],
    queryFn: async () => {
      let q = supabase.from("crm_etapas").select("*").order("ordem");
      if (funilId) q = q.eq("funil_id", funilId);
      const { data, error } = await q;
      if (error) throw error;
      return data as CrmEtapa[];
    },
  });
}

export function useCrmCamposPersonalizados() {
  return useQuery({
    queryKey: ["crm_campos_personalizados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_campos_personalizados")
        .select("*")
        .order("ordem");
      if (error) throw error;
      return (data || []).map((d: any) => ({
        ...d,
        opcoes: Array.isArray(d.opcoes) ? d.opcoes : [],
      })) as CrmCampoPersonalizado[];
    },
  });
}
