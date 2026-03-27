import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export function useNaoLidasInternas() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-interno-nao-lidas", user?.id],
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { data: participacoes } = await supabase
        .from("chat_interno_participantes")
        .select("conversa_id")
        .eq("user_id", user.id);

      if (!participacoes?.length) return 0;

      const conversaIds = participacoes.map((p) => p.conversa_id);

      const { data: msgs } = await supabase
        .from("chat_interno_mensagens")
        .select("id")
        .in("conversa_id", conversaIds)
        .neq("user_id", user.id);

      if (!msgs?.length) return 0;

      const msgIds = msgs.map((m) => m.id);

      const { data: leituras } = await supabase
        .from("chat_interno_leituras")
        .select("mensagem_id")
        .eq("user_id", user.id)
        .in("mensagem_id", msgIds);

      const lidasSet = new Set(leituras?.map((l) => l.mensagem_id) || []);
      return msgIds.filter((id) => !lidasSet.has(id)).length;
    },
  });

  // Realtime subscription to refresh unread count
  useEffect(() => {
    const channel = supabase
      .channel("nao-lidas-global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_interno_mensagens" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-interno-nao-lidas"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return query;
}
