import { supabase } from "@/integrations/supabase/client";

export interface ContatoDuplicado {
  id: string;
  nome: string;
  telefone: string;
  empresa?: string;
  origem: "cliente" | "crm";
  cliente_id?: string;
  email?: string;
}

export async function verificarTelefoneDuplicado(
  telefone: string
): Promise<{ existe: boolean; contatos: ContatoDuplicado[] }> {
  const limpo = telefone.replace(/\D/g, "");
  if (limpo.length < 10) return { existe: false, contatos: [] };

  const ultimos8 = limpo.slice(-8);

  const [{ data: clienteContatos }, { data: crmContatos }] = await Promise.all([
    supabase
      .from("cliente_contatos")
      .select("id, nome, telefone, email, cliente_id, clientes(nome_fantasia)")
      .ilike("telefone", `%${ultimos8}%`)
      .eq("ativo", true)
      .limit(5),
    supabase
      .from("crm_oportunidade_contatos")
      .select("id, nome, telefone, email, oportunidade_id")
      .ilike("telefone", `%${ultimos8}%`)
      .limit(5),
  ]);

  const resultado: ContatoDuplicado[] = [
    ...(clienteContatos || []).map((c: any) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email || undefined,
      empresa: c.clientes?.nome_fantasia,
      origem: "cliente" as const,
      cliente_id: c.cliente_id,
    })),
    ...(crmContatos || []).map((c: any) => ({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone,
      email: c.email || undefined,
      origem: "crm" as const,
    })),
  ];

  return { existe: resultado.length > 0, contatos: resultado };
}
