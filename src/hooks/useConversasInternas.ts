import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

export interface ConversaInterna {
  id: string;
  tipo: string;
  nome: string | null;
  created_at: string;
  ultima_mensagem: string | null;
  ultima_mensagem_at: string | null;
  nao_lidas: number;
  outro_participante?: { full_name: string; avatar_url: string | null; user_id: string } | null;
}

export function useConversasInternas() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["chat-interno-conversas", user?.id],
    enabled: !!user,
    refetchInterval: 15_000,
    queryFn: async (): Promise<ConversaInterna[]> => {
      if (!user) return [];

      // 1. Get conversations where user is participant
      const { data: participacoes } = await supabase
        .from("chat_interno_participantes")
        .select("conversa_id")
        .eq("user_id", user.id);

      if (!participacoes?.length) return [];

      const conversaIds = participacoes.map((p) => p.conversa_id);

      // 2. Get conversations
      const { data: conversas } = await supabase
        .from("chat_interno_conversas")
        .select("*")
        .in("id", conversaIds)
        .order("updated_at", { ascending: false });

      if (!conversas?.length) return [];

      // 3. For each conversation, get last message, unread count, and other participant
      const result: ConversaInterna[] = [];

      for (const c of conversas) {
        // Last message
        const { data: lastMsg } = await supabase
          .from("chat_interno_mensagens")
          .select("conteudo, created_at")
          .eq("conversa_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Unread count: messages in this conversation not read by this user
        const { data: allMsgs } = await supabase
          .from("chat_interno_mensagens")
          .select("id")
          .eq("conversa_id", c.id)
          .neq("user_id", user.id);

        let naoLidas = 0;
        if (allMsgs?.length) {
          const msgIds = allMsgs.map((m) => m.id);
          const { data: leituras } = await supabase
            .from("chat_interno_leituras")
            .select("mensagem_id")
            .eq("user_id", user.id)
            .in("mensagem_id", msgIds);

          const lidasSet = new Set(leituras?.map((l) => l.mensagem_id) || []);
          naoLidas = msgIds.filter((id) => !lidasSet.has(id)).length;
        }

        // Other participant for DMs
        let outroParticipante = null;
        if (c.tipo === "direto") {
          const { data: parts } = await supabase
            .from("chat_interno_participantes")
            .select("user_id")
            .eq("conversa_id", c.id)
            .neq("user_id", user.id)
            .limit(1)
            .maybeSingle();

          if (parts) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, avatar_url, user_id")
              .eq("user_id", parts.user_id)
              .maybeSingle();
            outroParticipante = profile;
          }
        }

        result.push({
          id: c.id,
          tipo: c.tipo,
          nome: c.nome,
          created_at: c.created_at,
          ultima_mensagem: lastMsg?.conteudo || null,
          ultima_mensagem_at: lastMsg?.created_at || null,
          nao_lidas: naoLidas,
          outro_participante: outroParticipante,
        });
      }

      return result;
    },
  });
}
