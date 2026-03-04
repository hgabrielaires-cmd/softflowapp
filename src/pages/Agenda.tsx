import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, User, Building2, Filter, MapPin, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";

interface Agendamento {
  id: string;
  card_id: string;
  atividade_id: string;
  checklist_index: number;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  observacao: string | null;
  criado_por: string | null;
  created_at: string;
  mesa_id: string | null;
  filial_id: string | null;
  etapa_id: string | null;
  titulo: string | null;
  cor_evento: string | null;
}

interface AgendamentoComDetalhes extends Agendamento {
  cliente_nome: string;
  contrato_numero: string;
  filial_id: string;
  filial_nome: string;
  atividade_nome: string;
  tecnicos: { id: string; full_name: string; avatar_url: string | null }[];
  apontados: { id: string; full_name: string; avatar_url: string | null }[];
  tipo_atendimento: string | null;
  status_projeto: string;
  pausado: boolean;
  iniciado_em: string | null;
  sla_horas: number;
  prioridade: string | null;
}

export default function Agenda() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { filiaisDoUsuario, filialPadraoId, isGlobal } = useUserFiliais();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filtroFilial, setFiltroFilial] = useState<string>("todas");
  const [filtroTecnico, setFiltroTecnico] = useState<string>("todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("todos");

  // Fetch agendamentos
  const { data: agendamentos = [] } = useQuery({
    queryKey: ["agenda-agendamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_agendamentos")
        .select("*")
        .order("data", { ascending: true });
      if (error) throw error;
      return data as Agendamento[];
    },
  });

  // Fetch cards do painel
  const { data: cards = [] } = useQuery({
    queryKey: ["agenda-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_atendimento")
        .select("id, cliente_id, contrato_id, pedido_id, filial_id, tipo_atendimento_local, status_projeto, pausado, iniciado_em, sla_horas, clientes(nome_fantasia), contratos(numero_exibicao), filiais(nome)");
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch atividades
  const { data: atividades = [] } = useQuery({
    queryKey: ["agenda-atividades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jornada_atividades")
        .select("id, nome");
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch técnicos apontados
  const { data: painelTecnicos = [] } = useQuery({
    queryKey: ["agenda-tecnicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_tecnicos")
        .select("card_id, tecnico_id, profiles:tecnico_id(id, full_name, avatar_url)");
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch apontamentos
  const { data: painelApontamentos = [] } = useQuery({
    queryKey: ["agenda-apontamentos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_apontamentos")
        .select("card_id, usuario_id, profiles:usuario_id(id, full_name, avatar_url)");
      if (error) throw error;
      return data as any[];
    },
  });

  // Mapa de cards
  const cardsMap = useMemo(() => {
    const map: Record<string, any> = {};
    cards.forEach((c) => { map[c.id] = c; });
    return map;
  }, [cards]);

  // Mapa de atividades
  const atividadesMap = useMemo(() => {
    const map: Record<string, string> = {};
    atividades.forEach((a: any) => { map[a.id] = a.nome; });
    return map;
  }, [atividades]);

  // Mapa de técnicos por card
  const tecnicosPorCard = useMemo(() => {
    const map: Record<string, { id: string; full_name: string; avatar_url: string | null }[]> = {};
    painelTecnicos.forEach((pt: any) => {
      if (!map[pt.card_id]) map[pt.card_id] = [];
      if (pt.profiles) map[pt.card_id].push(pt.profiles);
    });
    return map;
  }, [painelTecnicos]);

  // Mapa de apontados por card
  const apontadosPorCard = useMemo(() => {
    const map: Record<string, { id: string; full_name: string; avatar_url: string | null }[]> = {};
    painelApontamentos.forEach((pa: any) => {
      if (!map[pa.card_id]) map[pa.card_id] = [];
      if (pa.profiles) map[pa.card_id].push(pa.profiles);
    });
    return map;
  }, [painelApontamentos]);

  // Fetch highest priority per pedido
  const PRIORIDADE_PESO: Record<string, number> = { prioridade: 4, urgente: 3, medio: 2, normal: 1 };
  const PRIORIDADE_DISPLAY: Record<string, { label: string; emoji: string; className: string }> = {
    prioridade: { label: "Alta Prioridade", emoji: "⚡", className: "bg-purple-100 text-purple-700 border-purple-200" },
    urgente: { label: "Urgente", emoji: "🔴", className: "bg-red-100 text-red-700 border-red-200" },
    medio: { label: "Médio", emoji: "🟡", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    normal: { label: "Normal", emoji: "🟢", className: "bg-green-100 text-green-700 border-green-200" },
  };

  const pedidoIds = useMemo(() => [...new Set(cards.map((c: any) => c.pedido_id).filter(Boolean))], [cards]);

  const { data: pedidoPrioridadeMap = {} } = useQuery({
    queryKey: ["agenda-pedido-prioridade", pedidoIds.join(",")],
    enabled: pedidoIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("pedido_comentarios")
        .select("pedido_id, prioridade")
        .in("pedido_id", pedidoIds);
      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        const current = map[r.pedido_id];
        if (!current || (PRIORIDADE_PESO[r.prioridade] || 0) > (PRIORIDADE_PESO[current] || 0)) {
          map[r.pedido_id] = r.prioridade;
        }
      });
      return map;
    },
  });

  // Agendamentos enriquecidos
  const agendamentosDetalhados = useMemo<AgendamentoComDetalhes[]>(() => {
    return agendamentos.map((ag) => {
      const card = cardsMap[ag.card_id];
      const pedidoId = card?.pedido_id;
      return {
        ...ag,
        cliente_nome: card?.clientes?.nome_fantasia || "—",
        contrato_numero: card?.contratos?.numero_exibicao || "—",
        filial_id: card?.filial_id || "",
        filial_nome: card?.filiais?.nome || "—",
        atividade_nome: atividadesMap[ag.atividade_id] || "—",
        tecnicos: tecnicosPorCard[ag.card_id] || [],
        apontados: apontadosPorCard[ag.card_id] || [],
        tipo_atendimento: card?.tipo_atendimento_local || null,
        status_projeto: card?.status_projeto || "ativo",
        pausado: card?.pausado || false,
        iniciado_em: card?.iniciado_em || null,
        sla_horas: card?.sla_horas || 0,
        prioridade: pedidoId ? (pedidoPrioridadeMap[pedidoId] || null) : null,
      };
    });
  }, [agendamentos, cardsMap, atividadesMap, tecnicosPorCard, apontadosPorCard, pedidoPrioridadeMap]);

  // Listas para filtros
  const tecnicosList = useMemo(() => {
    const map = new Map<string, string>();
    agendamentosDetalhados.forEach((ag) => {
      ag.tecnicos.forEach((t) => map.set(t.id, t.full_name));
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [agendamentosDetalhados]);

  const clientesList = useMemo(() => {
    const map = new Map<string, string>();
    agendamentosDetalhados.forEach((ag) => {
      if (ag.cliente_nome !== "—") {
        const cardId = ag.card_id;
        const card = cardsMap[cardId];
        if (card?.cliente_id) map.set(card.cliente_id, ag.cliente_nome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [agendamentosDetalhados, cardsMap]);

  // Filtragem
  const agendamentosFiltrados = useMemo(() => {
    return agendamentosDetalhados.filter((ag) => {
      if (filtroFilial !== "todas" && ag.filial_id !== filtroFilial) return false;
      if (filtroTecnico !== "todos" && !ag.tecnicos.some((t) => t.id === filtroTecnico)) return false;
      if (filtroCliente !== "todos") {
        const card = cardsMap[ag.card_id];
        if (card?.cliente_id !== filtroCliente) return false;
      }
      return true;
    });
  }, [agendamentosDetalhados, filtroFilial, filtroTecnico, filtroCliente, cardsMap]);

  // Agendamentos do dia selecionado
  const agendamentosDoDia = useMemo(() => {
    return agendamentosFiltrados
      .filter((ag) => isSameDay(parseISO(ag.data), selectedDate))
      .sort((a, b) => {
        if (a.hora_inicio && b.hora_inicio) return a.hora_inicio.localeCompare(b.hora_inicio);
        if (a.hora_inicio) return -1;
        return 1;
      });
  }, [agendamentosFiltrados, selectedDate]);

  // Datas que possuem agendamentos (para destacar no calendário)
  const datasComAgendamento = useMemo(() => {
    const dates = new Set<string>();
    agendamentosFiltrados.forEach((ag) => dates.add(ag.data));
    return dates;
  }, [agendamentosFiltrados]);

  const modifiers = useMemo(() => ({
    hasEvent: (date: Date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      return datasComAgendamento.has(dateStr);
    },
  }), [datasComAgendamento]);

  const modifiersClassNames = {
    hasEvent: "agenda-has-event",
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agenda Operacional</h1>
            <p className="text-sm text-muted-foreground">Agendamentos do Painel de Atendimento</p>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroFilial} onValueChange={setFiltroFilial}>
                <SelectTrigger className="w-[180px] h-9">
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

              <Select value={filtroTecnico} onValueChange={setFiltroTecnico}>
                <SelectTrigger className="w-[180px] h-9">
                  <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Técnicos</SelectItem>
                  {tecnicosList.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                <SelectTrigger className="w-[200px] h-9">
                  <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Clientes</SelectItem>
                  {clientesList.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Layout: Calendário + Lista */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
          {/* Calendário */}
          <Card>
            <CardContent className="p-3">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                locale={ptBR}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                classNames={{
                  day_selected: "agenda-day-selected !bg-transparent !shadow-none !outline-none",
                }}
                className="pointer-events-auto"
              />
              <div className="mt-2 px-2 flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: "hsl(var(--primary))" }} />
                <span>Dias com agendamento</span>
              </div>
            </CardContent>
          </Card>

          {/* Lista do dia */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                <Badge variant="secondary" className="ml-auto">{agendamentosDoDia.length} agendamento(s)</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground font-medium">Compromissos</p>
            </CardHeader>
            <CardContent>
              {agendamentosDoDia.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum agendamento para este dia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agendamentosDoDia.map((ag) => {
                    // Outras datas agendadas para o mesmo card (contrato)
                    const outrasData = agendamentosFiltrados
                      .filter((o) => o.card_id === ag.card_id && o.id !== ag.id)
                      .map((o) => o.data)
                      .filter((v, i, arr) => arr.indexOf(v) === i)
                      .sort();

                    const getStatusInfo = () => {
                      if (ag.status_projeto === "recusado") return { label: "Recusado", color: "bg-destructive/10 text-destructive border-destructive/20" };
                      if (ag.pausado) return { label: "Pausado", color: "bg-yellow-100 text-yellow-700 border-yellow-200" };
                      if (ag.iniciado_em && ag.sla_horas > 0) {
                        const inicio = new Date(ag.iniciado_em).getTime();
                        const agora = Date.now();
                        const horasDecorridas = (agora - inicio) / (1000 * 60 * 60);
                        if (horasDecorridas > ag.sla_horas) return { label: "SLA Atrasado", color: "bg-destructive/10 text-destructive border-destructive/20" };
                      }
                      if (ag.iniciado_em) return { label: "Em Andamento", color: "bg-green-100 text-green-700 border-green-200" };
                      return { label: "Aguardando", color: "bg-muted text-muted-foreground border-border" };
                    };
                    const statusInfo = getStatusInfo();

                    return (
                      <div key={ag.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
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
                              {(() => {
                                if (!ag.prioridade || ag.prioridade === "normal") return null;
                                const display = PRIORIDADE_DISPLAY[ag.prioridade];
                                if (!display) return null;
                                return (
                                  <Badge variant="outline" className={cn("text-xs", display.className)}>
                                    {display.emoji} {display.label}
                                  </Badge>
                                );
                              })()}
                            </div>
                            <p className="font-medium text-sm text-foreground truncate">{ag.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">
                              Contrato: {ag.contrato_numero} · {ag.atividade_nome}
                            </p>
                            {ag.tecnicos.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                {ag.tecnicos.map((t) => (
                                  <Badge key={t.id} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                                    <UserAvatar avatarUrl={t.avatar_url} fullName={t.full_name} size="xs" />
                                    {t.full_name}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {ag.apontados.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground font-medium">Designados:</span>
                                {ag.apontados.map((a) => (
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
                            {outrasData.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-border/50">
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <CalendarDays className="h-3 w-3" />
                                  Agendamentos Programados
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {outrasData.map((d) => (
                                    <Badge
                                      key={d}
                                      variant="outline"
                                      className="text-xs font-mono cursor-pointer hover:bg-primary/10"
                                      onClick={() => setSelectedDate(parseISO(d))}
                                    >
                                      {format(parseISO(d), "dd/MM", { locale: ptBR })}
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
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => navigate(`/fila-agendamento?card=${ag.card_id}&from=agenda`)}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Abrir Card
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
