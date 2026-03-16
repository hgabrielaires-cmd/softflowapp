import { supabase } from "@/integrations/supabase/client";

const DEFAULT_INSTANCE = "Softflow_WhatsApp";

export interface InstanciaResult {
  instancia: string;
  setor_nome: string | null;
  fonte: "usuario" | "padrao";
}

/**
 * Resolve a instância WhatsApp para um dado usuário.
 * Prioridade:
 *   1. Setor vinculado ao usuario_id → instance_name desse setor
 *   2. Instância padrão global (Softflow_WhatsApp)
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

  // 2. Instância padrão
  return {
    instancia: DEFAULT_INSTANCE,
    setor_nome: null,
    fonte: "padrao",
  };
}
