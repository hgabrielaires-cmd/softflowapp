import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/supabase-types";

/**
 * Checks a single permission key (ex.: "crud.despesas.editar_paga") for the user's roles.
 * Admin always has access.
 */
export function usePermission(permissao: string, roles: AppRole[]) {
  const isAdmin = roles.includes("admin");
  const [allowed, setAllowed] = useState(isAdmin);
  const [loading, setLoading] = useState(!isAdmin);

  useEffect(() => {
    if (isAdmin) {
      setAllowed(true);
      setLoading(false);
      return;
    }
    if (roles.length === 0) {
      setAllowed(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    async function fetch() {
      const { data } = await supabase
        .from("role_permissions")
        .select("permissao")
        .in("role", roles)
        .eq("permissao", permissao)
        .eq("ativo", true);
      setAllowed((data || []).length > 0);
      setLoading(false);
    }
    fetch();
  }, [permissao, roles.join(","), isAdmin]);

  return { allowed, loading };
}
