import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Ticket, TicketComentario, TicketAnexo, TicketVinculo, TicketSeguidor, TicketCurtida, TicketAgendamento } from "./types";

export function useTickets() {
  return useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          clientes:cliente_id(id, nome_fantasia)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Ticket[];
    },
  });
}

export function useTicketSeguidores(ticketIds: string[]) {
  return useQuery({
    queryKey: ["ticket_seguidores", ticketIds],
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_seguidores")
        .select("*, profile:profiles!ticket_seguidores_user_id_fkey(user_id, full_name, avatar_url)")
        .in("ticket_id", ticketIds);
      if (error) throw error;
      return (data ?? []) as unknown as TicketSeguidor[];
    },
  });
}

export function useTicketAnexosCount(ticketIds: string[]) {
  return useQuery({
    queryKey: ["ticket_anexos_count", ticketIds],
    enabled: ticketIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_anexos")
        .select("ticket_id")
        .in("ticket_id", ticketIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data ?? []).forEach((a: { ticket_id: string }) => {
        counts[a.ticket_id] = (counts[a.ticket_id] || 0) + 1;
      });
      return counts;
    },
  });
}

export function useTicketDetail(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket_detail", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select(`
          *,
          clientes:cliente_id(id, nome_fantasia)
        `)
        .eq("id", ticketId!)
        .single();
      if (error) throw error;
      return data as unknown as Ticket;
    },
  });
}

export function useTicketComentarios(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket_comentarios", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_comentarios")
        .select("*, profile:profiles!ticket_comentarios_user_id_fkey(user_id, full_name, avatar_url)")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TicketComentario[];
    },
  });
}

export function useTicketCurtidas(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket_curtidas", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_curtidas")
        .select("*")
        .in("comentario_id",
          (await supabase.from("ticket_comentarios").select("id").eq("ticket_id", ticketId!)).data?.map((c: any) => c.id) || []
        );
      if (error) throw error;
      return (data ?? []) as unknown as TicketCurtida[];
    },
  });
}

export function useClienteContatos(clienteId: string | null) {
  return useQuery({
    queryKey: ["cliente_contatos_ticket", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cliente_contatos")
        .select("*")
        .eq("cliente_id", clienteId!)
        .eq("ativo", true)
        .order("decisor", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTicketAnexos(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket_anexos", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_anexos")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TicketAnexo[];
    },
  });
}

export function useTicketVinculos(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket_vinculos", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_vinculos")
        .select("*, ticket_vinculado:ticket_vinculado_id(id, numero_exibicao, titulo, status)")
        .eq("ticket_id", ticketId!);
      if (error) throw error;
      return (data ?? []) as unknown as TicketVinculo[];
    },
  });
}

export function useTicketAgendamentos(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket_agendamentos", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_agendamentos")
        .select("id, ticket_id, data, hora_inicio, hora_fim, titulo, created_at")
        .eq("ticket_id", ticketId!)
        .eq("origem", "ticket")
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TicketAgendamento[];
    },
  });
}

export function useTicketSeguidoresByTicket(ticketId: string | null) {
  return useQuery({
    queryKey: ["ticket_seguidores_detail", ticketId],
    enabled: !!ticketId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_seguidores")
        .select("*, profile:profiles!ticket_seguidores_user_id_fkey(user_id, full_name, avatar_url)")
        .eq("ticket_id", ticketId!);
      if (error) throw error;
      return (data ?? []) as unknown as TicketSeguidor[];
    },
  });
}

export function useHelpdeskTipos() {
  return useQuery({
    queryKey: ["helpdesk_tipos_atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_tipos_atendimento")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useHelpdeskModelos() {
  return useQuery({
    queryKey: ["helpdesk_modelos_ticket"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("helpdesk_modelos_ticket")
        .select("*, tipo_atendimento:tipo_atendimento_id(id, nome)")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, email, mesa_favorita_id")
        .eq("active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClienteContratos(clienteId: string | null) {
  return useQuery({
    queryKey: ["cliente_contratos", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contratos")
        .select("id, numero_exibicao, tipo, status, plano_id, planos:plano_id(nome)")
        .eq("cliente_id", clienteId!)
        .eq("status", "Ativo")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useClienteTicketsAbertos(clienteId: string | null) {
  return useQuery({
    queryKey: ["cliente_tickets_abertos", clienteId],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, numero_exibicao, titulo, status, prioridade, created_at")
        .eq("cliente_id", clienteId!)
        .in("status", ["Aberto", "Em Andamento", "Aguardando Cliente"])
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}
