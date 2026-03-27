import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DashKpi, TicketAlerta, TicketPorCategoria, TicketAntigo, KanbanResumo } from "./types";
import { KANBAN_STATUS_COLORS } from "./constants";
import { diasDesde, horasEntre } from "./helpers";
import { resolveStatus, type AtendentePresenca } from "./components/AtendentesPanel";

export function useDashKpis(startDate: string, endDate: string) {
  return useQuery<DashKpi>({
    queryKey: ["dash_tickets_kpis", startDate, endDate],
    queryFn: async () => {
      const now = new Date();

      const { data: tickets, error } = await supabase
        .from("tickets")
        .select("id, status, sla_deadline, created_at, updated_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (error) throw error;

      const all = tickets ?? [];
      const abertos = all.filter(t => ["Aberto", "Em Andamento", "Aguardando Cliente"].includes(t.status));
      const slaVencido = abertos.filter(t => t.sla_deadline && new Date(t.sla_deadline) < now);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const resolvidosHoje = all.filter(t => t.status === "Resolvido" && t.updated_at >= todayStart);

      const resolvidos = all.filter(t => t.status === "Resolvido");
      let tempoMedio = 0;
      if (resolvidos.length > 0) {
        const soma = resolvidos.reduce((acc, t) => acc + horasEntre(t.created_at, t.updated_at), 0);
        tempoMedio = Math.round((soma / resolvidos.length) * 10) / 10;
      }

      return {
        totalAbertos: abertos.length,
        slaVencido: slaVencido.length,
        resolvidosHoje: resolvidosHoje.length,
        tempoMedioResolucao: tempoMedio,
      };
    },
    refetchInterval: 60000,
  });
}

export function useDashAlertas() {
  return useQuery<TicketAlerta[]>({
    queryKey: ["dash_tickets_alertas"],
    queryFn: async () => {
      const now = new Date();
      const em2h = new Date(now.getTime() + 2 * 3600 * 1000);
      const alertas: TicketAlerta[] = [];

      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, numero_exibicao, titulo, sla_deadline, status")
        .in("status", ["Aberto", "Em Andamento", "Aguardando Cliente"])
        .not("sla_deadline", "is", null);

      (tickets ?? []).forEach(t => {
        const deadline = new Date(t.sla_deadline!);
        if (deadline < now) {
          alertas.push({
            id: t.id,
            numero_exibicao: t.numero_exibicao,
            titulo: t.titulo,
            tipo: "sla_vencido",
            detalhe: "SLA vencido",
          });
        } else if (deadline < em2h) {
          alertas.push({
            id: t.id,
            numero_exibicao: t.numero_exibicao,
            titulo: t.titulo,
            tipo: "sla_critico",
            detalhe: `Vence em ${Math.round((deadline.getTime() - now.getTime()) / 60000)}min`,
          });
        }
      });

      return alertas;
    },
    refetchInterval: 60000,
  });
}

export function useTicketsPorCategoria(startDate: string, endDate: string) {
  return useQuery<TicketPorCategoria[]>({
    queryKey: ["dash_tickets_por_categoria", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("mesa, created_at")
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data ?? []).forEach(t => {
        const cat = t.mesa || "Sem mesa";
        counts[cat] = (counts[cat] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([categoria, total]) => ({ categoria, total }))
        .sort((a, b) => b.total - a.total);
    },
  });
}

export function useTicketsMaisAntigos() {
  return useQuery<TicketAntigo[]>({
    queryKey: ["dash_tickets_mais_antigos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("id, numero_exibicao, titulo, prioridade, created_at, clientes:cliente_id(nome_fantasia)")
        .in("status", ["Aberto", "Em Andamento", "Aguardando Cliente"])
        .order("created_at", { ascending: true })
        .limit(5);
      if (error) throw error;

      return (data ?? []).map((t: any) => ({
        id: t.id,
        numero_exibicao: t.numero_exibicao,
        titulo: t.titulo,
        cliente_nome: t.clientes?.nome_fantasia ?? null,
        prioridade: t.prioridade,
        created_at: t.created_at,
        dias_aberto: diasDesde(t.created_at),
      }));
    },
  });
}

export function useKanbanResumo(startDate: string, endDate: string) {
  return useQuery<KanbanResumo[]>({
    queryKey: ["dash_tickets_kanban_resumo", startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets")
        .select("status")
        .gte("created_at", startDate)
        .lte("created_at", endDate);
      if (error) throw error;

      const counts: Record<string, number> = {};
      (data ?? []).forEach(t => {
        counts[t.status] = (counts[t.status] || 0) + 1;
      });

      const statuses = ["Aberto", "Em Andamento", "Aguardando Cliente", "Resolvido"];
      return statuses.map(s => ({
        status: s,
        total: counts[s] || 0,
        cor: KANBAN_STATUS_COLORS[s] || "hsl(220,10%,60%)",
      }));
    },
  });
}

export function useAgendaHoje() {
  return useQuery({
    queryKey: ["dash_tickets_agenda_hoje"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("painel_agendamentos")
        .select("id, titulo, data, hora_inicio, hora_fim, origem, ticket_id, card_id")
        .eq("data", today)
        .order("hora_inicio", { ascending: true })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });
}
