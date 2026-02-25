import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LayoutGrid, List, Search, Clock, Building2, User, Filter,
  GripVertical, ChevronRight, FileText, Package, ArrowUpCircle,
  Wrench, GraduationCap, Layers, Play, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PainelEtapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  ativo: boolean;
  controla_sla: boolean;
  prazo_maximo_horas: number | null;
}

interface PainelCard {
  id: string;
  contrato_id: string;
  pedido_id: string | null;
  cliente_id: string;
  filial_id: string;
  tipo_operacao: string;
  plano_id: string | null;
  jornada_id: string | null;
  responsavel_id: string | null;
  etapa_id: string;
  sla_horas: number;
  observacoes: string | null;
  iniciado_em: string | null;
  iniciado_por: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  clientes?: { nome_fantasia: string } | null;
  filiais?: { nome: string } | null;
  planos?: { nome: string } | null;
  contratos?: { numero_exibicao: string } | null;
  profiles?: { full_name: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_ICONS: Record<string, React.ReactNode> = {
  "Implantação": <Package className="h-3.5 w-3.5" />,
  "Upgrade": <ArrowUpCircle className="h-3.5 w-3.5" />,
  "Módulo Adicional": <Layers className="h-3.5 w-3.5" />,
  "Serviço": <Wrench className="h-3.5 w-3.5" />,
  "Treinamento": <GraduationCap className="h-3.5 w-3.5" />,
};

const TIPO_COLORS: Record<string, string> = {
  "Implantação": "bg-blue-100 text-blue-700 border-blue-200",
  "Upgrade": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Módulo Adicional": "bg-violet-100 text-violet-700 border-violet-200",
  "Serviço": "bg-amber-100 text-amber-700 border-amber-200",
  "Treinamento": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// Colors now come from the database `cor` field in painel_etapas

// ─── Component ───────────────────────────────────────────────────────────────

export default function PainelAtendimento() {
  const { filiaisDoUsuario, filialPadraoId } = useUserFiliais();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroFilial, setFiltroFilial] = useState<string>("_init_");
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("todos");
  const [filtroEtapa, setFiltroEtapa] = useState<string>("todos");
  const [detailCard, setDetailCard] = useState<PainelCard | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);

  // Set default filial filter when hook resolves
  useEffect(() => {
    if (filtroFilial === "_init_" && filialPadraoId) {
      setFiltroFilial(filialPadraoId);
    } else if (filtroFilial === "_init_" && !filialPadraoId) {
      setFiltroFilial("todos");
    }
  }, [filialPadraoId]);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: etapas = [] } = useQuery({
    queryKey: ["painel_etapas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_etapas")
        .select("*")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as PainelEtapa[];
    },
  });

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["painel_atendimento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("painel_atendimento")
        .select("*, clientes(nome_fantasia), filiais(nome), planos(nome), contratos(numero_exibicao), profiles(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PainelCard[];
    },
  });

  const filiais = filiaisDoUsuario;

  const { data: responsaveis = [] } = useQuery({
    queryKey: ["profiles_painel"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").eq("active", true).order("full_name");
      return data || [];
    },
  });

  // ─── Mutations ───────────────────────────────────────────────────────────

  const moverCard = useMutation({
    mutationFn: async ({ cardId, etapaId }: { cardId: string; etapaId: string }) => {
      const { error } = await supabase
        .from("painel_atendimento")
        .update({ etapa_id: etapaId })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
    },
    onError: () => toast.error("Erro ao mover card."),
  });

  const atribuirResponsavel = useMutation({
    mutationFn: async ({ cardId, responsavelId }: { cardId: string; responsavelId: string | null }) => {
      const { error } = await supabase
        .from("painel_atendimento")
        .update({ responsavel_id: responsavelId })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
      toast.success("Responsável atualizado!");
    },
    onError: () => toast.error("Erro ao atribuir responsável."),
  });

  const iniciarAtendimento = useMutation({
    mutationFn: async (cardId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("painel_atendimento")
        .update({ iniciado_em: new Date().toISOString(), iniciado_por: user.id })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
      toast.success("Atendimento iniciado!");
    },
    onError: () => toast.error("Erro ao iniciar atendimento."),
  });

  // ─── SLA inicio check ──────────────────────────────────────────────────

  function isInicioAtrasado(card: PainelCard): boolean {
    if (card.iniciado_em) return false; // já iniciou
    const etapa = etapas.find((e) => e.id === card.etapa_id);
    if (!etapa?.controla_sla || !etapa.prazo_maximo_horas) return false;
    const criado = new Date(card.created_at).getTime();
    const agora = Date.now();
    const diffHoras = (agora - criado) / (1000 * 60 * 60);
    return diffHoras > etapa.prazo_maximo_horas;
  }

  // ─── Filtered cards ──────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (search && !c.clientes?.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) &&
          !c.contratos?.numero_exibicao?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filtroTipo !== "todos" && c.tipo_operacao !== filtroTipo) return false;
      if (filtroFilial !== "todos" && filtroFilial !== "_init_" && c.filial_id !== filtroFilial) return false;
      if (filtroResponsavel !== "todos" && c.responsavel_id !== filtroResponsavel) return false;
      if (filtroEtapa !== "todos" && c.etapa_id !== filtroEtapa) return false;
      return true;
    });
  }, [cards, search, filtroTipo, filtroFilial, filtroResponsavel, filtroEtapa]);

  // ─── Drag & Drop ─────────────────────────────────────────────────────────

  function handleDragStart(cardId: string) {
    setDragCardId(cardId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(etapaId: string) {
    if (dragCardId) {
      const card = cards.find((c) => c.id === dragCardId);
      if (card && card.etapa_id !== etapaId) {
        // Validação: não mover para "Em Execução" se etapas anteriores obrigatórias não concluídas
        const etapaDestino = etapas.find((e) => e.id === etapaId);
        if (etapaDestino?.nome === "Em Execução") {
          const etapaAtual = etapas.find((e) => e.id === card.etapa_id);
          if (etapaAtual && etapaAtual.ordem < 2) {
            toast.error("Complete as etapas obrigatórias antes de mover para 'Em Execução'.");
            setDragCardId(null);
            return;
          }
        }
        moverCard.mutate({ cardId: dragCardId, etapaId });
      }
    }
    setDragCardId(null);
  }

  // ─── SLA formatting ──────────────────────────────────────────────────────

  function formatSLA(horas: number) {
    if (!horas) return "—";
    const h = Math.floor(horas);
    const m = Math.round((horas - h) * 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  }

  // ─── Progress calculation ────────────────────────────────────────────────

  function calcProgress(card: PainelCard): number {
    const etapa = etapas.find((e) => e.id === card.etapa_id);
    if (!etapa || etapas.length === 0) return 0;
    const concluido = etapas.find((e) => e.nome === "Concluído");
    if (concluido && card.etapa_id === concluido.id) return 100;
    const maxOrdem = Math.max(...etapas.map((e) => e.ordem));
    return Math.round((etapa.ordem / maxOrdem) * 100);
  }

  // ─── Unique operation types ──────────────────────────────────────────────

  const tiposUnicos = useMemo(() => {
    const tipos = new Set(cards.map((c) => c.tipo_operacao));
    return Array.from(tipos).sort();
  }, [cards]);

  // ─── Card component ─────────────────────────────────────────────────────

  function KanbanCard({ card }: { card: PainelCard }) {
    const progress = calcProgress(card);
    const etapa = etapas.find((e) => e.id === card.etapa_id);

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(card.id)}
        onClick={() => setDetailCard(card)}
        className="bg-card rounded-lg border border-border/60 shadow-sm cursor-pointer hover:shadow-md transition-all duration-150 border-t-[3px]"
        style={{ borderTopColor: etapa?.cor || 'hsl(var(--muted))' }}
      >
        <div className="p-3 space-y-2.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-foreground leading-tight truncate flex-1">
              {card.clientes?.nome_fantasia || "Cliente"}
            </p>
            <span className="text-[10px] text-muted-foreground font-mono shrink-0">
              {card.contratos?.numero_exibicao}
            </span>
          </div>

          {/* Status tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isInicioAtrasado(card) && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Tarefa Atrasada
              </Badge>
            )}
            {card.iniciado_em && (
              <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                <Play className="h-2.5 w-2.5" />
                Em andamento
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1", TIPO_COLORS[card.tipo_operacao] || "")}>
              {TIPO_ICONS[card.tipo_operacao]}
              {card.tipo_operacao}
            </Badge>
          </div>

          {/* Info row */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {card.filiais?.nome || "—"}
            </span>
            {card.planos?.nome && (
              <span className="flex items-center gap-1 truncate">
                <FileText className="h-3 w-3" />
                {card.planos.nome}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              {card.responsavel_id ? (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                  <User className="h-2.5 w-2.5" />
                  {card.profiles?.full_name?.split(" ")[0] || "—"}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                  Sem responsável
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatSLA(card.sla_horas)}
            </div>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-1" />
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Atendimento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} atendimento{filtered.length !== 1 ? "s" : ""} no painel
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4 mr-1" /> Kanban
            </Button>
            <Button
              variant={viewMode === "lista" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("lista")}
            >
              <List className="h-4 w-4 mr-1" /> Lista
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente ou contrato..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 w-60"
            />
          </div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Tipo da Operação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {tiposUnicos.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroEtapa} onValueChange={setFiltroEtapa}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Etapa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as etapas</SelectItem>
              {etapas.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroFilial} onValueChange={setFiltroFilial}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Filial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as filiais</SelectItem>
              {filiais.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {responsaveis.map((r: any) => (
                <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {etapas.map((etapa) => {
              const etapaCards = filtered.filter((c) => c.etapa_id === etapa.id);
              return (
                <div
                  key={etapa.id}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(etapa.id)}
                  className="flex-shrink-0 w-72"
                >
                  <div
                    className="rounded-t-lg px-3 py-2 flex items-center justify-between border-t-[3px] bg-muted/40"
                    style={{ borderTopColor: etapa.cor || 'hsl(var(--muted))' }}
                  >
                    <span className="font-semibold text-sm text-foreground">{etapa.nome}</span>
                    <Badge variant="secondary" className="text-xs px-1.5">{etapaCards.length}</Badge>
                  </div>
                  <div className="bg-muted/20 rounded-b-lg border border-t-0 border-border/40 min-h-[200px] p-2 space-y-2">
                    {etapaCards.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8 italic">Nenhum card</p>
                    ) : (
                      etapaCards.map((card) => (
                        <KanbanCard key={card.id} card={card} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === "lista" && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Filial</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead className="text-center">SLA</TableHead>
                  <TableHead className="text-center">Progresso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum atendimento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((card) => {
                    const etapa = etapas.find((e) => e.id === card.etapa_id);
                    const progress = calcProgress(card);
                    return (
                      <TableRow key={card.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailCard(card)}>
                        <TableCell className="font-medium">{card.clientes?.nome_fantasia || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{card.contratos?.numero_exibicao || "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-xs gap-1", TIPO_COLORS[card.tipo_operacao] || "")}>
                            {TIPO_ICONS[card.tipo_operacao]}
                            {card.tipo_operacao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{etapa?.nome || "—"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{card.filiais?.nome || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{card.planos?.nome || "—"}</TableCell>
                        <TableCell className="text-sm">{card.profiles?.full_name || <span className="text-muted-foreground italic">Não atribuído</span>}</TableCell>
                        <TableCell className="text-center text-sm">{formatSLA(card.sla_horas)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress value={progress} className="h-1.5 w-16" />
                            <span className="text-xs text-muted-foreground">{progress}%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailCard} onOpenChange={(open) => { if (!open) setDetailCard(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailCard && TIPO_ICONS[detailCard.tipo_operacao]}
              {detailCard?.clientes?.nome_fantasia || "Detalhes"}
            </DialogTitle>
          </DialogHeader>
          {detailCard && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Contrato</p>
                  <p className="font-medium font-mono">{detailCard.contratos?.numero_exibicao}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo da Operação</p>
                  <Badge variant="outline" className={cn("text-xs gap-1 mt-0.5", TIPO_COLORS[detailCard.tipo_operacao] || "")}>
                    {TIPO_ICONS[detailCard.tipo_operacao]}
                    {detailCard.tipo_operacao}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Filial</p>
                  <p className="font-medium">{detailCard.filiais?.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Plano</p>
                  <p className="font-medium">{detailCard.planos?.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Etapa Atual</p>
                  <Badge variant="secondary" className="mt-0.5">
                    {etapas.find((e) => e.id === detailCard.etapa_id)?.nome || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">SLA</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatSLA(detailCard.sla_horas)}
                  </p>
                </div>
              </div>

              {/* Status de Início */}
              <div className="p-3 rounded-lg border bg-muted/30">
                {detailCard.iniciado_em ? (
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                      <Play className="h-3 w-3 mr-1" />
                      Em andamento
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Iniciado em {new Date(detailCard.iniciado_em).toLocaleDateString("pt-BR")} às{" "}
                      {new Date(detailCard.iniciado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isInicioAtrasado(detailCard) ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Tarefa Atrasada
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">Aguardando início</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        iniciarAtendimento.mutate(detailCard.id);
                        setDetailCard({ ...detailCard, iniciado_em: new Date().toISOString() });
                      }}
                      disabled={iniciarAtendimento.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {iniciarAtendimento.isPending ? "Iniciando..." : "Iniciar"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Progress */}
              <div>
                <p className="text-muted-foreground text-xs mb-1">Progresso</p>
                <div className="flex items-center gap-2">
                  <Progress value={calcProgress(detailCard)} className="h-2 flex-1" />
                  <span className="text-sm font-medium">{calcProgress(detailCard)}%</span>
                </div>
              </div>

              {/* Responsável */}
              <div>
                <p className="text-muted-foreground text-xs mb-1">Responsável</p>
                <Select
                  value={detailCard.responsavel_id || "nenhum"}
                  onValueChange={(v) => {
                    const newVal = v === "nenhum" ? null : v;
                    atribuirResponsavel.mutate({ cardId: detailCard.id, responsavelId: newVal });
                    setDetailCard({ ...detailCard, responsavel_id: newVal, profiles: responsaveis.find((r: any) => r.id === newVal) as any });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecionar responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Nenhum</SelectItem>
                    {responsaveis.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mover etapa */}
              <div>
                <p className="text-muted-foreground text-xs mb-1">Mover para Etapa</p>
                <Select
                  value={detailCard.etapa_id}
                  onValueChange={(v) => {
                    moverCard.mutate({ cardId: detailCard.id, etapaId: v });
                    setDetailCard({ ...detailCard, etapa_id: v });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {etapas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Criado em {new Date(detailCard.created_at).toLocaleDateString("pt-BR")} às{" "}
                {new Date(detailCard.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
