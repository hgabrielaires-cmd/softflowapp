import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export function useChatConversas(tab: string, userId: string | undefined, search: string) {
  const query = useQuery({
    queryKey: ["chat-conversas", tab, userId, search],
    queryFn: async () => {
      let q = supabase
        .from("chat_conversas")
        .select(`
          *,
          setor:setores(id, nome),
          atendente:profiles!chat_conversas_atendente_id_fkey(user_id, full_name, avatar_url),
          cliente:clientes!chat_conversas_cliente_id_fkey(id, nome_fantasia, cnpj_cpf)
        `)
        .order("updated_at", { ascending: false })
        .limit(50);

      if (tab === "fila") {
        q = q.in("status", ["bot", "aguardando"]);
      } else if (tab === "meus" && userId) {
        q = q.eq("atendente_id", userId).in("status", ["em_atendimento"]);
      } else if (tab === "encerrados") {
        q = q.in("status", ["encerrado", "fora_horario"]);
      }
      // "todos" = all non-encerrados
      if (tab === "todos") {
        q = q.not("status", "in", '("encerrado","fora_horario")');
      }

      if (search) {
        q = q.or(`nome_cliente.ilike.%${search}%,numero_cliente.ilike.%${search}%,protocolo.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
    refetchInterval: 10000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("chat-conversas-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversas" }, () => {
        query.refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return query;
}

export function useChatMensagens(conversaId: string | null) {
  const query = useQuery({
    queryKey: ["chat-mensagens", conversaId],
    queryFn: async () => {
      if (!conversaId) return [];
      const { data, error } = await supabase
        .from("chat_mensagens")
        .select(`
          *,
          atendente:profiles!chat_mensagens_atendente_id_fkey(user_id, full_name, avatar_url)
        `)
        .eq("conversa_id", conversaId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversaId,
  });

  // Realtime for messages
  useEffect(() => {
    if (!conversaId) return;
    const channel = supabase
      .channel(`chat-mensagens-${conversaId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_mensagens",
        filter: `conversa_id=eq.${conversaId}`,
      }, () => {
        query.refetch();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversaId]);

  return query;
}

export function useChatRespostasRapidas() {
  return useQuery({
    queryKey: ["chat-respostas-rapidas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_respostas_rapidas")
        .select("*")
        .eq("ativo", true)
        .order("atalho");
      if (error) throw error;
      return data || [];
    },
  });
}

export function useChatHistorico(numero: string | null, conversaAtualId: string | null) {
  return useQuery({
    queryKey: ["chat-historico", numero],
    queryFn: async () => {
      if (!numero) return [];
      let q = supabase
        .from("chat_conversas")
        .select(`id, protocolo, status, created_at, encerrado_em, nome_cliente,
          nps_nota, tempo_atendimento_segundos, setor_id, titulo_atendimento,
          atendente:profiles!chat_conversas_atendente_id_fkey(full_name),
          setor:setores!chat_conversas_setor_id_fkey(nome)`)
        .eq("numero_cliente", numero)
        .order("created_at", { ascending: false })
        .limit(11);

      if (conversaAtualId) {
        q = q.neq("id", conversaAtualId);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data || []).slice(0, 10);
    },
    enabled: !!numero,
  });
}

export function useSetores() {
  return useQuery({
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
}

export function useAtendentes() {
  return useQuery({
    queryKey: ["atendentes-chat"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url");
      if (error) throw error;
      const filtered = (data || [])
        .filter((p: any) => p.ativo !== false)
        .sort((a: any, b: any) => (a.full_name || "").localeCompare(b.full_name || ""));
      return filtered as Array<{ user_id: string; full_name: string | null; avatar_url: string | null }>;
    },
  });
}
