import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { useCrmPipelineQueries } from "./crm-pipeline/useCrmPipelineQueries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Clock } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { calcularPeriodo } from "./dashboard-crm/helpers";
import { PERIODO_OPTIONS, DIAS_SEM_INTERACAO_PADRAO } from "./dashboard-crm/constants";
import {
  useKpiFinalizadas, useRankingVendedores, useMotivosPerda,
  useComparativoPeriodo, useKpiAndamento, useEtapasFunil,
  useTarefasAnalise, useAlertasAtencao,
} from "./dashboard-crm/useDashboardCrmQueries";
import { KpiFinalizadasCards } from "./dashboard-crm/components/KpiFinalizadasCards";
import { RankingVendedoresPanel } from "./dashboard-crm/components/RankingVendedoresPanel";
import { MotivosPerdaPanel } from "./dashboard-crm/components/MotivosPerdaPanel";
import { ComparativoPeriodoChart } from "./dashboard-crm/components/ComparativoPeriodoChart";
import { KpiAndamentoCards } from "./dashboard-crm/components/KpiAndamentoCards";
import { FunilEtapasVisual } from "./dashboard-crm/components/FunilEtapasVisual";
import { AnaliseTarefasPanel } from "./dashboard-crm/components/AnaliseTarefasPanel";
import { AlertasAtencaoPanel } from "./dashboard-crm/components/AlertasAtencaoPanel";

export default function DashboardCrm() {
  const { user, roles, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { filiaisDoUsuario, filialPadraoId } = useUserFiliais();
  const isVendedor = roles.includes("vendedor") && !isAdmin;

  // Filters
  const [selectedFunilId, setSelectedFunilId] = useState("");
  const [filterFilialId, setFilterFilialId] = useState("__all__");
  const [filterVendedorId, setFilterVendedorId] = useState("__all__");
  const [periodoTipo, setPeriodoTipo] = useState("mes_atual");
  const [customInicio, setCustomInicio] = useState("");
  const [customFim, setCustomFim] = useState("");
  const [abaAtiva, setAbaAtiva] = useState<"finalizadas" | "andamento">("finalizadas");
  const [diasSemInteracao, setDiasSemInteracao] = useState(DIAS_SEM_INTERACAO_PADRAO);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const { funisQuery, responsaveisQuery } = useCrmPipelineQueries(selectedFunilId);
  const funis = funisQuery.data || [];
  const responsaveis = responsaveisQuery.data || [];

  // Init funil
  useEffect(() => {
    if (funis.length > 0 && !selectedFunilId) setSelectedFunilId(funis[0].id);
  }, [funis, selectedFunilId]);

  // Init filial
  useEffect(() => {
    if (filialPadraoId) setFilterFilialId(filialPadraoId);
  }, [filialPadraoId]);

  // Init vendedor for vendedor role
  useEffect(() => {
    if (isVendedor && user?.id) setFilterVendedorId(user.id);
  }, [isVendedor, user?.id]);

  // Periodo calculation
  const periodo = useMemo(() => calcularPeriodo(periodoTipo, customInicio, customFim), [periodoTipo, customInicio, customFim]);

  // Responsavel IDs filter
  const responsavelIds = useMemo(() => {
    if (isVendedor && user?.id) return [user.id];
    if (filterVendedorId !== "__all__") return [filterVendedorId];
    if (filterFilialId !== "__all__") {
      // TODO: filter responsaveis by filial if needed
      return undefined;
    }
    return undefined;
  }, [isVendedor, user?.id, filterVendedorId, filterFilialId]);

  const finFilters = { funilId: selectedFunilId, responsavelIds, inicio: periodo.inicio, fim: periodo.fim };
  const andFilters = { funilId: selectedFunilId, responsavelIds };

  // Queries - Finalizadas
  const kpiFin = useKpiFinalizadas(finFilters);
  const rankingGanho = useRankingVendedores(finFilters, "ganho");
  const motivos = useMotivosPerda(finFilters);
  const comparativo = useComparativoPeriodo(finFilters);

  // Queries - Em Andamento
  const kpiAnd = useKpiAndamento(andFilters);
  const etapasFunil = useEtapasFunil(andFilters);
  const tarefas = useTarefasAnalise({ ...andFilters, inicio: periodo.inicio, fim: periodo.fim });
  const rankingAnd = useRankingVendedores({ ...andFilters, inicio: periodo.inicio, fim: periodo.fim }, "andamento");
  const alertas = useAlertasAtencao({ ...andFilters, diasSemInteracao });

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["crm_dash"] });
      setLastUpdate(new Date());
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ predicate: q => (q.queryKey[0] as string)?.startsWith("crm_dash") });
    setLastUpdate(new Date());
  };

  return (
    <AppLayout>
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b bg-background overflow-x-auto">
          <h1 className="text-lg font-bold text-foreground whitespace-nowrap">Dashboard CRM</h1>

          <Select value={selectedFunilId} onValueChange={setSelectedFunilId}>
            <SelectTrigger className="w-[160px] h-9 shrink-0"><SelectValue placeholder="Funil" /></SelectTrigger>
            <SelectContent>
              {funis.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>

          {!isVendedor && (
            <Select value={filterVendedorId} onValueChange={setFilterVendedorId}>
              <SelectTrigger className="w-[160px] h-9 shrink-0"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos Vendedores</SelectItem>
                {responsaveis.map(r => <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {filiaisDoUsuario.length > 1 && (
            <Select value={filterFilialId} onValueChange={setFilterFilialId}>
              <SelectTrigger className="w-[140px] h-9 shrink-0"><SelectValue placeholder="Filial" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas Filiais</SelectItem>
                {filiaisDoUsuario.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Select value={periodoTipo} onValueChange={setPeriodoTipo}>
            <SelectTrigger className="w-[150px] h-9 shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PERIODO_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {periodoTipo === "personalizado" && (
            <div className="flex items-center gap-1 shrink-0">
              <Input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)} className="h-9 w-[130px] text-xs" />
              <span className="text-xs text-muted-foreground">a</span>
              <Input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)} className="h-9 w-[130px] text-xs" />
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {format(lastUpdate, "HH:mm")}
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="px-4 pt-3">
          <div className="inline-flex rounded-lg bg-muted p-1">
            <button
              onClick={() => setAbaAtiva("finalizadas")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                abaAtiva === "finalizadas" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🏁 Finalizadas
            </button>
            <button
              onClick={() => setAbaAtiva("andamento")}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                abaAtiva === "andamento" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🚀 Em Andamento
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: abaAtiva === "andamento" ? "translateX(-100%)" : "translateX(0)" }}
            >
              {/* FINALIZADAS */}
              <div className="min-w-full space-y-4 pr-4">
                <KpiFinalizadasCards data={kpiFin.data} isLoading={kpiFin.isLoading} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <RankingVendedoresPanel
                    data={rankingGanho.data}
                    isLoading={rankingGanho.isLoading}
                    isAdmin={isAdmin}
                    currentUserId={user?.id}
                    titulo="Top Vendedores (Ganhos)"
                    maxItems={3}
                  />
                  <MotivosPerdaPanel data={motivos.data} isLoading={motivos.isLoading} />
                </div>

                <ComparativoPeriodoChart data={comparativo.data} isLoading={comparativo.isLoading} />
              </div>

              {/* EM ANDAMENTO */}
              <div className="min-w-full space-y-4 pl-4">
                <KpiAndamentoCards data={kpiAnd.data} isLoading={kpiAnd.isLoading} />

                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Funil Visual por Etapa</Label>
                  <FunilEtapasVisual data={etapasFunil.data} isLoading={etapasFunil.isLoading} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <AnaliseTarefasPanel data={tarefas.data} isLoading={tarefas.isLoading} />
                  <RankingVendedoresPanel
                    data={rankingAnd.data}
                    isLoading={rankingAnd.isLoading}
                    isAdmin={isAdmin}
                    currentUserId={user?.id}
                    titulo="Ranking Pipeline (Andamento)"
                  />
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-xs text-muted-foreground">Dias sem interação:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={90}
                    value={diasSemInteracao}
                    onChange={e => setDiasSemInteracao(Number(e.target.value) || 7)}
                    className="h-7 w-16 text-xs"
                  />
                </div>
                <AlertasAtencaoPanel data={alertas.data} isLoading={alertas.isLoading} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
