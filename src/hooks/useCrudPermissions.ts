import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/lib/supabase-types";
import { useAuth } from "@/context/AuthContext";
import { VENDEDOR_CRUD_PERMS } from "@/lib/vendedor-permissions";

/**
 * Fetches CRUD permissions (crud.<module>.incluir/editar/excluir) for the user's roles.
 * Admin always has full access.
 * Users flagged as "É Vendedor?" can create/edit pedidos e clientes.
 */
export function useCrudPermissions(module: string, roles: AppRole[]) {
  const { profile } = useAuth();
  const isVendedor = (profile as any)?.is_vendedor === true;
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

    const base = isVendedor ? new Set<string>(VENDEDOR_CRUD_PERMS) : new Set<string>();

    function apply(perms: Set<string>) {
      setCanIncluir(perms.has(`crud.${module}.incluir`));
      setCanEditar(perms.has(`crud.${module}.editar`));
      setCanExcluir(perms.has(`crud.${module}.excluir`));
      setLoading(false);
    }

    if (roles.length === 0) {
      apply(base);
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

      const perms = new Set<string>(base);
      (data || []).forEach((p) => perms.add(p.permissao));
      apply(perms);
    }

    fetch();
  }, [module, roles.join(","), isAdmin, isVendedor]);

  return { canIncluir, canEditar, canExcluir, loading };
}
