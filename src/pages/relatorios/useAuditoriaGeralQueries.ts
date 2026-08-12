import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditoriaGeralRegistro {
  id: string;
  created_at: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
}

/** Log de auditoria de todo o sistema (todas as entidades). */
export function useAuditoriaGeralQuery() {
  return useQuery({
    queryKey: ["audit_logs", "geral"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, user_id, action, entity_type, entity_id, details")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as unknown as AuditoriaGeralRegistro[];
    },
  });
}

/** Nomes dos usuários para exibição na auditoria. */
export function useAuditoriaProfilesQuery() {
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
