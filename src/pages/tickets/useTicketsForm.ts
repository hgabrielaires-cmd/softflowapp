import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TicketFormData, TicketStatus } from "./types";

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data, userId }: { data: TicketFormData; userId: string }) => {
      // Create ticket
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          titulo: data.titulo,
          descricao_html: data.descricao_html,
          cliente_id: data.cliente_id || null,
          contrato_id: data.contrato_id || null,
          mesa: data.mesa,
          tipo_atendimento_id: data.tipo_atendimento_id || null,
          prioridade: data.prioridade,
          responsavel_id: data.responsavel_id || null,
          sla_horas: data.sla_horas,
          tags: data.tags,
          previsao_entrega: data.previsao_entrega,
          ticket_pai_id: data.ticket_pai_id || null,
          criado_por: userId,
        } as Record<string, unknown>)
        .select("id, numero_exibicao")
        .single();
      if (error) throw error;

      // Add seguidores
      if (data.seguidores.length > 0) {
        const seguidoresRows = data.seguidores.map((uid) => ({
          ticket_id: ticket.id,
          user_id: uid,
        }));
        await supabase.from("ticket_seguidores").insert(seguidoresRows as Record<string, unknown>[]);
      }

      // Create system comment for creation
      await supabase.from("ticket_comentarios").insert({
        ticket_id: ticket.id,
        user_id: userId,
        tipo: "sistema",
        visibilidade: "publico",
        conteudo: "Ticket criado",
      } as Record<string, unknown>);

      return ticket as { id: string; numero_exibicao: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast.success("Ticket criado com sucesso!");
    },
    onError: (err: Error) => toast.error("Erro ao criar ticket: " + err.message),
  });
}

export function useUpdateTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ticketId,
      newStatus,
      oldStatus,
      userId,
    }: {
      ticketId: string;
      newStatus: TicketStatus;
      oldStatus: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus } as Record<string, unknown>)
        .eq("id", ticketId);
      if (error) throw error;

      await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "status_change",
        visibilidade: "publico",
        conteudo: `Status alterado de "${oldStatus}" para "${newStatus}"`,
        metadata: { old_status: oldStatus, new_status: newStatus },
      } as Record<string, unknown>);
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
      ticketId,
      userId,
      conteudo,
      visibilidade,
    }: {
      ticketId: string;
      userId: string;
      conteudo: string;
      visibilidade: "publico" | "interno";
    }) => {
      const { error } = await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "comentario",
        visibilidade,
        conteudo,
      } as Record<string, unknown>);
      if (error) throw error;
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
      ticketId,
      responsavelId,
      userId,
      responsavelNome,
    }: {
      ticketId: string;
      responsavelId: string;
      userId: string;
      responsavelNome: string;
    }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ responsavel_id: responsavelId } as Record<string, unknown>)
        .eq("id", ticketId);
      if (error) throw error;

      await supabase.from("ticket_comentarios").insert({
        ticket_id: ticketId,
        user_id: userId,
        tipo: "responsavel_change",
        visibilidade: "publico",
        conteudo: `Responsável alterado para ${responsavelNome}`,
      } as Record<string, unknown>);
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
        .insert({ ticket_id: ticketId, user_id: userId } as Record<string, unknown>);
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

export function useAddTicketVinculo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, ticketVinculadoId }: { ticketId: string; ticketVinculadoId: string }) => {
      const { error } = await supabase
        .from("ticket_vinculos")
        .insert({ ticket_id: ticketId, ticket_vinculado_id: ticketVinculadoId } as Record<string, unknown>);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_vinculos"] });
    },
  });
}

export function useUpdateTicketDescription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, descricao }: { ticketId: string; descricao: string }) => {
      const { error } = await supabase
        .from("tickets")
        .update({ descricao_html: descricao } as Record<string, unknown>)
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_detail"] });
      toast.success("Descrição atualizada!");
    },
  });
}

// Helpdesk parametros mutations
export function useSaveHelpdeskTipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id?: string;
      nome: string;
      descricao: string | null;
      sla_horas: number;
      mesa_padrao: string;
      ativo: boolean;
    }) => {
      if (data.id) {
        const { error } = await supabase
          .from("helpdesk_tipos_atendimento")
          .update(data as Record<string, unknown>)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("helpdesk_tipos_atendimento")
          .insert(data as Record<string, unknown>);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk_tipos_atendimento"] });
      toast.success("Tipo salvo com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useSaveHelpdeskModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id?: string;
      nome: string;
      tipo_atendimento_id: string | null;
      titulo_padrao: string | null;
      corpo_html: string;
      ativo: boolean;
    }) => {
      if (data.id) {
        const { error } = await supabase
          .from("helpdesk_modelos_ticket")
          .update(data as Record<string, unknown>)
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("helpdesk_modelos_ticket")
          .insert(data as Record<string, unknown>);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["helpdesk_modelos_ticket"] });
      toast.success("Modelo salvo com sucesso!");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
