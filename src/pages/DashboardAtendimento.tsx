import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RefreshCw, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { KpiCards } from "./dashboard-atendimento/components/KpiCards";
import { AlertasPanel } from "./dashboard-atendimento/components/AlertasPanel";
import { GraficoCategoria } from "./dashboard-atendimento/components/GraficoCategoria";
import { TicketsAntigos } from "./dashboard-atendimento/components/TicketsAntigos";
import { KanbanMini } from "./dashboard-atendimento/components/KanbanMini";
import { AgendaDia } from "./dashboard-atendimento/components/AgendaDia";
import { AtendentesPanel } from "./dashboard-atendimento/components/AtendentesPanel";
import {
  useDashKpis,
  useDashAlertas,
  useTicketsPorCategoria,
  useTicketsMaisAntigos,
  useKanbanResumo,
  useAgendaHoje,
  useAtendentesPresenca,
} from "./dashboard-atendimento/useDashAtendimentoQueries";

export default function DashboardAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const now = new Date();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(now),
    to: endOfMonth(now),
  });

  const startDate = dateRange.from.toISOString();
  const endDate = dateRange.to.toISOString();

  const { data: kpis, isLoading: loadKpi } = useDashKpis(startDate, endDate);
  const { data: alertas, isLoading: loadAlertas } = useDashAlertas();
  const { data: categorias, isLoading: loadCat } = useTicketsPorCategoria(startDate, endDate);
  const { data: antigos, isLoading: loadAntigos } = useTicketsMaisAntigos();
  const { data: kanban, isLoading: loadKanban } = useKanbanResumo(startDate, endDate);
  const { data: agenda, isLoading: loadAgenda } = useAgendaHoje();
  const { data: atendentes, isLoading: loadAtendentes } = useAtendentesPresenca();

  const handleVerTicket = (id: string) => {
    navigate(`/tickets?ticket=${id}`);
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["dash_tickets_kpis"] });
    queryClient.invalidateQueries({ queryKey: ["dash_tickets_alertas"] });
    queryClient.invalidateQueries({ queryKey: ["dash_tickets_por_categoria"] });
    queryClient.invalidateQueries({ queryKey: ["dash_tickets_mais_antigos"] });
    queryClient.invalidateQueries({ queryKey: ["dash_tickets_kanban_resumo"] });
    queryClient.invalidateQueries({ queryKey: ["dash_tickets_agenda_hoje"] });
    queryClient.invalidateQueries({ queryKey: ["dash_atendentes_presenca"] });
  };

  const rangeLabel =
    dateRange.from && dateRange.to
      ? `${format(dateRange.from, "dd/MM/yyyy")} — ${format(dateRange.to, "dd/MM/yyyy")}`
      : "Selecione o período";

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard Tickets</h1>
            <p className="text-sm text-muted-foreground">Visão operacional de tickets e compromissos</p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[220px] justify-start text-left font-normal">
                  <CalendarIcon className="h-4 w-4 mr-1.5" />
                  <span className="text-xs">{rangeLabel}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from) {
                      setDateRange({
                        from: range.from,
                        to: range.to ?? range.from,
                      });
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <KpiCards kpis={kpis} loading={loadKpi} />

        {/* Atendentes */}
        <AtendentesPanel atendentes={atendentes} loading={loadAtendentes} />

        {/* Main grid: content + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Central (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <GraficoCategoria data={categorias} loading={loadCat} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TicketsAntigos tickets={antigos} loading={loadAntigos} onVerTicket={handleVerTicket} />
              <KanbanMini data={kanban} loading={loadKanban} />
            </div>

            <AgendaDia agendamentos={agenda} loading={loadAgenda} />
          </div>

          {/* Sidebar alerts (1/3) */}
          <div>
            <AlertasPanel alertas={alertas} loading={loadAlertas} onVerTicket={handleVerTicket} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
