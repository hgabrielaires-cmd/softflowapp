import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/supabase-types";

/**
 * Fetches the active menu permissions for the user's roles from role_permissions.
 * Admin always has full access.
 * Returns a Set of permission keys like "menu.pedidos", "menu.clientes", etc.
 */
export function useMenuPermissions(roles: AppRole[]) {
  const [permissions, setPermissions] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = roles.includes("admin");

  useEffect(() => {
    if (isAdmin) {
      // Admin has access to everything
      setPermissions(null); // null = unrestricted
      setLoading(false);
      return;
    }

    if (roles.length === 0) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    async function fetch() {
      const { data } = await supabase
        .from("role_permissions")
        .select("permissao, ativo")
        .in("role", roles)
        .like("permissao", "menu.%")
        .eq("ativo", true);

      const perms = new Set((data || []).map((p) => p.permissao));
      setPermissions(perms);
      setLoading(false);
    }

    fetch();
  }, [roles.join(","), isAdmin]);

  return { permissions, loading };
}
