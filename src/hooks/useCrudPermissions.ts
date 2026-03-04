import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/supabase-types";

/**
 * Fetches CRUD permissions (crud.<module>.incluir/editar/excluir) for the user's roles.
 * Admin always has full access.
 */
export function useCrudPermissions(module: string, roles: AppRole[]) {
  const isAdmin = roles.includes("admin");
  const [canIncluir, setCanIncluir] = useState(isAdmin);
  const [canEditar, setCanEditar] = useState(isAdmin);
  const [canExcluir, setCanExcluir] = useState(isAdmin);
  const [loading, setLoading] = useState(!isAdmin);

  useEffect(() => {
    if (isAdmin) {
      setCanIncluir(true);
      setCanEditar(true);
      setCanExcluir(true);
      setLoading(false);
      return;
    }

    if (roles.length === 0) {
      setCanIncluir(false);
      setCanEditar(false);
      setCanExcluir(false);
      setLoading(false);
      return;
    }

    async function fetch() {
      const { data } = await supabase
        .from("role_permissions")
        .select("permissao")
        .in("role", roles)
        .in("permissao", [
          `crud.${module}.incluir`,
          `crud.${module}.editar`,
          `crud.${module}.excluir`,
        ])
        .eq("ativo", true);

      const perms = new Set((data || []).map((p) => p.permissao));
      setCanIncluir(perms.has(`crud.${module}.incluir`));
      setCanEditar(perms.has(`crud.${module}.editar`));
      setCanExcluir(perms.has(`crud.${module}.excluir`));
      setLoading(false);
    }

    fetch();
  }, [module, roles.join(","), isAdmin]);

  return { canIncluir, canEditar, canExcluir, loading };
}
