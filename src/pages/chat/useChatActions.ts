import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useChatActions() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["chat-conversas"] });
    qc.invalidateQueries({ queryKey: ["chat-mensagens"] });
  };

  const enviarMensagem = useMutation({
    mutationFn: async ({
      conversaId,
      texto,
      tipo = "texto",
      atendenteId,
      userName,
      numero,
      instanceName,
    }: {
      conversaId: string;
      texto: string;
      tipo?: string;
      atendenteId: string;
      userName?: string;
      numero: string;
      instanceName?: string;
    }) => {
      // Save to DB
      const { error } = await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo,
        conteudo: texto,
        remetente: tipo === "nota_interna" ? "sistema" : "atendente",
        atendente_id: atendenteId,
      });
      if (error) throw error;

      // Send via WhatsApp if not internal note
      if (tipo !== "nota_interna") {
        const textoWhatsApp = `*${userName || "Atendente"}* diz:\n${texto}`;
        const { error: sendError } = await supabase.functions.invoke("evolution-api", {
          body: { action: "send_text", number: numero, text: textoWhatsApp, instance_name: instanceName },
        });
        if (sendError) console.error("Erro ao enviar WhatsApp:", sendError);
      }

      // Update conversation timestamp
      await supabase
        .from("chat_conversas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversaId);
    },
    onSuccess: () => invalidate(),
    onError: (e) => toast.error("Erro ao enviar: " + e.message),
  });

  const iniciarAtendimento = useMutation({
    mutationFn: async ({
      conversaId,
      userId,
      userName,
      numero,
      instanceName,
    }: {
      conversaId: string;
      userId: string;
      userName: string;
      numero: string;
      instanceName?: string;
    }) => {
      const agora = new Date().toISOString();

      const { data: conv } = await supabase
        .from("chat_conversas")
        .select("iniciado_em")
        .eq("id", conversaId)
        .single();

      const tempoEspera = conv?.iniciado_em
        ? Math.round((Date.now() - new Date(conv.iniciado_em).getTime()) / 1000)
        : null;

      await supabase
        .from("chat_conversas")
        .update({
          status: "em_atendimento",
          atendente_id: userId,
          atendimento_iniciado_em: agora,
          tempo_espera_segundos: tempoEspera,
          updated_at: agora,
        })
        .eq("id", conversaId);

      // System message
      await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo: "sistema",
        conteudo: `${userName} iniciou o atendimento`,
        remetente: "sistema",
      });

      // Send WhatsApp greeting
      const saudacao = `😃 Olá! Meu nome é *${userName}* e estarei te auxiliando no atendimento.`;
      await supabase.functions.invoke("evolution-api", {
        body: { action: "send_text", number: numero, text: saudacao, instance_name: instanceName },
      });

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo: "texto",
        conteudo: saudacao,
        remetente: "atendente",
        atendente_id: userId,
      });

      // Update queue
      await supabase
        .from("chat_fila")
        .update({ status: "atribuido", atribuido_a: userId })
        .eq("conversa_id", conversaId);
    },
    onSuccess: () => {
      toast.success("Atendimento iniciado!");
      invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const encerrarConversa = useMutation({
    mutationFn: async ({
      conversaId,
      userId,
      userName,
      numero,
      instanceName,
      clienteId,
      tituloAtendimento,
    }: {
      conversaId: string;
      userId: string;
      userName: string;
      numero: string;
      instanceName?: string;
      clienteId?: string;
      tituloAtendimento?: string;
    }) => {
      const agora = new Date().toISOString();
      const { data: conv } = await supabase
        .from("chat_conversas")
        .select("atendimento_iniciado_em, filial_id")
        .eq("id", conversaId)
        .single();

      const tempoAtend = conv?.atendimento_iniciado_em
        ? Math.round((Date.now() - new Date(conv.atendimento_iniciado_em).getTime()) / 1000)
        : null;

      // Fetch config for messages (try filial-specific, then any)
      let config: { mensagem_encerramento: string | null; mensagem_nps: string | null } | null = null;
      if (conv?.filial_id) {
        const { data } = await supabase
          .from("chat_configuracoes")
          .select("mensagem_encerramento, mensagem_nps")
          .eq("filial_id", conv.filial_id)
          .maybeSingle();
        config = data;
      }
      if (!config) {
        const { data } = await supabase
          .from("chat_configuracoes")
          .select("mensagem_encerramento, mensagem_nps")
          .limit(1)
          .maybeSingle();
        config = data;
      }

      const msgEnc = config?.mensagem_encerramento || "Obrigado pelo contato! Foi um prazer atendê-lo. 😊";
      const msgNps = config?.mensagem_nps || "Como você avalia nosso atendimento?\n1 - Péssimo 😞\n2 - Ruim 😕\n3 - Regular 😐\n4 - Bom 😊\n5 - Excelente 🌟";

      const updatePayload: any = {
        status: "encerrado",
        encerrado_em: agora,
        tempo_atendimento_segundos: tempoAtend,
        updated_at: agora,
      };
      if (clienteId) updatePayload.cliente_id = clienteId;
      if (tituloAtendimento) updatePayload.titulo_atendimento = tituloAtendimento;

      await supabase
        .from("chat_conversas")
        .update(updatePayload)
        .eq("id", conversaId);

      // System message
      await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo: "sistema",
        conteudo: `Conversa encerrada por ${userName}`,
        remetente: "sistema",
      });

      // Send closure message via WhatsApp
      await supabase.functions.invoke("evolution-api", {
        body: { action: "send_text", number: numero, text: msgEnc, instance_name: instanceName },
      });

      // Delay 3 seconds before NPS
      await new Promise((r) => setTimeout(r, 3000));

      // Send NPS
      await supabase
        .from("chat_conversas")
        .update({ nps_enviado: true })
        .eq("id", conversaId);

      await supabase.functions.invoke("evolution-api", {
        body: { action: "send_text", number: numero, text: msgNps, instance_name: instanceName },
      });

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo: "bot",
        conteudo: msgNps,
        remetente: "bot",
      });
    },
    onSuccess: () => {
      toast.success("Conversa encerrada!");
      invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const transferirConversa = useMutation({
    mutationFn: async ({
      conversaId,
      novoSetorId,
      novoAtendenteId,
      motivo,
      setorNome,
    }: {
      conversaId: string;
      novoSetorId: string;
      novoAtendenteId?: string;
      motivo?: string;
      setorNome?: string;
    }) => {
      await supabase
        .from("chat_conversas")
        .update({
          setor_id: novoSetorId,
          atendente_id: novoAtendenteId || null,
          status: novoAtendenteId ? "em_atendimento" : "aguardando",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversaId);

      const msg = motivo
        ? `Transferido para ${setorNome || "outro setor"}. Motivo: ${motivo}`
        : `Transferido para ${setorNome || "outro setor"}`;

      await supabase.from("chat_mensagens").insert({
        conversa_id: conversaId,
        tipo: "sistema",
        conteudo: msg,
        remetente: "sistema",
      });

      // Update queue
      if (!novoAtendenteId) {
        await supabase.from("chat_fila").upsert({
          conversa_id: conversaId,
          setor_id: novoSetorId,
          status: "aguardando",
        }, { onConflict: "conversa_id" });
      }
    },
    onSuccess: () => {
      toast.success("Conversa transferida!");
      invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  return { enviarMensagem, iniciarAtendimento, encerrarConversa, transferirConversa };
}
