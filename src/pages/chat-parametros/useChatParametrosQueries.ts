import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserFiliais } from "@/hooks/useUserFiliais";

export function useChatParametrosQueries() {
  const { filialPadraoId } = useUserFiliais();

  const configQuery = useQuery({
    queryKey: ["chat-configuracoes", filialPadraoId],
    queryFn: async () => {
      // Try filial-specific first, then fallback to any config
      if (filialPadraoId) {
        const { data, error } = await supabase
          .from("chat_configuracoes")
          .select("*")
          .eq("filial_id", filialPadraoId)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) return data;
      }
      // Fallback: any config (filial_id is null or first available)
      const { data, error } = await supabase
        .from("chat_configuracoes")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const fluxoQuery = useQuery({
    queryKey: ["chat-bot-fluxo", filialPadraoId],
    queryFn: async () => {
      let query = supabase.from("chat_bot_fluxo").select("*").order("ordem");
      if (filialPadraoId) query = query.eq("filial_id", filialPadraoId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const respostasQuery = useQuery({
    queryKey: ["chat-respostas-rapidas", filialPadraoId],
    queryFn: async () => {
      let query = supabase
        .from("chat_respostas_rapidas")
        .select("*")
        .order("atalho");
      if (filialPadraoId) query = query.eq("filial_id", filialPadraoId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const setoresQuery = useQuery({
    queryKey: ["setores-chat"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  return { configQuery, fluxoQuery, respostasQuery, setoresQuery };
}
