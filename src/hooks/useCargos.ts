import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCargos() {
  return useQuery({
    queryKey: ["crm-cargos-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_cargos")
        .select("id, nome")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
