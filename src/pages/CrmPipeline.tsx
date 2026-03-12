import { useState, useCallback, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, DollarSign, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCrmPipelineQueries } from "./crm-pipeline/useCrmPipelineQueries";
import { useCrmPipelineForm } from "./crm-pipeline/useCrmPipelineForm";
import { PipelineCard } from "./crm-pipeline/components/PipelineCard";
import { OportunidadeFormDialog } from "./crm-pipeline/components/OportunidadeFormDialog";
import { formatValor, totalValorEtapa } from "./crm-pipeline/helpers";
import type { CrmOportunidade, CrmEtapaSimples } from "./crm-pipeline/types";

export default function CrmPipeline() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedFunilId, setSelectedFunilId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editOportunidade, setEditOportunidade] = useState<CrmOportunidade | null>(null);
  const [newEtapaId, setNewEtapaId] = useState<string>("");

  const { funisQuery, etapasQuery, oportunidadesQuery, responsaveisQuery } = useCrmPipelineQueries(selectedFunilId);
  const { createMutation, updateMutation, moveToEtapaMutation } = useCrmPipelineForm(selectedFunilId);

  const funis = funisQuery.data || [];
  const etapas = etapasQuery.data || [];
  const oportunidades = oportunidadesQuery.data || [];
  const responsaveis = responsaveisQuery.data || [];

  // Selecionar primeiro funil ao carregar
  useEffect(() => {
    if (funis.length > 0 && !selectedFunilId) {
      setSelectedFunilId(funis[0].id);
    }
  }, [funis, selectedFunilId]);

  // Buscar clientes
  const [clientes, setClientes] = useState<{ id: string; nome_fantasia: string }[]>([]);
  useEffect(() => {
    supabase.from("clientes").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia").then(({ data }) => {
      if (data) setClientes(data);
    });
  }, []);

  // Filtro
  const filtered = search
    ? oportunidades.filter(o =>
        o.titulo.toLowerCase().includes(search.toLowerCase()) ||
        o.clientes?.nome_fantasia?.toLowerCase().includes(search.toLowerCase())
      )
    : oportunidades;

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
    setEditOportunidade(op);
    setNewEtapaId("");
    setDialogOpen(true);
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
        <div className="flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 border-b bg-background">
          <h1 className="text-lg font-bold text-foreground">Pipeline de Vendas</h1>

          <div className="flex items-center gap-2 flex-1 flex-wrap">
            {/* Funil selector */}
            <Select value={selectedFunilId} onValueChange={setSelectedFunilId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione o funil" />
              </SelectTrigger>
              <SelectContent>
                {funis.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-[300px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar oportunidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9"
              />
            </div>

            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => queryClient.invalidateQueries({ queryKey: ["crm_oportunidades"] })}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Button size="sm" onClick={() => handleNewOportunidade()}>
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
      />
    </AppLayout>
  );
}
