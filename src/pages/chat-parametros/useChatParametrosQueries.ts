import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useChatParametrosQueries() {
  const { filialId } = useAuth();

  const configQuery = useQuery({
    queryKey: ["chat-configuracoes", filialId],
    queryFn: async () => {
      let query = supabase.from("chat_configuracoes").select("*");
      if (filialId) query = query.eq("filial_id", filialId);
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const fluxoQuery = useQuery({
    queryKey: ["chat-bot-fluxo", filialId],
    queryFn: async () => {
      let query = supabase.from("chat_bot_fluxo").select("*").order("ordem");
      if (filialId) query = query.eq("filial_id", filialId);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const respostasQuery = useQuery({
    queryKey: ["chat-respostas-rapidas", filialId],
    queryFn: async () => {
      let query = supabase
        .from("chat_respostas_rapidas")
        .select("*, setor:setores(id, nome)")
        .order("atalho");
      if (filialId) query = query.eq("filial_id", filialId);
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
