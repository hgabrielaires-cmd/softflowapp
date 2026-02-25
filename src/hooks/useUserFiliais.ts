import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface FilialOption {
  id: string;
  nome: string;
}

interface UseUserFiliaisReturn {
  /** Filiais que o usuário pode ver (todas se global, senão só as vinculadas) */
  filiaisDoUsuario: FilialOption[];
  /** Filial padrão: favorita (filial_id do profile) ou primeira vinculada */
  filialPadraoId: string | null;
  /** Se o usuário tem acesso global */
  isGlobal: boolean;
  /** Loading state */
  loading: boolean;
  /** Todas as filiais ativas (para admins/referência) */
  todasFiliais: FilialOption[];
}

/**
 * Hook centralizado para filtrar filiais conforme acesso do usuário.
 * - Se acesso_global: retorna todas, filial padrão = filial_favorita_id ou filial_id
 * - Se não: retorna apenas as vinculadas via usuario_filiais
 */
export function useUserFiliais(): UseUserFiliaisReturn {
  const { profile, user } = useAuth();
  const [todasFiliais, setTodasFiliais] = useState<FilialOption[]>([]);
  const [vinculadas, setVinculadas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: filiaisData }, { data: ufData }] = await Promise.all([
        supabase.from("filiais").select("id, nome").eq("ativa", true).order("nome"),
        user ? supabase.from("usuario_filiais").select("filial_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
      ]);
      setTodasFiliais((filiaisData || []) as FilialOption[]);
      setVinculadas((ufData || []).map((u: any) => u.filial_id));
      setLoading(false);
    }
    load();
  }, [user?.id]);

  const isGlobal = profile?.acesso_global ?? false;

  const filiaisDoUsuario = isGlobal
    ? todasFiliais
    : todasFiliais.filter((f) => vinculadas.includes(f.id));

  // Filial padrão: favorita > filial_id > primeira vinculada
  const filialPadraoId =
    profile?.filial_favorita_id ||
    profile?.filial_id ||
    (filiaisDoUsuario.length > 0 ? filiaisDoUsuario[0].id : null);

  return {
    filiaisDoUsuario,
    filialPadraoId,
    isGlobal,
    loading,
    todasFiliais,
  };
}
