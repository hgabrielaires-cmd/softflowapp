import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Clock, User, Building2, Filter, MapPin } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
}

interface AgendamentoComDetalhes extends Agendamento {
  cliente_nome: string;
  contrato_numero: string;
  filial_id: string;
  filial_nome: string;
  atividade_nome: string;
  tecnicos: { id: string; full_name: string }[];
  tipo_atendimento: string | null;
}

export default function Agenda() {
  const { profile } = useAuth();
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
        .select("id, cliente_id, contrato_id, filial_id, tipo_atendimento_local, clientes(nome_fantasia), contratos(numero_exibicao), filiais(nome)");
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
        .select("card_id, tecnico_id, profiles:tecnico_id(id, full_name)");
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
    const map: Record<string, { id: string; full_name: string }[]> = {};
    painelTecnicos.forEach((pt: any) => {
      if (!map[pt.card_id]) map[pt.card_id] = [];
      if (pt.profiles) map[pt.card_id].push(pt.profiles);
    });
    return map;
  }, [painelTecnicos]);

  // Agendamentos enriquecidos
  const agendamentosDetalhados = useMemo<AgendamentoComDetalhes[]>(() => {
    return agendamentos.map((ag) => {
      const card = cardsMap[ag.card_id];
      return {
        ...ag,
        cliente_nome: card?.clientes?.nome_fantasia || "—",
        contrato_numero: card?.contratos?.numero_exibicao || "—",
        filial_id: card?.filial_id || "",
        filial_nome: card?.filiais?.nome || "—",
        atividade_nome: atividadesMap[ag.atividade_id] || "—",
        tecnicos: tecnicosPorCard[ag.card_id] || [],
        tipo_atendimento: card?.tipo_atendimento_local || null,
      };
    });
  }, [agendamentos, cardsMap, atividadesMap, tecnicosPorCard]);

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

  const modifiersStyles = {
    hasEvent: {
      backgroundColor: "hsl(var(--primary))",
      color: "hsl(var(--primary-foreground))",
      borderRadius: "50%",
      fontWeight: "bold" as const,
    },
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
                modifiersStyles={modifiersStyles}
                classNames={{
                  day_selected: "bg-primary/20 text-primary rounded-full hover:bg-primary/25 focus:bg-primary/25 font-bold",
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
            </CardHeader>
            <CardContent>
              {agendamentosDoDia.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <CalendarDays className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum agendamento para este dia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {agendamentosDoDia.map((ag) => (
                    <div key={ag.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
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
                          </div>
                          <p className="font-medium text-sm text-foreground truncate">{ag.cliente_nome}</p>
                          <p className="text-xs text-muted-foreground">
                            Contrato: {ag.contrato_numero} · {ag.atividade_nome}
                          </p>
                          {ag.tecnicos.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <User className="h-3 w-3 text-muted-foreground" />
                              {ag.tecnicos.map((t) => (
                                <Badge key={t.id} variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                  {t.full_name}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {ag.observacao && (
                            <p className="text-xs text-muted-foreground mt-1 italic">"{ag.observacao}"</p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          <Building2 className="h-3 w-3 mr-1" />
                          {ag.filial_nome}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
