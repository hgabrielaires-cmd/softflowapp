import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TicketFormData, TicketStatus } from "./types";

export function useCreateTicket(onCreated?: () => void) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, userId, agendamentos = [], anexos = [], origem = "avulso" }: {
      data: TicketFormData; userId: string;
      agendamentos?: { data: string; hora_inicio: string | null }[];
      anexos?: { nome: string; url: string; tipo_mime: string; tamanho_bytes: number }[];
      origem?: string;
    }) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          titulo: data.titulo,
          descricao_html: data.descricao_html,
          cliente_id: data.cliente_id || null,
          contrato_id: data.contrato_id || null,
          mesa: data.mesa,
          modo: data.modo,
          tipo_atendimento_id: data.tipo_atendimento_id || null,
          prioridade: data.prioridade,
          responsavel_id: data.responsavel_id || null,
          sla_horas: data.sla_horas,
          tags: data.tags,
          previsao_entrega: data.previsao_entrega,
          ticket_pai_id: data.ticket_pai_id || null,
          criado_por: userId,
          origem,
        } as any)
        .select("id, numero_exibicao")
        .single();
      if (error) throw error;

      if (data.seguidores.length > 0) {
        const rows = data.seguidores.map((uid) => ({
          ticket_id: ticket.id,
          user_id: uid,
        }));
        await supabase.from("ticket_seguidores").insert(rows);
      }

      await supabase.from("ticket_comentarios").insert({
        ticket_id: ticket.id,
        user_id: userId,
        tipo: "sistema",
        visibilidade: "publico",
        conteudo: "Ticket criado",
      });

      // Save anexos
      if (anexos.length > 0) {
        const anexoRows = anexos.map((a) => ({
          ticket_id: ticket.id,
          nome: a.nome,
          url: a.url,
          tipo_mime: a.tipo_mime,
          tamanho_bytes: a.tamanho_bytes,
          uploaded_by: userId,
        }));
        const { error: anexoError } = await supabase.from("ticket_anexos").insert(anexoRows);
        if (anexoError) console.error("Erro ao salvar anexos:", anexoError);
      }

      // Save agendamentos if any dates were selected
      if (agendamentos.length > 0) {
        const agRows = agendamentos.map((ag) => ({
          ticket_id: ticket.id,
          data: ag.data,
          hora_inicio: ag.hora_inicio || null,
          origem: "ticket",
          checklist_index: 0,
          criado_por: userId,
          titulo: data.titulo || "Ticket",
        }));
        const { error: agError } = await supabase.from("painel_agendamentos").insert(agRows);
        if (agError) console.error("Erro ao salvar agendamentos:", agError);
      }

      return ticket as { id: string; numero_exibicao: string };
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket criado com sucesso!");
      onCreated?.();
    },
    onError: (err: Error) => toast.error("Erro ao criar ticket: " + err.message),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId, newStatus, oldStatus, userId,
    }: { ticketId: string; newStatus: TicketStatus; oldStatus: string; userId: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);
      if (error) throw error;

      await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "status_change",
        visibilidade: "publico",
        conteudo: `Status alterado de "${oldStatus}" para "${newStatus}"`,
        metadata: { old_status: oldStatus, new_status: newStatus },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket_detail"] });
      qc.invalidateQueries({ queryKey: ["ticket_comentarios"] });
    },
    onError: (err: Error) => toast.error("Erro ao atualizar status: " + err.message),
  });
}

export function useAddTicketComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId, userId, conteudo, visibilidade, mentionedUserIds = [], ticketNumero = "", anexos = [],
    }: {
      ticketId: string; userId: string; conteudo: string;
      visibilidade: "publico" | "interno";
      mentionedUserIds?: string[];
      ticketNumero?: string;
      anexos?: { nome: string; url: string; tipo?: string }[];
    }) => {
      const { error } = await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "comentario",
        visibilidade,
        conteudo,
        anexos: anexos.length > 0 ? anexos : [],
      } as any);
      if (error) throw error;

      // Send notifications for mentions
      if (mentionedUserIds.length > 0) {
        const { data: autorProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", userId)
          .maybeSingle();
        const autorNome = autorProfile?.full_name || "Alguém";
        const preview = conteudo.slice(0, 120) + (conteudo.length > 120 ? "..." : "");

        const notifs = mentionedUserIds
          .filter((id) => id !== userId)
          .map((mentionedId) => ({
            titulo: `💬 ${autorNome} mencionou você`,
            mensagem: `Você foi mencionado em um comentário no ticket ${ticketNumero}: "${preview}"`,
            tipo: "info" as const,
            criado_por: userId,
            destinatario_user_id: mentionedId,
            metadata: { ticket_id: ticketId },
          }));

        if (notifs.length > 0) {
          await supabase.from("notificacoes").insert(notifs);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_comentarios"] });
      toast.success("Resposta enviada!");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}

export function useUpdateTicketResponsavel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId, responsavelId, userId, responsavelNome,
    }: { ticketId: string; responsavelId: string; userId: string; responsavelNome: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ responsavel_id: responsavelId })
        .eq("id", ticketId);
      if (error) throw error;

      await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "responsavel_change",
        visibilidade: "publico",
        conteudo: `Responsável alterado para ${responsavelNome}`,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket_detail"] });
      qc.invalidateQueries({ queryKey: ["ticket_comentarios"] });
    },
  });
}

export function useAddTicketSeguidor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { error } = await supabase
        .from("ticket_seguidores")
        .insert({ ticket_id: ticketId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_seguidores"] });
      qc.invalidateQueries({ queryKey: ["ticket_seguidores_detail"] });
    },
  });
}

export function useRemoveTicketSeguidor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, userId }: { ticketId: string; userId: string }) => {
      const { error } = await supabase
        .from("ticket_seguidores")
        .delete()
        .eq("ticket_id", ticketId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_seguidores"] });
      qc.invalidateQueries({ queryKey: ["ticket_seguidores_detail"] });
    },
  });
}

export function useToggleTicketCurtida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ comentarioId, userId, liked }: { comentarioId: string; userId: string; liked: boolean }) => {
      if (liked) {
        await supabase.from("ticket_curtidas").delete().eq("comentario_id", comentarioId).eq("user_id", userId);
      } else {
        await supabase.from("ticket_curtidas").insert({ comentario_id: comentarioId, user_id: userId });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_curtidas"] });
    },
  });
}

export function useReplyTicketComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId, userId, conteudo, visibilidade, parentId,
    }: {
      ticketId: string; userId: string; conteudo: string;
      visibilidade: "publico" | "interno"; parentId: string;
    }) => {
      const { error } = await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "comentario",
        visibilidade,
        conteudo,
        parent_id: parentId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_comentarios"] });
    },
  });
}

export function useAddTicketVinculo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, ticketVinculadoId }: { ticketId: string; ticketVinculadoId: string }) => {
      const { error } = await supabase
        .from("ticket_vinculos")
        .insert({ ticket_id: ticketId, ticket_vinculado_id: ticketVinculadoId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ticket_vinculos"] }),
  });
}

export function useAddTicketAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, data, horaInicio, titulo, userId }: {
      ticketId: string; data: string; horaInicio: string | null; titulo: string; userId: string;
    }) => {
      const { error } = await supabase.from("painel_agendamentos").insert({
        ticket_id: ticketId,
        data,
        hora_inicio: horaInicio || null,
        origem: "ticket",
        checklist_index: 0,
        criado_por: userId,
        titulo,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_agendamentos"] });
      toast.success("Agendamento adicionado!");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}

export function useRemoveTicketAgendamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ agendamentoId }: { agendamentoId: string }) => {
      const { error } = await supabase.from("painel_agendamentos").delete().eq("id", agendamentoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_agendamentos"] });
      toast.success("Agendamento removido!");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}

export function useUpdateTicketDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, descricao }: { ticketId: string; descricao: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ descricao_html: descricao })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_detail"] });
      toast.success("Descrição atualizada!");
    },
  });
}

export function useSaveHelpdeskTipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id?: string; nome: string; descricao: string | null;
      sla_horas: number; mesa_padrao: string; ativo: boolean;
    }) => {
      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase.from("helpdesk_tipos_atendimento").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("helpdesk_tipos_atendimento").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk_tipos_atendimento"] });
      toast.success("Tipo salvo!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSaveHelpdeskModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id?: string; nome: string; tipo_atendimento_id: string | null;
      titulo_padrao: string | null; corpo_html: string; ativo: boolean;
    }) => {
      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase.from("helpdesk_modelos_ticket").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("helpdesk_modelos_ticket").insert(rest);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk_modelos_ticket"] });
      toast.success("Modelo salvo!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useCloseTicketWithResolution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId, newStatus, oldStatus, userId, resolucao,
    }: { ticketId: string; newStatus: string; oldStatus: string; userId: string; resolucao: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);
      if (error) throw error;

      await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "status_change",
        visibilidade: "publico",
        conteudo: `Status alterado de "${oldStatus}" para "${newStatus}". Resolução: ${resolucao}`,
        metadata: { old_status: oldStatus, new_status: newStatus, resolucao },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket_detail"] });
      qc.invalidateQueries({ queryKey: ["ticket_comentarios"] });
      toast.success("Ticket atualizado com sucesso!");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}

export function usePausarTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId, userId, motivo, tipo,
    }: { ticketId: string; userId: string; motivo: string; tipo: "aguardando_cliente" | "outro" }) => {
      const newStatus = tipo === "aguardando_cliente" ? "Aguardando Cliente" : "Em Andamento";
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);
      if (error) throw error;

      const conteudo = tipo === "aguardando_cliente"
        ? `Ticket pausado — Aguardando Cliente. Motivo: ${motivo}`
        : `Ticket pausado. Motivo: ${motivo}`;

      await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "status_change",
        visibilidade: "publico",
        conteudo,
        metadata: { action: "pausar", tipo_pausa: tipo, motivo },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["ticket_detail"] });
      qc.invalidateQueries({ queryKey: ["ticket_comentarios"] });
      toast.success("Ticket pausado!");
    },
    onError: (err: Error) => toast.error("Erro: " + err.message),
  });
}
