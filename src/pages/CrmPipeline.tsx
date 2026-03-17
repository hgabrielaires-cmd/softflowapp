import { useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Plus, Search, DollarSign, RefreshCw, Filter } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { useCrmPipelineQueries } from "./crm-pipeline/useCrmPipelineQueries";
import { useCrmCamposPersonalizados } from "./crm-parametros/useCrmParametrosQueries";
import { useCrmPipelineForm } from "./crm-pipeline/useCrmPipelineForm";
import { PipelineCard } from "./crm-pipeline/components/PipelineCard";
import { OportunidadeFormDialog } from "./crm-pipeline/components/OportunidadeFormDialog";
import { OportunidadeDetailView } from "./crm-pipeline/components/OportunidadeDetailView";
import { formatValor, totalValorEtapa } from "./crm-pipeline/helpers";
import type { CrmOportunidade, CrmEtapaSimples } from "./crm-pipeline/types";

export default function CrmPipeline() {
  const { profile, user, roles } = useAuth();
  const queryClient = useQueryClient();
  const { filiaisDoUsuario, filialPadraoId } = useUserFiliais();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedFunilId, setSelectedFunilId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOportunidade, setEditOportunidade] = useState<CrmOportunidade | null>(null);
  const [detailOportunidade, setDetailOportunidade] = useState<CrmOportunidade | null>(null);
  const [newEtapaId, setNewEtapaId] = useState<string>("");
  const [detailDefaultTab, setDetailDefaultTab] = useState<string | undefined>(undefined);
  const [visibleCountMap, setVisibleCountMap] = useState<Record<string, number>>({});

  // Filtros
  const [filterFilialId, setFilterFilialId] = useState<string>("__all__");
  const [filterVendedorId, setFilterVendedorId] = useState<string>("__all__");
  const [filterStatus, setFilterStatus] = useState<string>("em_andamento");
  const [filterTarefa, setFilterTarefa] = useState<string>("__all__");
  const [filtersReady, setFiltersReady] = useState(false);

  const isVendedor = roles.includes("vendedor");

  const { funisQuery, etapasQuery, oportunidadesQuery, responsaveisQuery, segmentosQuery, clientesQuery, cargosQuery } = useCrmPipelineQueries(selectedFunilId, filterStatus);
  const { createMutation, updateMutation, moveToEtapaMutation } = useCrmPipelineForm(selectedFunilId);
  const { data: camposPersonalizados = [] } = useCrmCamposPersonalizados();

  const funis = funisQuery.data || [];
  const etapas = etapasQuery.data || [];
  const oportunidades = oportunidadesQuery.data || [];
  const responsaveis = responsaveisQuery.data || [];
  const segmentos = segmentosQuery.data || [];
  const clientes = clientesQuery.data || [];
  const cargos = cargosQuery.data || [];

  // Inicializar filtros: filial favorita (ou todas) + vendedor logado sempre
  const { loading: filiaisLoading } = useUserFiliais();
  useEffect(() => {
    if (filtersReady || filiaisLoading) return;
    const favId = profile?.filial_favorita_id;
    if (favId && filiaisDoUsuario.some(f => f.id === favId)) {
      setFilterFilialId(favId);
    } else {
      setFilterFilialId("__all__");
    }
    if (user?.id) {
      setFilterVendedorId(user.id);
    }
    setFiltersReady(true);
  }, [profile?.filial_favorita_id, filiaisDoUsuario, filiaisLoading, user?.id, filtersReady]);

  // Selecionar funil favorito ou primeiro ao carregar
  useEffect(() => {
    if (funis.length > 0 && !selectedFunilId) {
      const favId = profile?.funil_favorito_id;
      const favExists = favId && funis.some(f => f.id === favId);
      setSelectedFunilId(favExists ? favId! : funis[0].id);
    }
  }, [funis, selectedFunilId, profile?.funil_favorito_id]);

  // Open oportunidade from URL params (e.g. ?oportunidade=ID&tab=tarefas)
  useEffect(() => {
    const opId = searchParams.get("oportunidade");
    const tab = searchParams.get("tab");
    if (!opId || !oportunidades.length) return;

    const found = oportunidades.find(o => o.id === opId);
    if (found) {
      setDetailDefaultTab(tab || undefined);
      setDetailOportunidade(found);
      // Clear URL params
      searchParams.delete("oportunidade");
      searchParams.delete("tab");
      setSearchParams(searchParams, { replace: true });
    }
  }, [oportunidades, searchParams]);


  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterFilialId !== "__all__") count++;
    if (filterVendedorId !== "__all__") count++;
    if (filterStatus !== "em_andamento") count++;
    if (filterTarefa !== "__all__") count++;
    return count;
  }, [filterFilialId, filterVendedorId, filterStatus, filterTarefa]);

  // Filtro combinado: texto + filial + vendedor
  const filtered = useMemo(() => {
    let result = oportunidades;

    if (filterFilialId !== "__all__") {
      result = result.filter(o => !o.clientes || o.clientes.filial_id === filterFilialId);
    }
    if (filterVendedorId !== "__all__") {
      result = result.filter(o => o.responsavel_id === filterVendedorId);
    }
    if (filterTarefa !== "__all__") {
      result = result.filter(o => o.tarefas_status === filterTarefa);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o =>
        o.titulo.toLowerCase().includes(s) ||
        o.clientes?.nome_fantasia?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [oportunidades, filterFilialId, filterVendedorId, filterTarefa, search]);

  const getOpsForEtapa = useCallback((etapaId: string) => {
    return filtered.filter(o => o.etapa_id === etapaId);
  }, [filtered]);

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (etapaId: string) => {
    if (dragCardId) {
      const card = oportunidades.find(o => o.id === dragCardId);
      if (card && card.etapa_id !== etapaId) {
        const etapaNome = etapas.find(e => e.id === etapaId)?.nome;
        moveToEtapaMutation.mutate({ id: dragCardId, etapa_id: etapaId, etapa_nome: etapaNome });
      }
      setDragCardId(null);
    }
  };

  // Open form
  const handleNewOportunidade = (etapaId?: string) => {
    setEditOportunidade(null);
    setNewEtapaId(etapaId || etapas[0]?.id || "");
    setDialogOpen(true);
  };

  const handleCardClick = (op: CrmOportunidade) => {
    setDetailDefaultTab(undefined);
    setDetailOportunidade(op);
  };

  const handleSave = (data: Record<string, unknown>) => {
    if (editOportunidade) {
      updateMutation.mutate({ id: editOportunidade.id, ...data } as CrmOportunidade, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createMutation.mutate({ funil_id: selectedFunilId, ...data } as CrmOportunidade, {
        onSuccess: (created) => {
          setDialogOpen(false);
          if (created) {
            setDetailOportunidade({
              ...created,
              campos_personalizados: (created.campos_personalizados || {}) as Record<string, string>,
              profiles: null,
              tarefas_status: "sem_tarefa",
              total_implantacao: 0,
              total_mensalidade: 0,
            } as CrmOportunidade);
            setDetailDefaultTab("tarefas");
          }
        },
      });
    }
  };

  // Detail view now auto-saves directly to DB

  const isLoading = funisQuery.isLoading || etapasQuery.isLoading || oportunidadesQuery.isLoading;

  return (
    <AppLayout>
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        {detailOportunidade ? (
          <OportunidadeDetailView
            oportunidade={detailOportunidade}
            etapas={etapas}
            clientes={clientes}
            responsaveis={responsaveis}
            onBack={() => setDetailOportunidade(null)}
            exibeCliente={funis.find(f => f.id === selectedFunilId)?.exibe_cliente ?? true}
            camposPersonalizados={camposPersonalizados}
            segmentos={segmentos}
            cargos={cargos}
            defaultTab={detailDefaultTab}
            funilId={selectedFunilId}
          />
        ) : (
        <>
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b bg-background">
          <h1 className="text-lg font-bold text-foreground mr-auto sm:mr-0">Pipeline de Vendas</h1>

          {/* Funil selector */}
          <Select value={selectedFunilId} onValueChange={setSelectedFunilId}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Selecione o funil" />
            </SelectTrigger>
            <SelectContent>
              {funis.map(f => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9"
            />
          </div>

          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => queryClient.invalidateQueries({ queryKey: ["crm_oportunidades"] })}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Filtros Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="relative h-9 shrink-0">
                <Filter className="h-4 w-4 mr-1" />
                Filtros
                {activeFilterCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="end">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-foreground">Filtros</h4>

                {/* Filial */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Filial</Label>
                  <Select value={filterFilialId} onValueChange={setFilterFilialId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as Filiais</SelectItem>
                      {filiaisDoUsuario.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vendedor - oculto para vendedores (só veem as próprias) */}
                {!isVendedor && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Vendedor</Label>
                    <Select value={filterVendedorId} onValueChange={setFilterVendedorId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent position="popper" className="max-h-60 overflow-y-auto">
                        <SelectItem value="__all__">Todos os Vendedores</SelectItem>
                        {responsaveis.map(r => (
                          <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Status */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="em_andamento">💼 Em Andamento</SelectItem>
                      <SelectItem value="perdido">😢 Negócio Perdido</SelectItem>
                      <SelectItem value="ganho">🥳 Negócio Ganho</SelectItem>
                      <SelectItem value="todos">📋 Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tarefas */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tarefas</Label>
                  <Select value={filterTarefa} onValueChange={setFilterTarefa}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">📋 Todas as Tarefas</SelectItem>
                      <SelectItem value="ok">📅 Tarefa Agendada</SelectItem>
                      <SelectItem value="vencida">⚠️ Tarefa Atrasada</SelectItem>
                      <SelectItem value="sem_tarefa">🚫 Sem Tarefa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Limpar filtros */}
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setFilterFilialId("__all__");
                      setFilterVendedorId("__all__");
                      setFilterStatus("em_andamento");
                      setFilterTarefa("__all__");
                    }}
                  >
                    Limpar filtros
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Button size="sm" className="h-9 shrink-0 w-full sm:w-auto" onClick={() => handleNewOportunidade()}>
            <Plus className="h-4 w-4 mr-1" /> Nova Oportunidade
          </Button>
        </div>

        {/* Kanban */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          {isLoading ? (
            <div className="flex gap-4 p-4 h-full">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="min-w-[280px] w-[280px]">
                  <Skeleton className="h-10 mb-3 rounded-lg" />
                  <Skeleton className="h-28 mb-2 rounded-lg" />
                  <Skeleton className="h-28 mb-2 rounded-lg" />
                </div>
              ))}
            </div>
          ) : etapas.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              {funis.length === 0 ? "Nenhum funil cadastrado. Configure em Parâmetros > CRM." : "Nenhuma etapa cadastrada para este funil."}
            </div>
          ) : (
            <div className="flex gap-3 p-4">
              {etapas.map(etapa => {
                const ops = getOpsForEtapa(etapa.id);
                const total = totalValorEtapa(ops);
                return (
                  <div
                    key={etapa.id}
                    className="min-w-[280px] w-[280px] flex flex-col rounded-xl bg-muted/40 border border-border/50"
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(etapa.id)}
                  >
                    {/* Column Header */}
                    <div className="p-3 border-b border-border/40">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />
                        <span className="font-semibold text-sm truncate flex-1">{etapa.nome}</span>
                        <span className="text-sm font-bold text-foreground shrink-0">
                          {ops.length}
                        </span>
                      </div>
                      <div className="mt-1.5 space-y-0.5">
                        <div className="flex items-center gap-1" title="Total Implantação da etapa">
                          <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shrink-0" />
                          <span className="text-[11px] font-semibold text-foreground">
                            {formatValor(ops.reduce((s, o) => s + (o.total_implantacao ?? 0), 0))}
                          </span>
                        </div>
                        <div className="flex items-center gap-1" title="Total Mensalidade da etapa">
                          <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                          <span className="text-[11px] font-semibold text-foreground">
                            {formatValor(ops.reduce((s, o) => s + (o.total_mensalidade ?? 0), 0))}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2">
                      {(() => {
                        const limit = visibleCountMap[etapa.id] || 15;
                        const visible = ops.slice(0, limit);
                        const hasMore = ops.length > limit;
                        return (
                          <>
                            {visible.map(op => (
                              <PipelineCard
                                key={op.id}
                                oportunidade={op}
                                etapa={etapa}
                                onDragStart={setDragCardId}
                                onClick={handleCardClick}
                              />
                            ))}
                            {hasMore && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full text-xs"
                                onClick={() => setVisibleCountMap(prev => ({ ...prev, [etapa.id]: limit + 15 }))}
                              >
                                Carregar mais ({ops.length - limit} restantes)
                              </Button>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Add button */}
                    <div className="p-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-muted-foreground"
                        onClick={() => handleNewOportunidade(etapa.id)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}
      </div>

      <OportunidadeFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        etapas={etapas}
        etapaIdInicial={newEtapaId}
        oportunidade={editOportunidade}
        clientes={clientes}
        responsaveis={responsaveis}
        onSave={handleSave}
        saving={createMutation.isPending || updateMutation.isPending}
        exibeCliente={funis.find(f => f.id === selectedFunilId)?.exibe_cliente ?? true}
        currentUserId={user?.id}
        camposPersonalizados={camposPersonalizados}
        segmentos={segmentos}
        cargos={cargos}
      />
    </AppLayout>
  );
}
