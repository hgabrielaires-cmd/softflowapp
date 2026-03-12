import { useState, useCallback, useEffect, useMemo } from "react";
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

  const [selectedFunilId, setSelectedFunilId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOportunidade, setEditOportunidade] = useState<CrmOportunidade | null>(null);
  const [detailOportunidade, setDetailOportunidade] = useState<CrmOportunidade | null>(null);
  const [newEtapaId, setNewEtapaId] = useState<string>("");

  // Filtros
  const [filterFilialId, setFilterFilialId] = useState<string>("__all__");
  const [filterVendedorId, setFilterVendedorId] = useState<string>("__all__");
  const [filtersReady, setFiltersReady] = useState(false);

  const isVendedor = roles.includes("vendedor");

  const { funisQuery, etapasQuery, oportunidadesQuery, responsaveisQuery, segmentosQuery, clientesQuery, cargosQuery } = useCrmPipelineQueries(selectedFunilId);
  const { createMutation, updateMutation, moveToEtapaMutation } = useCrmPipelineForm(selectedFunilId);
  const { data: camposPersonalizados = [] } = useCrmCamposPersonalizados();

  const funis = funisQuery.data || [];
  const etapas = etapasQuery.data || [];
  const oportunidades = oportunidadesQuery.data || [];
  const responsaveis = responsaveisQuery.data || [];
  const segmentos = segmentosQuery.data || [];
  const clientes = clientesQuery.data || [];
  const cargos = cargosQuery.data || [];

  // Inicializar filtros com filial do usuário e vendedor logado
  useEffect(() => {
    if (filtersReady) return;
    if (filialPadraoId) {
      setFilterFilialId(filialPadraoId);
    }
    if (isVendedor && user?.id) {
      setFilterVendedorId(user.id);
    }
    setFiltersReady(true);
  }, [filialPadraoId, isVendedor, user?.id, filtersReady]);

  // Selecionar funil favorito ou primeiro ao carregar
  useEffect(() => {
    if (funis.length > 0 && !selectedFunilId) {
      const favId = profile?.funil_favorito_id;
      const favExists = favId && funis.some(f => f.id === favId);
      setSelectedFunilId(favExists ? favId! : funis[0].id);
    }
  }, [funis, selectedFunilId, profile?.funil_favorito_id]);

  // Contar filtros ativos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterFilialId !== "__all__") count++;
    if (filterVendedorId !== "__all__") count++;
    return count;
  }, [filterFilialId, filterVendedorId]);

  // Filtro combinado: texto + filial + vendedor
  const filtered = useMemo(() => {
    let result = oportunidades;

    if (filterFilialId !== "__all__") {
      result = result.filter(o => !o.clientes || o.clientes.filial_id === filterFilialId);
    }
    if (filterVendedorId !== "__all__") {
      result = result.filter(o => o.responsavel_id === filterVendedorId);
    }
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(o =>
        o.titulo.toLowerCase().includes(s) ||
        o.clientes?.nome_fantasia?.toLowerCase().includes(s)
      );
    }
    return result;
  }, [oportunidades, filterFilialId, filterVendedorId, search]);

  const getOpsForEtapa = useCallback((etapaId: string) => {
    return filtered.filter(o => o.etapa_id === etapaId);
  }, [filtered]);

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (etapaId: string) => {
    if (dragCardId) {
      const card = oportunidades.find(o => o.id === dragCardId);
      if (card && card.etapa_id !== etapaId) {
        moveToEtapaMutation.mutate({ id: dragCardId, etapa_id: etapaId });
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
    setDetailOportunidade(op);
  };

  const handleSave = (data: Record<string, unknown>) => {
    if (editOportunidade) {
      updateMutation.mutate({ id: editOportunidade.id, ...data } as CrmOportunidade, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createMutation.mutate({ funil_id: selectedFunilId, ...data } as any, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const isLoading = funisQuery.isLoading || etapasQuery.isLoading || oportunidadesQuery.isLoading;

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-64px)]">
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
                      <SelectContent>
                        <SelectItem value="__all__">Todos os Vendedores</SelectItem>
                        {responsaveis.map(r => (
                          <SelectItem key={r.user_id} value={r.user_id}>{r.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Limpar filtros */}
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setFilterFilialId("__all__");
                      setFilterVendedorId("__all__");
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
            <div className="flex gap-3 p-4 h-full">
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
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                          {ops.length}
                        </Badge>
                      </div>
                      {total > 0 && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          {formatValor(total)}
                        </div>
                      )}
                    </div>

                    {/* Cards */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {ops.map(op => (
                        <PipelineCard
                          key={op.id}
                          oportunidade={op}
                          etapa={etapa}
                          onDragStart={setDragCardId}
                          onClick={handleCardClick}
                        />
                      ))}
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
