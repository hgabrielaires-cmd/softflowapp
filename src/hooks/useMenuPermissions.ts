import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/supabase-types";

/**
 * Fetches the active menu permissions for the user's roles from role_permissions.
 * Admin always has full access (permissions = null).
 * While loading, non-admin users get an empty Set to avoid flash of all menus.
 */
export function useMenuPermissions(roles: AppRole[]) {
  const isAdmin = roles.includes("admin");
  // Non-admin starts with empty Set (hide everything) until loaded
  const [permissions, setPermissions] = useState<Set<string> | null>(isAdmin ? null : new Set());
  const [loading, setLoading] = useState(!isAdmin);

  useEffect(() => {
    if (isAdmin) {
      setPermissions(null); // null = unrestricted
      setLoading(false);
      return;
    }

    if (roles.length === 0) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    // Reset to empty while fetching to prevent flash
    setPermissions(new Set());
    setLoading(true);

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
