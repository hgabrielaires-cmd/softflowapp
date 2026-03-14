import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePagination } from "@/components/TablePagination";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays, Clock, User, Building2, Filter, MapPin, ExternalLink,
  Layers, List, Search, ChevronLeft, ChevronRight, Play, CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  format, parseISO, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";

const ITEMS_PER_PAGE = 15;

const PRIORIDADE_PESO: Record<string, number> = { prioridade: 4, urgente: 3, medio: 2, normal: 1 };
const PRIORIDADE_DISPLAY: Record<string, { label: string; emoji: string; className: string }> = {
  prioridade: { label: "Alta Prioridade", emoji: "⚡", className: "bg-purple-100 text-purple-700 border-purple-200" },
  urgente: { label: "Urgente", emoji: "🔴", className: "bg-red-100 text-red-700 border-red-200" },
  medio: { label: "Médio", emoji: "🟡", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  normal: { label: "Normal", emoji: "🟢", className: "bg-green-100 text-green-700 border-green-200" },
};

type CalendarMode = "month" | "week";

export default function Agenda() {
  const { profile, user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { filiaisDoUsuario, filialPadraoId, isGlobal } = useUserFiliais();

  // View state
  const [activeView, setActiveView] = useState<"calendario" | "lista">("calendario");

  // Shared filters
  const [filtroFilial, setFiltroFilial] = useState<string>("_init_");
  const [filtroMesa, setFiltroMesa] = useState<string>("_init_");
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // List-specific
  const [listPage, setListPage] = useState(1);
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("todos");
  const [listPeriodoDe, setListPeriodoDe] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return format(d, "yyyy-MM-dd");
  });
  const [listPeriodoAte, setListPeriodoAte] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return format(d, "yyyy-MM-dd");
  });

  // Calendar-specific
  const [calMode, setCalMode] = useState<CalendarMode>("month");
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // ===== Shared data =====
  const { data: mesasDoUsuario = [] } = useQuery({
    queryKey: ["agenda-usuario-mesas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("usuario_mesas").select("mesa_id").eq("user_id", user!.id);
      return (data || []).map((r: any) => r.mesa_id) as string[];
    },
  });

  useEffect(() => {
    if (filtersInitialized || !profile) return;
    setFiltroFilial(profile.filial_favorita_id || "todas");
    const defaultMesa = profile.mesa_favorita_id
      ? profile.mesa_favorita_id
      : mesasDoUsuario.length === 1 ? mesasDoUsuario[0] : "todas";
    setFiltroMesa(defaultMesa);
    setFiltersInitialized(true);
  }, [profile, filialPadraoId, mesasDoUsuario, filtersInitialized]);

  const { data: mesas = [] } = useQuery({
    queryKey: ["agenda-mesas", isAdmin, isGlobal, mesasDoUsuario],
    queryFn: async () => {
      let query = supabase.from("mesas_atendimento").select("id, nome, cor").eq("ativo", true).order("nome");
      if (!isAdmin && !isGlobal && mesasDoUsuario.length > 0) {
        query = query.in("id", mesasDoUsuario);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as { id: string; nome: string; cor: string | null }[];
    },
  });

  const { data: atividades = [] } = useQuery({
    queryKey: ["agenda-atividades"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jornada_atividades").select("id, nome");
      if (error) throw error;
      return data as { id: string; nome: string }[];
    },
  });

  const atividadesMap = useMemo(() => {
    const map: Record<string, string> = {};
    atividades.forEach((a) => { map[a.id] = a.nome; });
    return map;
  }, [atividades]);

  const mesasMap = useMemo(() => {
    const map: Record<string, { nome: string; cor: string | null }> = {};
    mesas.forEach((m) => { map[m.id] = { nome: m.nome, cor: m.cor }; });
    return map;
  }, [mesas]);

  // Helper: build base query filters
  const applyBaseFilters = useCallback((query: any) => {
    if (filtroFilial !== "todas" && filtroFilial !== "_init_") {
      query = query.eq("filial_id", filtroFilial);
    }
    if (filtroMesa !== "todas" && filtroMesa !== "_init_") {
      query = query.eq("mesa_id", filtroMesa);
    }
    return query;
  }, [filtroFilial, filtroMesa]);

  // ===== LIST VIEW: server-side paginated =====
  const listQueryKey = useMemo(() => [
    "agenda-list", filtroFilial, filtroMesa, listPage, listSearch, listStatus, listPeriodoDe, listPeriodoAte, mesas.length,
  ], [filtroFilial, filtroMesa, listPage, listSearch, listStatus, listPeriodoDe, listPeriodoAte, mesas.length]);

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: listQueryKey,
    enabled: activeView === "lista" && filtersInitialized && mesas.length > 0,
    queryFn: async () => {
      // Step 1: count
      let countQ = supabase.from("painel_agendamentos").select("id", { count: "exact", head: true });
      countQ = applyBaseFilters(countQ);
      countQ = countQ.gte("data", listPeriodoDe).lte("data", listPeriodoAte);
      if (listSearch) {
        // We'll filter client-side for search since we need join data
        // But limit date range server-side
      }
      const { count: totalRaw } = await countQ;

      // Step 2: fetch page
      const from = (listPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let q = supabase.from("painel_agendamentos")
        .select("id, card_id, ticket_id, origem, atividade_id, checklist_index, data, hora_inicio, hora_fim, observacao, mesa_id, filial_id, etapa_id, titulo, cor_evento, criado_por, created_at, status, iniciado_em, finalizado_em");
      q = applyBaseFilters(q);
      q = q.gte("data", listPeriodoDe).lte("data", listPeriodoAte);
      q = q.order("data", { ascending: false }).order("hora_inicio", { ascending: true });
      q = q.range(from, to);

      const { data: rows, error } = await q;
      if (error) throw error;

      // Step 3: enrich with card data
      const cardIds = [...new Set((rows || []).map((r: any) => r.card_id).filter(Boolean))];
      let cards: any[] = [];
      if (cardIds.length > 0) {
        const { data: cardsData } = await supabase
          .from("painel_atendimento")
          .select("id, cliente_id, contrato_id, pedido_id, filial_id, plano_id, jornada_id, tipo_atendimento_local, status_projeto, pausado, iniciado_em, sla_horas, responsavel_id, etapa_id, clientes(nome_fantasia, cnpj_cpf), contratos(numero_exibicao), filiais(nome), profiles:responsavel_id(full_name)")
          .in("id", cardIds)
          .neq("status_projeto", "cancelado");
        cards = cardsData || [];
      }
      const cardsMap: Record<string, any> = {};
      cards.forEach((c: any) => { cardsMap[c.id] = c; });

      // Step 4: fetch técnicos, apontados, execuções e progresso real do checklist
      let tecnicos: any[] = [];
      let apontados: any[] = [];
      let atividadeExecucao: any[] = [];
      let checklistProgressRows: any[] = [];
      let jornadaAtividades: any[] = [];
      let jornadaEtapas: any[] = [];
      let jornadasByPlano: Record<string, string> = {};
      if (cardIds.length > 0) {
        const planoIds = [...new Set(cards.map((c: any) => c.plano_id).filter(Boolean))];
        const [tecRes, aponRes, execRes, checklistRes, jornadasRes] = await Promise.all([
          supabase.from("painel_tecnicos").select("card_id, tecnico_id, profiles:tecnico_id(id, full_name, avatar_url)").in("card_id", cardIds),
          supabase.from("painel_apontamentos").select("card_id, usuario_id, profiles:usuario_id(id, full_name, avatar_url)").in("card_id", cardIds),
          supabase.from("painel_atividade_execucao").select("card_id, atividade_id, etapa_id, status").in("card_id", cardIds).not("atividade_id", "is", null),
          supabase.from("painel_checklist_progresso").select("card_id, atividade_id, checklist_index, concluido").in("card_id", cardIds).eq("concluido", true),
          planoIds.length > 0
            ? supabase.from("jornadas").select("id, vinculo_id").eq("ativo", true).eq("vinculo_tipo", "plano").in("vinculo_id", planoIds)
            : Promise.resolve({ data: [] }),
        ]);
        tecnicos = tecRes.data || [];
        apontados = aponRes.data || [];
        atividadeExecucao = execRes.data || [];
        checklistProgressRows = checklistRes.data || [];
        (jornadasRes.data || []).forEach((j: any) => {
          jornadasByPlano[j.vinculo_id] = j.id;
        });

        const jornadaIds = [...new Set(cards.map((c: any) => c.jornada_id || (c.plano_id ? jornadasByPlano[c.plano_id] : null)).filter(Boolean))];
        if (jornadaIds.length > 0) {
          const { data: etapasData } = await supabase
            .from("jornada_etapas")
            .select("id, jornada_id, nome")
            .in("jornada_id", jornadaIds);
          jornadaEtapas = etapasData || [];

          const etapaIds = jornadaEtapas.map((e: any) => e.id);
          if (etapaIds.length > 0) {
            const { data: atividadesData } = await supabase
              .from("jornada_atividades")
              .select("id, etapa_id, checklist")
              .in("etapa_id", etapaIds);
            jornadaAtividades = atividadesData || [];
          }
        }
      }
      const tecMap: Record<string, any[]> = {};
      tecnicos.forEach((t: any) => {
        if (!tecMap[t.card_id]) tecMap[t.card_id] = [];
        if (t.profiles) tecMap[t.card_id].push(t.profiles);
      });
      const aponMap: Record<string, any[]> = {};
      apontados.forEach((a: any) => {
        if (!aponMap[a.card_id]) aponMap[a.card_id] = [];
        if (a.profiles) aponMap[a.card_id].push(a.profiles);
      });

      // Step 5: fetch etapa names for display - include card etapa_id as fallback
      const etapaIdsFromAg = (rows || []).map((r: any) => r.etapa_id).filter(Boolean);
      const etapaIdsFromCards = Object.values(cardsMap).map((c: any) => c.etapa_id).filter(Boolean);
      const etapaIds = [...new Set([...etapaIdsFromAg, ...etapaIdsFromCards])];
      let etapasMap: Record<string, { nome: string; cor: string | null }> = {};
      if (etapaIds.length > 0) {
        const { data: etapasData } = await supabase.from("painel_etapas").select("id, nome, cor").in("id", etapaIds);
        (etapasData || []).forEach((e: any) => { etapasMap[e.id] = { nome: e.nome, cor: e.cor }; });
      }

      // Progress maps alinhados com o card do projeto
      const progressMap: Record<string, { total: number; concluidas: number }> = {};
      const progressEtapaMap: Record<string, { total: number; concluidas: number }> = {};
      const activityStatusMap: Record<string, string> = {};

      const jornadaEtapaById: Record<string, { jornada_id: string; nome: string }> = {};
      jornadaEtapas.forEach((e: any) => {
        jornadaEtapaById[e.id] = { jornada_id: e.jornada_id, nome: e.nome };
      });

      const atividadesByJornada: Record<string, any[]> = {};
      const atividadesByEtapa: Record<string, any[]> = {};
      jornadaAtividades.forEach((a: any) => {
        const etapaMeta = jornadaEtapaById[a.etapa_id];
        if (etapaMeta) {
          if (!atividadesByJornada[etapaMeta.jornada_id]) atividadesByJornada[etapaMeta.jornada_id] = [];
          atividadesByJornada[etapaMeta.jornada_id].push(a);
        }
        if (!atividadesByEtapa[a.etapa_id]) atividadesByEtapa[a.etapa_id] = [];
        atividadesByEtapa[a.etapa_id].push(a);
      });

      atividadeExecucao.forEach((e: any) => {
        if (e.atividade_id) {
          activityStatusMap[`${e.card_id}__${e.atividade_id}`] = e.status;
        }
      });

      cards.forEach((card: any) => {
        const resolvedJornadaId = card.jornada_id || (card.plano_id ? jornadasByPlano[card.plano_id] : null);
        const atividadesProjeto = resolvedJornadaId ? (atividadesByJornada[resolvedJornadaId] || []) : [];
        const totalProjeto = atividadesProjeto.reduce((acc: number, a: any) => {
          const checklist = Array.isArray(a.checklist) ? a.checklist : [];
          return acc + checklist.length;
        }, 0);
        const concluidasProjeto = checklistProgressRows.filter((r: any) => r.card_id === card.id).length;
        progressMap[card.id] = { total: totalProjeto, concluidas: concluidasProjeto };

        const etapaAtualNome = card.etapa_id ? etapasMap[card.etapa_id]?.nome || null : null;
        const etapaJornadaAtual = etapaAtualNome && resolvedJornadaId
          ? jornadaEtapas.find((e: any) => e.jornada_id === resolvedJornadaId && e.nome === etapaAtualNome)
          : null;
        const atividadesEtapaAtual = etapaJornadaAtual ? (atividadesByEtapa[etapaJornadaAtual.id] || []) : [];
        const atividadeIdsEtapa = new Set(atividadesEtapaAtual.map((a: any) => a.id));
        const totalEtapa = atividadesEtapaAtual.reduce((acc: number, a: any) => {
          const checklist = Array.isArray(a.checklist) ? a.checklist : [];
          return acc + checklist.length;
        }, 0);
        const concluidasEtapa = checklistProgressRows.filter((r: any) => r.card_id === card.id && r.atividade_id && atividadeIdsEtapa.has(r.atividade_id)).length;
        if (card.etapa_id) {
          progressEtapaMap[`${card.id}__${card.etapa_id}`] = { total: totalEtapa, concluidas: concluidasEtapa };
        }
      });

      // Fetch ticket data for ticket-origin agendamentos
      const ticketIds = [...new Set((rows || []).filter((r: any) => r.origem === "ticket" && r.ticket_id).map((r: any) => r.ticket_id))];
      let ticketsMap: Record<string, any> = {};
      if (ticketIds.length > 0) {
        const { data: ticketsData } = await supabase
          .from("tickets")
          .select("id, numero_exibicao, titulo, status, cliente_id, clientes:cliente_id(nome_fantasia, cnpj_cpf)")
          .in("id", ticketIds);
        (ticketsData || []).forEach((t: any) => { ticketsMap[t.id] = t; });
      }

      // Enrich
      const enriched = (rows || []).map((ag: any) => {
        if (ag.origem === "ticket" && ag.ticket_id) {
          const ticket = ticketsMap[ag.ticket_id];
          return {
            ...ag,
            ag_status: ag.status || 'agendado',
            ag_iniciado_em: ag.iniciado_em || null,
            ag_finalizado_em: ag.finalizado_em || null,
            cliente_nome: ticket?.clientes?.nome_fantasia || "—",
            cliente_cnpj: ticket?.clientes?.cnpj_cpf || "",
            contrato_numero: ticket?.numero_exibicao || "—",
            filial_nome: "—",
            atividade_nome: "—",
            mesa_nome: "—",
            mesa_cor: null,
            etapa_atual_nome: "Tickets",
            etapa_atual_cor: "#6366f1",
            responsavel_nome: "—",
            tecnicos: [],
            apontados: [],
            status_projeto: "ativo",
            pausado: false,
            card_iniciado_em: null,
            sla_horas: 0,
            tipo_atendimento: null,
            progresso: null,
            progresso_etapa: null,
            atividade_status: null,
            is_ticket: true,
          };
        }
        const card = cardsMap[ag.card_id];
        const cardEtapaId = card?.etapa_id;
        return {
          ...ag,
          ag_status: ag.status || 'agendado',
          ag_iniciado_em: ag.iniciado_em || null,
          ag_finalizado_em: ag.finalizado_em || null,
          cliente_nome: card?.clientes?.nome_fantasia || "—",
          cliente_cnpj: card?.clientes?.cnpj_cpf || "",
          contrato_numero: card?.contratos?.numero_exibicao || "—",
          filial_nome: card?.filiais?.nome || "—",
          atividade_nome: atividadesMap[ag.atividade_id] || "—",
          mesa_nome: ag.mesa_id ? mesasMap[ag.mesa_id]?.nome || "—" : "—",
          mesa_cor: ag.mesa_id ? mesasMap[ag.mesa_id]?.cor || null : null,
          etapa_atual_nome: cardEtapaId ? etapasMap[cardEtapaId]?.nome || "—" : "—",
          etapa_atual_cor: cardEtapaId ? etapasMap[cardEtapaId]?.cor || null : null,
          responsavel_nome: card?.profiles?.full_name || "—",
          tecnicos: tecMap[ag.card_id] || [],
          apontados: aponMap[ag.card_id] || [],
          status_projeto: card?.status_projeto || "ativo",
          pausado: card?.pausado || false,
          card_iniciado_em: card?.iniciado_em || null,
          sla_horas: card?.sla_horas || 0,
          tipo_atendimento: card?.tipo_atendimento_local || null,
          progresso: progressMap[ag.card_id] || null,
          progresso_etapa: cardEtapaId ? (progressEtapaMap[`${ag.card_id}__${cardEtapaId}`] || null) : null,
          atividade_status: ag.atividade_id ? (activityStatusMap[`${ag.card_id}__${ag.atividade_id}`] || 'pendente') : null,
          is_ticket: false,
        };
      });

      // Client-side search filter
      let filtered = enriched;
      if (listSearch) {
        const term = listSearch.toLowerCase();
        filtered = enriched.filter((ag: any) =>
          ag.cliente_nome.toLowerCase().includes(term) ||
          ag.cliente_cnpj.toLowerCase().includes(term) ||
          (ag.titulo || "").toLowerCase().includes(term)
        );
      }

      return { items: filtered, total: totalRaw || 0 };
    },
  });

  // Reset page on filter change
  useEffect(() => { setListPage(1); }, [filtroFilial, filtroMesa, listSearch, listStatus, listPeriodoDe, listPeriodoAte]);

  // ===== CALENDAR VIEW: interval-based =====
  const calRange = useMemo(() => {
    if (calMode === "week") {
      return {
        start: format(startOfWeek(calDate, { weekStartsOn: 0 }), "yyyy-MM-dd"),
        end: format(endOfWeek(calDate, { weekStartsOn: 0 }), "yyyy-MM-dd"),
      };
    }
    return {
      start: format(startOfMonth(calDate), "yyyy-MM-dd"),
      end: format(endOfMonth(calDate), "yyyy-MM-dd"),
    };
  }, [calDate, calMode]);

  const { data: calAgendamentos = [], isLoading: calLoading } = useQuery({
    queryKey: ["agenda-cal", calRange.start, calRange.end, filtroFilial, filtroMesa, mesas.length],
    enabled: activeView === "calendario" && filtersInitialized && mesas.length > 0,
    queryFn: async () => {
      let q = supabase.from("painel_agendamentos")
        .select("id, card_id, ticket_id, origem, atividade_id, checklist_index, data, hora_inicio, hora_fim, observacao, mesa_id, filial_id, etapa_id, titulo, cor_evento, status, iniciado_em, finalizado_em");
      q = applyBaseFilters(q);
      q = q.gte("data", calRange.start).lte("data", calRange.end);
      q = q.order("data").order("hora_inicio", { ascending: true });

      const { data: rows, error } = await q;
      if (error) throw error;

      // Enrich with card data
      const cardIds = [...new Set((rows || []).map((r: any) => r.card_id).filter(Boolean))];
      let cardsMap: Record<string, any> = {};
      if (cardIds.length > 0) {
        const { data: cardsData } = await supabase
          .from("painel_atendimento")
          .select("id, cliente_id, contrato_id, filial_id, plano_id, jornada_id, etapa_id, tipo_atendimento_local, status_projeto, pausado, iniciado_em, sla_horas, pedido_id, clientes(nome_fantasia), contratos(numero_exibicao), filiais(nome)")
          .in("id", cardIds)
          .neq("status_projeto", "cancelado");
        (cardsData || []).forEach((c: any) => { cardsMap[c.id] = c; });
      }

      // Técnicos, Apontados, execuções e progresso real do checklist
      let tecMap: Record<string, any[]> = {};
      let aponMap: Record<string, any[]> = {};
      let progressMap: Record<string, { total: number; concluidas: number }> = {};
      let progressEtapaMap: Record<string, { total: number; concluidas: number }> = {};
      let calActStatusMap: Record<string, string> = {};
      let jornadasByPlano: Record<string, string> = {};
      if (cardIds.length > 0) {
        const planoIds = [...new Set(Object.values(cardsMap).map((c: any) => c.plano_id).filter(Boolean))];
        const [tecRes, aponRes, execRes, checklistRes, jornadasRes] = await Promise.all([
          supabase.from("painel_tecnicos").select("card_id, tecnico_id, profiles:tecnico_id(id, full_name, avatar_url)").in("card_id", cardIds),
          supabase.from("painel_apontamentos").select("card_id, usuario_id, profiles:usuario_id(id, full_name, avatar_url)").in("card_id", cardIds),
          supabase.from("painel_atividade_execucao").select("card_id, atividade_id, etapa_id, status").in("card_id", cardIds).not("atividade_id", "is", null),
          supabase.from("painel_checklist_progresso").select("card_id, atividade_id, checklist_index, concluido").in("card_id", cardIds).eq("concluido", true),
          planoIds.length > 0
            ? supabase.from("jornadas").select("id, vinculo_id").eq("ativo", true).eq("vinculo_tipo", "plano").in("vinculo_id", planoIds)
            : Promise.resolve({ data: [] }),
        ]);
        (tecRes.data || []).forEach((t: any) => {
          if (!tecMap[t.card_id]) tecMap[t.card_id] = [];
          if (t.profiles) tecMap[t.card_id].push(t.profiles);
        });
        (aponRes.data || []).forEach((a: any) => {
          if (!aponMap[a.card_id]) aponMap[a.card_id] = [];
          if (a.profiles) aponMap[a.card_id].push(a.profiles);
        });
        (execRes.data || []).forEach((e: any) => {
          if (e.atividade_id) {
            calActStatusMap[`${e.card_id}__${e.atividade_id}`] = e.status;
          }
        });
        (jornadasRes.data || []).forEach((j: any) => {
          jornadasByPlano[j.vinculo_id] = j.id;
        });

        const jornadaIds = [...new Set(Object.values(cardsMap).map((c: any) => c.jornada_id || (c.plano_id ? jornadasByPlano[c.plano_id] : null)).filter(Boolean))];
        let jornadaEtapas: any[] = [];
        let jornadaAtividades: any[] = [];
        if (jornadaIds.length > 0) {
          const { data: etapasJornadaData } = await supabase
            .from("jornada_etapas")
            .select("id, jornada_id, nome")
            .in("jornada_id", jornadaIds);
          jornadaEtapas = etapasJornadaData || [];

          const etapaIdsJornada = jornadaEtapas.map((e: any) => e.id);
          if (etapaIdsJornada.length > 0) {
            const { data: atividadesData } = await supabase
              .from("jornada_atividades")
              .select("id, etapa_id, checklist")
              .in("etapa_id", etapaIdsJornada);
            jornadaAtividades = atividadesData || [];
          }
        }

        // Fetch etapa data - include both agendamento etapa_id and card etapa_id as fallback
        const etapaIdsFromAg = (rows || []).map((r: any) => r.etapa_id).filter(Boolean);
        const etapaIdsFromCards = Object.values(cardsMap).map((c: any) => c.etapa_id).filter(Boolean);
        const etapaIds = [...new Set([...etapaIdsFromAg, ...etapaIdsFromCards])];
        let etapasMap: Record<string, { nome: string; cor: string | null }> = {};
        if (etapaIds.length > 0) {
          const { data: etapasData } = await supabase.from("painel_etapas").select("id, nome, cor").in("id", etapaIds);
          (etapasData || []).forEach((e: any) => { etapasMap[e.id] = { nome: e.nome, cor: e.cor }; });
        }

        const jornadaEtapaById: Record<string, { jornada_id: string; nome: string }> = {};
        jornadaEtapas.forEach((e: any) => {
          jornadaEtapaById[e.id] = { jornada_id: e.jornada_id, nome: e.nome };
        });

        const atividadesByJornada: Record<string, any[]> = {};
        const atividadesByEtapa: Record<string, any[]> = {};
        jornadaAtividades.forEach((a: any) => {
          const etapaMeta = jornadaEtapaById[a.etapa_id];
          if (etapaMeta) {
            if (!atividadesByJornada[etapaMeta.jornada_id]) atividadesByJornada[etapaMeta.jornada_id] = [];
            atividadesByJornada[etapaMeta.jornada_id].push(a);
          }
          if (!atividadesByEtapa[a.etapa_id]) atividadesByEtapa[a.etapa_id] = [];
          atividadesByEtapa[a.etapa_id].push(a);
        });

        const checklistProgressRows = checklistRes.data || [];
        Object.values(cardsMap).forEach((card: any) => {
          const resolvedJornadaId = card.jornada_id || (card.plano_id ? jornadasByPlano[card.plano_id] : null);
          const atividadesProjeto = resolvedJornadaId ? (atividadesByJornada[resolvedJornadaId] || []) : [];
          const totalProjeto = atividadesProjeto.reduce((acc: number, a: any) => {
            const checklist = Array.isArray(a.checklist) ? a.checklist : [];
            return acc + checklist.length;
          }, 0);
          const concluidasProjeto = checklistProgressRows.filter((r: any) => r.card_id === card.id).length;
          progressMap[card.id] = { total: totalProjeto, concluidas: concluidasProjeto };

          const etapaAtualNome = card.etapa_id ? etapasMap[card.etapa_id]?.nome || null : null;
          const etapaJornadaAtual = etapaAtualNome && resolvedJornadaId
            ? jornadaEtapas.find((e: any) => e.jornada_id === resolvedJornadaId && e.nome === etapaAtualNome)
            : null;
          const atividadesEtapaAtual = etapaJornadaAtual ? (atividadesByEtapa[etapaJornadaAtual.id] || []) : [];
          const atividadeIdsEtapa = new Set(atividadesEtapaAtual.map((a: any) => a.id));
          const totalEtapa = atividadesEtapaAtual.reduce((acc: number, a: any) => {
            const checklist = Array.isArray(a.checklist) ? a.checklist : [];
            return acc + checklist.length;
          }, 0);
          const concluidasEtapa = checklistProgressRows.filter((r: any) => r.card_id === card.id && r.atividade_id && atividadeIdsEtapa.has(r.atividade_id)).length;
          if (card.etapa_id) {
            progressEtapaMap[`${card.id}__${card.etapa_id}`] = { total: totalEtapa, concluidas: concluidasEtapa };
          }
        });
      }
      // Fetch etapa data - include both agendamento etapa_id and card etapa_id as fallback
      const etapaIdsFromAg = (rows || []).map((r: any) => r.etapa_id).filter(Boolean);
      const etapaIdsFromCards = Object.values(cardsMap).map((c: any) => c.etapa_id).filter(Boolean);
      const etapaIds = [...new Set([...etapaIdsFromAg, ...etapaIdsFromCards])];
      let etapasMap: Record<string, { nome: string; cor: string | null }> = {};
      if (etapaIds.length > 0) {
        const { data: etapasData } = await supabase.from("painel_etapas").select("id, nome, cor").in("id", etapaIds);
        (etapasData || []).forEach((e: any) => { etapasMap[e.id] = { nome: e.nome, cor: e.cor }; });
      }

      // Fetch ticket data for ticket-origin agendamentos
      const calTicketIds = [...new Set((rows || []).filter((r: any) => r.origem === "ticket" && r.ticket_id).map((r: any) => r.ticket_id))];
      let calTicketsMap: Record<string, any> = {};
      if (calTicketIds.length > 0) {
        const { data: ticketsData } = await supabase
          .from("tickets")
          .select("id, numero_exibicao, titulo, status, cliente_id, clientes:cliente_id(nome_fantasia)")
          .in("id", calTicketIds);
        (ticketsData || []).forEach((t: any) => { calTicketsMap[t.id] = t; });
      }

      return (rows || []).map((ag: any) => {
        if (ag.origem === "ticket" && ag.ticket_id) {
          const ticket = calTicketsMap[ag.ticket_id];
          return {
            ...ag,
            ag_status: ag.status || 'agendado',
            ag_iniciado_em: ag.iniciado_em || null,
            ag_finalizado_em: ag.finalizado_em || null,
            cliente_nome: ticket?.clientes?.nome_fantasia || "—",
            contrato_numero: ticket?.numero_exibicao || "—",
            filial_id: "",
            filial_nome: "—",
            atividade_nome: "—",
            mesa_nome: "—",
            mesa_cor: null,
            etapa_atual_nome: "Tickets",
            etapa_atual_cor: "#6366f1",
            tecnicos: [],
            apontados: [],
            tipo_atendimento: null,
            status_projeto: "ativo",
            pausado: false,
            card_iniciado_em: null,
            sla_horas: 0,
            progresso: null,
            progresso_etapa: null,
            atividade_status: null,
            is_ticket: true,
            cor_evento: ag.cor_evento || "#6366f1",
          };
        }
        const card = cardsMap[ag.card_id];
        const cardEtapaId = card?.etapa_id;
        return {
          ...ag,
          ag_status: ag.status || 'agendado',
          ag_iniciado_em: ag.iniciado_em || null,
          ag_finalizado_em: ag.finalizado_em || null,
          cliente_nome: card?.clientes?.nome_fantasia || "—",
          contrato_numero: card?.contratos?.numero_exibicao || "—",
          filial_id: card?.filial_id || "",
          filial_nome: card?.filiais?.nome || "—",
          atividade_nome: atividadesMap[ag.atividade_id] || "—",
          mesa_nome: ag.mesa_id ? mesasMap[ag.mesa_id]?.nome || "—" : "—",
          mesa_cor: ag.mesa_id ? mesasMap[ag.mesa_id]?.cor || null : null,
          etapa_atual_nome: cardEtapaId ? etapasMap[cardEtapaId]?.nome || "—" : "—",
          etapa_atual_cor: cardEtapaId ? etapasMap[cardEtapaId]?.cor || null : null,
          tecnicos: tecMap[ag.card_id] || [],
          apontados: aponMap[ag.card_id] || [],
          tipo_atendimento: card?.tipo_atendimento_local || null,
          status_projeto: card?.status_projeto || "ativo",
          pausado: card?.pausado || false,
          card_iniciado_em: card?.iniciado_em || null,
          sla_horas: card?.sla_horas || 0,
          progresso: progressMap[ag.card_id] || null,
          progresso_etapa: cardEtapaId ? (progressEtapaMap[`${ag.card_id}__${cardEtapaId}`] || null) : null,
          atividade_status: ag.atividade_id ? (calActStatusMap[`${ag.card_id}__${ag.atividade_id}`] || 'pendente') : null,
          is_ticket: false,
        };
      });
    },
  });

  // Calendar: dates with events and their mesa colors
  const datasComAgendamento = useMemo(() => {
    const dates = new Set<string>();
    calAgendamentos.forEach((ag: any) => dates.add(ag.data));
    return dates;
  }, [calAgendamentos]);

  // Map date -> unique mesa colors for that date
  const dateMesaColors = useMemo(() => {
    const map: Record<string, string[]> = {};
    calAgendamentos.forEach((ag: any) => {
      if (!map[ag.data]) map[ag.data] = [];
      const color = ag.mesa_cor || ag.cor_evento || null;
      if (color && !map[ag.data].includes(color)) {
        map[ag.data].push(color);
      }
    });
    return map;
  }, [calAgendamentos]);

  const modifiers = useMemo(() => ({
    hasEvent: (date: Date) => datasComAgendamento.has(format(date, "yyyy-MM-dd")),
  }), [datasComAgendamento]);

  const modifiersClassNames = { hasEvent: "agenda-has-event" };

  // Calendar: events for selected day
  const agendamentosDoDia = useMemo(() => {
    return calAgendamentos
      .filter((ag: any) => isSameDay(parseISO(ag.data), selectedDate))
      .sort((a: any, b: any) => {
        if (a.hora_inicio && b.hora_inicio) return a.hora_inicio.localeCompare(b.hora_inicio);
        if (a.hora_inicio) return -1;
        return 1;
      });
  }, [calAgendamentos, selectedDate]);

  // Fetch OTHER scheduled dates for cards visible on the selected day
  const cardIdsDoDia = useMemo(() => [...new Set(agendamentosDoDia.map((ag: any) => ag.card_id))], [agendamentosDoDia]);

  const { data: outrasDatasMap = {} } = useQuery({
    queryKey: ["agenda-outras-datas", cardIdsDoDia, format(selectedDate, "yyyy-MM-dd")],
    enabled: cardIdsDoDia.length > 0 && activeView === "calendario",
    queryFn: async () => {
      const selectedStr = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("painel_agendamentos")
        .select("card_id, data, hora_inicio, hora_fim")
        .in("card_id", cardIdsDoDia)
        .neq("data", selectedStr)
        .order("data", { ascending: true });
      if (error) throw error;
      const map: Record<string, { data: string; hora_inicio: string | null; hora_fim: string | null }[]> = {};
      (data || []).forEach((r: any) => {
        if (!map[r.card_id]) map[r.card_id] = [];
        map[r.card_id].push({ data: r.data, hora_inicio: r.hora_inicio, hora_fim: r.hora_fim });
      });
      return map;
    },
  }) as { data: Record<string, { data: string; hora_inicio: string | null; hora_fim: string | null }[]> };

  // ===== SHARED: status helper =====
  const getStatusInfo = (ag: any) => {
    // Prioridade: status do agendamento (execução)
    if (ag.ag_status === "finalizado") return { label: "Finalizado", color: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    if (ag.ag_status === "em_andamento") return { label: "Em Andamento", color: "bg-blue-100 text-blue-700 border-blue-200" };
    // Fallback: status do projeto/card
    if (ag.status_projeto === "recusado") return { label: "Recusado", color: "bg-destructive/10 text-destructive border-destructive/20" };
    if (ag.pausado) return { label: "Pausado", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
    return { label: "Agendado", color: "bg-muted text-muted-foreground border-border" };
  };

  // ===== Mutation: iniciar/finalizar atendimento na agenda =====
  const updateAgStatus = useMutation({
    mutationFn: async ({ agId, newStatus }: { agId: string; newStatus: string }) => {
      const now = new Date().toISOString();

      // Fetch full agendamento data for linking
      const { data: agData } = await supabase
        .from("painel_agendamentos")
        .select("card_id, atividade_id, etapa_execucao_id, etapa_id")
        .eq("id", agId)
        .single();

      if (!agData) throw new Error("Agendamento não encontrado.");

      if (newStatus === "em_andamento") {
        const etapaExecId = agData.etapa_execucao_id;
        const atividadeId = agData.atividade_id;

        // If there's an execution stage configured, validate and move card if needed
        if (etapaExecId) {
          // Validate the execution stage exists and is active
          const { data: etapaExec } = await supabase
            .from("painel_etapas")
            .select("id, nome, ativo")
            .eq("id", etapaExecId)
            .single();

          if (!etapaExec) {
            throw new Error("A etapa de execução configurada não foi encontrada.");
          }
          if (!etapaExec.ativo) {
            throw new Error("A etapa de execução configurada está inativa.");
          }

          // Check current card stage
          const { data: card } = await supabase
            .from("painel_atendimento")
            .select("id, etapa_id, filial_id")
            .eq("id", agData.card_id)
            .single();

          if (!card) throw new Error("Card do projeto não encontrado.");

          // Move card to execution stage if not already there
          if (card.etapa_id !== etapaExecId) {
            // Register stage exit/entry in history
            const { data: currentEtapa } = await supabase
              .from("painel_etapas")
              .select("nome")
              .eq("id", card.etapa_id)
              .single();

            // Close current stage history
            const { data: histOpen } = await supabase
              .from("painel_historico_etapas")
              .select("id, entrada_em")
              .eq("card_id", card.id)
              .eq("etapa_id", card.etapa_id)
              .is("saida_em", null)
              .order("entrada_em", { ascending: false })
              .limit(1);

            if (histOpen && histOpen.length > 0) {
              const tempoReal = Math.round(((Date.now() - new Date(histOpen[0].entrada_em).getTime()) / (1000 * 60 * 60)) * 100) / 100;
              await supabase.from("painel_historico_etapas").update({
                saida_em: now,
                tempo_real_horas: tempoReal,
              }).eq("id", histOpen[0].id);
            }

            // Open new stage history
            await supabase.from("painel_historico_etapas").insert({
              card_id: card.id,
              etapa_id: etapaExecId,
              etapa_nome: etapaExec.nome,
              entrada_em: now,
              usuario_id: user?.id || null,
            });

            // Move card
            await supabase.from("painel_atendimento").update({
              etapa_id: etapaExecId,
              iniciado_em: now,
              iniciado_por: user?.id || null,
            }).eq("id", card.id);
          }
        }

        // Validate and start linked activity
        if (atividadeId) {
          const { data: atividade } = await supabase
            .from("jornada_atividades")
            .select("id, etapa_id")
            .eq("id", atividadeId)
            .single();

          if (!atividade) {
            throw new Error("A atividade vinculada não foi encontrada.");
          }

          // Start the activity execution
          await supabase
            .from("painel_atividade_execucao")
            .upsert({
              card_id: agData.card_id,
              atividade_id: atividadeId,
              etapa_id: etapaExecId || agData.etapa_id || null,
              status: "em_andamento",
              iniciado_em: now,
              iniciado_por: user?.id || null,
              updated_at: now,
            }, { onConflict: "card_id,atividade_id" });
        }
      }

      // Update agenda status
      const updateData: any = { status: newStatus };
      if (newStatus === "em_andamento") {
        updateData.iniciado_em = now;
        updateData.iniciado_por = user?.id || null;
      }
      if (newStatus === "finalizado") {
        updateData.finalizado_em = now;
        updateData.finalizado_por = user?.id || null;
      }
      const { error } = await supabase.from("painel_agendamentos").update(updateData).eq("id", agId);
      if (error) throw error;
    },
    onSuccess: (_, { newStatus }) => {
      toast.success(newStatus === "em_andamento" ? "Atendimento iniciado!" : "Atendimento finalizado!");
      queryClient.invalidateQueries({ queryKey: ["agenda-cal"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-list"] });
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
      queryClient.invalidateQueries({ queryKey: ["painel_atividade_execucao"] });
    },
    onError: (err: any) => toast.error(err?.message || "Erro ao atualizar status"),
  });

  // ===== RENDER: event card (shared between views) =====
  const renderEventCard = (ag: any, compact = false) => {
    const statusInfo = getStatusInfo(ag);
    return (
      <div
        key={ag.id}
        className="border rounded-lg p-3 hover:bg-accent/50 transition-colors"
        style={{
          borderLeftWidth: ag.cor_evento ? "4px" : undefined,
          borderLeftColor: ag.cor_evento || undefined,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {ag.hora_inicio && (
                <Badge variant="outline" className="text-xs font-mono shrink-0">
                  <Clock className="h-3 w-3 mr-1" />
                  {ag.hora_inicio.slice(0, 5)}
                  {ag.hora_fim && ` - ${ag.hora_fim.slice(0, 5)}`}
                </Badge>
              )}
              {ag.tipo_atendimento && (
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="h-3 w-3 mr-1" />
                  {ag.tipo_atendimento}
                </Badge>
              )}
              <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
                {statusInfo.label}
              </Badge>
              {ag.atividade_status && (
                <Badge className={cn("text-xs border-transparent text-white", 
                  ag.atividade_status === "concluida" ? "bg-emerald-500" :
                  ag.atividade_status === "em_andamento" ? "bg-primary" :
                  "bg-muted-foreground"
                )}>
                  {ag.atividade_status === "concluida" ? "Concluída" :
                   ag.atividade_status === "em_andamento" ? "Em Andamento" : "Pendente"}
                </Badge>
              )}
              {ag.mesa_nome && ag.mesa_nome !== "—" && (
                <Badge className="text-xs text-white border-transparent font-medium" style={{ backgroundColor: ag.mesa_cor || "hsl(var(--muted-foreground))" }}>
                  <span className="h-2 w-2 rounded-full mr-1 inline-block bg-white/30" />
                  {ag.mesa_nome}
                </Badge>
              )}
            </div>
            <p className="font-medium text-sm text-foreground truncate">
              {ag.cliente_nome}
            </p>
            <p className="text-xs text-muted-foreground">
              {ag.is_ticket ? (
                <><span className="font-medium" style={{ color: "#6366f1" }}>Ticket: {ag.contrato_numero}</span></>
              ) : (
                <>Contrato: {ag.contrato_numero} · <span className="font-medium" style={{ color: ag.mesa_cor || undefined }}>{ag.atividade_nome}</span></>
              )}
            </p>
            {ag.titulo && (
              <p className="text-xs text-muted-foreground truncate">{ag.titulo}</p>
            )}
            {ag.etapa_atual_nome && ag.etapa_atual_nome !== "—" && (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-medium" style={{ color: ag.etapa_atual_cor || undefined }}>
                  Etapa Atual: {ag.etapa_atual_nome}
                </span>
                {ag.progresso_etapa && ag.progresso_etapa.total > 0 && (
                  <Badge variant="outline" className="text-[11px] border-primary/30 text-primary font-medium">
                    {ag.progresso_etapa.concluidas} de {ag.progresso_etapa.total}
                  </Badge>
                )}
                {ag.sla_horas > 0 && ag.card_iniciado_em && (
                  <Badge variant="outline" className={cn("text-[11px]", (() => {
                    const horasDecorridas = (Date.now() - new Date(ag.card_iniciado_em).getTime()) / 3600000;
                    return horasDecorridas > ag.sla_horas
                      ? "border-destructive/30 text-destructive"
                      : "border-primary/30 text-primary";
                  })())}>
                    <Clock className="h-3 w-3 mr-1" />
                    SLA: {ag.sla_horas}h
                    {(() => {
                      const horasDecorridas = (Date.now() - new Date(ag.card_iniciado_em).getTime()) / 3600000;
                      if (horasDecorridas > ag.sla_horas) {
                        const atraso = Math.round(horasDecorridas - ag.sla_horas);
                        return ` (${atraso}h atrasado)`;
                      }
                      const restante = Math.round(ag.sla_horas - horasDecorridas);
                      return ` (${restante}h restante)`;
                    })()}
                  </Badge>
                )}
                {ag.sla_horas > 0 && !ag.card_iniciado_em && (
                  <Badge variant="outline" className="text-[11px] border-muted text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    SLA: {ag.sla_horas}h
                  </Badge>
                )}
              </div>
            )}
            {!compact && ag.tecnicos.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {ag.tecnicos.map((t: any) => (
                  <Badge key={t.id} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                    <UserAvatar avatarUrl={t.avatar_url} fullName={t.full_name} size="xs" />
                    {t.full_name}
                  </Badge>
                ))}
              </div>
            )}
            {!compact && ag.apontados?.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[10px] text-muted-foreground font-medium">Designados:</span>
                {ag.apontados.map((a: any) => (
                  <Badge key={a.id} variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
                    <UserAvatar avatarUrl={a.avatar_url} fullName={a.full_name} size="xs" />
                    {a.full_name}
                  </Badge>
                ))}
              </div>
            )}
            {ag.observacao && (
              <p className="text-xs text-muted-foreground mt-1 italic">"{ag.observacao}"</p>
            )}
            {/* Outras datas agendadas para o mesmo card/contrato */}
            {outrasDatasMap[ag.card_id]?.length > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <p className="text-[10px] font-semibold text-muted-foreground mb-1 uppercase tracking-wide">
                  <CalendarDays className="h-3 w-3 inline mr-1" />
                  Outras datas agendadas ({outrasDatasMap[ag.card_id].length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {outrasDatasMap[ag.card_id].map((od, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className={cn(
                        "text-[11px] font-mono cursor-pointer hover:bg-accent/80 transition-colors",
                        parseISO(od.data) >= new Date(new Date().setHours(0,0,0,0))
                          ? "border-primary/30 text-primary"
                          : "border-border text-muted-foreground"
                      )}
                      onClick={() => setSelectedDate(parseISO(od.data))}
                    >
                      {format(parseISO(od.data), "dd/MM")}
                      {od.hora_inicio && ` ${od.hora_inicio.slice(0, 5)}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge variant="outline" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              {ag.filial_nome}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => navigate(`/fila-agendamento?card=${ag.card_id}&from=agenda`)}>
              <ExternalLink className="h-3 w-3" /> Abrir Card
            </Button>
            {/* Progresso do projeto */}
            {ag.progresso && ag.progresso.total > 0 && (() => {
              const pct = Math.round((ag.progresso.concluidas / ag.progresso.total) * 100);
              return (
                <div className="flex items-center gap-1.5 mt-1">
                  <Progress value={pct} className="h-1.5 w-16 [&>div]:bg-primary" />
                  <span className="text-[10px] font-semibold text-primary">{pct}%</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    );
  };

  // ===== Calendar navigation =====
  const calPrev = () => setCalDate(calMode === "month" ? subMonths(calDate, 1) : subWeeks(calDate, 1));
  const calNext = () => setCalDate(calMode === "month" ? addMonths(calDate, 1) : addWeeks(calDate, 1));
  const calToday = () => { setCalDate(new Date()); setSelectedDate(new Date()); };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda Operacional</h1>
            <p className="text-sm text-muted-foreground">Agendamentos do Painel de Atendimento</p>
          </div>
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
            <TabsList>
              <TabsTrigger value="calendario" className="gap-1.5">
                <CalendarDays className="h-4 w-4" /> Calendário
              </TabsTrigger>
              <TabsTrigger value="lista" className="gap-1.5">
                <List className="h-4 w-4" /> Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Filtros compartilhados */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroFilial} onValueChange={setFiltroFilial}>
                <SelectTrigger className="w-[260px] h-9">
                  <Building2 className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Filiais</SelectItem>
                  {filiaisDoUsuario.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroMesa} onValueChange={setFiltroMesa}>
                <SelectTrigger className="w-[180px] h-9">
                  <Layers className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Mesa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Mesas</SelectItem>
                  {mesas.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: m.cor || "hsl(var(--muted-foreground))" }} />
                        {m.nome}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* List-specific filters */}
              {activeView === "lista" && (
                <>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar cliente, CNPJ ou título..."
                      value={listSearch}
                      onChange={(e) => setListSearch(e.target.value)}
                      className="h-9 pl-8 w-[250px]"
                    />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>De:</span>
                    <Input type="date" value={listPeriodoDe} onChange={(e) => setListPeriodoDe(e.target.value)} className="h-9 w-[140px]" />
                    <span>Até:</span>
                    <Input type="date" value={listPeriodoAte} onChange={(e) => setListPeriodoAte(e.target.value)} className="h-9 w-[140px]" />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legenda de Mesas */}
        {mesas.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap px-1">
            <span className="text-xs font-medium text-muted-foreground">Mesas:</span>
            {mesas.map((m) => (
              <button
                key={m.id}
                onClick={() => setFiltroMesa(filtroMesa === m.id ? "todas" : m.id)}
                className={cn(
                  "flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors cursor-pointer",
                  filtroMesa === m.id
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border text-muted-foreground hover:bg-accent"
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: m.cor || "hsl(var(--muted-foreground))" }} />
                {m.nome}
              </button>
            ))}
          </div>
        )}

        {/* ===== CALENDAR VIEW ===== */}
        {activeView === "calendario" && (
          <div className="space-y-4">
            {/* Calendar navigation */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={calPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={calToday}>Hoje</Button>
                <Button variant="outline" size="sm" onClick={calNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm font-medium text-foreground capitalize">
                {calMode === "month"
                  ? format(calDate, "MMMM yyyy", { locale: ptBR })
                  : `Semana de ${format(startOfWeek(calDate, { weekStartsOn: 0 }), "dd/MM")} a ${format(endOfWeek(calDate, { weekStartsOn: 0 }), "dd/MM/yyyy")}`}
              </span>
              <div className="ml-auto flex gap-1">
                <Button variant={calMode === "week" ? "default" : "outline"} size="sm" onClick={() => setCalMode("week")}>Semana</Button>
                <Button variant={calMode === "month" ? "default" : "outline"} size="sm" onClick={() => setCalMode("month")}>Mês</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_minmax(0,1fr)] gap-4">
              {/* Calendar widget */}
              <Card>
                <CardContent className="p-3">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => d && setSelectedDate(d)}
                    month={calDate}
                    onMonthChange={setCalDate}
                    locale={ptBR}
                    modifiers={modifiers}
                    modifiersClassNames={modifiersClassNames}
                    classNames={{
                      day_selected: "agenda-day-selected !bg-transparent !shadow-none !outline-none",
                    }}
                    className="pointer-events-auto"
                    components={{
                      DayContent: ({ date, ...props }) => {
                        const dateStr = format(date, "yyyy-MM-dd");
                        const colors = dateMesaColors[dateStr] || [];
                        return (
                          <div className="flex flex-col items-center">
                            <span>{date.getDate()}</span>
                            {colors.length > 0 && (
                              <div className="flex gap-0.5 mt-0.5">
                                {colors.slice(0, 3).map((c, i) => (
                                  <span key={i} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      },
                    }}
                  />
                  <div className="mt-2 px-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
                    <span>Dias com agendamento</span>
                  </div>
                </CardContent>
              </Card>

              {/* Events of selected day */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    <Badge variant="secondary" className="ml-auto">{agendamentosDoDia.length} agendamento(s)</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calLoading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
                  ) : agendamentosDoDia.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground">
                      <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhum agendamento para este dia</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {agendamentosDoDia.map((ag: any) => renderEventCard(ag))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ===== LIST VIEW ===== */}
        {activeView === "lista" && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <List className="h-4 w-4 text-primary" />
                Agendamentos
                {listData && (
                  <Badge variant="secondary" className="ml-auto">{listData.total} resultado(s)</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {listLoading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : !listData || listData.items.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum agendamento encontrado no período</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {listData.items.map((ag: any) => (
                    <div key={ag.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs font-mono">
                          {format(parseISO(ag.data), "dd/MM/yyyy", { locale: ptBR })}
                        </Badge>
                        {ag.etapa_atual_nome && ag.etapa_atual_nome !== "—" && (
                          <Badge variant="outline" className="text-xs" style={{ borderColor: ag.etapa_atual_cor || undefined, color: ag.etapa_atual_cor || undefined }}>
                            {ag.etapa_atual_nome}
                          </Badge>
                        )}
                      </div>
                      {renderEventCard(ag)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            {listData && listData.total > ITEMS_PER_PAGE && (
              <TablePagination
                currentPage={listPage}
                totalPages={Math.ceil(listData.total / ITEMS_PER_PAGE)}
                totalItems={listData.total}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setListPage}
              />
            )}
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
