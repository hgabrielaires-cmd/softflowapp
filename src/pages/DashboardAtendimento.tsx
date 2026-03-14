import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { KpiCards } from "./dashboard-atendimento/components/KpiCards";
import { AlertasPanel } from "./dashboard-atendimento/components/AlertasPanel";
import { GraficoCategoria } from "./dashboard-atendimento/components/GraficoCategoria";
import { TicketsAntigos } from "./dashboard-atendimento/components/TicketsAntigos";
import { KanbanMini } from "./dashboard-atendimento/components/KanbanMini";
import { AgendaDia } from "./dashboard-atendimento/components/AgendaDia";
import {
  useDashKpis,
  useDashAlertas,
  useTicketsPorCategoria,
  useTicketsMaisAntigos,
  useKanbanResumo,
  useAgendaHoje,
} from "./dashboard-atendimento/useDashAtendimentoQueries";

export default function DashboardAtendimento() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: kpis, isLoading: loadKpi } = useDashKpis();
  const { data: alertas, isLoading: loadAlertas } = useDashAlertas();
  const { data: categorias, isLoading: loadCat } = useTicketsPorCategoria();
  const { data: antigos, isLoading: loadAntigos } = useTicketsMaisAntigos();
  const { data: kanban, isLoading: loadKanban } = useKanbanResumo();
  const { data: agenda, isLoading: loadAgenda } = useAgendaHoje();

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
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard Tickets</h1>
            <p className="text-sm text-muted-foreground">Visão operacional de tickets e compromissos</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Atualizar
          </Button>
        </div>

        {/* KPIs */}
        <KpiCards kpis={kpis} loading={loadKpi} />

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
