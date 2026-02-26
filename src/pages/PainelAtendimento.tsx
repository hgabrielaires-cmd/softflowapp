import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  LayoutGrid, List, Search, Clock, Building2, User, Filter,
  GripVertical, ChevronRight, FileText, Package, ArrowUpCircle,
  Wrench, GraduationCap, Layers, Play, AlertTriangle, RefreshCw, ArrowRight, CheckSquare,
  CalendarDays, ThumbsUp, ThumbsDown, Paperclip, Hash, Type, MessageSquare, Info, History, Pencil, MoreHorizontal, XCircle, PauseCircle
} from "lucide-react";
import { CHECKLIST_TIPO_LABELS } from "@/lib/supabase-types";
import type { ChecklistItem } from "@/lib/supabase-types";
import { cn } from "@/lib/utils";
import { AgendamentoChecklist } from "@/components/AgendamentoChecklist";
import { PedidoComentarios } from "@/components/PedidoComentarios";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PainelEtapa {
  id: string;
  nome: string;
  ordem: number;
  cor: string | null;
  ativo: boolean;
  controla_sla: boolean;
  prazo_maximo_horas: number | null;
  ordem_entrada: string;
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
  aponta_tecnico_agenda: boolean;
  tipo_atendimento_local: string | null;
  comentario: string | null;
  created_at: string;
  updated_at: string;
  // Joins
  clientes?: { nome_fantasia: string } | null;
  filiais?: { nome: string } | null;
  planos?: { nome: string; descricao: string | null } | null;
  contratos?: { numero_exibicao: string } | null;
  profiles?: { full_name: string } | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIPO_ICONS: Record<string, React.ReactNode> = {
  "Implantação": <Package className="h-3.5 w-3.5" />,
  "Upgrade": <ArrowUpCircle className="h-3.5 w-3.5" />,
  "Módulo Adicional": <Layers className="h-3.5 w-3.5" />,
  "Ordem de Atendimento": <FileText className="h-3.5 w-3.5" />,
  "Serviço": <Wrench className="h-3.5 w-3.5" />,
  "Treinamento": <GraduationCap className="h-3.5 w-3.5" />,
};

const TIPO_COLORS: Record<string, string> = {
  "Implantação": "bg-blue-100 text-blue-700 border-blue-200",
  "Upgrade": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Módulo Adicional": "bg-violet-100 text-violet-700 border-violet-200",
  "Ordem de Atendimento": "bg-teal-100 text-teal-700 border-teal-200",
  "Serviço": "bg-amber-100 text-amber-700 border-amber-200",
  "Treinamento": "bg-emerald-100 text-emerald-700 border-emerald-200",
};

// Colors now come from the database `cor` field in painel_etapas

// ─── Component ───────────────────────────────────────────────────────────────

export default function PainelAtendimento() {
  const { profile, roles } = useAuth();
  const { filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais } = useUserFiliais();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroFilial, setFiltroFilial] = useState<string>("_init_");
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("todos");
  const [filtroEtapa, setFiltroEtapa] = useState<string>("todos");
  const [detailCard, setDetailCard] = useState<PainelCard | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [detalhesData, setDetalhesData] = useState<any>(null);
  const [detalhesLoading, setDetalhesLoading] = useState(false);
  const [planoAnteriorNome, setPlanoAnteriorNome] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [slaEtapaJornada, setSlaEtapaJornada] = useState<number | null>(null);
  const [slaProjeto, setSlaProjeto] = useState<number | null>(null);
  const [checklistEtapa, setChecklistEtapa] = useState<any[]>([]);
  const [checklistProgresso, setChecklistProgresso] = useState<Record<string, { concluido: boolean; valor_texto?: string; valor_data?: string; concluido_por?: string; concluido_em?: string; concluido_por_nome?: string }>>({});
  const [finalizando, setFinalizando] = useState(false);
  const [, setTick] = useState(0); // force re-render for atrasado checks
  const [novoComentario, setNovoComentario] = useState("");
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState<string[]>([]);
  const [buscaTecnico, setBuscaTecnico] = useState("");
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoData, setHistoricoData] = useState<any[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [configEditMode, setConfigEditMode] = useState(false);
  // Auto-refresh atrasado status every 60s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Fetch plano anterior for Upgrade cards
  useEffect(() => {
    if (!detailCard || detailCard.tipo_operacao !== "Upgrade") {
      setPlanoAnteriorNome(null);
      return;
    }
    (async () => {
      // Get contrato_origem_id from the aditivo contract
      const { data: contrato } = await supabase
        .from("contratos")
        .select("contrato_origem_id")
        .eq("id", detailCard.contrato_id)
        .single();
      if (!contrato?.contrato_origem_id) { setPlanoAnteriorNome(null); return; }
      // Get the plan from the base contract
      const { data: base } = await supabase
        .from("contratos")
        .select("plano_id, planos:plano_id(nome)")
        .eq("id", contrato.contrato_origem_id)
        .single();
      setPlanoAnteriorNome((base?.planos as any)?.nome || null);
    })();
  }, [detailCard]);



  useEffect(() => {
    if (filtroFilial === "_init_") {
      if (isGlobal && !profile?.filial_favorita_id) {
        setFiltroFilial("todos");
      } else if (filialPadraoId) {
        setFiltroFilial(filialPadraoId);
      } else {
        setFiltroFilial("todos");
      }
    }
  }, [filialPadraoId, isGlobal, profile?.filial_favorita_id]);

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
        .select("*, clientes(nome_fantasia), filiais(nome), planos(nome, descricao), contratos(numero_exibicao), profiles(full_name)")
        .order("created_at", { ascending: true });
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

  // Fetch users marked as tecnico in profiles
  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos_painel"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, tipo_tecnico")
        .eq("active", true)
        .eq("is_tecnico", true)
        .order("full_name");
      return profiles || [];
    },
  });

  // Query user permissions for editing config after agendamento
  const { data: userPermissions = [] } = useQuery({
    queryKey: ["user_permissions_painel", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id);
      if (!userRoles || userRoles.length === 0) return [];
      const roleNames = userRoles.map(r => r.role);
      const { data } = await supabase
        .from("role_permissions")
        .select("permissao, ativo")
        .in("role", roleNames)
        .eq("ativo", true);
      return (data || []).map(p => p.permissao);
    },
    enabled: !!profile?.user_id,
  });

  const podeEditarConfigProjeto = userPermissions.includes("acao.editar_config_projeto");

  // Precompute SLA da Etapa per card (jornada-based) + total checklist items per jornada
  const { data: jornadaSlaMap = {} } = useQuery({
    queryKey: ["jornada_sla_map"],
    queryFn: async () => {
      // Fetch all active jornadas
      const { data: jornadas } = await supabase
        .from("jornadas")
        .select("id, vinculo_id")
        .eq("ativo", true)
        .eq("vinculo_tipo", "plano");
      if (!jornadas || jornadas.length === 0) return {};

      const jornadaIds = jornadas.map(j => j.id);
      const { data: jornadaEtapas } = await supabase
        .from("jornada_etapas")
        .select("id, jornada_id, nome")
        .in("jornada_id", jornadaIds);
      if (!jornadaEtapas || jornadaEtapas.length === 0) return {};

      const etapaIds = jornadaEtapas.map(e => e.id);
      const { data: atividades } = await supabase
        .from("jornada_atividades")
        .select("etapa_id, horas_estimadas, checklist")
        .in("etapa_id", etapaIds);

      // Map: jornada_id -> { etapa_nome -> total_horas }
      const result: Record<string, Record<string, number>> = {};
      // Also map plano_id -> jornada_id
      const planoJornadaMap: Record<string, string> = {};
      jornadas.forEach(j => { planoJornadaMap[j.vinculo_id] = j.id; });

      jornadaEtapas.forEach(je => {
        if (!result[je.jornada_id]) result[je.jornada_id] = {};
        const total = (atividades || [])
          .filter(a => a.etapa_id === je.id)
          .reduce((acc, a) => acc + (a.horas_estimadas || 0), 0);
        result[je.jornada_id][je.nome] = total;
      });

      // Final map: plano_id -> { etapa_nome -> horas }
      const finalMap: Record<string, Record<string, number>> = {};
      Object.entries(planoJornadaMap).forEach(([planoId, jornadaId]) => {
        finalMap[planoId] = result[jornadaId] || {};
      });
      return finalMap;
    },
  });

  // Precompute total checklist items per plano (across all jornada etapas)
  const { data: totalChecklistPorPlano = {} } = useQuery({
    queryKey: ["total_checklist_por_plano"],
    queryFn: async () => {
      const { data: jornadas } = await supabase
        .from("jornadas")
        .select("id, vinculo_id")
        .eq("ativo", true)
        .eq("vinculo_tipo", "plano");
      if (!jornadas || jornadas.length === 0) return {};

      const jornadaIds = jornadas.map(j => j.id);
      const { data: jornadaEtapas } = await supabase
        .from("jornada_etapas")
        .select("id, jornada_id")
        .in("jornada_id", jornadaIds);
      if (!jornadaEtapas || jornadaEtapas.length === 0) return {};

      const etapaIds = jornadaEtapas.map(e => e.id);
      const { data: atividades } = await supabase
        .from("jornada_atividades")
        .select("etapa_id, checklist")
        .in("etapa_id", etapaIds);

      // plano_id -> total checklist items
      const planoJornadaMap: Record<string, string> = {};
      jornadas.forEach(j => { planoJornadaMap[j.vinculo_id] = j.id; });

      const jornadaTotals: Record<string, number> = {};
      jornadaEtapas.forEach(je => {
        const atividadesEtapa = (atividades || []).filter(a => a.etapa_id === je.id);
        const count = atividadesEtapa.reduce((acc, a) => {
          const cl = Array.isArray(a.checklist) ? a.checklist : [];
          return acc + cl.length;
        }, 0);
        jornadaTotals[je.jornada_id] = (jornadaTotals[je.jornada_id] || 0) + count;
      });

      const result: Record<string, number> = {};
      Object.entries(planoJornadaMap).forEach(([planoId, jornadaId]) => {
        result[planoId] = jornadaTotals[jornadaId] || 0;
      });
      return result;
    },
  });

  // Fetch highest priority per pedido (for card display)
  const PRIORIDADE_PESO: Record<string, number> = { prioridade: 4, urgente: 3, medio: 2, normal: 1 };
  const PRIORIDADE_DISPLAY: Record<string, { label: string; emoji: string; className: string }> = {
    prioridade: { label: "Alta Prioridade", emoji: "⚡", className: "bg-purple-100 text-purple-700 border-purple-200" },
    urgente: { label: "Urgente", emoji: "🔴", className: "bg-red-100 text-red-700 border-red-200" },
    medio: { label: "Médio", emoji: "🟡", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
    normal: { label: "Normal", emoji: "🟢", className: "bg-green-100 text-green-700 border-green-200" },
  };

  const pedidoIds = useMemo(() => [...new Set(cards.map(c => c.pedido_id).filter(Boolean))], [cards]);

  const { data: pedidoPrioridadeMap = {} } = useQuery({
    queryKey: ["pedido_prioridade_map", pedidoIds.join(",")],
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

  // Fetch completed checklist items per card
  const { data: cardProgressMap = {} } = useQuery({
    queryKey: ["card_checklist_progress", cards.map(c => c.id).join(",")],
    enabled: cards.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("painel_checklist_progresso")
        .select("card_id, concluido")
        .eq("concluido", true);
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.card_id] = (counts[r.card_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch comentarios and tecnicos when card opens
  useEffect(() => {
    if (!detailCard) {
      setComentarios([]);
      setTecnicosSelecionados([]);
      setNovoComentario("");
      setBuscaTecnico("");
      return;
    }
    (async () => {
      const [{ data: coms }, { data: tecs }] = await Promise.all([
        supabase
          .from("painel_comentarios")
          .select("id, texto, criado_por, created_at")
          .eq("card_id", detailCard.id)
          .eq("etapa_id", detailCard.etapa_id)
          .order("created_at", { ascending: true }),
        supabase
          .from("painel_tecnicos")
          .select("tecnico_id")
          .eq("card_id", detailCard.id),
      ]);
      setComentarios(coms || []);
      setTecnicosSelecionados((tecs || []).map((t: any) => t.tecnico_id));
    })();
  }, [detailCard?.id]);

  // ─── Sync contratos assinados ───────────────────────────────────────────
  const syncContratosAssinados = useCallback(async () => {
    setSyncing(true);
    try {
      const cardContratoIds = cards
        .filter((c) => c.contrato_id)
        .map((c) => c.contrato_id);

      if (cardContratoIds.length === 0) {
        setSyncing(false);
        return;
      }

      const { data: zapsignRecords } = await supabase
        .from("contratos_zapsign")
        .select("contrato_id, status")
        .in("contrato_id", cardContratoIds)
        .in("status", ["Enviado", "Pendente"]);

      if (zapsignRecords && zapsignRecords.length > 0) {
        for (const rec of zapsignRecords) {
          try {
            await supabase.functions.invoke("zapsign", {
              body: { action: "status", contrato_id: rec.contrato_id },
            });
          } catch {
            // ignore
          }
        }
        queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
      }
      toast.success("Painel atualizado!");
    } catch {
      // silent
    } finally {
      setSyncing(false);
    }
  }, [cards, queryClient]);

  // Sync on first load
  const [hasSynced, setHasSynced] = useState(false);
  useEffect(() => {
    if (cards.length > 0 && !hasSynced) {
      setHasSynced(true);
      syncContratosAssinados();
    }
  }, [cards.length, hasSynced, syncContratosAssinados]);

  // Fetch SLA da Etapa + Checklist from jornada linked to the card's plano
  useEffect(() => {
    if (!detailCard || !detailCard.plano_id) {
      setSlaEtapaJornada(null);
      setSlaProjeto(null);
      setChecklistEtapa([]);
      return;
    }
    (async () => {
      // Find jornada linked to this plano
      let resolvedJornadaId = detailCard.jornada_id;
      if (!resolvedJornadaId) {
        const { data: jornada } = await supabase
          .from("jornadas")
          .select("id")
          .eq("vinculo_tipo", "plano")
          .eq("vinculo_id", detailCard.plano_id)
          .eq("ativo", true)
          .limit(1);
        if (!jornada || jornada.length === 0) {
          setSlaEtapaJornada(null);
          setSlaProjeto(null);
          setChecklistEtapa([]);
          return;
        }
        resolvedJornadaId = jornada[0].id;
      }

      // Fetch ALL jornada_etapas for SLA do Projeto (total hours)
      const { data: todasEtapasJornada } = await supabase
        .from("jornada_etapas")
        .select("id")
        .eq("jornada_id", resolvedJornadaId);

      if (todasEtapasJornada && todasEtapasJornada.length > 0) {
        const etapaIds = todasEtapasJornada.map((e) => e.id);
        const { data: todasAtividades } = await supabase
          .from("jornada_atividades")
          .select("horas_estimadas")
          .in("etapa_id", etapaIds);
        const totalProjeto = (todasAtividades || []).reduce((acc, a) => acc + (a.horas_estimadas || 0), 0);
        setSlaProjeto(totalProjeto);
      } else {
        setSlaProjeto(null);
      }

      // Find jornada_etapa matching current painel_etapa name for SLA da Etapa
      const etapaAtual = etapas.find((e) => e.id === detailCard.etapa_id);
      if (!etapaAtual) { setSlaEtapaJornada(null); setChecklistEtapa([]); return; }

      const { data: jornadaEtapa } = await supabase
        .from("jornada_etapas")
        .select("id")
        .eq("jornada_id", resolvedJornadaId)
        .eq("nome", etapaAtual.nome)
        .limit(1);

      if (!jornadaEtapa || jornadaEtapa.length === 0) {
        setSlaEtapaJornada(null);
        setChecklistEtapa([]);
        return;
      }

      // Fetch activities for SLA da Etapa + checklist
      const { data: atividades } = await supabase
        .from("jornada_atividades")
        .select("id, nome, horas_estimadas, checklist")
        .eq("etapa_id", jornadaEtapa[0].id)
        .order("ordem");

      const totalEtapa = (atividades || []).reduce((acc, a) => acc + (a.horas_estimadas || 0), 0);
      setSlaEtapaJornada(totalEtapa);
      setChecklistEtapa(atividades || []);

      // Fetch existing progress for this card
      const { data: progresso } = await supabase
        .from("painel_checklist_progresso")
        .select("atividade_id, checklist_index, concluido, valor_texto, valor_data, concluido_por, concluido_em")
        .eq("card_id", detailCard.id);

      // Fetch profile names for concluido_por
      const userIds = [...new Set((progresso || []).map((p: any) => p.concluido_por).filter(Boolean))];
      let profileMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", userIds);
        (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
      }

      const progressoMap: Record<string, { concluido: boolean; valor_texto?: string; valor_data?: string; concluido_por?: string; concluido_em?: string; concluido_por_nome?: string }> = {};
      (progresso || []).forEach((p: any) => {
        progressoMap[`${p.atividade_id}_${p.checklist_index}`] = {
          concluido: p.concluido,
          valor_texto: p.valor_texto || undefined,
          valor_data: p.valor_data || undefined,
          concluido_por: p.concluido_por || undefined,
          concluido_em: p.concluido_em || undefined,
          concluido_por_nome: p.concluido_por ? profileMap[p.concluido_por] : undefined,
        };
      });
      setChecklistProgresso(progressoMap);
    })();
  }, [detailCard, etapas]);

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
      // Ao iniciar, o usuário se torna responsável pelo card
      const { data: prof } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      const { error } = await supabase
        .from("painel_atendimento")
        .update({
          iniciado_em: new Date().toISOString(),
          iniciado_por: user.id,
          responsavel_id: prof?.id || null,
        })
        .eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
      toast.success("Atendimento iniciado! Você é o responsável.");
    },
    onError: () => toast.error("Erro ao iniciar atendimento."),
  });

  // ─── Toggle checklist item ─────────────────────────────────────────────
  async function saveChecklistItem(
    atividadeId: string, checklistIndex: number,
    updates: { concluido?: boolean; valor_texto?: string; valor_data?: string }
  ) {
    if (!detailCard) return;
    const key = `${atividadeId}_${checklistIndex}`;
    const prev = checklistProgresso[key] || { concluido: false };
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();

    // Get current user's name for immediate display
    let userName = prev.concluido_por_nome;
    if (user && !userName) {
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single();
      userName = prof?.full_name || undefined;
    }

    const newVal = {
      ...prev,
      ...updates,
      concluido_por: updates.concluido ? user?.id : prev.concluido_por,
      concluido_em: updates.concluido ? now : (updates.concluido === false ? undefined : prev.concluido_em),
      concluido_por_nome: updates.concluido ? userName : (updates.concluido === false ? undefined : prev.concluido_por_nome),
    };
    setChecklistProgresso((p) => ({ ...p, [key]: newVal }));

    const { error } = await supabase
      .from("painel_checklist_progresso")
      .upsert({
        card_id: detailCard.id,
        atividade_id: atividadeId,
        checklist_index: checklistIndex,
        concluido: newVal.concluido,
        valor_texto: newVal.valor_texto || null,
        valor_data: newVal.valor_data || null,
        concluido_por: user?.id || null,
        concluido_em: newVal.concluido ? now : null,
      }, { onConflict: "card_id,atividade_id,checklist_index" });

    if (error) {
      toast.error("Erro ao salvar checklist.");
      setChecklistProgresso((p) => ({ ...p, [key]: prev }));
    } else {
      queryClient.invalidateQueries({ queryKey: ["card_checklist_progress"] });
    }
  }

  async function fetchDetalhes(card: PainelCard) {
    setDetalhesLoading(true);
    setDetalhesOpen(true);
    try {
      // 1. Pedido info
      let pedidoInfo: any = null;
      if (card.pedido_id) {
        const { data: ped } = await supabase
          .from("pedidos")
          .select("numero_exibicao, created_at, vendedor_id, tipo_pedido, modulos_adicionais, servicos_pedido, tipo_atendimento")
          .eq("id", card.pedido_id)
          .single();
        if (ped) {
          // Get vendedor name
          const { data: vendProf } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", ped.vendedor_id)
            .single();
          pedidoInfo = { ...ped, vendedor_nome: vendProf?.full_name || "—" };
        }
      }

      // 2. Contrato info
      let contratoInfo: any = null;
      if (card.contrato_id) {
        const { data: contr } = await supabase
          .from("contratos")
          .select("numero_exibicao, status, tipo, created_at")
          .eq("id", card.contrato_id)
          .single();
        contratoInfo = contr;
        // Check ZapSign signature
        const { data: zap } = await supabase
          .from("contratos_zapsign")
          .select("updated_at, status")
          .eq("contrato_id", card.contrato_id)
          .maybeSingle();
        if (contratoInfo) {
          contratoInfo.assinado = zap?.status === "Assinado";
          contratoInfo.dataAssinatura = zap?.status === "Assinado" ? zap.updated_at : null;
          contratoInfo.statusZapsign = zap?.status || null;
        }
      }

      // 3. Dados da empresa (cliente)
      let clienteInfo: any = null;
      const { data: cli } = await supabase
        .from("clientes")
        .select("nome_fantasia, razao_social, cnpj_cpf, telefone, email, cidade, uf, logradouro, numero, bairro, complemento, cep")
        .eq("id", card.cliente_id)
        .single();
      clienteInfo = cli;

      // 4. Contatos do cliente
      const { data: contatos } = await supabase
        .from("cliente_contatos")
        .select("nome, email, telefone, cargo, decisor")
        .eq("cliente_id", card.cliente_id)
        .eq("ativo", true)
        .order("decisor", { ascending: false });

      // 5. Módulos do plano + descrição do plano
      let modulosPlano: string[] = [];
      let planoNome: string | null = card.planos?.nome || null;
      let planoDescricao: string | null = card.planos?.descricao || null;
      if (card.plano_id) {
        const { data: mods } = await supabase
          .from("plano_modulos")
          .select("modulo_id, modulos(nome)")
          .eq("plano_id", card.plano_id)
          .eq("incluso_no_plano", true)
          .order("ordem");
        modulosPlano = (mods || []).map((m: any) => m.modulos?.nome).filter(Boolean);
        // If description not loaded from join, fetch it
        if (!planoDescricao) {
          const { data: planoData } = await supabase
            .from("planos")
            .select("descricao")
            .eq("id", card.plano_id)
            .single();
          planoDescricao = planoData?.descricao || null;
        }
      }

      // 6. Módulos adicionais (do pedido) - com quantidade
      let modulosAdicionais: { nome: string; quantidade: number }[] = [];
      if (pedidoInfo?.modulos_adicionais) {
        const modsAd = Array.isArray(pedidoInfo.modulos_adicionais) ? pedidoInfo.modulos_adicionais : [];
        if (modsAd.length > 0) {
          const modIds = modsAd.map((m: any) => m.modulo_id).filter(Boolean);
          if (modIds.length > 0) {
            const { data: modNames } = await supabase
              .from("modulos")
              .select("id, nome")
              .in("id", modIds);
            const nameMap: Record<string, string> = {};
            (modNames || []).forEach((m: any) => { nameMap[m.id] = m.nome; });
            modulosAdicionais = modsAd
              .filter((m: any) => nameMap[m.modulo_id])
              .map((m: any) => ({ nome: nameMap[m.modulo_id], quantidade: m.quantidade || 1 }));
          }
        }
      }

      // 7. Serviços (OA)
      let servicosOA: any[] = [];
      if (pedidoInfo?.servicos_pedido) {
        servicosOA = Array.isArray(pedidoInfo.servicos_pedido) ? pedidoInfo.servicos_pedido : [];
      }

      // 8. Observações técnicas
      const { data: obs } = await supabase
        .from("painel_comentarios")
        .select("texto, created_at, criado_por, profiles:criado_por(full_name)")
        .eq("card_id", card.id)
        .order("created_at", { ascending: false });

      setDetalhesData({
        pedidoInfo,
        contratoInfo,
        clienteInfo,
        contatos: contatos || [],
        planoNome,
        planoDescricao,
        modulosPlano,
        modulosAdicionais,
        servicosOA,
        obsCard: card.observacoes,
        observacoes: obs || [],
        tipoOperacao: card.tipo_operacao,
      });
    } catch {
      toast.error("Erro ao carregar detalhes.");
    } finally {
      setDetalhesLoading(false);
    }
  }

  // ─── Fetch Histórico de Etapas Anteriores ─────────────────────────────
  async function fetchHistorico(card: PainelCard) {
    setHistoricoLoading(true);
    setHistoricoOpen(true);
    try {
      // 1. Get completed stage history (saida_em IS NOT NULL)
      const { data: historico } = await supabase
        .from("painel_historico_etapas")
        .select("id, etapa_id, etapa_nome, entrada_em, saida_em, sla_previsto_horas, tempo_real_horas, sla_cumprido")
        .eq("card_id", card.id)
        .not("saida_em", "is", null)
        .order("entrada_em", { ascending: true });

      if (!historico || historico.length === 0) {
        setHistoricoData([]);
        setHistoricoLoading(false);
        return;
      }

      // 2. For each historical stage, get checklist + comments
      let resolvedJornadaId = card.jornada_id;
      if (!resolvedJornadaId && card.plano_id) {
        const { data: jornada } = await supabase
          .from("jornadas")
          .select("id")
          .eq("vinculo_tipo", "plano")
          .eq("vinculo_id", card.plano_id)
          .eq("ativo", true)
          .limit(1);
        resolvedJornadaId = jornada?.[0]?.id || null;
      }

      const result: any[] = [];

      for (const h of historico) {
        // Get checklist activities for this stage
        let atividades: any[] = [];
        let progressoMap: Record<string, any> = {};

        if (resolvedJornadaId) {
          const { data: jornadaEtapa } = await supabase
            .from("jornada_etapas")
            .select("id")
            .eq("jornada_id", resolvedJornadaId)
            .eq("nome", h.etapa_nome)
            .limit(1);

          if (jornadaEtapa && jornadaEtapa.length > 0) {
            const { data: atv } = await supabase
              .from("jornada_atividades")
              .select("id, nome, horas_estimadas, checklist")
              .eq("etapa_id", jornadaEtapa[0].id)
              .order("ordem");
            atividades = atv || [];

            // Get progress
            const { data: progresso } = await supabase
              .from("painel_checklist_progresso")
              .select("atividade_id, checklist_index, concluido, valor_texto, valor_data, concluido_por, concluido_em")
              .eq("card_id", card.id);

            // Get profile names
            const userIds = [...new Set((progresso || []).map((p: any) => p.concluido_por).filter(Boolean))];
            let profileMap: Record<string, string> = {};
            if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from("profiles")
                .select("user_id, full_name")
                .in("user_id", userIds);
              (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
            }

            (progresso || []).forEach((p: any) => {
              progressoMap[`${p.atividade_id}_${p.checklist_index}`] = {
                concluido: p.concluido,
                valor_texto: p.valor_texto || undefined,
                concluido_por_nome: p.concluido_por ? profileMap[p.concluido_por] : undefined,
                concluido_em: p.concluido_em || undefined,
              };
            });
          }
        }

        // Get comments for this stage (by etapa_id or by date range)
        let stageComments: any[] = [];
        const { data: comsByEtapa } = await supabase
          .from("painel_comentarios")
          .select("id, texto, criado_por, created_at")
          .eq("card_id", card.id)
          .eq("etapa_id", h.etapa_id)
          .order("created_at", { ascending: true });

        if (comsByEtapa && comsByEtapa.length > 0) {
          stageComments = comsByEtapa;
        } else if (h.entrada_em && h.saida_em) {
          // Fallback: match by date range for old comments without etapa_id
          const { data: comsByDate } = await supabase
            .from("painel_comentarios")
            .select("id, texto, criado_por, created_at")
            .eq("card_id", card.id)
            .is("etapa_id", null)
            .gte("created_at", h.entrada_em)
            .lte("created_at", h.saida_em)
            .order("created_at", { ascending: true });
          stageComments = comsByDate || [];
        }

        result.push({
          etapa_nome: h.etapa_nome,
          entrada_em: h.entrada_em,
          saida_em: h.saida_em,
          sla_previsto_horas: (h as any).sla_previsto_horas,
          tempo_real_horas: (h as any).tempo_real_horas,
          sla_cumprido: (h as any).sla_cumprido,
          atividades,
          progressoMap,
          comentarios: stageComments,
        });
      }

      setHistoricoData(result);
    } catch {
      toast.error("Erro ao carregar histórico.");
    } finally {
      setHistoricoLoading(false);
    }
  }

  async function registrarEntradaEtapa(cardId: string, etapaId: string, etapaNome: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("painel_historico_etapas").insert({
      card_id: cardId,
      etapa_id: etapaId,
      etapa_nome: etapaNome,
      entrada_em: new Date().toISOString(),
      usuario_id: user?.id || null,
    });
  }

  async function registrarSaidaEtapa(cardId: string, etapaId: string, slaPrevisto?: number | null) {
    // Find the open record (saida_em IS NULL) for this card+etapa
    const { data } = await supabase
      .from("painel_historico_etapas")
      .select("id, entrada_em")
      .eq("card_id", cardId)
      .eq("etapa_id", etapaId)
      .is("saida_em", null)
      .order("entrada_em", { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      const now = new Date();
      const entrada = new Date(data[0].entrada_em);
      const tempoRealHoras = (now.getTime() - entrada.getTime()) / (1000 * 60 * 60);
      const tempoReal = Math.round(tempoRealHoras * 100) / 100;
      const slaCumprido = slaPrevisto != null && slaPrevisto > 0 ? tempoReal <= slaPrevisto : null;
      await supabase
        .from("painel_historico_etapas")
        .update({
          saida_em: now.toISOString(),
          sla_previsto_horas: slaPrevisto ?? null,
          tempo_real_horas: tempoReal,
          sla_cumprido: slaCumprido,
        })
        .eq("id", data[0].id);
    }
  }

  // Ensure current stage has a history entry (on card open)
  useEffect(() => {
    if (!detailCard) return;
    (async () => {
      const etapa = etapas.find((e) => e.id === detailCard.etapa_id);
      if (!etapa) return;
      // Check if there's already an open entry for this card+etapa
      const { data } = await supabase
        .from("painel_historico_etapas")
        .select("id")
        .eq("card_id", detailCard.id)
        .eq("etapa_id", detailCard.etapa_id)
        .is("saida_em", null)
        .limit(1);
      if (!data || data.length === 0) {
        // Create entry with card's updated_at as entrance time (approximation)
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("painel_historico_etapas").insert({
          card_id: detailCard.id,
          etapa_id: detailCard.etapa_id,
          etapa_nome: etapa.nome,
          entrada_em: detailCard.updated_at,
          usuario_id: user?.id || null,
        });
      }
    })();
  }, [detailCard?.id, detailCard?.etapa_id, etapas]);

  // ─── Tempo na etapa (para exibir no card) ───────────────────────────
  function getTempoNaEtapa(card: PainelCard): string {
    // Use updated_at as proxy for when card entered current stage
    const entrada = new Date(card.updated_at).getTime();
    const agora = Date.now();
    const diffMs = agora - entrada;
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const horas = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (dias > 0) return `${dias}d ${horas}h`;
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
  }

  // ─── Finalizar etapa ──────────────────────────────────────────────────
  async function finalizarEtapa() {
    if (!detailCard) return;
    setFinalizando(true);
    try {
      const etapaAtualIdx = etapas.findIndex((e) => e.id === detailCard.etapa_id);
      const proximaEtapa = etapas[etapaAtualIdx + 1];
      if (!proximaEtapa) {
        toast.error("Não há próxima etapa configurada.");
        return;
      }
      // Register exit from current stage
      await registrarSaidaEtapa(detailCard.id, detailCard.etapa_id, slaEtapaJornada);
      // Register entry into next stage
      await registrarEntradaEtapa(detailCard.id, proximaEtapa.id, proximaEtapa.nome);
      // Reset iniciado_em for new stage
      const { error } = await supabase
        .from("painel_atendimento")
        .update({ etapa_id: proximaEtapa.id, iniciado_em: null, iniciado_por: null })
        .eq("id", detailCard.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
      toast.success(`Avançado para etapa: ${proximaEtapa.nome}`);
      setDetailCard(null);
    } catch {
      toast.error("Erro ao finalizar etapa.");
    } finally {
      setFinalizando(false);
    }
  }

  // ─── Check if all checklist items completed ───────────────────────────
  function isChecklistCompleto(): boolean {
    if (checklistEtapa.length === 0) return true;
    let totalItens = 0;
    let totalConcluidos = 0;
    checklistEtapa.forEach((atividade: any) => {
      const items = Array.isArray(atividade.checklist) ? atividade.checklist : [];
      items.forEach((_: any, idx: number) => {
        totalItens++;
        const prog = checklistProgresso[`${atividade.id}_${idx}`];
        if (prog?.concluido) totalConcluidos++;
      });
    });
    return totalItens > 0 && totalConcluidos === totalItens;
  }

  // ─── SLA inicio check ──────────────────────────────────────────────────

  function isInicioAtrasado(card: PainelCard): boolean {
    if (card.iniciado_em) return false;
    const etapa = etapas.find((e) => e.id === card.etapa_id);
    if (!etapa?.controla_sla || !etapa.prazo_maximo_horas) return false;
    const criado = new Date(card.created_at).getTime();
    const agora = Date.now();
    const diffHoras = (agora - criado) / (1000 * 60 * 60);
    return diffHoras > etapa.prazo_maximo_horas;
  }

  function getTempoRestante(card: PainelCard): string | null {
    if (card.iniciado_em) return null;
    const etapa = etapas.find((e) => e.id === card.etapa_id);
    if (!etapa?.controla_sla || !etapa.prazo_maximo_horas) return null;
    const criado = new Date(card.created_at).getTime();
    const limite = criado + etapa.prazo_maximo_horas * 60 * 60 * 1000;
    const restanteMs = limite - Date.now();
    if (restanteMs <= 0) return null; // já atrasou
    const horas = Math.floor(restanteMs / (1000 * 60 * 60));
    const minutos = Math.floor((restanteMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${horas}:${String(minutos).padStart(2, "0")}`;
  }

  function getTempoAtraso(card: PainelCard): string | null {
    if (card.iniciado_em) return null;
    const etapa = etapas.find((e) => e.id === card.etapa_id);
    if (!etapa?.controla_sla || !etapa.prazo_maximo_horas) return null;
    const criado = new Date(card.created_at).getTime();
    const limite = criado + etapa.prazo_maximo_horas * 60 * 60 * 1000;
    const atrasoMs = Date.now() - limite;
    if (atrasoMs <= 0) return null;
    const dias = Math.floor(atrasoMs / (1000 * 60 * 60 * 24));
    const horas = Math.floor((atrasoMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((atrasoMs % (1000 * 60 * 60)) / (1000 * 60));
    if (dias > 0) return `${dias}d ${horas}h`;
    return `${horas}:${String(minutos).padStart(2, "0")}h`;
  }

  // ─── SLA da Etapa (jornada-based) for kanban cards ──────────────────────
  function getSlaEtapaForCard(card: PainelCard): number | null {
    if (!card.plano_id) return null;
    const planoMap = jornadaSlaMap[card.plano_id];
    if (!planoMap) return null;
    const etapa = etapas.find((e) => e.id === card.etapa_id);
    if (!etapa) return null;
    return planoMap[etapa.nome] ?? null;
  }

  function isEtapaSlaAtrasado(card: PainelCard): boolean {
    if (!card.iniciado_em) return false;
    const sla = getSlaEtapaForCard(card);
    if (!sla || sla <= 0) return false;
    const inicio = new Date(card.iniciado_em).getTime();
    return Date.now() > inicio + sla * 60 * 60 * 1000;
  }

  function getVencimentoSla(iniciado_em: string | null, sla: number | null): Date | null {
    if (!iniciado_em || !sla || sla <= 0) return null;
    return new Date(new Date(iniciado_em).getTime() + sla * 60 * 60 * 1000);
  }

  function getTempoExcedidoSla(card: PainelCard): string | null {
    if (!card.iniciado_em) return null;
    const sla = getSlaEtapaForCard(card);
    if (!sla || sla <= 0) return null;
    const inicio = new Date(card.iniciado_em).getTime();
    const atrasoMs = Date.now() - (inicio + sla * 60 * 60 * 1000);
    if (atrasoMs <= 0) return null;
    const dias = Math.floor(atrasoMs / (1000 * 60 * 60 * 24));
    const horas = Math.floor((atrasoMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutos = Math.floor((atrasoMs % (1000 * 60 * 60)) / (1000 * 60));
    if (dias > 0) return `${dias}d ${horas}h`;
    if (horas > 0) return `${horas}h ${minutos}m`;
    return `${minutos}m`;
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
        const etapaDestino = etapas.find((e) => e.id === etapaId);
        if (etapaDestino?.nome === "Em Execução") {
          const etapaAtual = etapas.find((e) => e.id === card.etapa_id);
          if (etapaAtual && etapaAtual.ordem < 2) {
            toast.error("Complete as etapas obrigatórias antes de mover para 'Em Execução'.");
            setDragCardId(null);
            return;
          }
        }
        // Record history on drag
        (async () => {
          const dragSla = getSlaEtapaForCard(card);
          await registrarSaidaEtapa(card.id, card.etapa_id, dragSla);
          if (etapaDestino) await registrarEntradaEtapa(card.id, etapaId, etapaDestino.nome);
        })();
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

  // ─── Progress calculation (real checklist-based) ──────────────────────

  function calcProgress(card: PainelCard): number {
    if (!card.plano_id) return 0;
    const total = totalChecklistPorPlano[card.plano_id] || 0;
    if (total === 0) return 0;
    const concluidos = cardProgressMap[card.id] || 0;
    return Math.min(100, Math.round((concluidos / total) * 100));
  }

  // ─── Unique operation types ──────────────────────────────────────────────

  const tiposUnicos = ["Implantação", "Upgrade", "Módulo Adicional", "Ordem de Atendimento", "Serviço"];

  // ─── Card component ─────────────────────────────────────────────────────

  function KanbanCard({ card }: { card: PainelCard }) {
    const progress = calcProgress(card);
    const etapa = etapas.find((e) => e.id === card.etapa_id);

    return (
      <div
        draggable
        onDragStart={() => handleDragStart(card.id)}
        onClick={() => setDetailCard(card)}
        className="bg-card rounded-lg border border-border/50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.12)] cursor-pointer hover:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.18)] transition-all duration-150 border-t-[3px]"
        style={{ borderTopColor: etapa?.cor || 'hsl(var(--muted))' }}
      >
        <div className="p-3 space-y-2.5">
          {/* Header + Progress */}
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground leading-tight truncate flex-1">
                {card.clientes?.nome_fantasia || "Cliente"}
              </p>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                {card.contratos?.numero_exibicao}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Progress value={progress} className="h-1.5 flex-1" />
              <span className="text-[10px] font-semibold text-muted-foreground shrink-0">{progress}%</span>
            </div>
          </div>

          {/* Status tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isInicioAtrasado(card) && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Atrasada {getTempoAtraso(card)}
              </Badge>
            )}
            {isEtapaSlaAtrasado(card) && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                <Clock className="h-2.5 w-2.5" />
                SLA Atrasado {getTempoExcedidoSla(card)}
              </Badge>
            )}
            {card.iniciado_em && !isEtapaSlaAtrasado(card) && (
              <Badge className="text-[10px] px-1.5 py-0 gap-1 bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                <Play className="h-2.5 w-2.5" />
                Em andamento
              </Badge>
            )}
            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1", TIPO_COLORS[card.tipo_operacao] || "")}>
              {TIPO_ICONS[card.tipo_operacao]}
              {card.tipo_operacao}
            </Badge>
            {/* Priority from pedido comments */}
            {(() => {
              const pri = card.pedido_id ? pedidoPrioridadeMap[card.pedido_id] : null;
              if (!pri || pri === "normal") return null;
              const display = PRIORIDADE_DISPLAY[pri];
              if (!display) return null;
              return (
                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 gap-1", display.className)}>
                  {display.emoji} {display.label}
                </Badge>
              );
            })()}
          </div>

          {/* Info row */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {card.filiais?.nome || "—"}
            </span>
          </div>

          {/* Countdown SLA */}
          {(() => {
            const tempo = getTempoRestante(card);
            return tempo ? (
              <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                <Clock className="h-2.5 w-2.5" />
                Vence em {tempo}h
              </div>
            ) : null;
          })()}

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
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground" title="Tempo nesta etapa">
                <Clock className="h-3 w-3" />
                {getTempoNaEtapa(card)}
              </div>
            </div>
          </div>
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
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              onClick={() => syncContratosAssinados()}
              disabled={syncing}
              title="Atualizar status dos contratos"
            >
              <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
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
              {isGlobal && <SelectItem value="todos">Todas as filiais</SelectItem>}
              {(filiaisDoUsuario.length > 0 ? filiaisDoUsuario : todasFiliais).map((f) => (
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
              const etapaCards = filtered
                .filter((c) => c.etapa_id === etapa.id)
                .sort((a, b) => {
                  const dateA = new Date(a.created_at).getTime();
                  const dateB = new Date(b.created_at).getTime();
                  return etapa.ordem_entrada === "ultimo_acima" ? dateB - dateA : dateA - dateB;
                });
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
      <Dialog open={!!detailCard} onOpenChange={(open) => { if (!open) { setDetailCard(null); setConfigEditMode(false); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailCard && TIPO_ICONS[detailCard.tipo_operacao]}
              {detailCard?.clientes?.nome_fantasia || "Detalhes"}
            </DialogTitle>
          </DialogHeader>
          {detailCard && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Botão Iniciar / Em Andamento + Progresso do Projeto - no topo */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {detailCard.iniciado_em ? (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      disabled
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Em andamento
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        iniciarAtendimento.mutate(detailCard.id);
                        setDetailCard({ ...detailCard, iniciado_em: new Date().toISOString() });
                      }}
                      disabled={iniciarAtendimento.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {iniciarAtendimento.isPending ? "Iniciando..." : "Iniciar Etapa"}
                    </Button>
                  )}
                  {detailCard.iniciado_em && (
                    <span className="text-xs text-muted-foreground">
                      Iniciado em {new Date(detailCard.iniciado_em).toLocaleDateString("pt-BR")} às{" "}
                      {new Date(detailCard.iniciado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                  {!detailCard.iniciado_em && isInicioAtrasado(detailCard) && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Tarefa Atrasada
                    </Badge>
                  )}
                  {!detailCard.iniciado_em && (() => {
                    const tempo = getTempoRestante(detailCard);
                    return tempo ? (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <Clock className="h-3 w-3" />
                        Vence em {tempo}h
                      </span>
                    ) : null;
                  })()}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Progresso do Projeto</p>
                  <div className="flex items-center gap-2">
                    <Progress value={calcProgress(detailCard)} className="h-2 flex-1" />
                    <span className="text-sm font-medium">{calcProgress(detailCard)}%</span>
                  </div>
                </div>
              </div>

              {/* Cabeçalho de informações do card */}
              <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <div className="flex items-center gap-1 font-medium">
                    {TIPO_ICONS[detailCard.tipo_operacao]}
                    <Badge variant="outline" className={cn("text-[10px]", TIPO_COLORS[detailCard.tipo_operacao])}>
                      {detailCard.tipo_operacao}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">Contrato</p>
                  <p className="font-medium">{detailCard.contratos?.numero_exibicao || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Filial</p>
                  <p className="font-medium flex items-center gap-1"><Building2 className="h-3 w-3" />{detailCard.filiais?.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">SLA Etapa</p>
                  <p className="font-medium">{formatSLA(slaEtapaJornada || 0)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">SLA Projeto</p>
                  <p className="font-medium">{formatSLA(slaProjeto || 0)}</p>
                </div>
                {detailCard.iniciado_em && slaEtapaJornada && slaEtapaJornada > 0 && (
                  <div>
                    <p className="text-muted-foreground">Vencimento SLA</p>
                    {(() => {
                      const venc = getVencimentoSla(detailCard.iniciado_em, slaEtapaJornada);
                      const atrasado = isEtapaSlaAtrasado(detailCard);
                      const tempoExcedido = getTempoExcedidoSla(detailCard);
                      return venc ? (
                        <div>
                          <p className={cn("font-medium", atrasado && "text-destructive")}>
                            {venc.toLocaleDateString("pt-BR")} {venc.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {atrasado && tempoExcedido && (
                            <Badge variant="destructive" className="text-[10px] mt-0.5 gap-1">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              SLA Atrasado: {tempoExcedido}
                            </Badge>
                          )}
                        </div>
                      ) : <p className="font-medium">—</p>;
                    })()}
                  </div>
                )}
                {detailCard.profiles?.full_name && (
                  <div>
                    <p className="text-muted-foreground">Responsável</p>
                    <p className="font-medium flex items-center gap-1"><User className="h-3 w-3" />{detailCard.profiles.full_name}</p>
                  </div>
                )}
                {detailCard.tipo_atendimento_local && (
                  <div>
                    <p className="text-muted-foreground">Atendimento</p>
                    <p className="font-medium">{detailCard.tipo_atendimento_local}</p>
                  </div>
                )}
                {detailCard.tipo_operacao === "Upgrade" && planoAnteriorNome && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Plano</p>
                    <p className="font-medium flex items-center gap-1">
                      {planoAnteriorNome} <ArrowRight className="h-3 w-3" /> {detailCard.planos?.nome || "—"}
                    </p>
                  </div>
                )}
                {detailCard.tipo_operacao !== "Upgrade" && detailCard.planos?.nome && (
                  <div>
                    <p className="text-muted-foreground">Plano</p>
                    <p className="font-medium">{detailCard.planos.nome}</p>
                  </div>
                )}
              </div>

              {/* Checklist da Etapa (da Jornada) - Interativo */}
              {checklistEtapa.length > 0 && (() => {
                const totalItens = checklistEtapa.reduce((acc: number, a: any) => acc + (Array.isArray(a.checklist) ? a.checklist.length : 0), 0);
                const totalConcluidos = checklistEtapa.reduce((acc: number, a: any) => {
                  const items = Array.isArray(a.checklist) ? a.checklist : [];
                  return acc + items.filter((_: any, idx: number) => checklistProgresso[`${a.id}_${idx}`]?.concluido).length;
                }, 0);
                const checklistPercent = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
                const isCongelado = !detailCard.iniciado_em;
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold flex items-center gap-1">
                        <CheckSquare className="h-3.5 w-3.5" />
                        Checklist da Etapa ({totalConcluidos}/{totalItens})
                      </p>
                      <div className="flex items-center gap-2">
                        {totalItens > 0 && (
                          <Progress value={checklistPercent} className="h-1.5 w-20" />
                        )}
                        <span className="text-[10px] font-semibold text-muted-foreground">{checklistPercent}%</span>
                      </div>
                    </div>
                    {isCongelado && (
                      <p className="text-[10px] text-amber-600 mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Clique em "Iniciar" para liberar o checklist
                      </p>
                    )}
                    <div className="space-y-3">
                      {checklistEtapa.map((atividade: any, aIdx: number) => {
                        const items = Array.isArray(atividade.checklist) ? atividade.checklist : [];
                        if (items.length === 0) return null;
                        return (
                          <div key={aIdx}>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">{atividade.nome} <span className="text-[10px]">({formatSLA(atividade.horas_estimadas)})</span></p>
                            <ul className="space-y-2 pl-1">
                              {items.map((item: any, cIdx: number) => {
                                const key = `${atividade.id}_${cIdx}`;
                                const prog = checklistProgresso[key] || { concluido: false };
                                const tipo = (item as ChecklistItem).tipo || 'check';
                                return (
                                  <li key={cIdx} className="flex flex-col gap-1.5 text-xs border-b border-border/40 pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                      <span className={cn("flex-1", prog.concluido && "line-through text-muted-foreground")}>{item.texto || "(sem texto)"}</span>
                                    </div>

                                    {/* Quem executou e quando */}
                                    {prog.concluido && prog.concluido_por_nome && (
                                      <div className="flex items-center gap-1.5 pl-1 text-[10px] text-muted-foreground">
                                        <User className="h-2.5 w-2.5" />
                                        <span>{prog.concluido_por_nome}</span>
                                        {prog.concluido_em && (
                                          <>
                                            <span>·</span>
                                            <span>{new Date(prog.concluido_em).toLocaleDateString("pt-BR")} {new Date(prog.concluido_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                          </>
                                        )}
                                      </div>
                                    )}

                                    {/* Type-specific inputs */}
                                    {tipo === 'check' && (
                                      <div className="pl-1">
                                        <Checkbox
                                          checked={prog.concluido}
                                          disabled={isCongelado}
                                          onCheckedChange={() => saveChecklistItem(atividade.id, cIdx, { concluido: !prog.concluido })}
                                          className="h-4 w-4"
                                        />
                                      </div>
                                    )}

                                    {tipo === 'sim_nao' && (
                                      <div className="flex gap-1.5 pl-1">
                                        <Button
                                          size="sm"
                                          variant={prog.valor_texto === 'sim' ? 'default' : 'outline'}
                                          className={cn("h-7 text-[11px] px-3", prog.valor_texto === 'sim' && "bg-emerald-600 hover:bg-emerald-700")}
                                          disabled={isCongelado}
                                          onClick={() => saveChecklistItem(atividade.id, cIdx, { concluido: true, valor_texto: 'sim' })}
                                        >
                                          <ThumbsUp className="h-3 w-3 mr-1" /> Sim
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={prog.valor_texto === 'nao' ? 'default' : 'outline'}
                                          className={cn("h-7 text-[11px] px-3", prog.valor_texto === 'nao' && "bg-red-600 hover:bg-red-700")}
                                          disabled={isCongelado}
                                          onClick={() => saveChecklistItem(atividade.id, cIdx, { concluido: true, valor_texto: 'nao' })}
                                        >
                                          <ThumbsDown className="h-3 w-3 mr-1" /> Não
                                        </Button>
                                      </div>
                                    )}

                                    {tipo === 'agendamento' && detailCard && (
                                      <AgendamentoChecklist
                                        cardId={detailCard.id}
                                        atividadeId={atividade.id}
                                        checklistIndex={cIdx}
                                        disabled={isCongelado}
                                        onUpdate={(has) => {
                                          setChecklistProgresso((p) => ({
                                            ...p,
                                            [key]: { ...p[key], concluido: has },
                                          }));
                                        }}
                                      />
                                    )}

                                    {tipo === 'texto' && (
                                      <div className="pl-1">
                                        <Input
                                          className="h-7 text-xs"
                                          placeholder="Digite aqui..."
                                          disabled={isCongelado}
                                          value={prog.valor_texto || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setChecklistProgresso((p) => ({ ...p, [key]: { ...prog, valor_texto: val, concluido: !!val } }));
                                          }}
                                          onBlur={(e) => {
                                            saveChecklistItem(atividade.id, cIdx, { concluido: !!e.target.value, valor_texto: e.target.value });
                                          }}
                                        />
                                      </div>
                                    )}

                                    {tipo === 'quantitativo' && (
                                      <div className="pl-1">
                                        <Input
                                          type="number"
                                          className="h-7 text-xs w-28"
                                          placeholder="Qtd"
                                          disabled={isCongelado}
                                          value={prog.valor_texto || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setChecklistProgresso((p) => ({ ...p, [key]: { ...prog, valor_texto: val, concluido: !!val } }));
                                          }}
                                          onBlur={(e) => {
                                            saveChecklistItem(atividade.id, cIdx, { concluido: !!e.target.value, valor_texto: e.target.value });
                                          }}
                                        />
                                      </div>
                                    )}

                                    {tipo === 'anexo' && (
                                      <div className="pl-1">
                                        <Button
                                          size="sm"
                                          variant={prog.concluido ? 'default' : 'outline'}
                                          className="h-7 text-[11px]"
                                          disabled={isCongelado}
                                          onClick={() => saveChecklistItem(atividade.id, cIdx, { concluido: !prog.concluido })}
                                        >
                                          <Paperclip className="h-3 w-3 mr-1" />
                                          {prog.concluido ? "Anexado ✓" : "Marcar como Anexado"}
                                        </Button>
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Controles do Projeto (persistem entre etapas) */}
              {(() => {
                const etapaAtual = etapas.find(e => e.id === detailCard.etapa_id);
                const isEtapaAgendamento = etapaAtual?.ordem === 1; // Agendamento é ordem 1
                const configLocked = !isEtapaAgendamento && !configEditMode;

                return (
              <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configurações do Projeto</p>
                  {!isEtapaAgendamento && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => {
                        if (!configEditMode) {
                          if (!podeEditarConfigProjeto) {
                            toast.error("Você não tem permissão para editar configurações do projeto");
                            return;
                          }
                          setConfigEditMode(true);
                        } else {
                          setConfigEditMode(false);
                        }
                      }}
                      title={configLocked ? "Editar configurações" : "Bloquear configurações"}
                    >
                      <Pencil className={cn("h-3.5 w-3.5", configEditMode ? "text-primary" : "text-muted-foreground")} />
                    </Button>
                  )}
                </div>

                {configLocked && (
                  <p className="text-[10px] text-muted-foreground italic">Campos bloqueados. Clique no lápis para editar.</p>
                )}

                {/* Toggle Aponta Técnico */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="aponta-agenda" className="text-xs font-medium flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Aponta Técnico para Agenda
                  </Label>
                  <Switch
                    id="aponta-agenda"
                    checked={detailCard.aponta_tecnico_agenda || false}
                    disabled={configLocked}
                    onCheckedChange={async (checked) => {
                      setDetailCard({ ...detailCard, aponta_tecnico_agenda: checked });
                      await supabase.from("painel_atendimento").update({ aponta_tecnico_agenda: checked }).eq("id", detailCard.id);
                      if (!checked) {
                        await supabase.from("painel_tecnicos").delete().eq("card_id", detailCard.id);
                        setTecnicosSelecionados([]);
                      }
                    }}
                  />
                </div>

                {/* Lista de Técnicos (multi-select) - só aparece quando toggle ON */}
                {detailCard.aponta_tecnico_agenda && (() => {
                  const tecnicosFiltrados = tecnicos.filter((tec: any) =>
                    tec.full_name.toLowerCase().includes(buscaTecnico.toLowerCase())
                  );
                  const tecnicosSelecionadosData = tecnicos.filter((tec: any) => tecnicosSelecionados.includes(tec.id));
                  return (
                    <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                      <Label className="text-xs font-medium flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Técnicos
                      </Label>

                      {/* Chips dos selecionados */}
                      {tecnicosSelecionadosData.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tecnicosSelecionadosData.map((tec: any) => (
                            <span
                              key={tec.id}
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm"
                            >
                              {tec.full_name}
                              {tec.tipo_tecnico && (
                                <span className="opacity-70 text-[10px]">· {tec.tipo_tecnico}</span>
                              )}
                              {!configLocked && (
                              <button
                                type="button"
                                className="ml-0.5 rounded-full hover:bg-primary-foreground/20 p-0.5 transition-colors"
                                onClick={async () => {
                                  setTecnicosSelecionados((prev) => prev.filter((id) => id !== tec.id));
                                  await supabase.from("painel_tecnicos").delete().eq("card_id", detailCard.id).eq("tecnico_id", tec.id);
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              </button>
                              )}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Busca e lista - só quando não está locked */}
                      {!configLocked && (
                        <>
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            placeholder="Buscar técnico..."
                            value={buscaTecnico}
                            onChange={(e) => setBuscaTecnico(e.target.value)}
                            className="h-8 pl-7 text-xs"
                          />
                        </div>

                        <div className="space-y-0.5 max-h-28 overflow-y-auto rounded-md border bg-muted/30 p-1.5">
                          {tecnicos.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic py-2 text-center">Nenhum técnico cadastrado</p>
                          ) : tecnicosFiltrados.filter((tec: any) => !tecnicosSelecionados.includes(tec.id)).length === 0 ? (
                            <p className="text-[10px] text-muted-foreground italic py-2 text-center">{buscaTecnico ? "Nenhum resultado" : "Todos selecionados"}</p>
                          ) : (
                            tecnicosFiltrados
                              .filter((tec: any) => !tecnicosSelecionados.includes(tec.id))
                              .map((tec: any) => (
                                <button
                                  key={tec.id}
                                  type="button"
                                  className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                                  onClick={async () => {
                                    setTecnicosSelecionados((prev) => [...prev, tec.id]);
                                    await supabase.from("painel_tecnicos").insert({ card_id: detailCard.id, tecnico_id: tec.id });
                                  }}
                                >
                                  <User className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span>{tec.full_name}</span>
                                  {tec.tipo_tecnico && (
                                    <span className="text-[10px] text-muted-foreground ml-auto">({tec.tipo_tecnico})</span>
                                  )}
                                </button>
                              ))
                          )}
                        </div>
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* Tipo de Atendimento */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Tipo de Atendimento</Label>
                  {configLocked ? (
                    <p className="text-xs text-foreground">{detailCard.tipo_atendimento_local === "interno" ? "Interno" : detailCard.tipo_atendimento_local === "externo" ? "Externo" : "—"}</p>
                  ) : (
                  <RadioGroup
                    value={detailCard.tipo_atendimento_local || ""}
                    onValueChange={async (val) => {
                      setDetailCard({ ...detailCard, tipo_atendimento_local: val });
                      await supabase.from("painel_atendimento").update({ tipo_atendimento_local: val }).eq("id", detailCard.id);
                    }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="interno" id="at-interno" />
                      <Label htmlFor="at-interno" className="text-xs cursor-pointer">Interno</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="externo" id="at-externo" />
                      <Label htmlFor="at-externo" className="text-xs cursor-pointer">Externo</Label>
                    </div>
                  </RadioGroup>
                  )}
                </div>

                {/* Comentários (thread) */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Comentários ({comentarios.length})
                  </Label>
                  {comentarios.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {comentarios.map((com: any) => {
                        const autor = responsaveis.find((r: any) => r.id === com.criado_por) ||
                          { full_name: "Usuário" };
                        return (
                          <div key={com.id} className="bg-muted/50 rounded p-2 text-xs">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="font-medium text-foreground">{(autor as any).full_name?.split(" ")[0]}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(com.created_at).toLocaleDateString("pt-BR")} {new Date(com.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-foreground/80">{com.texto}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Textarea
                      className="text-xs min-h-[50px] resize-none flex-1"
                      placeholder="Digite um comentário..."
                      value={novoComentario}
                      onChange={(e) => setNovoComentario(e.target.value)}
                    />
                    <Button
                      size="sm"
                      className="self-end h-8"
                      disabled={!novoComentario.trim()}
                      onClick={async () => {
                        const { data: { user } } = await supabase.auth.getUser();
                        if (!user || !detailCard) return;
                        const { data: myProfile } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
                        const { data: novo, error } = await supabase
                          .from("painel_comentarios")
                          .insert({ card_id: detailCard.id, texto: novoComentario.trim(), criado_por: myProfile?.id || user.id, etapa_id: detailCard.etapa_id })
                          .select("id, texto, criado_por, created_at")
                          .single();
                        if (!error && novo) {
                          setComentarios((prev) => [...prev, novo]);
                          setNovoComentario("");
                          toast.success("Comentário adicionado!");
                        } else {
                          toast.error("Erro ao adicionar comentário.");
                        }
                      }}
                    >
                      Incluir
                    </Button>
                  </div>
                </div>
              </div>
                );
              })()}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Criado em {new Date(detailCard.created_at).toLocaleDateString("pt-BR")} às{" "}
                {new Date(detailCard.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
          {detailCard && (
            <DialogFooter className="border-t pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isChecklistCompleto() && detailCard.iniciado_em && (
                  <p className="text-[10px] text-muted-foreground">
                    Complete todos os itens do checklist para finalizar
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchDetalhes(detailCard)}
                >
                  <Info className="h-4 w-4 mr-1" />
                  Detalhes
                </Button>
                {(() => {
                  // Only show Histórico from second etapa onwards
                  const etapaAtualIdx = etapas.findIndex((e) => e.id === detailCard.etapa_id);
                  if (etapaAtualIdx <= 0) return null;
                  return (
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600"
                      onClick={() => fetchHistorico(detailCard)}
                    >
                      <History className="h-4 w-4 mr-1" />
                      Histórico
                    </Button>
                  );
                })()}
                <Button
                  size="sm"
                  onClick={finalizarEtapa}
                  disabled={!detailCard.iniciado_em || !isChecklistCompleto() || finalizando}
                >
                  <ChevronRight className="h-4 w-4 mr-1" />
                  {finalizando ? "Finalizando..." : "Finalizar Etapa"}
                </Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Detalhes Dialog */}
      <Dialog open={detalhesOpen} onOpenChange={setDetalhesOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Info className="h-5 w-5 text-primary" />
              Detalhes do Atendimento
            </DialogTitle>
          </DialogHeader>
          {detalhesLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : detalhesData && (
            <div className="space-y-3 overflow-y-auto flex-1 pr-1">

              {/* ── PEDIDO ── */}
              {detalhesData.pedidoInfo && (
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Pedido</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Número</p>
                      <p className="text-sm font-semibold text-foreground">{detalhesData.pedidoInfo.numero_exibicao || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Data/Hora</p>
                      <p className="text-sm font-medium text-foreground">
                        {detalhesData.pedidoInfo.created_at
                          ? `${new Date(detalhesData.pedidoInfo.created_at).toLocaleDateString("pt-BR")} ${new Date(detalhesData.pedidoInfo.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Vendedor</p>
                      <p className="text-sm font-medium text-foreground">{detalhesData.pedidoInfo.vendedor_nome}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CONTRATO ── */}
              {detalhesData.contratoInfo && (
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-md bg-emerald-light flex items-center justify-center">
                      <CheckSquare className="h-4 w-4 text-emerald" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Contrato</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Número</p>
                      <p className="text-sm font-semibold text-foreground">{detalhesData.contratoInfo.numero_exibicao || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Status</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className={cn("text-[11px]",
                          detalhesData.contratoInfo.assinado ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"
                        )}>
                          {detalhesData.contratoInfo.status} {detalhesData.contratoInfo.assinado ? "• Assinado" : detalhesData.contratoInfo.statusZapsign ? `• ${detalhesData.contratoInfo.statusZapsign}` : ""}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Assinatura</p>
                      <p className="text-sm font-medium text-foreground">
                        {detalhesData.contratoInfo.dataAssinatura
                          ? `${new Date(detalhesData.contratoInfo.dataAssinatura).toLocaleDateString("pt-BR")} ${new Date(detalhesData.contratoInfo.dataAssinatura).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── DADOS DA EMPRESA ── */}
              {detalhesData.clienteInfo && (
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Dados da Empresa</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Nome Fantasia:</span>{" "}
                      <span className="font-medium text-foreground">{detalhesData.clienteInfo.nome_fantasia}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Razão Social:</span>{" "}
                      <span className="font-medium text-foreground">{detalhesData.clienteInfo.razao_social || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CNPJ/CPF:</span>{" "}
                      <span className="font-medium text-foreground">{detalhesData.clienteInfo.cnpj_cpf}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Telefone:</span>{" "}
                      <span className="font-medium text-foreground">{detalhesData.clienteInfo.telefone || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">E-mail:</span>{" "}
                      <span className="font-medium text-foreground">{detalhesData.clienteInfo.email || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Cidade/UF:</span>{" "}
                      <span className="font-medium text-foreground">{[detalhesData.clienteInfo.cidade, detalhesData.clienteInfo.uf].filter(Boolean).join("/") || "—"}</span>
                    </div>
                    {detalhesData.clienteInfo.logradouro && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Endereço:</span>{" "}
                        <span className="font-medium text-foreground">
                          {[detalhesData.clienteInfo.logradouro, detalhesData.clienteInfo.numero, detalhesData.clienteInfo.bairro, detalhesData.clienteInfo.complemento].filter(Boolean).join(", ")}
                          {detalhesData.clienteInfo.cep ? ` - CEP: ${detalhesData.clienteInfo.cep}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Contatos */}
                  {detalhesData.contatos.length > 0 && (
                    <>
                      <div className="border-t my-3" />
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">Contatos</p>
                      <div className="space-y-2">
                        {detalhesData.contatos.map((c: any, i: number) => (
                          <div key={i} className={cn("flex items-center justify-between text-xs rounded-md px-3 py-2 border",
                            c.decisor ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                          )}>
                            <div className="flex items-center gap-2">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-medium text-foreground">{c.nome}</span>
                              {c.cargo && <span className="text-muted-foreground">({c.cargo})</span>}
                              {c.decisor && (
                                <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">
                                  Decisor
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              {c.telefone && <span>📱 {c.telefone}</span>}
                              {c.email && <span>✉️ {c.email}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── PLANO CONTRATADO + MÓDULOS DO PLANO + ADICIONAIS ── */}
              {detalhesData.planoNome && (
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-4">
                  {/* Plano Contratado */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground">
                        {detailCard?.tipo_operacao === "Upgrade" ? "Novo Plano Contratado" : "Plano Contratado"}
                      </h4>
                    </div>
                    <p className="text-sm font-semibold ml-9">
                      {detalhesData.planoNome}
                    </p>
                    {detailCard?.tipo_operacao === "Upgrade" && planoAnteriorNome && (
                      <p className="text-xs text-muted-foreground ml-9 mt-0.5">
                        Plano anterior: <span className="line-through">{planoAnteriorNome}</span>
                      </p>
                    )}
                  </div>

                  {/* Módulos do Plano (da descrição) */}
                  {detalhesData.planoDescricao && (
                    <div className="ml-9">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5">Módulos do Plano</p>
                      <div className="space-y-0.5">
                        {detalhesData.planoDescricao.split(",").map((item: string, i: number) => {
                          const trimmed = item.trim();
                          return trimmed ? (
                            <p key={i} className="text-xs text-foreground">• {trimmed}</p>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Módulos Adicionais */}
                  {detalhesData.modulosAdicionais.length > 0 && (
                    <div className="ml-9 pt-2 border-t">
                      <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 text-violet-600" />
                        Módulos Adicionais
                      </p>
                      <div className="space-y-0.5">
                        {detalhesData.modulosAdicionais.map((mod: { nome: string; quantidade: number }, i: number) => (
                          <p key={i} className="text-xs text-foreground">
                            {mod.quantidade > 1 ? `${mod.quantidade} ` : ""}{mod.nome}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SERVIÇOS (OA) ── */}
              {detalhesData.servicosOA.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-md bg-teal-100 flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-teal-600" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Serviços (OA)</h4>
                    {detalhesData.pedidoInfo?.tipo_atendimento && (
                      <Badge variant="secondary" className="ml-auto text-[10px]">{detalhesData.pedidoInfo.tipo_atendimento}</Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    {detalhesData.servicosOA.map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border bg-muted/20">
                        <span className="font-medium text-foreground">{s.nome || s.descricao || `Serviço ${i + 1}`}</span>
                        {s.quantidade && <span className="text-muted-foreground">x{s.quantidade}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── OBSERVAÇÕES ── */}
              {(detalhesData.obsCard || detalhesData.observacoes.length > 0) && (
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Observações</h4>
                  </div>
                  {detalhesData.obsCard && (
                    <div className="p-2.5 rounded-md border bg-muted/20 text-xs whitespace-pre-wrap mb-2">
                      {detalhesData.obsCard}
                    </div>
                  )}
                  {detalhesData.observacoes.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {detalhesData.observacoes.map((obs: any) => (
                        <div key={obs.created_at} className="p-2.5 rounded-md border bg-muted/20">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-medium text-foreground">{obs.profiles?.full_name || "—"}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(obs.created_at).toLocaleDateString("pt-BR")} {new Date(obs.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs whitespace-pre-wrap text-foreground">{obs.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Comentários Internos do Pedido */}
              {detailCard?.pedido_id && (
                <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                  <PedidoComentarios pedidoId={detailCard.pedido_id} readOnly />
                </div>
              )}

            </div>
          )}
          {detalhesData && (
            <DialogFooter className="border-t pt-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <MoreHorizontal className="h-4 w-4" />
                    Ações
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="gap-2 text-amber-600 focus:text-amber-600"
                    onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                  >
                    <PauseCircle className="h-4 w-4" />
                    Pausar Projeto
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() => toast.info("Funcionalidade em desenvolvimento")}
                  >
                    <XCircle className="h-4 w-4" />
                    Recusar Projeto
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Histórico Dialog */}
      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-amber-500" />
              Histórico de Etapas
            </DialogTitle>
          </DialogHeader>
          {historicoLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando...
            </div>
          ) : historicoData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Nenhum histórico disponível.
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {historicoData.map((stage: any, sIdx: number) => (
                <div key={sIdx} className="rounded-lg border bg-card overflow-hidden">
                  {/* Stage Header */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 px-4 py-3 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                          {sIdx + 1}
                        </div>
                        <h4 className="text-sm font-bold text-foreground">{stage.etapa_nome}</h4>
                        {stage.sla_cumprido === true && (
                          <Badge className="text-[9px] px-1.5 py-0 gap-0.5 bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                            <CheckSquare className="h-2.5 w-2.5" />
                            SLA Cumprido {stage.tempo_real_horas != null ? `(${formatSLA(stage.tempo_real_horas)})` : ""}
                          </Badge>
                        )}
                        {stage.sla_cumprido === false && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            SLA Não Cumprido {stage.tempo_real_horas != null ? `(${formatSLA(stage.tempo_real_horas)})` : ""}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{new Date(stage.entrada_em).toLocaleDateString("pt-BR")} {new Date(stage.entrada_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{new Date(stage.saida_em).toLocaleDateString("pt-BR")} {new Date(stage.saida_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    {/* SLA Previsto vs Real */}
                    {(stage.sla_previsto_horas != null || stage.tempo_real_horas != null) && (
                      <div className="flex items-center gap-4 mt-2 text-[11px]">
                        {stage.sla_previsto_horas != null && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Previsto: <span className="font-semibold text-foreground">{formatSLA(stage.sla_previsto_horas)}</span>
                          </span>
                        )}
                        {stage.tempo_real_horas != null && (
                          <span className={cn(
                            "flex items-center gap-1",
                            stage.sla_previsto_horas != null && stage.tempo_real_horas > stage.sla_previsto_horas
                              ? "text-destructive font-semibold"
                              : "text-muted-foreground"
                          )}>
                            <Clock className="h-3 w-3" />
                            Real: <span className="font-semibold">{formatSLA(stage.tempo_real_horas)}</span>
                          </span>
                        )}
                        {stage.sla_previsto_horas != null && stage.tempo_real_horas != null && stage.tempo_real_horas > stage.sla_previsto_horas && (
                          <Badge variant="destructive" className="text-[9px] px-1.5 py-0 gap-0.5">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            SLA Excedido
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Checklist read-only */}
                    {stage.atividades.length > 0 && (
                      <div className="space-y-2">
                        {stage.atividades.map((atividade: any, aIdx: number) => {
                          const items = Array.isArray(atividade.checklist) ? atividade.checklist : [];
                          if (items.length === 0) return null;
                          return (
                            <div key={aIdx}>
                              <p className="text-xs font-medium text-muted-foreground mb-1">{atividade.nome}</p>
                              <ul className="space-y-1 pl-1">
                                {items.map((item: any, cIdx: number) => {
                                  const key = `${atividade.id}_${cIdx}`;
                                  const prog = stage.progressoMap[key] || { concluido: false };
                                  return (
                                    <li key={cIdx} className="flex flex-col gap-0.5 text-xs border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                                      <div className="flex items-center gap-2">
                                        <div className={cn(
                                          "h-4 w-4 rounded-sm border flex items-center justify-center shrink-0",
                                          prog.concluido ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30"
                                        )}>
                                          {prog.concluido && <CheckSquare className="h-3 w-3" />}
                                        </div>
                                        <span className={cn("flex-1", prog.concluido && "line-through text-muted-foreground")}>
                                          {item.texto || "(sem texto)"}
                                        </span>
                                        {prog.valor_texto && (
                                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                            {prog.valor_texto === 'sim' ? '✓ Sim' : prog.valor_texto === 'nao' ? '✗ Não' : prog.valor_texto}
                                          </Badge>
                                        )}
                                      </div>
                                      {prog.concluido && prog.concluido_por_nome && (
                                        <div className="flex items-center gap-1.5 pl-6 text-[10px] text-muted-foreground">
                                          <User className="h-2.5 w-2.5" />
                                          <span>{prog.concluido_por_nome}</span>
                                          {prog.concluido_em && (
                                            <>
                                              <span>·</span>
                                              <span>{new Date(prog.concluido_em).toLocaleDateString("pt-BR")} {new Date(prog.concluido_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Comments from this stage */}
                    {stage.comentarios.length > 0 && (
                      <>
                        <div className="border-t pt-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Comentários
                          </p>
                          <div className="space-y-1.5">
                            {stage.comentarios.map((com: any) => {
                              const autor = responsaveis.find((r: any) => r.id === com.criado_por) || { full_name: "Usuário" };
                              return (
                                <div key={com.id} className="bg-muted/50 rounded p-2 text-xs">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-medium text-foreground">{(autor as any).full_name?.split(" ")[0]}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(com.created_at).toLocaleDateString("pt-BR")} {new Date(com.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                  </div>
                                  <p className="text-foreground/80">{com.texto}</p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}

                    {stage.atividades.length === 0 && stage.comentarios.length === 0 && (
                      <p className="text-xs text-muted-foreground italic text-center py-2">Nenhum registro nesta etapa</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
