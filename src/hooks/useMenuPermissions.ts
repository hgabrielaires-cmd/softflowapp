import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/supabase-types";
import { useAuth } from "@/context/AuthContext";
import { VENDEDOR_MENU_PERMS } from "@/lib/vendedor-permissions";

/**
 * Fetches the active menu permissions for the user's roles from role_permissions.
 * Admin always has full access (permissions = null).
 * While loading, non-admin users get an empty Set to avoid flash of all menus.
 * Users flagged as "É Vendedor?" always get the Vendas/Clientes menus.
 */
export function useMenuPermissions(roles: AppRole[]) {
  const { profile } = useAuth();
  const isVendedor = (profile as any)?.is_vendedor === true;
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

    const base = isVendedor ? new Set<string>(VENDEDOR_MENU_PERMS) : new Set<string>();

    if (roles.length === 0) {
      setPermissions(base);
      setLoading(false);
      return;
    }

    // Reset while fetching to prevent flash
    setPermissions(base);
    setLoading(true);

    async function fetch() {
      const { data } = await supabase
        .from("role_permissions")
        .select("permissao, ativo")
        .in("role", roles)
        .like("permissao", "menu.%")
        .eq("ativo", true);

      const perms = new Set<string>(base);
      (data || []).forEach((p) => perms.add(p.permissao));
      setPermissions(perms);
      setLoading(false);
    }

    fetch();
  }, [roles.join(","), isAdmin, isVendedor]);

  return { permissions, loading };
}
