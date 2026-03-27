import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ClienteDocumento {
  id: string;
  cliente_id: string;
  nome: string;
  descricao: string | null;
  url: string;
  criado_em: string;
}

export function useClienteDocumentos(clienteId: string | null) {
  const queryClient = useQueryClient();

  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ["cliente-documentos", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_documentos")
        .select("*")
        .eq("cliente_id", clienteId!)
        .order("criado_em", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ClienteDocumento[];
    },
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["cliente-documentos", clienteId] });

  return { documentos, isLoading, invalidate };
}
