import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface MensagemInterna {
  id: string;
  conversa_id: string;
  user_id: string;
  conteudo: string;
  created_at: string;
  remetente_nome?: string;
  remetente_avatar?: string | null;
}

export function useMensagensInternas(conversaId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["chat-interno-mensagens", conversaId],
    enabled: !!conversaId && !!user,
    queryFn: async (): Promise<MensagemInterna[]> => {
      if (!conversaId) return [];

      const { data: msgs } = await supabase
        .from("chat_interno_mensagens")
        .select("*")
        .eq("conversa_id", conversaId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (!msgs?.length) return [];

      // Get profiles for senders
      const userIds = [...new Set(msgs.map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      return msgs.map((m) => {
        const p = profileMap.get(m.user_id);
        return {
          ...m,
          remetente_nome: p?.full_name || "Usuário",
          remetente_avatar: p?.avatar_url || null,
        };
      });
    },
  });

  // Realtime subscription
  useEffect(() => {
    if (!conversaId) return;

    const channel = supabase
      .channel(`chat-interno-${conversaId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_interno_mensagens",
          filter: `conversa_id=eq.${conversaId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-interno-mensagens", conversaId] });
          queryClient.invalidateQueries({ queryKey: ["chat-interno-conversas"] });
          queryClient.invalidateQueries({ queryKey: ["chat-interno-nao-lidas"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, queryClient]);

  return query;
}
