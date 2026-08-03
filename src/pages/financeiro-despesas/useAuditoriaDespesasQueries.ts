import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AuditoriaDespesaRegistro } from "./types";

/** Lê o log de auditoria genérico (audit_logs) filtrado pela entidade fin_despesas. */
export function useAuditoriaDespesasQuery() {
  return useQuery({
    queryKey: ["audit_logs", "fin_despesas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, user_id, action, entity_id, details")
        .eq("entity_type", "fin_despesas")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as AuditoriaDespesaRegistro[];
    },
  });
}

/** Nomes dos usuários responsáveis pelos eventos de auditoria. */
export function useAuditoriaUsuariosQuery() {
  return useQuery({
    queryKey: ["audit_logs_usuarios"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return (data || []) as { user_id: string; full_name: string | null; email: string | null }[];
    },
  });
}
