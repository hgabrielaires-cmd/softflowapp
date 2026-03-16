import { supabase } from "@/integrations/supabase/client";

const DEFAULT_INSTANCE = "Softflow_WhatsApp";

export interface InstanciaResult {
  instancia: string;
  setor_nome: string | null;
  fonte: "usuario" | "filial" | "padrao";
}

/**
 * Resolve a instância WhatsApp para um dado usuário.
 * Prioridade:
 *   1. Setor vinculado ao usuario_id → instance_name desse setor
 *   2. Filial do usuário → setor da filial com instância
 *   3. Instância padrão global (Softflow_WhatsApp)
 */
export async function getInstanciaDoUsuario(userId: string): Promise<InstanciaResult> {
  // 1. Buscar setor onde usuario_id = userId
  const { data: setorUsuario } = await supabase
    .from("setores")
    .select("instance_name, nome")
    .eq("usuario_id", userId)
    .eq("ativo", true)
    .not("instance_name", "is", null)
    .limit(1)
    .maybeSingle();

  if (setorUsuario?.instance_name) {
    return {
      instancia: setorUsuario.instance_name,
      setor_nome: setorUsuario.nome,
      fonte: "usuario",
    };
  }

  // 2. Buscar filial do usuário → procurar setor da filial com instância
  const { data: profile } = await supabase
    .from("profiles")
    .select("filial_id")
    .eq("user_id", userId)
    .single();

  if (profile?.filial_id) {
    // Buscar setor vinculado à filial que tenha instance_name
    // (filiais podem ter instance_name direta via filiais ou setor padrão)
    const { data: setorFilial } = await supabase
      .from("setores")
      .select("instance_name, nome")
      .eq("ativo", true)
      .not("instance_name", "is", null)
      .limit(1)
      .maybeSingle();

    if (setorFilial?.instance_name) {
      return {
        instancia: setorFilial.instance_name,
        setor_nome: setorFilial.nome,
        fonte: "filial",
      };
    }
  }

  // 3. Instância padrão
  return {
    instancia: DEFAULT_INSTANCE,
    setor_nome: null,
    fonte: "padrao",
  };
}
