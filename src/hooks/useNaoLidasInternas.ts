import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useNaoLidasInternas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chat-interno-nao-lidas", user?.id],
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      // Get all conversations user participates in
      const { data: participacoes } = await supabase
        .from("chat_interno_participantes")
        .select("conversa_id")
        .eq("user_id", user.id);

      if (!participacoes?.length) return 0;

      const conversaIds = participacoes.map((p) => p.conversa_id);

      // Get all messages in those conversations not sent by current user
      const { data: msgs } = await supabase
        .from("chat_interno_mensagens")
        .select("id")
        .in("conversa_id", conversaIds)
        .neq("user_id", user.id);

      if (!msgs?.length) return 0;

      const msgIds = msgs.map((m) => m.id);

      // Get which of those messages user has read
      const { data: leituras } = await supabase
        .from("chat_interno_leituras")
        .select("mensagem_id")
        .eq("user_id", user.id)
        .in("mensagem_id", msgIds);

      const lidasSet = new Set(leituras?.map((l) => l.mensagem_id) || []);
      return msgIds.filter((id) => !lidasSet.has(id)).length;
    },
  });
}
