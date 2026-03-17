import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Navigate, useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TablePagination } from "@/components/TablePagination";
import { UserAvatar } from "@/components/UserAvatar";
import {
  CalendarDays, Clock, User, Filter, List, Search,
  ChevronLeft, ChevronRight, CheckCircle2, Phone, Video,
  MessageSquare, ExternalLink, RotateCcw, Building2,
} from "lucide-react";
import {
  format, parseISO, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addMonths, subMonths, addWeeks, subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 15;
type CalendarMode = "month" | "week";

interface CrmCompromisso {
  id: string;
  oportunidade_id: string;
  tipo_atendimento: string;
  canal: string;
  data_reuniao: string;
  descricao: string;
  criado_por: string;
  concluido_em: string | null;
  concluido_por: string | null;
  created_at: string;
  oportunidade_titulo: string;
  cliente_nome: string | null;
  cliente_filial_id: string | null;
  responsavel_id: string | null;
  funil_nome: string | null;
  etapa_nome: string | null;
  adiamentos: number;
}

const CANAL_ICON: Record<string, React.ReactNode> = {
  "Ligação": <Phone className="h-3.5 w-3.5" />,
  "Meet": <Video className="h-3.5 w-3.5" />,
  "Mensagem Whatsapp": <MessageSquare className="h-3.5 w-3.5" />,
  "Mensagem Whatsapp cliente": <MessageSquare className="h-3.5 w-3.5" />,
};

export default function AgendaCrm() {
  const { roles } = useAuth();
  const { permissions: menuPerms, loading: permLoading } = useMenuPermissions(roles);

  if (!permLoading && menuPerms && !menuPerms.has("menu.crm_agenda")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <AgendaCrmContent />
    </AppLayout>
  );
}

function AgendaCrmContent() {
  const { user, profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { filiaisDoUsuario, filialPadraoId, isGlobal } = useUserFiliais();

  const [activeView, setActiveView] = useState<"calendario" | "lista">("calendario");
  const [filtroVendedor, setFiltroVendedor] = useState<string>("_init_");
  const [filtroFilial, setFiltroFilial] = useState<string>("_init_");
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // List-specific
  const [listPage, setListPage] = useState(1);
  const [listSearch, setListSearch] = useState("");
  const [listStatus, setListStatus] = useState("todos");
  const [listPeriodoDe, setListPeriodoDe] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return format(d, "yyyy-MM-dd");
  });
  const [listPeriodoAte, setListPeriodoAte] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7);
    return format(d, "yyyy-MM-dd");
  });

  // Calendar-specific
  const [calMode, setCalMode] = useState<CalendarMode>("month");
  const [calDate, setCalDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Init filter
  useEffect(() => {
    if (filtroVendedor === "_init_" && user) {
      if (isAdmin) {
        setFiltroVendedor("all");
      } else {
        setFiltroVendedor(user.id);
      }
    }
  }, [user, isAdmin, filtroVendedor]);

  // Init filial filter
  useEffect(() => {
    if (filtroFilial === "_init_" && filiaisDoUsuario.length > 0) {
      if (isGlobal || filiaisDoUsuario.length > 1) {
        setFiltroFilial(filialPadraoId || "all");
      } else {
        setFiltroFilial(filiaisDoUsuario[0]?.id || "all");
      }
    }
  }, [filtroFilial, filiaisDoUsuario, filialPadraoId, isGlobal]);

  // Mark initialized when both filters are ready
  useEffect(() => {
    if (!filtersInitialized && filtroVendedor !== "_init_" && filtroFilial !== "_init_") {
      setFiltersInitialized(true);
    }
  }, [filtroVendedor, filtroFilial, filtersInitialized]);

  // Fetch vendedores
  const { data: vendedores = [] } = useQuery({
    queryKey: ["crm-agenda-vendedores"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .eq("is_vendedor", true)
        .eq("active", true)
        .order("full_name");
      return data || [];
    },
  });

  // Calculate date range for queries
  const dateRange = useMemo(() => {
    if (activeView === "lista") {
      return { from: listPeriodoDe, to: listPeriodoAte };
    }
    let start: Date, end: Date;
    if (calMode === "month") {
      start = startOfMonth(calDate);
      end = endOfMonth(calDate);
    } else {
      start = startOfWeek(calDate, { locale: ptBR });
      end = endOfWeek(calDate, { locale: ptBR });
    }
    return { from: format(start, "yyyy-MM-dd"), to: format(end, "yyyy-MM-dd") };
  }, [activeView, calMode, calDate, listPeriodoDe, listPeriodoAte]);

  // Main query
  const { data: compromissos = [], isLoading } = useQuery({
    queryKey: ["crm-agenda-compromissos", dateRange, filtroVendedor, filtroFilial, listSearch, listStatus],
    enabled: filtersInitialized,
    queryFn: async () => {
      // Fetch tasks with data_reuniao
      let query = supabase
        .from("crm_tarefas")
        .select(`
          id, oportunidade_id, tipo_atendimento, canal, data_reuniao,
          descricao, criado_por, concluido_em, concluido_por, created_at
        `)
        .not("data_reuniao", "is", null)
        .gte("data_reuniao", dateRange.from + "T00:00:00")
        .lte("data_reuniao", dateRange.to + "T23:59:59")
        .order("data_reuniao", { ascending: true });

      const { data: tarefas } = await query;
      if (!tarefas || tarefas.length === 0) return [];

      // Fetch oportunidades
      const opIds = [...new Set(tarefas.map(t => t.oportunidade_id))];
      const { data: oportunidades } = await supabase
        .from("crm_oportunidades")
        .select("id, titulo, cliente_id, responsavel_id, funil_id, etapa_id")
        .in("id", opIds);

      // Fetch clientes, funis, etapas
      const clienteIds = [...new Set((oportunidades || []).map(o => o.cliente_id).filter(Boolean))];
      const funilIds = [...new Set((oportunidades || []).map(o => o.funil_id).filter(Boolean))];
      const etapaIds = [...new Set((oportunidades || []).map(o => o.etapa_id).filter(Boolean))];

      const [clientesRes, funisRes, etapasRes, histRes] = await Promise.all([
        clienteIds.length > 0
          ? supabase.from("clientes").select("id, nome_fantasia").in("id", clienteIds)
          : { data: [] },
        funilIds.length > 0
          ? supabase.from("crm_funis").select("id, nome").in("id", funilIds)
          : { data: [] },
        etapaIds.length > 0
          ? supabase.from("crm_etapas").select("id, nome").in("id", etapaIds)
          : { data: [] },
        supabase
          .from("crm_tarefas_historico")
          .select("tarefa_id, tipo")
          .in("tarefa_id", tarefas.map(t => t.id))
          .eq("tipo", "adiamento"),
      ]);

      const clienteMap = Object.fromEntries((clientesRes.data || []).map(c => [c.id, c.nome_fantasia]));
      const funilMap = Object.fromEntries((funisRes.data || []).map(f => [f.id, f.nome]));
      const etapaMap = Object.fromEntries((etapasRes.data || []).map(e => [e.id, e.nome]));
      const opMap = Object.fromEntries((oportunidades || []).map(o => [o.id, o]));

      // Count adiamentos per tarefa
      const adiamentoCount: Record<string, number> = {};
      (histRes.data || []).forEach(h => {
        adiamentoCount[h.tarefa_id] = (adiamentoCount[h.tarefa_id] || 0) + 1;
      });

      let result: CrmCompromisso[] = tarefas.map(t => {
        const op = opMap[t.oportunidade_id];
        return {
          ...t,
          data_reuniao: t.data_reuniao!,
          oportunidade_titulo: op?.titulo || "—",
          cliente_nome: op?.cliente_id ? clienteMap[op.cliente_id] || null : null,
          responsavel_id: op?.responsavel_id || null,
          funil_nome: op?.funil_id ? funilMap[op.funil_id] || null : null,
          etapa_nome: op?.etapa_id ? etapaMap[op.etapa_id] || null : null,
          adiamentos: adiamentoCount[t.id] || 0,
        };
      });

      // Filter by vendedor (responsavel)
      if (filtroVendedor && filtroVendedor !== "all") {
        result = result.filter(c => c.responsavel_id === filtroVendedor);
      }

      // Filter by search
      if (listSearch.trim()) {
        const s = listSearch.toLowerCase();
        result = result.filter(c =>
          c.oportunidade_titulo.toLowerCase().includes(s) ||
          (c.cliente_nome || "").toLowerCase().includes(s) ||
          c.descricao.toLowerCase().includes(s)
        );
      }

      // Filter by status
      if (listStatus === "pendentes") {
        result = result.filter(c => !c.concluido_em);
      } else if (listStatus === "concluidas") {
        result = result.filter(c => !!c.concluido_em);
      }

      return result;
    },
  });

  // Profiles map
  const profileIds = useMemo(() => {
    const ids = new Set<string>();
    compromissos.forEach(c => {
      if (c.responsavel_id) ids.add(c.responsavel_id);
      if (c.criado_por) ids.add(c.criado_por);
    });
    return [...ids];
  }, [compromissos]);

  const { data: profilesMap = {} } = useQuery({
    queryKey: ["crm-agenda-profiles", profileIds],
    enabled: profileIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", profileIds);
      const map: Record<string, { full_name: string; avatar_url: string | null }> = {};
      (data || []).forEach(p => { map[p.user_id] = p; });
      return map;
    },
  });

  // Calendar helpers
  const compromissosByDate = useMemo(() => {
    const map: Record<string, CrmCompromisso[]> = {};
    compromissos.forEach(c => {
      const d = c.data_reuniao.split("T")[0];
      if (!map[d]) map[d] = [];
      map[d].push(c);
    });
    return map;
  }, [compromissos]);

  const selectedDayItems = useMemo(() => {
    return compromissos.filter(c =>
      isSameDay(parseISO(c.data_reuniao), selectedDate)
    );
  }, [compromissos, selectedDate]);

  // Pagination for list
  const paginatedList = useMemo(() => {
    const start = (listPage - 1) * ITEMS_PER_PAGE;
    return compromissos.slice(start, start + ITEMS_PER_PAGE);
  }, [compromissos, listPage]);

  const totalPages = Math.ceil(compromissos.length / ITEMS_PER_PAGE);

  // Calendar nav
  function navPrev() {
    setCalDate(calMode === "month" ? subMonths(calDate, 1) : subWeeks(calDate, 1));
  }
  function navNext() {
    setCalDate(calMode === "month" ? addMonths(calDate, 1) : addWeeks(calDate, 1));
  }

  function getStatusBadge(c: CrmCompromisso) {
    if (c.concluido_em) {
      return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">Concluída</Badge>;
    }
    const now = new Date();
    const dr = parseISO(c.data_reuniao);
    if (dr < now) {
      return <Badge className="text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">Atrasada</Badge>;
    }
    return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">Pendente</Badge>;
  }

  function renderCard(c: CrmCompromisso, compact = false) {
    const respProfile = c.responsavel_id ? profilesMap[c.responsavel_id] : null;
    return (
      <Card
        key={c.id}
        className={cn(
          "cursor-pointer hover:shadow-md transition-shadow border-l-4",
          c.concluido_em
            ? "border-l-emerald-500 opacity-70"
            : parseISO(c.data_reuniao) < new Date()
              ? "border-l-red-500"
              : "border-l-primary"
        )}
        onClick={() => navigate(`/crm-pipeline?oportunidade=${c.oportunidade_id}&tab=tarefas`)}
      >
        <CardContent className={cn("p-3", compact && "p-2.5")}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0 space-y-1">
              {/* Oportunidade title */}
              <div className="font-semibold text-sm truncate">{c.oportunidade_titulo}</div>

              {/* Client */}
              {c.cliente_nome && (
                <div className="text-xs text-muted-foreground truncate">{c.cliente_nome}</div>
              )}

              {/* Description */}
              <div className="text-xs text-foreground/80 line-clamp-2">{c.descricao}</div>

              {/* Meta row */}
              <div className="flex items-center gap-2 flex-wrap mt-1">
                {/* Time */}
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(parseISO(c.data_reuniao), "dd/MM HH:mm")}
                </span>

                {/* Tipo */}
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {c.tipo_atendimento}
                </Badge>

                {/* Canal */}
                {c.canal && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    {CANAL_ICON[c.canal] || null}
                    {c.canal}
                  </span>
                )}

                {/* Adiamentos */}
                {c.adiamentos > 0 && (
                  <span className="text-xs text-amber-600 flex items-center gap-0.5">
                    <RotateCcw className="h-3 w-3" /> {c.adiamentos}x
                  </span>
                )}
              </div>

              {/* Funil / Etapa */}
              {(c.funil_nome || c.etapa_nome) && (
                <div className="text-[10px] text-muted-foreground">
                  {c.funil_nome}{c.etapa_nome ? ` › ${c.etapa_nome}` : ""}
                </div>
              )}
            </div>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {getStatusBadge(c)}
              {respProfile && (
                <UserAvatar
                  fullName={respProfile.full_name}
                  avatarUrl={respProfile.avatar_url}
                  size="sm"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Agenda CRM
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Compromissos e tarefas das oportunidades
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Vendedor filter */}
          {(isAdmin || vendedores.length > 1) && (
            <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
              <SelectTrigger className="h-9 w-56">
                <User className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Vendedores</SelectItem>
                {vendedores.map(v => (
                  <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* View toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={activeView === "calendario" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setActiveView("calendario")}
            >
              <CalendarDays className="h-4 w-4" /> Calendário
            </Button>
            <Button
              variant={activeView === "lista" ? "default" : "ghost"}
              size="sm"
              className="rounded-none gap-1.5"
              onClick={() => setActiveView("lista")}
            >
              <List className="h-4 w-4" /> Lista
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {activeView === "calendario" && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Left: Calendar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <Button
                  variant={calMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalMode("month")}
                >
                  Mês
                </Button>
                <Button
                  variant={calMode === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCalMode("week")}
                >
                  Semana
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={navPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {format(calDate, calMode === "month" ? "MMMM yyyy" : "'Sem.' w, MMM yyyy", { locale: ptBR })}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={navNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              month={calDate}
              onMonthChange={setCalDate}
              locale={ptBR}
              modifiers={{
                hasEvent: (date) => {
                  const key = format(date, "yyyy-MM-dd");
                  return !!compromissosByDate[key]?.length;
                },
                hasOverdue: (date) => {
                  const key = format(date, "yyyy-MM-dd");
                  const items = compromissosByDate[key];
                  if (!items?.length) return false;
                  const now = new Date();
                  return items.some(c => !c.concluido_em && parseISO(c.data_reuniao) < now);
                },
              }}
              modifiersClassNames={{
                hasEvent: "bg-primary/15 font-bold text-primary",
                hasOverdue: "crm-agenda-overdue",
                today: "crm-agenda-today",
              }}
              className="crm-agenda-calendar rounded-md border"
            />

            {/* Day stats */}
            <div className="text-sm text-muted-foreground text-center">
              <span className="font-medium text-foreground">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </span>
              {" — "}
              {selectedDayItems.length} compromisso{selectedDayItems.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Right: Day items */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Compromissos do dia
            </h3>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando...</div>
            ) : selectedDayItems.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhum compromisso para esta data
              </div>
            ) : (
              selectedDayItems.map(c => renderCard(c))
            )}
          </div>
        </div>
      )}

      {/* List View */}
      {activeView === "lista" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar oportunidade ou cliente..."
                value={listSearch}
                onChange={(e) => { setListSearch(e.target.value); setListPage(1); }}
                className="pl-9 h-9 w-64"
              />
            </div>
            <Select value={listStatus} onValueChange={(v) => { setListStatus(v); setListPage(1); }}>
              <SelectTrigger className="h-9 w-40">
                <Filter className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendentes">Pendentes</SelectItem>
                <SelectItem value="concluidas">Concluídas</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span>De</span>
              <Input
                type="date"
                value={listPeriodoDe}
                onChange={(e) => setListPeriodoDe(e.target.value)}
                className="h-9 w-36"
              />
              <span>até</span>
              <Input
                type="date"
                value={listPeriodoAte}
                onChange={(e) => setListPeriodoAte(e.target.value)}
                className="h-9 w-36"
              />
            </div>
          </div>

          {/* Cards */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          ) : paginatedList.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Nenhum compromisso encontrado
            </div>
          ) : (
            <div className="grid gap-3">
              {paginatedList.map(c => renderCard(c))}
            </div>
          )}

          {totalPages > 1 && (
            <TablePagination
              currentPage={listPage}
              totalPages={totalPages}
              totalItems={compromissos.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setListPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
