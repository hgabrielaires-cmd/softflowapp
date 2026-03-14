import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { Ticket as TicketIcon, Plus, FilterX, RefreshCw } from "lucide-react";
import { TicketKanbanColumn } from "./tickets/components/TicketKanbanColumn";
import { TicketDetailDrawer } from "./tickets/components/TicketDetailDrawer";
import {
  useTickets, useTicketSeguidores, useTicketAnexosCount, useProfiles,
} from "./tickets/useTicketsQueries";
import { useUpdateTicketStatus } from "./tickets/useTicketsForm";
import { useAuth } from "@/context/AuthContext";
import {
  TICKET_STATUSES, TICKET_PRIORIDADES, TICKET_MESAS,
} from "./tickets/constants";
import type { Ticket, TicketStatus, TicketSeguidor } from "./tickets/types";

export default function Tickets() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id || "";

  // Filters
  const [search, setSearch] = useState("");
  const [filterPrioridade, setFilterPrioridade] = useState("__none__");
  const [filterResponsavel, setFilterResponsavel] = useState("__none__");
  const [filterMesa, setFilterMesa] = useState("__none__");

  // Detail drawer
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // Data
  const { data: tickets = [], refetch: refetchTickets, isFetching } = useTickets();
  const { data: profiles = [] } = useProfiles();
  const ticketIds = useMemo(() => tickets.map((t) => t.id), [tickets]);
  const { data: seguidoresRaw = [] } = useTicketSeguidores(ticketIds);
  const { data: anexosMap = {} } = useTicketAnexosCount(ticketIds);
  const updateStatus = useUpdateTicketStatus();

  // Group seguidores by ticket
  const seguidoresMap = useMemo(() => {
    const map: Record<string, TicketSeguidor[]> = {};
    seguidoresRaw.forEach((s) => {
      if (!map[s.ticket_id]) map[s.ticket_id] = [];
      map[s.ticket_id].push(s);
    });
    return map;
  }, [seguidoresRaw]);

  // Apply filters
  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.titulo.toLowerCase().includes(q) && !t.numero_exibicao.toLowerCase().includes(q)) return false;
      }
      if (filterPrioridade !== "__none__" && t.prioridade !== filterPrioridade) return false;
      if (filterResponsavel !== "__none__" && t.responsavel_id !== filterResponsavel) return false;
      if (filterMesa !== "__none__" && t.mesa !== filterMesa) return false;
      return true;
    });
  }, [tickets, search, filterPrioridade, filterResponsavel, filterMesa]);

  // Group by status
  const columns = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      "Aberto": [], "Em Andamento": [], "Aguardando Cliente": [], "Resolvido": [], "Fechado": [],
    };
    filtered.forEach((t) => {
      if (map[t.status as TicketStatus]) map[t.status as TicketStatus].push(t);
    });
    return map;
  }, [filtered]);

  // Drag & drop
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as TicketStatus;
    const ticketId = result.draggableId;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;
    updateStatus.mutate({ ticketId, newStatus, oldStatus: ticket.status, userId });
  };

  const clearFilters = () => {
    setSearch("");
    setFilterPrioridade("__none__");
    setFilterResponsavel("__none__");
    setFilterMesa("__none__");
  };

  const hasFilters = search || filterPrioridade !== "__none__" || filterResponsavel !== "__none__" || filterMesa !== "__none__";

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 px-4 pt-4 pb-2 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <TicketIcon className="h-5 w-5" />
              Tickets
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => refetchTickets()} disabled={isFetching} className="h-9 w-9">
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
              <Button onClick={() => navigate("/tickets/novo")} className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1" /> Novo Ticket
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              placeholder="Buscar título ou nº..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-52 h-8 text-sm"
            />
            <Select value={filterPrioridade} onValueChange={setFilterPrioridade}>
              <SelectTrigger className="w-32 h-8 text-sm">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Todas</SelectItem>
                {TICKET_PRIORIDADES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterResponsavel} onValueChange={setFilterResponsavel}>
              <SelectTrigger className="w-40 h-8 text-sm">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Todos</SelectItem>
                {profiles.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMesa} onValueChange={setFilterMesa}>
              <SelectTrigger className="w-36 h-8 text-sm">
                <SelectValue placeholder="Mesa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Todas</SelectItem>
                {TICKET_MESAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="text-xs h-8">
                <FilterX className="h-3 w-3 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Kanban */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto px-4 pb-4">
            <div className="flex gap-3 h-full">
              {TICKET_STATUSES.map((status) => (
                <TicketKanbanColumn
                  key={status}
                  status={status}
                  tickets={columns[status]}
                  seguidoresMap={seguidoresMap}
                  anexosMap={anexosMap}
                  onCardClick={(t) => setSelectedTicketId(t.id)}
                />
              ))}
            </div>
          </div>
        </DragDropContext>

        {/* Detail drawer */}
        <TicketDetailDrawer
          ticketId={selectedTicketId}
          open={!!selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      </div>
    </AppLayout>
  );
}
