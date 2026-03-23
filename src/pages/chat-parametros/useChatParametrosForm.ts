import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { toast } from "sonner";

export function useChatParametrosForm() {
  const qc = useQueryClient();
  const { filialPadraoId } = useUserFiliais();

  const salvarConfig = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const { id, ...rest } = values;
      const payload = { ...rest, filial_id: filialPadraoId || null };
      if (id) {
        const { error } = await supabase
          .from("chat_configuracoes")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("chat_configuracoes")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Configurações salvas!");
      qc.invalidateQueries({ queryKey: ["chat-configuracoes"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const salvarFluxo = useMutation({
    mutationFn: async (values: { id?: string; ordem: number; pergunta: string; tipo: string; opcoes: any; campo_destino: string | null; ativo: boolean }) => {
      const payload = { ...values, filial_id: filialPadraoId || null };
      if (values.id) {
        const { error } = await supabase
          .from("chat_bot_fluxo")
          .update(payload)
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { id, ...rest } = payload;
        const { error } = await supabase
          .from("chat_bot_fluxo")
          .insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Passo do fluxo salvo!");
      qc.invalidateQueries({ queryKey: ["chat-bot-fluxo"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluirFluxo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_bot_fluxo").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Passo removido!");
      qc.invalidateQueries({ queryKey: ["chat-bot-fluxo"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const salvarResposta = useMutation({
    mutationFn: async (values: { id?: string; atalho: string; conteudo: string; setor_id: string | null; ativo: boolean }) => {
      const payload = { ...values, filial_id: filialPadraoId || null };
      if (values.id) {
        const { error } = await supabase
          .from("chat_respostas_rapidas")
          .update(payload)
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { id, ...rest } = payload;
        const { error } = await supabase
          .from("chat_respostas_rapidas")
          .insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Resposta rápida salva!");
      qc.invalidateQueries({ queryKey: ["chat-respostas-rapidas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const excluirResposta = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chat_respostas_rapidas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resposta removida!");
      qc.invalidateQueries({ queryKey: ["chat-respostas-rapidas"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const configurarWebhook = useMutation({
    mutationFn: async (instancia: string) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "configure_webhook",
          instance_name: instancia,
          webhook_url: `${supabaseUrl}/functions/v1/evolution-webhook`,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => toast.success("Webhook configurado!"),
    onError: (e: any) => toast.error(e.message),
  });

  return { salvarConfig, salvarFluxo, excluirFluxo, salvarResposta, excluirResposta, configurarWebhook };
}
