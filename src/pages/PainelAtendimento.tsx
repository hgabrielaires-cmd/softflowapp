import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { ptBR } from "date-fns/locale";
import {
  LayoutGrid, List, Search, Clock, Building2, User, Play, AlertTriangle, RefreshCw, ArrowRight, CheckSquare,
  CalendarDays, Pencil, MoreHorizontal, XCircle, PauseCircle, UserPlus, Ban, X,
  Heart, Reply, CornerDownRight, BellRing, BellOff, ChevronRight, History, Info, FileText,
} from "lucide-react";
import { CHECKLIST_TIPO_LABELS } from "@/lib/supabase-types";
import type { ChecklistItem } from "@/lib/supabase-types";
import { cn } from "@/lib/utils";
import { AgendamentoChecklist } from "@/components/AgendamentoChecklist";
import { PedidoComentarios } from "@/components/PedidoComentarios";
import { MentionInput, renderMentionText } from "@/components/MentionInput";
import { UserAvatar } from "@/components/UserAvatar";

// ─── Extracted modules ──────────────────────────────────────────────────────
import type { PainelCard, PainelEtapa } from "./painel-atendimento/types";
import { TIPO_ICONS, TIPO_COLORS, TIPOS_UNICOS } from "./painel-atendimento/constants";
import { PRIORIDADE_DISPLAY } from "./painel-atendimento/types";
import {
  getTempoNaEtapa, isInicioAtrasado, getTempoRestante, getTempoAtraso,
  getSlaEtapaForCard, isEtapaSlaAtrasado, getVencimentoSla, getTempoExcedidoSla,
  formatSLA, calcProgress, isChecklistCompleto,
} from "./painel-atendimento/helpers";
import { usePainelQueries } from "./painel-atendimento/usePainelQueries";
import { KanbanCard } from "./painel-atendimento/components/KanbanCard";
import { PausarDialog } from "./painel-atendimento/components/PausarDialog";
import { RecusarDialog } from "./painel-atendimento/components/RecusarDialog";
import { ResetarDialog } from "./painel-atendimento/components/ResetarDialog";
import { CancelarDialog } from "./painel-atendimento/components/CancelarDialog";
import { AgendamentosCancelDialog } from "./painel-atendimento/components/AgendamentosCancelDialog";
import { ApontamentoDialog } from "./painel-atendimento/components/ApontamentoDialog";
import { RetomarDialog } from "./painel-atendimento/components/RetomarDialog";
import { VerPedidoDialog } from "./painel-atendimento/components/VerPedidoDialog";
import { DetalhesDialog } from "./painel-atendimento/components/DetalhesDialog";
import { HistoricoDialog } from "./painel-atendimento/components/HistoricoDialog";

// ─── Component ──────────────────────────────────────────────────────────────

export default function PainelAtendimento() {
  const { profile, roles } = useAuth();
  const { filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais } = useUserFiliais();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"kanban" | "lista">("kanban");
  const [search, setSearch] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroFilial, setFiltroFilial] = useState<string>("_init_");
  const [filtroResponsavel, setFiltroResponsavel] = useState<string>("todos");
  const [filtroEtapa, setFiltroEtapa] = useState<string>("todos");
  const [filtroMesa, setFiltroMesa] = useState<string>("todos");
  const [detailCard, setDetailCard] = useState<PainelCard | null>(null);
  const [openedFrom, setOpenedFrom] = useState<string | null>(null);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [detalhesData, setDetalhesData] = useState<any>(null);
  const [detalhesLoading, setDetalhesLoading] = useState(false);
  const [planoAnteriorNome, setPlanoAnteriorNome] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [slaEtapaJornada, setSlaEtapaJornada] = useState<number | null>(null);
  const [slaProjeto, setSlaProjeto] = useState<number | null>(null);
  const [checklistEtapa, setChecklistEtapa] = useState<any[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [checklistProgresso, setChecklistProgresso] = useState<Record<string, { concluido: boolean; valor_texto?: string; valor_data?: string; concluido_por?: string; concluido_em?: string; concluido_por_nome?: string }>>({});
  const [etapaMesaInfo, setEtapaMesaInfo] = useState<{ id: string; cor: string | null } | null>(null);
  const [finalizando, setFinalizando] = useState(false);
  const [, setTick] = useState(0);
  const [novoComentario, setNovoComentario] = useState("");
  const mentionedUsersRef = useRef<string[]>([]);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [curtidas, setCurtidas] = useState<Record<string, string[]>>({});
  const [replyTo, setReplyTo] = useState<{ id: string; autorNome: string } | null>(null);
  const [likesPopoverOpen, setLikesPopoverOpen] = useState<string | null>(null);
  const [tecnicosSelecionados, setTecnicosSelecionados] = useState<string[]>([]);
  const [buscaTecnico, setBuscaTecnico] = useState<string | null>(null);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoData, setHistoricoData] = useState<any[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);
  const [configEditMode, setConfigEditMode] = useState(false);
  const [checklistEditMode, setChecklistEditMode] = useState(false);
  const [cardAgendamentos, setCardAgendamentos] = useState<any[]>([]);
  const [pausarOpen, setPausarOpen] = useState(false);
  const [pausarMotivo, setPausarMotivo] = useState("");
  const [pausando, setPausando] = useState(false);
  const [recusarOpen, setRecusarOpen] = useState(false);
  const [recusarMotivo, setRecusarMotivo] = useState("");
  const [recusando, setRecusando] = useState(false);
  const [apontamentoOpen, setApontamentoOpen] = useState(false);
  const [apontamentoCardId, setApontamentoCardId] = useState<string | null>(null);
  const [apontamentoUsuarios, setApontamentoUsuarios] = useState<string[]>([]);
  const [apontando, setApontando] = useState(false);
  const [buscaApontamento, setBuscaApontamento] = useState("");
  const [retomarOpen, setRetomarOpen] = useState(false);
  const [retomarComentario, setRetomarComentario] = useState("");
  const [retomando, setRetomando] = useState(false);
  const [seguindoProjeto, setSeguindoProjeto] = useState(false);
  const [seguindoLoading, setSeguindoLoading] = useState(false);
  const [seguidoresList, setSeguidoresList] = useState<any[]>([]);
  const [seguidoresPopupOpen, setSeguidoresPopupOpen] = useState(false);
  const [resetarOpen, setResetarOpen] = useState(false);
  const [resetarMotivo, setResetarMotivo] = useState("");
  const [resetando, setResetando] = useState(false);
  const [cancelarOpen, setCancelarOpen] = useState(false);
  const [cancelarMotivo, setCancelarMotivo] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [agendamentosCancelOpen, setAgendamentosCancelOpen] = useState(false);
  const [agendamentosCancelados, setAgendamentosCancelados] = useState<any[]>([]);
  const [removendoAgendamentos, setRemovendoAgendamentos] = useState(false);
  const [verPedidoOpen, setVerPedidoOpen] = useState(false);
  const [verPedidoData, setVerPedidoData] = useState<any>(null);
  const [verPedidoLoading, setVerPedidoLoading] = useState(false);

  // ─── Data from extracted queries hook ─────────────────────────────────────
  const {
    etapas, cards, isLoading, responsaveis, mesasAtendimento, jornadaMesaMap,
    tecnicos, jornadaSlaMap, totalChecklistPorPlano, pedidoPrioridadeMap,
    cardProgressMap, cardApontamentosMap, cardApontamentosDetalhado, permissions,
  } = usePainelQueries(profile);

  const {
    podeEditarConfigProjeto, podePausarProjeto, podeRecusarProjeto,
    podeGerenciarApontamento, podeVoltarEtapa, podeEditarChecklist,
    podeVisualizarSeguidores, podeResetarProjeto, podeCancelarProjeto, podeVerValoresProjeto,
  } = permissions;

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
      const { data: contrato } = await supabase
        .from("contratos")
        .select("contrato_origem_id")
        .eq("id", detailCard.contrato_id)
        .single();
      if (!contrato?.contrato_origem_id) { setPlanoAnteriorNome(null); return; }
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
      if (profile?.filial_favorita_id) {
        setFiltroFilial(profile.filial_favorita_id);
      } else {
        setFiltroFilial("todos");
      }
    }
  }, [filialPadraoId, profile?.filial_favorita_id]);

  // Auto-open card from query param
  useEffect(() => {
    const cardParam = searchParams.get("card");
    const fromParam = searchParams.get("from");
    if (cardParam && cards.length > 0 && !detailCard) {
      const found = cards.find((c: any) => c.id === cardParam);
      if (found) {
        setDetailCard(found);
        if (fromParam) setOpenedFrom(fromParam);
        searchParams.delete("card");
        searchParams.delete("from");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [cards, searchParams]);

  useEffect(() => {
    if (!detailCard) {
      setComentarios([]); setCurtidas({}); setReplyTo(null);
      setTecnicosSelecionados([]); setNovoComentario(""); setBuscaTecnico(null);
      setCardAgendamentos([]); setChecklistEditMode(false);
      setSlaEtapaJornada(null); setSlaProjeto(null);
      setChecklistEtapa([]); setChecklistProgresso({});
      setSeguindoProjeto(false); setSeguidoresList([]);
      return;
    }
    (async () => {
      const [{ data: coms }, { data: tecs }, { data: likes }, { data: agData }, { data: seguindo }, { data: allSeguidores }] = await Promise.all([
        supabase.from("painel_comentarios").select("id, texto, criado_por, created_at, parent_id, etapa_id").eq("card_id", detailCard.id).order("created_at", { ascending: true }),
        supabase.from("painel_tecnicos").select("tecnico_id").eq("card_id", detailCard.id),
        supabase.from("painel_curtidas").select("comentario_id, user_id"),
        supabase.from("painel_agendamentos").select("*, jornada_atividades(nome), painel_etapas:etapa_id(nome, cor)").eq("card_id", detailCard.id).order("data"),
        supabase.from("painel_seguidores" as any).select("id").eq("card_id", detailCard.id).eq("user_id", profile?.user_id || "").is("unfollowed_at", null).maybeSingle(),
        (supabase as any).from("painel_seguidores").select("user_id, created_at, unfollowed_at").eq("card_id", detailCard.id),
      ]);
      setComentarios(coms || []);
      setTecnicosSelecionados((tecs || []).map((t: any) => t.tecnico_id));
      const likesMap: Record<string, string[]> = {};
      (likes || []).forEach((l: any) => { if (!likesMap[l.comentario_id]) likesMap[l.comentario_id] = []; likesMap[l.comentario_id].push(l.user_id); });
      setCurtidas(likesMap);
      setReplyTo(null);
      setCardAgendamentos(agData || []);
      setSeguindoProjeto(!!seguindo);
      const segData = allSeguidores || [];
      if (segData.length > 0) {
        const uids = segData.map((s: any) => s.user_id);
        const { data: profs } = await supabase.from("profiles").select("id, user_id, full_name, avatar_url").in("user_id", uids);
        const profMap: Record<string, any> = {};
        (profs || []).forEach((p: any) => { profMap[p.user_id] = p; });
        setSeguidoresList(segData.map((s: any) => ({ ...s, profile: profMap[s.user_id] || null })));
      } else {
        setSeguidoresList([]);
      }
    })();
  }, [detailCard?.id]);

  // ─── Atualizar Painel ─────────────────────────────────────────────────────
  const atualizarPainel = useCallback(async () => {
    setSyncing(true);
    try {
      const cardContratoIds = cards.filter((c) => c.contrato_id).map((c) => c.contrato_id);
      if (cardContratoIds.length > 0) {
        const { data: zapsignRecords } = await supabase.from("contratos_zapsign").select("contrato_id, status").in("contrato_id", cardContratoIds).in("status", ["Enviado", "Pendente"]);
        if (zapsignRecords && zapsignRecords.length > 0) {
          for (const rec of zapsignRecords) {
            try { await supabase.functions.invoke("zapsign", { body: { action: "status", contrato_id: rec.contrato_id } }); } catch { }
          }
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }),
        queryClient.invalidateQueries({ queryKey: ["painel_etapas"] }),
        queryClient.invalidateQueries({ queryKey: ["card_apontamentos"] }),
        queryClient.invalidateQueries({ queryKey: ["profiles_painel"] }),
        queryClient.invalidateQueries({ queryKey: ["tecnicos_painel"] }),
        queryClient.invalidateQueries({ queryKey: ["jornada_sla_map"] }),
      ]);
      toast.success("Painel atualizado!");
    } catch { } finally { setSyncing(false); }
  }, [cards, queryClient]);

  const [hasSynced, setHasSynced] = useState(false);
  useEffect(() => {
    if (cards.length > 0 && !hasSynced) { setHasSynced(true); atualizarPainel(); }
  }, [cards.length, hasSynced, atualizarPainel]);

  // Fetch SLA da Etapa + Checklist
  useEffect(() => {
    if (!detailCard || !detailCard.plano_id) return;
    setChecklistLoading(true);
    (async () => {
      let resolvedJornadaId = detailCard.jornada_id;
      if (!resolvedJornadaId) {
        const { data: jornada } = await supabase.from("jornadas").select("id").eq("vinculo_tipo", "plano").eq("vinculo_id", detailCard.plano_id).eq("ativo", true).limit(1);
        if (!jornada || jornada.length === 0) { setSlaEtapaJornada(null); setSlaProjeto(null); setChecklistEtapa([]); setChecklistLoading(false); return; }
        resolvedJornadaId = jornada[0].id;
      }
      const etapaAtual = etapas.find((e) => e.id === detailCard.etapa_id);
      const [{ data: todasEtapasJornada }, { data: progresso }, jornadaEtapaResult] = await Promise.all([
        supabase.from("jornada_etapas").select("id").eq("jornada_id", resolvedJornadaId),
        supabase.from("painel_checklist_progresso").select("atividade_id, checklist_index, concluido, valor_texto, valor_data, concluido_por, concluido_em").eq("card_id", detailCard.id),
        etapaAtual ? supabase.from("jornada_etapas").select("id, mesa_atendimento_id, mesas_atendimento:mesa_atendimento_id(id, cor)").eq("jornada_id", resolvedJornadaId).eq("nome", etapaAtual.nome).limit(1) : Promise.resolve({ data: null }),
      ]);
      if (todasEtapasJornada && todasEtapasJornada.length > 0) {
        const etapaIds = todasEtapasJornada.map((e) => e.id);
        const { data: todasAtividades } = await supabase.from("jornada_atividades").select("horas_estimadas").in("etapa_id", etapaIds);
        setSlaProjeto((todasAtividades || []).reduce((acc, a) => acc + (a.horas_estimadas || 0), 0));
      } else { setSlaProjeto(null); }
      const userIds = [...new Set((progresso || []).map((p: any) => p.concluido_por).filter(Boolean))];
      const profileMapPromise = userIds.length > 0 ? supabase.from("profiles").select("user_id, full_name").in("user_id", userIds) : Promise.resolve({ data: [] });
      const jornadaEtapa = jornadaEtapaResult?.data;
      if (jornadaEtapa && jornadaEtapa.length > 0 && jornadaEtapa[0].mesas_atendimento) {
        setEtapaMesaInfo({ id: jornadaEtapa[0].mesas_atendimento.id, cor: jornadaEtapa[0].mesas_atendimento.cor || null });
      } else { setEtapaMesaInfo(null); }
      if (!etapaAtual || !jornadaEtapa || jornadaEtapa.length === 0) {
        setSlaEtapaJornada(null); setChecklistEtapa([]);
        const { data: profiles } = await profileMapPromise;
        const profileMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
        const progressoMap: Record<string, any> = {};
        (progresso || []).forEach((p: any) => {
          progressoMap[`${p.atividade_id}_${p.checklist_index}`] = { concluido: p.concluido, valor_texto: p.valor_texto || undefined, valor_data: p.valor_data || undefined, concluido_por: p.concluido_por || undefined, concluido_em: p.concluido_em || undefined, concluido_por_nome: p.concluido_por ? profileMap[p.concluido_por] : undefined };
        });
        setChecklistProgresso(progressoMap); setChecklistLoading(false); return;
      }
      const [{ data: atividades }, { data: profiles }] = await Promise.all([
        supabase.from("jornada_atividades").select("id, nome, horas_estimadas, checklist, mesa_atendimento_id, mesas_atendimento:mesa_atendimento_id(id, nome, cor)").eq("etapa_id", jornadaEtapa[0].id).order("ordem"),
        profileMapPromise,
      ]);
      setSlaEtapaJornada((atividades || []).reduce((acc, a) => acc + (a.horas_estimadas || 0), 0));
      setChecklistEtapa(atividades || []);
      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; });
      const progressoMap: Record<string, { concluido: boolean; valor_texto?: string; valor_data?: string; concluido_por?: string; concluido_em?: string; concluido_por_nome?: string }> = {};
      (progresso || []).forEach((p: any) => {
        progressoMap[`${p.atividade_id}_${p.checklist_index}`] = { concluido: p.concluido, valor_texto: p.valor_texto || undefined, valor_data: p.valor_data || undefined, concluido_por: p.concluido_por || undefined, concluido_em: p.concluido_em || undefined, concluido_por_nome: p.concluido_por ? profileMap[p.concluido_por] : undefined };
      });
      setChecklistProgresso(progressoMap); setChecklistLoading(false);
    })();
  }, [detailCard?.id, detailCard?.etapa_id, detailCard?.plano_id, detailCard?.jornada_id, etapas]);

  // ─── Mutations ────────────────────────────────────────────────────────────
  const moverCard = useMutation({
    mutationFn: async ({ cardId, etapaId }: { cardId: string; etapaId: string }) => {
      const { error } = await supabase.from("painel_atendimento").update({ etapa_id: etapaId }).eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); },
    onError: () => toast.error("Erro ao mover card."),
  });

  const atribuirResponsavel = useMutation({
    mutationFn: async ({ cardId, responsavelId }: { cardId: string; responsavelId: string | null }) => {
      const { error } = await supabase.from("painel_atendimento").update({ responsavel_id: responsavelId }).eq("id", cardId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); toast.success("Responsável atualizado!"); },
    onError: () => toast.error("Erro ao atribuir responsável."),
  });

  const iniciarAtendimento = useMutation({
    mutationFn: async (cardId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      const now = new Date();
      const { error } = await supabase.from("painel_atendimento").update({ iniciado_em: now.toISOString(), iniciado_por: user.id, responsavel_id: prof?.id || null }).eq("id", cardId);
      if (error) throw error;
      const { data: histOpen } = await supabase.from("painel_historico_etapas").select("id, entrada_em").eq("card_id", cardId).is("saida_em", null).order("entrada_em", { ascending: false }).limit(1);
      if (histOpen && histOpen.length > 0) {
        const atrasoInicioHoras = Math.round(((now.getTime() - new Date(histOpen[0].entrada_em).getTime()) / (1000 * 60 * 60)) * 100) / 100;
        await supabase.from("painel_historico_etapas").update({ atraso_inicio_horas: atrasoInicioHoras } as any).eq("id", histOpen[0].id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); toast.success("Atendimento iniciado! Você é o responsável."); },
    onError: () => toast.error("Erro ao iniciar atendimento."),
  });

  // ─── Checklist ────────────────────────────────────────────────────────────
  async function saveChecklistItem(atividadeId: string, checklistIndex: number, updates: { concluido?: boolean; valor_texto?: string; valor_data?: string }) {
    if (!detailCard) return;
    const key = `${atividadeId}_${checklistIndex}`;
    const prev = checklistProgresso[key] || { concluido: false };
    const { data: { user } } = await supabase.auth.getUser();
    const now = new Date().toISOString();
    let userName = prev.concluido_por_nome;
    if (user && !userName) { const { data: prof } = await supabase.from("profiles").select("full_name").eq("user_id", user.id).single(); userName = prof?.full_name || undefined; }
    const newVal = { ...prev, ...updates, concluido_por: updates.concluido ? user?.id : prev.concluido_por, concluido_em: updates.concluido ? now : (updates.concluido === false ? undefined : prev.concluido_em), concluido_por_nome: updates.concluido ? userName : (updates.concluido === false ? undefined : prev.concluido_por_nome) };
    setChecklistProgresso((p) => ({ ...p, [key]: newVal }));
    const { error } = await supabase.from("painel_checklist_progresso").upsert({ card_id: detailCard.id, atividade_id: atividadeId, checklist_index: checklistIndex, concluido: newVal.concluido, valor_texto: newVal.valor_texto || null, valor_data: newVal.valor_data || null, concluido_por: user?.id || null, concluido_em: newVal.concluido ? now : null }, { onConflict: "card_id,atividade_id,checklist_index" });
    if (error) { toast.error("Erro ao salvar checklist."); setChecklistProgresso((p) => ({ ...p, [key]: prev })); } else { queryClient.invalidateQueries({ queryKey: ["card_checklist_progress"] }); }
  }

  // ─── Fetch Detalhes ───────────────────────────────────────────────────────
  async function fetchDetalhes(card: PainelCard) {
    setDetalhesLoading(true); setDetalhesOpen(true);
    try {
      let pedidoInfo: any = null;
      if (card.pedido_id) {
        const { data: ped } = await supabase.from("pedidos").select("numero_exibicao, created_at, vendedor_id, tipo_pedido, modulos_adicionais, servicos_pedido, tipo_atendimento").eq("id", card.pedido_id).single();
        if (ped) { const { data: vendProf } = await supabase.from("profiles").select("full_name").eq("user_id", ped.vendedor_id).single(); pedidoInfo = { ...ped, vendedor_nome: vendProf?.full_name || "—" }; }
      }
      let contratoInfo: any = null;
      if (card.contrato_id) {
        const { data: contr } = await supabase.from("contratos").select("numero_exibicao, status, tipo, created_at").eq("id", card.contrato_id).single();
        contratoInfo = contr;
        const { data: zap } = await supabase.from("contratos_zapsign").select("updated_at, status").eq("contrato_id", card.contrato_id).maybeSingle();
        if (contratoInfo) { contratoInfo.assinado = zap?.status === "Assinado"; contratoInfo.dataAssinatura = zap?.status === "Assinado" ? zap.updated_at : null; contratoInfo.statusZapsign = zap?.status || null; }
      }
      const { data: cli } = await supabase.from("clientes").select("nome_fantasia, razao_social, cnpj_cpf, telefone, email, cidade, uf, logradouro, numero, bairro, complemento, cep, apelido, inscricao_estadual").eq("id", card.cliente_id).single();
      const { data: contatos } = await supabase.from("cliente_contatos").select("nome, email, telefone, cargo, decisor").eq("cliente_id", card.cliente_id).eq("ativo", true).order("decisor", { ascending: false });
      let modulosPlano: string[] = [];
      let planoNome: string | null = card.planos?.nome || null;
      let planoDescricao: string | null = card.planos?.descricao || null;
      if (card.plano_id) {
        const { data: mods } = await supabase.from("plano_modulos").select("modulo_id, modulos(nome)").eq("plano_id", card.plano_id).eq("incluso_no_plano", true).order("ordem");
        modulosPlano = (mods || []).map((m: any) => m.modulos?.nome).filter(Boolean);
        if (!planoDescricao) { const { data: planoData } = await supabase.from("planos").select("descricao").eq("id", card.plano_id).single(); planoDescricao = planoData?.descricao || null; }
      }
      let modulosAdicionais: { nome: string; quantidade: number }[] = [];
      if (pedidoInfo?.modulos_adicionais) {
        const modsAd = Array.isArray(pedidoInfo.modulos_adicionais) ? pedidoInfo.modulos_adicionais : [];
        if (modsAd.length > 0) {
          const modIds = modsAd.map((m: any) => m.modulo_id).filter(Boolean);
          if (modIds.length > 0) { const { data: modNames } = await supabase.from("modulos").select("id, nome").in("id", modIds); const nameMap: Record<string, string> = {}; (modNames || []).forEach((m: any) => { nameMap[m.id] = m.nome; }); modulosAdicionais = modsAd.filter((m: any) => nameMap[m.modulo_id]).map((m: any) => ({ nome: nameMap[m.modulo_id], quantidade: m.quantidade || 1 })); }
        }
      }
      let servicosOA: any[] = [];
      if (pedidoInfo?.servicos_pedido) { servicosOA = Array.isArray(pedidoInfo.servicos_pedido) ? pedidoInfo.servicos_pedido : []; }
      const { data: obs } = await supabase.from("painel_comentarios").select("texto, created_at, criado_por, profiles:criado_por(full_name)").eq("card_id", card.id).order("created_at", { ascending: false });
      setDetalhesData({ pedidoInfo, contratoInfo, clienteInfo: cli, contatos: contatos || [], planoNome, planoDescricao, modulosPlano, modulosAdicionais, servicosOA, obsCard: card.observacoes, observacoes: obs || [], tipoOperacao: card.tipo_operacao });
    } catch { toast.error("Erro ao carregar detalhes."); } finally { setDetalhesLoading(false); }
  }

  async function fetchVerPedido(pedidoId: string) {
    setVerPedidoLoading(true); setVerPedidoOpen(true);
    try {
      const { data: ped } = await supabase.from("pedidos").select("*, planos(nome), clientes(nome_fantasia), filiais(nome)").eq("id", pedidoId).single();
      if (ped) {
        const [vendRes, planoRes] = await Promise.all([supabase.from("profiles").select("full_name").eq("user_id", ped.vendedor_id).single(), ped.plano_id ? supabase.from("planos").select("*").eq("id", ped.plano_id).single() : Promise.resolve({ data: null })]);
        setVerPedidoData({ ...ped, vendedor_nome: vendRes.data?.full_name || "—", planoDetalhes: planoRes.data });
      }
    } catch { toast.error("Erro ao carregar dados do pedido."); } finally { setVerPedidoLoading(false); }
  }

  async function fetchHistorico(card: PainelCard) {
    setHistoricoLoading(true); setHistoricoOpen(true);
    try {
      const { data: historico } = await supabase.from("painel_historico_etapas").select("id, etapa_id, etapa_nome, entrada_em, saida_em, sla_previsto_horas, tempo_real_horas, sla_cumprido, atraso_inicio_horas").eq("card_id", card.id).not("saida_em", "is", null).order("entrada_em", { ascending: true });
      if (!historico || historico.length === 0) { setHistoricoData([]); setHistoricoLoading(false); return; }
      let resolvedJornadaId = card.jornada_id;
      if (!resolvedJornadaId && card.plano_id) { const { data: jornada } = await supabase.from("jornadas").select("id").eq("vinculo_tipo", "plano").eq("vinculo_id", card.plano_id).eq("ativo", true).limit(1); resolvedJornadaId = jornada?.[0]?.id || null; }
      const result: any[] = [];
      for (const h of historico) {
        let atividades: any[] = []; let progressoMap: Record<string, any> = {};
        if (resolvedJornadaId) {
          const { data: jornadaEtapa } = await supabase.from("jornada_etapas").select("id").eq("jornada_id", resolvedJornadaId).eq("nome", h.etapa_nome).limit(1);
          if (jornadaEtapa && jornadaEtapa.length > 0) {
            const { data: atv } = await supabase.from("jornada_atividades").select("id, nome, horas_estimadas, checklist, mesa_atendimento_id, mesas_atendimento:mesa_atendimento_id(id, nome, cor)").eq("etapa_id", jornadaEtapa[0].id).order("ordem");
            atividades = atv || [];
            const { data: progresso } = await supabase.from("painel_checklist_progresso").select("atividade_id, checklist_index, concluido, valor_texto, valor_data, concluido_por, concluido_em").eq("card_id", card.id);
            const userIds = [...new Set((progresso || []).map((p: any) => p.concluido_por).filter(Boolean))];
            let profileMap: Record<string, string> = {};
            if (userIds.length > 0) { const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds); (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p.full_name; }); }
            (progresso || []).forEach((p: any) => { progressoMap[`${p.atividade_id}_${p.checklist_index}`] = { concluido: p.concluido, valor_texto: p.valor_texto || undefined, concluido_por_nome: p.concluido_por ? profileMap[p.concluido_por] : undefined, concluido_em: p.concluido_em || undefined }; });
          }
        }
        let stageComments: any[] = [];
        if (h.entrada_em && h.saida_em) { const { data: comsByDate } = await supabase.from("painel_comentarios").select("id, texto, criado_por, created_at").eq("card_id", card.id).gte("created_at", h.entrada_em).lte("created_at", h.saida_em).order("created_at", { ascending: true }); stageComments = comsByDate || []; }
        result.push({ etapa_nome: h.etapa_nome, entrada_em: h.entrada_em, saida_em: h.saida_em, sla_previsto_horas: (h as any).sla_previsto_horas, tempo_real_horas: (h as any).tempo_real_horas, sla_cumprido: (h as any).sla_cumprido, atraso_inicio_horas: (h as any).atraso_inicio_horas, atividades, progressoMap, comentarios: stageComments });
      }
      setHistoricoData(result);
    } catch { toast.error("Erro ao carregar histórico."); } finally { setHistoricoLoading(false); }
  }

  // ─── History helpers ──────────────────────────────────────────────────────
  async function registrarEntradaEtapa(cardId: string, etapaId: string, etapaNome: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("painel_historico_etapas").insert({ card_id: cardId, etapa_id: etapaId, etapa_nome: etapaNome, entrada_em: new Date().toISOString(), usuario_id: user?.id || null });
  }

  async function notificarSeguidoresAvanco(cardId: string, novaEtapaNome: string, clienteNome: string) {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      const autorNome = profile?.full_name || "Usuário";
      const { data: seguidores } = await (supabase as any).from("painel_seguidores").select("user_id").eq("card_id", cardId).is("unfollowed_at", null);
      if (!seguidores || seguidores.length === 0) return;
      for (const seg of seguidores) {
        if (seg.user_id === currentUser.id) continue;
        await supabase.from("notificacoes").insert({ titulo: `🔄 ${autorNome} avançou etapa`, mensagem: `${autorNome} avançou a etapa para ${novaEtapaNome} no projeto ${clienteNome}.`, criado_por: currentUser.id, destinatario_user_id: seg.user_id, metadata: { card_id: cardId } });
      }
    } catch (err) { console.error("Erro ao notificar seguidores sobre avanço:", err); }
  }

  async function registrarSaidaEtapa(cardId: string, etapaId: string, slaPrevisto?: number | null) {
    const { data } = await supabase.from("painel_historico_etapas").select("id, entrada_em").eq("card_id", cardId).eq("etapa_id", etapaId).is("saida_em", null).order("entrada_em", { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const now = new Date(); const tempoReal = Math.round(((now.getTime() - new Date(data[0].entrada_em).getTime()) / (1000 * 60 * 60)) * 100) / 100;
      const slaCumprido = slaPrevisto != null && slaPrevisto > 0 ? tempoReal <= slaPrevisto : null;
      await supabase.from("painel_historico_etapas").update({ saida_em: now.toISOString(), sla_previsto_horas: slaPrevisto ?? null, tempo_real_horas: tempoReal, sla_cumprido: slaCumprido }).eq("id", data[0].id);
    }
  }

  // ─── Action handlers ──────────────────────────────────────────────────────
  async function handlePausarProjeto() {
    if (!detailCard || !pausarMotivo.trim()) return;
    setPausando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const standbyEtapa = etapas.find(e => e.nome.toLowerCase() === "standby");
      if (!standbyEtapa) { toast.error("Etapa 'Standby' não encontrada."); setPausando(false); return; }
      const sla = getSlaEtapaForCard(detailCard, jornadaSlaMap, etapas);
      await registrarSaidaEtapa(detailCard.id, detailCard.etapa_id, sla);
      const autorNome = profile?.full_name?.split(" ")[0] || "Usuário";
      await supabase.from("painel_comentarios").insert({ card_id: detailCard.id, etapa_id: detailCard.etapa_id, criado_por: user.id, texto: `⏸️ Projeto pausado por ${autorNome}: ${pausarMotivo.trim()}` });
      await registrarEntradaEtapa(detailCard.id, standbyEtapa.id, standbyEtapa.nome);
      const { error } = await supabase.from("painel_atendimento").update({ pausado: true, pausado_em: new Date().toISOString(), pausado_por: user.id, pausado_motivo: pausarMotivo.trim(), iniciado_em: null, iniciado_por: null, etapa_id: standbyEtapa.id, status_projeto: "pausado", etapa_origem_id: detailCard.etapa_id } as any).eq("id", detailCard.id);
      if (error) throw error;
      if (apontamentoUsuarios.length > 0) {
        const clienteNome = detailCard.clientes?.nome_fantasia || "Cliente";
        await supabase.from("painel_apontamentos").insert(apontamentoUsuarios.map(uid => ({ card_id: detailCard.id, usuario_id: uid, apontado_por: user.id, motivo: pausarMotivo.trim() })) as any);
        for (const uid of apontamentoUsuarios) { const prof = responsaveis.find((r: any) => r.id === uid); await supabase.from("notificacoes").insert({ titulo: "📌 Apontamento - Projeto Pausado", mensagem: `Você foi designado(a) para resolver uma pendência do projeto ${clienteNome}. Motivo: ${pausarMotivo.trim()}`, tipo: "alerta", criado_por: user.id, destinatario_user_id: (prof as any)?.user_id || uid, metadata: { card_id: detailCard.id } } as any); }
        const nomes = apontamentoUsuarios.map(uid => { const p = responsaveis.find((r: any) => r.id === uid); return (p as any)?.full_name?.split(" ")[0] || "Usuário"; });
        await supabase.from("painel_comentarios").insert({ card_id: detailCard.id, etapa_id: standbyEtapa.id, criado_por: user.id, texto: `📌 Apontamento: ${nomes.join(", ")} designado(s) para resolução.` });
      }
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); queryClient.invalidateQueries({ queryKey: ["card_apontamentos"] });
      toast.success("Projeto pausado e movido para Standby!"); setPausarOpen(false); setPausarMotivo(""); setApontamentoUsuarios([]); setBuscaApontamento(""); setDetailCard(null);
    } catch (err: any) { toast.error("Erro ao pausar projeto: " + (err.message || "")); } finally { setPausando(false); }
  }

  async function handleRecusarProjeto() {
    if (!detailCard || !recusarMotivo.trim()) return;
    setRecusando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const standbyEtapa = etapas.find(e => e.nome.toLowerCase() === "standby");
      if (!standbyEtapa) { toast.error("Etapa 'Standby' não encontrada."); setRecusando(false); return; }
      const sla = getSlaEtapaForCard(detailCard, jornadaSlaMap, etapas);
      await registrarSaidaEtapa(detailCard.id, detailCard.etapa_id, sla);
      const autorNome = profile?.full_name?.split(" ")[0] || "Usuário";
      await supabase.from("painel_comentarios").insert({ card_id: detailCard.id, etapa_id: detailCard.etapa_id, criado_por: user.id, texto: `❌ Projeto recusado por ${autorNome}: ${recusarMotivo.trim()}` });
      await registrarEntradaEtapa(detailCard.id, standbyEtapa.id, standbyEtapa.nome);
      const { error } = await supabase.from("painel_atendimento").update({ pausado: true, pausado_em: new Date().toISOString(), pausado_por: user.id, pausado_motivo: recusarMotivo.trim(), iniciado_em: null, iniciado_por: null, etapa_id: standbyEtapa.id, status_projeto: "recusado", etapa_origem_id: detailCard.etapa_id } as any).eq("id", detailCard.id);
      if (error) throw error;
      if (apontamentoUsuarios.length > 0) {
        const clienteNome = detailCard.clientes?.nome_fantasia || "Cliente";
        await supabase.from("painel_apontamentos").insert(apontamentoUsuarios.map(uid => ({ card_id: detailCard.id, usuario_id: uid, apontado_por: user.id, motivo: recusarMotivo.trim() })) as any);
        for (const uid of apontamentoUsuarios) { const prof = responsaveis.find((r: any) => r.id === uid); await supabase.from("notificacoes").insert({ titulo: "📌 Apontamento - Projeto Recusado", mensagem: `Você foi designado(a) para resolver uma pendência do projeto ${clienteNome}. Motivo: ${recusarMotivo.trim()}`, tipo: "alerta", criado_por: user.id, destinatario_user_id: (prof as any)?.user_id || uid, metadata: { card_id: detailCard.id } } as any); }
        const nomes = apontamentoUsuarios.map(uid => { const p = responsaveis.find((r: any) => r.id === uid); return (p as any)?.full_name?.split(" ")[0] || "Usuário"; });
        await supabase.from("painel_comentarios").insert({ card_id: detailCard.id, etapa_id: standbyEtapa.id, criado_por: user.id, texto: `📌 Apontamento: ${nomes.join(", ")} designado(s) para resolução.` });
      }
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); queryClient.invalidateQueries({ queryKey: ["card_apontamentos"] });
      toast.success("Projeto recusado e movido para Standby!"); setRecusarOpen(false); setRecusarMotivo(""); setApontamentoUsuarios([]); setBuscaApontamento(""); setDetailCard(null);
    } catch (err: any) { toast.error("Erro ao recusar projeto: " + (err.message || "")); } finally { setRecusando(false); }
  }

  async function handleResetarProjeto() {
    if (!detailCard || !resetarMotivo.trim()) return;
    setResetando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data: filialData } = await supabase.from("filiais").select("etapa_inicial_id").eq("id", detailCard.filial_id).single();
      let etapaDestinoId = filialData?.etapa_inicial_id;
      if (!etapaDestinoId) { const primeiraEtapa = etapas.find(e => e.ativo); if (!primeiraEtapa) { toast.error("Nenhuma etapa ativa encontrada."); setResetando(false); return; } etapaDestinoId = primeiraEtapa.id; }
      await supabase.from("painel_historico_etapas").delete().eq("card_id", detailCard.id);
      await supabase.from("painel_checklist_progresso").delete().eq("card_id", detailCard.id);
      await supabase.from("painel_agendamentos").delete().eq("card_id", detailCard.id);
      const etapaDestino = etapas.find(e => e.id === etapaDestinoId);
      await registrarEntradaEtapa(detailCard.id, etapaDestinoId!, etapaDestino?.nome || "Etapa Inicial");
      const { error } = await supabase.from("painel_atendimento").update({ etapa_id: etapaDestinoId, iniciado_em: null, iniciado_por: null, pausado: false, pausado_em: null, pausado_por: null, pausado_motivo: null, status_projeto: "ativo", etapa_origem_id: null } as any).eq("id", detailCard.id);
      if (error) throw error;
      const autorNome = profile?.full_name?.split(" ")[0] || "Usuário";
      await supabase.from("painel_comentarios").insert({ card_id: detailCard.id, etapa_id: etapaDestinoId, criado_por: user.id, texto: `🔄 Projeto resetado por ${autorNome}: ${resetarMotivo.trim()}` });
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); toast.success("Projeto resetado com sucesso!"); setResetarOpen(false); setResetarMotivo(""); setDetailCard(null);
    } catch (err: any) { toast.error("Erro ao resetar projeto: " + (err.message || "")); } finally { setResetando(false); }
  }

  async function handleCancelarProjeto() {
    if (!detailCard || !cancelarMotivo.trim()) return;
    setCancelando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      await supabase.from("projetos_cancelados").insert({ card_id: detailCard.id, contrato_id: detailCard.contrato_id, cliente_id: detailCard.cliente_id, filial_id: detailCard.filial_id, motivo: cancelarMotivo.trim(), cancelado_por: user.id, tipo_operacao: detailCard.tipo_operacao, plano_nome: detailCard.planos?.nome || null, cliente_nome: detailCard.clientes?.nome_fantasia || null, contrato_numero: detailCard.contratos?.numero_exibicao || null } as any);
      const { error } = await supabase.from("painel_atendimento").update({ status_projeto: "cancelado" } as any).eq("id", detailCard.id);
      if (error) throw error;
      const autorNome = profile?.full_name?.split(" ")[0] || "Usuário";
      await supabase.from("painel_comentarios").insert({ card_id: detailCard.id, etapa_id: detailCard.etapa_id, criado_por: user.id, texto: `❌ Projeto cancelado por ${autorNome}: ${cancelarMotivo.trim()}` });
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); toast.success("Projeto cancelado com sucesso!"); setCancelarOpen(false); setCancelarMotivo("");
      const { data: agendamentos } = await supabase.from("painel_agendamentos").select("*, painel_atendimento!inner(clientes(nome_fantasia), contratos(numero_exibicao))").eq("card_id", detailCard.id).order("data");
      if (agendamentos && agendamentos.length > 0) { setAgendamentosCancelados(agendamentos); setAgendamentosCancelOpen(true); } else { setDetailCard(null); }
    } catch (err: any) { toast.error("Erro ao cancelar projeto: " + (err.message || "")); } finally { setCancelando(false); }
  }

  async function handleRemoverAgendamentosCancelados() {
    setRemovendoAgendamentos(true);
    try { const ids = agendamentosCancelados.map(a => a.id); await supabase.from("painel_agendamentos").delete().in("id", ids); toast.success(`${ids.length} agendamento(s) removido(s)!`); } catch (err: any) { toast.error("Erro ao remover agendamentos: " + (err.message || "")); } finally { setRemovendoAgendamentos(false); setAgendamentosCancelOpen(false); setAgendamentosCancelados([]); setDetailCard(null); }
  }

  async function handleApontamento() {
    if (!apontamentoCardId || apontamentoUsuarios.length === 0) return;
    setApontando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const card = cards.find(c => c.id === apontamentoCardId) || detailCard;
      const clienteNome = card?.clientes?.nome_fantasia || "Cliente";
      const existingApontados = (cardApontamentosDetalhado[apontamentoCardId] || []).map(a => a.usuario_id);
      const novosUsuarios = apontamentoUsuarios.filter(uid => !existingApontados.includes(uid));
      if (novosUsuarios.length === 0) { toast.info("Todos os usuários selecionados já estão apontados."); setApontando(false); return; }
      const { error } = await supabase.from("painel_apontamentos").insert(novosUsuarios.map(uid => ({ card_id: apontamentoCardId, usuario_id: uid, apontado_por: user.id, motivo: card?.pausado_motivo || null })) as any);
      if (error) throw error;
      for (const uid of novosUsuarios) { const prof = responsaveis.find((r: any) => r.id === uid); await supabase.from("notificacoes").insert({ titulo: "📌 Apontamento de Resolução", mensagem: `Você foi designado(a) para resolver uma pendência do projeto ${clienteNome}. Motivo: ${card?.pausado_motivo || "Não informado"}`, tipo: "alerta", criado_por: user.id, destinatario_user_id: (prof as any)?.user_id || uid, metadata: { card_id: card?.id || detailCard?.id } } as any); }
      const nomes = novosUsuarios.map(uid => { const p = responsaveis.find((r: any) => r.id === uid); return (p as any)?.full_name?.split(" ")[0] || "Usuário"; });
      await supabase.from("painel_comentarios").insert({ card_id: apontamentoCardId, etapa_id: card?.etapa_id || null, criado_por: user.id, texto: `📌 Apontamento: ${nomes.join(", ")} designado(s) para resolução.` });
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); queryClient.invalidateQueries({ queryKey: ["card_apontamentos"] });
      toast.success(`${novosUsuarios.length} usuário(s) designado(s)!`); setApontamentoOpen(false); setApontamentoUsuarios([]); setApontamentoCardId(null); setBuscaApontamento("");
    } catch (err: any) { toast.error("Erro ao realizar apontamento: " + (err.message || "")); } finally { setApontando(false); }
  }

  async function handleRemoverApontamento(apontamentoId: string, cardId: string) {
    try { const { error } = await supabase.from("painel_apontamentos").delete().eq("id", apontamentoId); if (error) throw error; queryClient.invalidateQueries({ queryKey: ["card_apontamentos"] }); toast.success("Apontamento removido!"); } catch (err: any) { toast.error("Erro ao remover apontamento: " + (err.message || "")); }
  }

  async function handleDespausar() {
    if (!detailCard || !retomarComentario.trim()) return;
    setRetomando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      const cardId = detailCard.id;
      const etapaOrigemId = detailCard.etapa_origem_id;
      let targetEtapaId = detailCard.etapa_id;
      if (etapaOrigemId) {
        targetEtapaId = etapaOrigemId;
        const sla = getSlaEtapaForCard(detailCard, jornadaSlaMap, etapas);
        await registrarSaidaEtapa(cardId, detailCard.etapa_id, sla);
        const etapaOrigem = etapas.find(e => e.id === etapaOrigemId);
        if (etapaOrigem) await registrarEntradaEtapa(cardId, etapaOrigemId, etapaOrigem.nome);
      }
      const now = new Date().toISOString();
      const statusLabel = detailCard.status_projeto === "recusado" ? "Recusa" : "Pausa";
      await supabase.from("painel_comentarios").insert({ card_id: cardId, etapa_id: targetEtapaId || detailCard.etapa_id, criado_por: user.id, texto: `▶️ Projeto retomado (resposta à ${statusLabel}): ${retomarComentario.trim()}` });
      const { error } = await supabase.from("painel_atendimento").update({ pausado: false, pausado_em: null, pausado_por: null, pausado_motivo: null, iniciado_em: null, iniciado_por: null, responsavel_id: prof?.id || null, status_projeto: "ativo", etapa_origem_id: null, etapa_id: targetEtapaId, updated_at: now } as any).eq("id", cardId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); toast.success("Projeto retomado!"); setRetomarOpen(false); setRetomarComentario(""); setDetailCard(null);
    } catch (err: any) { toast.error("Erro ao retomar projeto: " + (err.message || "")); } finally { setRetomando(false); }
  }

  // Auto-create history entry
  useEffect(() => {
    if (!detailCard) return;
    (async () => {
      const etapa = etapas.find((e) => e.id === detailCard.etapa_id);
      if (!etapa) return;
      const { data } = await supabase.from("painel_historico_etapas").select("id").eq("card_id", detailCard.id).eq("etapa_id", detailCard.etapa_id).is("saida_em", null).limit(1);
      if (!data || data.length === 0) {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("painel_historico_etapas").insert({ card_id: detailCard.id, etapa_id: detailCard.etapa_id, etapa_nome: etapa.nome, entrada_em: detailCard.updated_at, usuario_id: user?.id || null });
      }
    })();
  }, [detailCard?.id, detailCard?.etapa_id, etapas]);

  async function finalizarEtapa() {
    if (!detailCard) return;
    setFinalizando(true);
    try {
      const etapaAtualIdx = etapas.findIndex((e) => e.id === detailCard.etapa_id);
      const proximaEtapa = etapas[etapaAtualIdx + 1];
      if (!proximaEtapa) { toast.error("Não há próxima etapa configurada."); return; }
      await registrarSaidaEtapa(detailCard.id, detailCard.etapa_id, slaEtapaJornada);
      await registrarEntradaEtapa(detailCard.id, proximaEtapa.id, proximaEtapa.nome);
      const { error } = await supabase.from("painel_atendimento").update({ etapa_id: proximaEtapa.id, iniciado_em: null, iniciado_por: null }).eq("id", detailCard.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
      toast.success(`Avançado para etapa: ${proximaEtapa.nome}`);
      const clienteNomeNotif = detailCard.clientes?.apelido || detailCard.clientes?.nome_fantasia || "Projeto";
      notificarSeguidoresAvanco(detailCard.id, proximaEtapa.nome, clienteNomeNotif);
      setDetailCard(null);
    } catch { toast.error("Erro ao finalizar etapa."); } finally { setFinalizando(false); }
  }

  // ─── Filtered cards ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return cards.filter((c) => {
      if (search && !c.clientes?.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) && !c.contratos?.numero_exibicao?.toLowerCase().includes(search.toLowerCase())) return false;
      if (filtroTipo !== "todos" && c.tipo_operacao !== filtroTipo) return false;
      if (filtroFilial !== "todos" && filtroFilial !== "_init_" && c.filial_id !== filtroFilial) return false;
      if (filtroResponsavel !== "todos") {
        const isResponsavel = c.responsavel_id === filtroResponsavel;
        const isApontado = (cardApontamentosDetalhado[c.id] || []).some(a => a.usuario_id === filtroResponsavel);
        if (!isResponsavel && !isApontado) return false;
      }
      if (filtroEtapa !== "todos" && c.etapa_id !== filtroEtapa) return false;
      if (filtroMesa !== "todos") { if (!c.jornada_id) return false; const mesasDoCard = jornadaMesaMap[c.jornada_id] || []; if (!mesasDoCard.includes(filtroMesa)) return false; }
      return true;
    });
  }, [cards, search, filtroTipo, filtroFilial, filtroResponsavel, filtroEtapa, filtroMesa, cardApontamentosDetalhado, jornadaMesaMap]);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }
  function handleDrop(etapaId: string) {
    if (dragCardId) {
      const card = cards.find((c) => c.id === dragCardId);
      if (card && card.etapa_id !== etapaId) {
        const etapaAtual = etapas.find((e) => e.id === card.etapa_id);
        const etapaDestino = etapas.find((e) => e.id === etapaId);
        if (etapaAtual && etapaDestino && etapaDestino.ordem < etapaAtual.ordem && !podeVoltarEtapa) { toast.error("Você não tem permissão para voltar etapa."); setDragCardId(null); return; }
        if (etapaDestino?.nome === "Em Execução" && etapaAtual && etapaAtual.ordem < 2) { toast.error("Complete as etapas obrigatórias antes de mover para 'Em Execução'."); setDragCardId(null); return; }
        (async () => {
          const dragSla = getSlaEtapaForCard(card, jornadaSlaMap, etapas);
          await registrarSaidaEtapa(card.id, card.etapa_id, dragSla);
          if (etapaDestino) { await registrarEntradaEtapa(card.id, etapaId, etapaDestino.nome); notificarSeguidoresAvanco(card.id, etapaDestino.nome, card.clientes?.apelido || card.clientes?.nome_fantasia || "Projeto"); }
        })();
        moverCard.mutate({ cardId: dragCardId, etapaId });
      }
    }
    setDragCardId(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Atendimento</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{filtered.length} atendimento{filtered.length !== 1 ? "s" : ""} no painel</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={viewMode === "kanban" ? "default" : "outline"} size="sm" onClick={() => setViewMode("kanban")}><LayoutGrid className="h-4 w-4 mr-1" /> Kanban</Button>
            <Button variant={viewMode === "lista" ? "default" : "outline"} size="sm" onClick={() => setViewMode("lista")}><List className="h-4 w-4 mr-1" /> Lista</Button>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => atualizarPainel()} disabled={syncing} title="Atualizar painel"><RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} /></Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar cliente ou contrato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-60" /></div>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}><SelectTrigger className="h-9 w-44"><SelectValue placeholder="Tipo da Operação" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os tipos</SelectItem>{TIPOS_UNICOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          <Select value={filtroEtapa} onValueChange={setFiltroEtapa}><SelectTrigger className="h-9 w-44"><SelectValue placeholder="Etapa" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as etapas</SelectItem>{etapas.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent></Select>
          <Select value={filtroFilial} onValueChange={setFiltroFilial}><SelectTrigger className="h-9 w-40"><SelectValue placeholder="Filial" /></SelectTrigger><SelectContent>{filiaisDoUsuario.length > 1 && <SelectItem value="todos">Todas as filiais</SelectItem>}{(filiaisDoUsuario.length > 0 ? filiaisDoUsuario : todasFiliais).map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent></Select>
          <Select value={filtroResponsavel} onValueChange={setFiltroResponsavel}><SelectTrigger className="h-9 w-44"><SelectValue placeholder="Responsável" /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{responsaveis.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}</SelectContent></Select>
          <Select value={filtroMesa} onValueChange={setFiltroMesa}><SelectTrigger className="h-9 w-44"><SelectValue placeholder="Mesa" /></SelectTrigger><SelectContent><SelectItem value="todos">Todas as mesas</SelectItem>{mesasAtendimento.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select>
        </div>

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <div className="flex gap-3 overflow-x-auto pb-4 -mx-2 px-2">
            {etapas.map((etapa) => {
              const etapaCards = filtered.filter((c) => c.etapa_id === etapa.id).sort((a, b) => {
                const dateA = new Date(a.created_at).getTime(); const dateB = new Date(b.created_at).getTime();
                return etapa.ordem_entrada === "ultimo_acima" ? dateB - dateA : dateA - dateB;
              });
              return (
                <div key={etapa.id} onDragOver={handleDragOver} onDrop={() => handleDrop(etapa.id)} className="flex-shrink-0 w-72">
                  <div className="rounded-t-lg px-3 py-2 flex items-center justify-between border-t-[3px] bg-muted/40" style={{ borderTopColor: etapa.cor || 'hsl(var(--muted))' }}>
                    <span className="font-semibold text-sm text-foreground">{etapa.nome}</span>
                    <Badge variant="secondary" className="text-xs px-1.5">{etapaCards.length}</Badge>
                  </div>
                  <div className="bg-muted/20 rounded-b-lg border border-t-0 border-border/40 min-h-[200px] p-2 space-y-2">
                    {etapaCards.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8 italic">Nenhum card</p>
                    ) : etapaCards.map((card) => (
                      <KanbanCard
                        key={card.id}
                        card={card}
                        etapas={etapas}
                        jornadaSlaMap={jornadaSlaMap}
                        totalChecklistPorPlano={totalChecklistPorPlano}
                        cardProgressMap={cardProgressMap}
                        cardApontamentosMap={cardApontamentosMap}
                        pedidoPrioridadeMap={pedidoPrioridadeMap}
                        responsaveis={responsaveis}
                        onDragStart={(id) => setDragCardId(id)}
                        onClick={(c) => setDetailCard(c)}
                      />
                    ))}
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
              <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Contrato</TableHead><TableHead>Tipo</TableHead><TableHead>Etapa</TableHead><TableHead>Filial</TableHead><TableHead>Plano</TableHead><TableHead>Responsável</TableHead><TableHead className="text-center">SLA</TableHead><TableHead className="text-center">Progresso</TableHead></TableRow></TableHeader>
              <TableBody>
                {isLoading ? (<TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
                ) : filtered.length === 0 ? (<TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum atendimento encontrado.</TableCell></TableRow>
                ) : filtered.map((card) => {
                  const etapa = etapas.find((e) => e.id === card.etapa_id);
                  const progress = calcProgress(card, totalChecklistPorPlano, cardProgressMap);
                  return (
                    <TableRow key={card.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetailCard(card)}>
                      <TableCell className="font-medium">{card.clientes?.nome_fantasia || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{card.contratos?.numero_exibicao || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-xs gap-1", TIPO_COLORS[card.tipo_operacao] || "")}>{TIPO_ICONS[card.tipo_operacao]}{card.tipo_operacao}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs">{etapa?.nome || "—"}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{card.filiais?.nome || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{card.planos?.nome || "—"}</TableCell>
                      <TableCell className="text-sm">{card.profiles?.full_name || <span className="text-muted-foreground italic">Não atribuído</span>}</TableCell>
                      <TableCell className="text-center text-sm">{formatSLA(card.sla_horas)}</TableCell>
                      <TableCell className="text-center"><div className="flex items-center gap-2 justify-center"><Progress value={progress} className="h-1.5 w-16" /><span className="text-xs text-muted-foreground">{progress}%</span></div></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* ═══════════════════════ CARD DETAIL DIALOG ═══════════════════════════ */}
      {/* NOTE: This large dialog block (~1300 lines) is kept inline intentionally.
          Extracting it requires passing 40+ props and risks regression.
          It will be extracted in a future phase. */}
      <Dialog open={!!detailCard} onOpenChange={(open) => { if (!open) { setDetailCard(null); setConfigEditMode(false); if (openedFrom === "agenda") { navigate("/agenda"); } setOpenedFrom(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                {detailCard && TIPO_ICONS[detailCard.tipo_operacao]}
                {detailCard?.clientes?.nome_fantasia || "Detalhes"}
              </div>
              {detailCard?.clientes?.apelido && <span className="text-xs font-normal text-muted-foreground">{detailCard.clientes.apelido}</span>}
            </DialogTitle>
          </DialogHeader>
          {detailCard && (
            <div className="space-y-4 overflow-y-auto flex-1 pr-1">
              {/* Botão Iniciar / Em Andamento / Pausado + Progresso */}
              <div className="space-y-2">
                {/* Recusado banner */}
                {(detailCard as any).status_projeto === "recusado" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-red-700"><Ban className="h-4 w-4" /><span className="text-sm font-semibold">Projeto Recusado</span></div>
                    {detailCard.pausado_motivo && <p className="text-xs text-red-600">Motivo: {detailCard.pausado_motivo}</p>}
                    {detailCard.pausado_em && <p className="text-[10px] text-muted-foreground">Recusado em {new Date(detailCard.pausado_em).toLocaleDateString("pt-BR")} às {new Date(detailCard.pausado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{detailCard.pausado_por && (() => { const autor = responsaveis.find((r: any) => r.id === detailCard.pausado_por); return autor ? ` por ${(autor as any).full_name?.split(" ")[0]}` : ""; })()}</p>}
                    {cardApontamentosDetalhado[detailCard.id]?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><UserPlus className="h-3 w-3" />Apontados:</p>
                        {cardApontamentosDetalhado[detailCard.id].map((ap) => (
                          <div key={ap.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5"><UserAvatar avatarUrl={ap.avatar_url} fullName={ap.nome} size="xs" /><span className="text-muted-foreground">{ap.nome}</span></div>
                            {podeGerenciarApontamento && <Button variant="ghost" size="sm" className="h-5 px-1 text-destructive hover:text-destructive" onClick={() => handleRemoverApontamento(ap.id, detailCard.id)}><XCircle className="h-3 w-3" /></Button>}
                          </div>
                        ))}
                        {podeGerenciarApontamento && <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 mt-1" onClick={() => { setApontamentoCardId(detailCard.id); setApontamentoOpen(true); }}><UserPlus className="h-3 w-3" /> Adicionar</Button>}
                      </div>
                    )}
                    {(!cardApontamentosDetalhado[detailCard.id] || cardApontamentosDetalhado[detailCard.id].length === 0) && podeGerenciarApontamento && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { setApontamentoCardId(detailCard.id); setApontamentoOpen(true); }}><UserPlus className="h-3 w-3" /> Apontar responsável</Button>
                    )}
                  </div>
                )}
                {/* Pausado banner */}
                {detailCard.pausado && (detailCard as any).status_projeto !== "recusado" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700"><PauseCircle className="h-4 w-4" /><span className="text-sm font-semibold">Projeto Pausado</span></div>
                    {detailCard.pausado_motivo && <p className="text-xs text-amber-600">Motivo: {detailCard.pausado_motivo}</p>}
                    {detailCard.pausado_em && <p className="text-[10px] text-muted-foreground">Pausado em {new Date(detailCard.pausado_em).toLocaleDateString("pt-BR")} às {new Date(detailCard.pausado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}{detailCard.pausado_por && (() => { const autor = responsaveis.find((r: any) => r.id === detailCard.pausado_por); return autor ? ` por ${(autor as any).full_name?.split(" ")[0]}` : ""; })()}</p>}
                    {cardApontamentosDetalhado[detailCard.id]?.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><UserPlus className="h-3 w-3" />Apontados:</p>
                        {cardApontamentosDetalhado[detailCard.id].map((ap) => (
                          <div key={ap.id} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5"><UserAvatar avatarUrl={ap.avatar_url} fullName={ap.nome} size="xs" /><span className="text-muted-foreground">{ap.nome}</span></div>
                            {podeGerenciarApontamento && <Button variant="ghost" size="sm" className="h-5 px-1 text-destructive hover:text-destructive" onClick={() => handleRemoverApontamento(ap.id, detailCard.id)}><XCircle className="h-3 w-3" /></Button>}
                          </div>
                        ))}
                        {podeGerenciarApontamento && <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 mt-1" onClick={() => { setApontamentoCardId(detailCard.id); setApontamentoOpen(true); }}><UserPlus className="h-3 w-3" /> Adicionar</Button>}
                      </div>
                    )}
                    {(!cardApontamentosDetalhado[detailCard.id] || cardApontamentosDetalhado[detailCard.id].length === 0) && podeGerenciarApontamento && (
                      <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => { setApontamentoCardId(detailCard.id); setApontamentoOpen(true); }}><UserPlus className="h-3 w-3" /> Apontar responsável</Button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {detailCard.pausado ? (
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={(e) => { e.stopPropagation(); setRetomarOpen(true); }}><Play className="h-4 w-4 mr-1" />Retomar Projeto</Button>
                  ) : detailCard.iniciado_em ? (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled><Play className="h-4 w-4 mr-1" />Em andamento</Button>
                  ) : (
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={(e) => { e.stopPropagation(); iniciarAtendimento.mutate(detailCard.id); setDetailCard({ ...detailCard, iniciado_em: new Date().toISOString() }); }} disabled={iniciarAtendimento.isPending}><Play className="h-4 w-4 mr-1" />{iniciarAtendimento.isPending ? "Iniciando..." : "Iniciar Etapa"}</Button>
                  )}
                  {detailCard.iniciado_em && <span className="text-xs text-muted-foreground">Iniciado em {new Date(detailCard.iniciado_em).toLocaleDateString("pt-BR")} às {new Date(detailCard.iniciado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>}
                  {!detailCard.iniciado_em && isInicioAtrasado(detailCard, etapas) && <Badge variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" />Tarefa Atrasada</Badge>}
                  {!detailCard.iniciado_em && (() => { const tempo = getTempoRestante(detailCard, etapas); return tempo ? <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><Clock className="h-3 w-3" />Vence em {tempo}h</span> : null; })()}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Progresso do Projeto</p>
                  <div className="flex items-center gap-2"><Progress value={calcProgress(detailCard, totalChecklistPorPlano, cardProgressMap)} className="h-2 flex-1" /><span className="text-sm font-medium">{calcProgress(detailCard, totalChecklistPorPlano, cardProgressMap)}%</span></div>
                  {(() => { const etapaAtual = etapas.find(e => e.id === detailCard.etapa_id); if (!etapaAtual) return null; return (<div className="flex items-center gap-1.5 mt-1"><span className="text-xs text-muted-foreground">Etapa:</span><Badge variant="outline" className="text-[10px] font-medium border" style={{ backgroundColor: etapaAtual.cor ? `${etapaAtual.cor}20` : undefined, color: etapaAtual.cor || undefined, borderColor: etapaAtual.cor ? `${etapaAtual.cor}60` : undefined }}>{etapaAtual.nome}</Badge></div>); })()}
                </div>
              </div>

              {/* Info grid */}
              <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-xs">
                <div><p className="text-muted-foreground">Tipo</p><div className="flex items-center gap-1 font-medium">{TIPO_ICONS[detailCard.tipo_operacao]}<Badge variant="outline" className={cn("text-[10px]", TIPO_COLORS[detailCard.tipo_operacao])}>{detailCard.tipo_operacao}</Badge></div></div>
                <div><p className="text-muted-foreground">Contrato</p><p className="font-medium">{detailCard.contratos?.numero_exibicao || "—"}</p></div>
                <div><p className="text-muted-foreground">Filial</p><p className="font-medium flex items-center gap-1"><Building2 className="h-3 w-3" />{detailCard.filiais?.nome || "—"}</p></div>
                <div><p className="text-muted-foreground">SLA Etapa</p><p className="font-medium">{formatSLA(slaEtapaJornada || 0)}</p></div>
                <div><p className="text-muted-foreground">SLA Projeto</p><p className="font-medium">{formatSLA(slaProjeto || 0)}</p></div>
                {detailCard.iniciado_em && slaEtapaJornada && slaEtapaJornada > 0 && (
                  <div><p className="text-muted-foreground">Vencimento SLA</p>{(() => { const venc = getVencimentoSla(detailCard.iniciado_em, slaEtapaJornada); const atrasado = isEtapaSlaAtrasado(detailCard, jornadaSlaMap, etapas); const tempoExcedido = getTempoExcedidoSla(detailCard, jornadaSlaMap, etapas); return venc ? (<div><p className={cn("font-medium", atrasado && "text-destructive")}>{venc.toLocaleDateString("pt-BR")} {venc.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>{atrasado && tempoExcedido && <Badge variant="destructive" className="text-[10px] mt-0.5 gap-1"><AlertTriangle className="h-2.5 w-2.5" />SLA Atrasado: {tempoExcedido}</Badge>}</div>) : <p className="font-medium">—</p>; })()}</div>
                )}
                {(detailCard.profiles?.full_name || (cardApontamentosDetalhado[detailCard.id]?.length > 0)) && (
                  <div><p className="text-muted-foreground">Responsável</p>
                    {detailCard.profiles?.full_name && <p className="font-medium flex items-center gap-1"><User className="h-3 w-3" />{detailCard.profiles.full_name} <span className="text-muted-foreground text-xs font-normal">(iniciou)</span></p>}
                    {cardApontamentosDetalhado[detailCard.id]?.length > 0 && <div className="mt-1 space-y-0.5">{cardApontamentosDetalhado[detailCard.id].map((ap) => <p key={ap.id} className="font-medium flex items-center gap-1.5 text-sm"><UserAvatar avatarUrl={ap.avatar_url} fullName={ap.nome} size="xs" />{ap.nome} <span className="text-muted-foreground text-xs font-normal">(apontado)</span></p>)}</div>}
                  </div>
                )}
                {detailCard.tipo_atendimento_local && <div><p className="text-muted-foreground">Atendimento</p><p className="font-medium">{detailCard.tipo_atendimento_local}</p></div>}
                {detailCard.tipo_operacao === "Upgrade" && planoAnteriorNome && <div className="col-span-2"><p className="text-muted-foreground">Plano</p><p className="font-medium flex items-center gap-1">{planoAnteriorNome} <ArrowRight className="h-3 w-3" /> {detailCard.planos?.nome || "—"}</p></div>}
                {detailCard.tipo_operacao !== "Upgrade" && detailCard.planos?.nome && <div><p className="text-muted-foreground">Plano</p><p className="font-medium">{detailCard.planos.nome}</p></div>}
              </div>

              {/* Checklist da Etapa */}
              {checklistLoading && checklistEtapa.length === 0 && (
                <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                  <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded" /><Skeleton className="h-4 w-40" /></div>
                  <Skeleton className="h-2 w-full rounded-full" /><div className="space-y-2"><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-full" /><Skeleton className="h-6 w-3/4" /></div>
                </div>
              )}
              {checklistEtapa.length > 0 && (() => {
                const totalItens = checklistEtapa.reduce((acc: number, a: any) => acc + (Array.isArray(a.checklist) ? a.checklist.length : 0), 0);
                const totalConcluidos = checklistEtapa.reduce((acc: number, a: any) => {
                  const items = Array.isArray(a.checklist) ? a.checklist : [];
                  return acc + items.filter((_: any, idx: number) => checklistProgresso[`${a.id}_${idx}`]?.concluido).length;
                }, 0);
                const etapaProgress = totalItens > 0 ? Math.round((totalConcluidos / totalItens) * 100) : 0;
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4 text-primary" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Checklist da Etapa</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {podeEditarChecklist && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setChecklistEditMode(!checklistEditMode)} title={checklistEditMode ? "Bloquear edição" : "Editar checklist"}>
                            <Pencil className={cn("h-3.5 w-3.5", checklistEditMode ? "text-primary" : "text-muted-foreground")} />
                          </Button>
                        )}
                        <span className="text-[10px] font-semibold text-muted-foreground">{totalConcluidos}/{totalItens}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2"><Progress value={etapaProgress} className="h-1.5 flex-1" /><span className="text-[10px] font-semibold text-muted-foreground">{etapaProgress}%</span></div>
                    <div className="space-y-3">
                      {checklistEtapa.map((atividade: any) => {
                        const items: ChecklistItem[] = Array.isArray(atividade.checklist) ? atividade.checklist : [];
                        if (items.length === 0) return null;
                        return (
                          <div key={atividade.id}>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-xs font-medium text-muted-foreground">{atividade.nome}</p>
                              {atividade.mesas_atendimento?.nome && <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-1" style={{ backgroundColor: atividade.mesas_atendimento.cor ? `${atividade.mesas_atendimento.cor}15` : undefined, color: atividade.mesas_atendimento.cor || undefined, borderColor: atividade.mesas_atendimento.cor ? `${atividade.mesas_atendimento.cor}40` : undefined }}>{atividade.mesas_atendimento.nome}</Badge>}
                              {atividade.horas_estimadas > 0 && <span className="text-[10px] text-muted-foreground ml-auto"><Clock className="h-2.5 w-2.5 inline mr-0.5" />{formatSLA(atividade.horas_estimadas)}</span>}
                            </div>
                            <ul className="space-y-1 pl-1">
                              {items.map((item: ChecklistItem, idx: number) => {
                                const key = `${atividade.id}_${idx}`;
                                const prog = checklistProgresso[key] || { concluido: false };
                                const tipoLabel = CHECKLIST_TIPO_LABELS[item.tipo] || item.tipo;
                                return (
                                  <li key={idx} className="flex flex-col gap-0.5 text-xs border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                      <Checkbox checked={prog.concluido} disabled={!checklistEditMode && !podeEditarChecklist} onCheckedChange={(checked) => saveChecklistItem(atividade.id, idx, { concluido: !!checked })} className="shrink-0" />
                                      <span className={cn("flex-1", prog.concluido && "line-through text-muted-foreground")}>{item.texto || "(sem texto)"}</span>
                                      {item.tipo === "sim_nao" && (
                                        <div className="flex gap-1 shrink-0">
                                          <Button variant={prog.valor_texto === "sim" ? "default" : "outline"} size="sm" className="h-5 px-1.5 text-[10px]" disabled={!checklistEditMode && !podeEditarChecklist} onClick={() => saveChecklistItem(atividade.id, idx, { valor_texto: prog.valor_texto === "sim" ? "" : "sim" })}>Sim</Button>
                                          <Button variant={prog.valor_texto === "nao" ? "destructive" : "outline"} size="sm" className="h-5 px-1.5 text-[10px]" disabled={!checklistEditMode && !podeEditarChecklist} onClick={() => saveChecklistItem(atividade.id, idx, { valor_texto: prog.valor_texto === "nao" ? "" : "nao" })}>Não</Button>
                                        </div>
                                      )}
                                      {item.tipo === "data" && <Input type="date" className="h-5 w-32 text-[10px] px-1" value={prog.valor_data || ""} disabled={!checklistEditMode && !podeEditarChecklist} onChange={(e) => saveChecklistItem(atividade.id, idx, { valor_data: e.target.value })} />}
                                      {item.tipo === "texto" && <Input className="h-5 w-40 text-[10px] px-1" placeholder="Valor..." value={prog.valor_texto || ""} disabled={!checklistEditMode && !podeEditarChecklist} onChange={(e) => saveChecklistItem(atividade.id, idx, { valor_texto: e.target.value })} />}
                                      {detailCard.aponta_tecnico_agenda && prog.concluido && !prog.valor_data && (
                                        <AgendamentoChecklist cardId={detailCard.id} atividadeId={atividade.id} checklistIndex={idx} checklistTexto={item.texto} etapaId={detailCard.etapa_id} filialId={detailCard.filial_id} etapaMesaInfo={etapaMesaInfo} />
                                      )}
                                    </div>
                                    {prog.concluido && prog.concluido_por_nome && (
                                      <div className="flex items-center gap-1.5 pl-6 text-[10px] text-muted-foreground">
                                        <User className="h-2.5 w-2.5" /><span>{prog.concluido_por_nome}</span>
                                        {prog.concluido_em && <><span>·</span><span>{new Date(prog.concluido_em).toLocaleDateString("pt-BR")} {new Date(prog.concluido_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></>}
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

              {/* Detalhes do Agendamento */}
              {(() => {
                const etapaAtual = etapas.find(e => e.id === detailCard.etapa_id);
                const isEtapaAgendamento = etapaAtual?.ordem === 1;
                const configLocked = !isEtapaAgendamento && !configEditMode;
                return (
                  <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Detalhes do Agendamento</p>
                      {!isEtapaAgendamento && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (!configEditMode) { if (!podeEditarConfigProjeto) { toast.error("Você não tem permissão para editar detalhes do agendamento"); return; } setConfigEditMode(true); } else { setConfigEditMode(false); } }} title={configLocked ? "Editar detalhes" : "Bloquear edição"}><Pencil className={cn("h-3.5 w-3.5", configEditMode ? "text-primary" : "text-muted-foreground")} /></Button>}
                    </div>
                    {configLocked && <p className="text-[10px] text-muted-foreground italic">Campos bloqueados. Clique no lápis para editar.</p>}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="aponta-agenda" className="text-xs font-medium flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Aponta Técnico para Agenda</Label>
                      <Switch id="aponta-agenda" checked={detailCard.aponta_tecnico_agenda || false} disabled={configLocked} onCheckedChange={async (checked) => { setDetailCard({ ...detailCard, aponta_tecnico_agenda: checked }); await supabase.from("painel_atendimento").update({ aponta_tecnico_agenda: checked }).eq("id", detailCard.id); if (!checked) { await supabase.from("painel_tecnicos").delete().eq("card_id", detailCard.id); setTecnicosSelecionados([]); } }} />
                    </div>
                    {detailCard.aponta_tecnico_agenda && (() => {
                      const tecnicosFiltrados = tecnicos.filter((tec: any) => tec.full_name.toLowerCase().includes((buscaTecnico || "").toLowerCase()));
                      const tecnicosSelecionadosData = tecnicos.filter((tec: any) => tecnicosSelecionados.includes(tec.id));
                      return (
                        <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                          <Label className="text-xs font-medium flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Técnicos</Label>
                          {tecnicosSelecionadosData.length > 0 && <div className="flex flex-wrap gap-1.5">{tecnicosSelecionadosData.map((tec: any) => <span key={tec.id} className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground shadow-sm">{tec.full_name}{tec.tipo_tecnico && <span className="opacity-70 text-[10px]">· {tec.tipo_tecnico}</span>}{!configLocked && <button type="button" className="ml-0.5 rounded-full hover:bg-primary-foreground/20 p-0.5 transition-colors" onClick={async () => { setTecnicosSelecionados((prev) => prev.filter((id) => id !== tec.id)); await supabase.from("painel_tecnicos").delete().eq("card_id", detailCard.id).eq("tecnico_id", tec.id); }}><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>}</span>)}</div>}
                          {!configLocked && <>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 w-full" onClick={() => setBuscaTecnico(buscaTecnico === null ? "" : null as any)}><Search className="h-3 w-3" />Buscar técnico</Button>
                            {buscaTecnico !== null && <>
                              <div className="relative"><Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Buscar técnico..." value={buscaTecnico || ""} onChange={(e) => setBuscaTecnico(e.target.value)} className="h-8 pl-7 text-xs" autoFocus /></div>
                              <div className="space-y-0.5 max-h-28 overflow-y-auto rounded-md border bg-muted/30 p-1.5">
                                {tecnicos.length === 0 ? <p className="text-[10px] text-muted-foreground italic py-2 text-center">Nenhum técnico cadastrado</p>
                                : tecnicosFiltrados.filter((tec: any) => !tecnicosSelecionados.includes(tec.id)).length === 0 ? <p className="text-[10px] text-muted-foreground italic py-2 text-center">{buscaTecnico ? "Nenhum resultado" : "Todos selecionados"}</p>
                                : tecnicosFiltrados.filter((tec: any) => !tecnicosSelecionados.includes(tec.id)).map((tec: any) => <button key={tec.id} type="button" className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors text-left" onClick={async () => { setTecnicosSelecionados((prev) => [...prev, tec.id]); await supabase.from("painel_tecnicos").insert({ card_id: detailCard.id, tecnico_id: tec.id }); setBuscaTecnico(null as any); }}><User className="h-3 w-3 text-muted-foreground shrink-0" /><span>{tec.full_name}</span>{tec.tipo_tecnico && <span className="text-[10px] text-muted-foreground ml-auto">({tec.tipo_tecnico})</span>}</button>)}
                              </div>
                            </>}
                          </>}
                        </div>
                      );
                    })()}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Tipo de Atendimento</Label>
                      {configLocked ? <p className="text-xs text-foreground">{detailCard.tipo_atendimento_local === "interno" ? "Interno" : detailCard.tipo_atendimento_local === "externo" ? "Externo" : "—"}</p> : (
                        <RadioGroup value={detailCard.tipo_atendimento_local || ""} onValueChange={async (val) => { setDetailCard({ ...detailCard, tipo_atendimento_local: val }); await supabase.from("painel_atendimento").update({ tipo_atendimento_local: val }).eq("id", detailCard.id); }} className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5"><RadioGroupItem value="interno" id="at-interno" /><Label htmlFor="at-interno" className="text-xs cursor-pointer">Interno</Label></div>
                          <div className="flex items-center gap-1.5"><RadioGroupItem value="externo" id="at-externo" /><Label htmlFor="at-externo" className="text-xs cursor-pointer">Externo</Label></div>
                        </RadioGroup>
                      )}
                    </div>
                    {cardAgendamentos.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Agendamentos ({cardAgendamentos.length})</Label>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {cardAgendamentos.map((ag: any) => (
                            <div key={ag.id} className="flex items-center gap-2 bg-muted/50 rounded px-2 py-1.5 text-xs" style={{ borderLeft: ag.painel_etapas?.cor ? `3px solid ${ag.painel_etapas.cor}` : undefined }}>
                              <CalendarDays className="h-3 w-3 text-primary shrink-0" />
                              {configLocked ? <span className="font-medium min-w-[70px]">{new Date(ag.data + "T12:00:00").toLocaleDateString("pt-BR")}</span> : (
                                <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" className="h-6 text-[11px] px-2 min-w-[80px] font-medium">{new Date(ag.data + "T12:00:00").toLocaleDateString("pt-BR")}</Button></PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={new Date(ag.data + "T12:00:00")} onSelect={async (date) => { if (!date) return; const formatted = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; await supabase.from("painel_agendamentos").update({ data: formatted }).eq("id", ag.id); setCardAgendamentos(prev => prev.map(a => a.id === ag.id ? { ...a, data: formatted } : a)); toast.success("Data atualizada!"); }} locale={ptBR} className={cn("p-3 pointer-events-auto")} /></PopoverContent></Popover>
                              )}
                              <div className="flex items-center gap-1"><Clock className="h-2.5 w-2.5 text-muted-foreground" /><Input type="time" className="h-6 w-[75px] text-[11px] px-1" value={ag.hora_inicio || ""} disabled={configLocked} onChange={async (e) => { const val = e.target.value || null; await supabase.from("painel_agendamentos").update({ hora_inicio: val }).eq("id", ag.id); setCardAgendamentos(prev => prev.map(a => a.id === ag.id ? { ...a, hora_inicio: val } : a)); }} /><span className="text-muted-foreground">-</span><Input type="time" className="h-6 w-[75px] text-[11px] px-1" value={ag.hora_fim || ""} disabled={configLocked} onChange={async (e) => { const val = e.target.value || null; await supabase.from("painel_agendamentos").update({ hora_fim: val }).eq("id", ag.id); setCardAgendamentos(prev => prev.map(a => a.id === ag.id ? { ...a, hora_fim: val } : a)); }} /></div>
                              {ag.jornada_atividades?.nome && <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={ag.jornada_atividades.nome}>{ag.jornada_atividades.nome}</span>}
                              {ag.painel_etapas?.nome && <span className="text-[10px] font-medium truncate max-w-[120px] shrink-0" style={{ color: ag.painel_etapas.cor || undefined }} title={ag.painel_etapas.nome}>{ag.painel_etapas.nome}</span>}
                              {!configLocked && <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 ml-auto" onClick={async () => { await supabase.from("painel_agendamentos").delete().eq("id", ag.id); setCardAgendamentos(prev => prev.filter(a => a.id !== ag.id)); toast.success("Agendamento removido!"); }}><X className="h-3 w-3" /></Button>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Comunicação */}
              <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comunicação</p>
                  <Button variant={seguindoProjeto ? "default" : "outline"} size="sm" className={cn("gap-1.5 text-[10px] h-7", seguindoProjeto && "bg-primary/90")} disabled={seguindoLoading} onClick={async () => {
                    if (!profile?.user_id || !detailCard) return;
                    setSeguindoLoading(true);
                    try {
                      if (seguindoProjeto) { await (supabase as any).from("painel_seguidores").update({ unfollowed_at: new Date().toISOString() }).eq("card_id", detailCard.id).eq("user_id", profile.user_id); setSeguindoProjeto(false); toast.success("Você parou de seguir este projeto."); }
                      else { await (supabase as any).from("painel_seguidores").upsert({ card_id: detailCard.id, user_id: profile.user_id, unfollowed_at: null }, { onConflict: "card_id,user_id" }); setSeguindoProjeto(true); toast.success("Agora você está seguindo este projeto!"); }
                    } catch { toast.error("Erro ao atualizar seguimento."); } finally { setSeguindoLoading(false); }
                  }}>
                    {seguindoProjeto ? <><BellOff className="h-3 w-3" />Seguindo</> : <><BellRing className="h-3 w-3" />Seguir</>}
                  </Button>
                </div>
                {podeVisualizarSeguidores && seguidoresList.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground">Seguidores:</span>
                    <div className="flex -space-x-1.5">{seguidoresList.filter((s: any) => !s.unfollowed_at).slice(0, 5).map((s: any, i: number) => <div key={i} className="h-5 w-5 rounded-full border border-background overflow-hidden"><UserAvatar avatarUrl={s.profile?.avatar_url} fullName={s.profile?.full_name || "?"} size="xs" /></div>)}</div>
                    {seguidoresList.filter((s: any) => !s.unfollowed_at).length > 5 && <span className="text-[10px] text-muted-foreground">+{seguidoresList.filter((s: any) => !s.unfollowed_at).length - 5}</span>}
                  </div>
                )}
                {comentarios.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {(() => {
                      const rootComments = comentarios.filter((c: any) => !c.parent_id);
                      const renderComment = (com: any, isReply = false) => {
                        const autor = responsaveis.find((r: any) => r.user_id === com.criado_por || r.id === com.criado_por) || { full_name: "Usuário" };
                        const likes = curtidas[com.id] || [];
                        const replies = comentarios.filter((c: any) => c.parent_id === com.id);
                        return (
                          <div key={com.id} className={cn("text-xs", isReply && "ml-4 pl-3 border-l-2 border-primary/20")}>
                            {isReply && <CornerDownRight className="h-2.5 w-2.5 text-primary/40 -ml-[13px] mb-0.5" />}
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <UserAvatar avatarUrl={(autor as any).avatar_url} fullName={(autor as any).full_name} size="xs" />
                              <span className="font-semibold text-foreground">{(autor as any).full_name?.split(" ")[0]}</span>
                              <span className="text-[10px] text-muted-foreground">{new Date(com.created_at).toLocaleDateString("pt-BR")} {new Date(com.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap pl-6">{renderMentionText(com.texto, responsaveis as any)}</p>
                            <div className="flex items-center gap-3 pl-6 mt-1">
                              <button type="button" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-500 transition-colors" onClick={async () => {
                                const { data: { user } } = await supabase.auth.getUser();
                                if (!user) return;
                                const alreadyLiked = likes.includes(user.id);
                                if (alreadyLiked) { await supabase.from("painel_curtidas").delete().eq("comentario_id", com.id).eq("user_id", user.id); setCurtidas(prev => ({ ...prev, [com.id]: prev[com.id].filter(uid => uid !== user.id) })); }
                                else { await supabase.from("painel_curtidas").insert({ comentario_id: com.id, user_id: user.id }); setCurtidas(prev => ({ ...prev, [com.id]: [...(prev[com.id] || []), user.id] })); }
                              }}>
                                <Heart className={cn("h-3 w-3", likes.some((uid: string) => uid === profile?.user_id) && "fill-red-500")} />{likes.length > 0 && <span>{likes.length}</span>}
                              </button>
                              {likes.length > 0 && (() => {
                                const likedUsers = likes.map((uid: string) => { const prof = (responsaveis as any[]).find((r: any) => r.user_id === uid); return prof ? { name: prof.full_name, avatar: prof.avatar_url } : { name: "Usuário", avatar: null }; });
                                const isOpen = likesPopoverOpen === com.id;
                                return (
                                  <div className="relative">
                                    <button type="button" className="flex items-center gap-1" onClick={() => setLikesPopoverOpen(isOpen ? null : com.id)}>
                                      <div className="flex -space-x-1.5">{likedUsers.slice(0, 3).map((u: any, i: number) => <div key={i} className="h-4 w-4 rounded-full border border-background overflow-hidden"><UserAvatar avatarUrl={u.avatar} fullName={u.name} size="xs" /></div>)}</div>
                                      {likedUsers.length > 3 && <span className="text-[9px] text-muted-foreground">+{likedUsers.length - 3}</span>}
                                    </button>
                                    {isOpen && <div className="absolute z-50 left-0 top-6 bg-popover border rounded-md shadow-md p-2 min-w-[140px] space-y-1.5"><p className="text-[10px] font-semibold text-foreground mb-1">Curtido por</p>{likedUsers.map((u: any, i: number) => <div key={i} className="flex items-center gap-1.5"><UserAvatar avatarUrl={u.avatar} fullName={u.name} size="sm" /><span className="text-[10px] text-foreground truncate">{u.name}</span></div>)}<button type="button" className="text-[9px] text-muted-foreground hover:text-foreground mt-1" onClick={() => setLikesPopoverOpen(null)}>Fechar</button></div>}
                                  </div>
                                );
                              })()}
                              <button type="button" className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors" onClick={() => setReplyTo({ id: com.id, autorNome: (autor as any).full_name?.split(" ")[0] || "Usuário" })}><Reply className="h-3 w-3" />Responder</button>
                            </div>
                            {!isReply && replies.length > 0 && <div className="mt-1.5 space-y-1">{replies.map((r: any) => renderComment(r, true))}</div>}
                          </div>
                        );
                      };
                      return rootComments.map((com: any) => renderComment(com));
                    })()}
                  </div>
                )}
                {replyTo && <div className="flex items-center gap-2 text-xs bg-primary/5 border border-primary/20 rounded px-2 py-1"><CornerDownRight className="h-3 w-3 text-primary" /><span className="text-muted-foreground">Respondendo <strong className="text-foreground">{replyTo.autorNome}</strong></span><button type="button" className="ml-auto text-muted-foreground hover:text-foreground" onClick={() => setReplyTo(null)}><XCircle className="h-3.5 w-3.5" /></button></div>}
                <div className="flex gap-2">
                  <MentionInput value={novoComentario} onChange={setNovoComentario} users={responsaveis as any} placeholder={replyTo ? `Responder ${replyTo.autorNome}...` : "Digite um comentário... Use @nome para mencionar"} onMentionsChange={(ids) => { mentionedUsersRef.current = ids; }} />
                  <Button size="sm" className="self-end h-8" disabled={!novoComentario.trim()} onClick={async () => {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user || !detailCard) return;
                    const { data: myProfile } = await supabase.from("profiles").select("id, full_name, telefone").eq("user_id", user.id).maybeSingle();
                    const { data: novo, error } = await supabase.from("painel_comentarios").insert({ card_id: detailCard.id, texto: novoComentario.trim(), criado_por: myProfile?.id || user.id, etapa_id: detailCard.etapa_id, parent_id: replyTo?.id || null }).select("id, texto, criado_por, created_at, parent_id").single();
                    if (!error && novo) {
                      setComentarios((prev) => [...prev, novo]);
                      const clienteNome = detailCard.clientes?.nome_fantasia || "Cliente";
                      const autorNome = myProfile?.full_name?.split(" ")[0] || "Alguém";
                      if (replyTo) { const parentCom = comentarios.find((c: any) => c.id === replyTo.id); if (parentCom && parentCom.criado_por !== (myProfile?.id || user.id)) { const parentProf = (responsaveis as any[]).find((r: any) => r.id === parentCom.criado_por); if (parentProf?.user_id) { await supabase.from("notificacoes").insert({ titulo: `💬 ${autorNome} respondeu seu comentário`, mensagem: `${autorNome} respondeu seu comentário no projeto ${clienteNome}: "${novoComentario.trim().slice(0, 100)}${novoComentario.trim().length > 100 ? "..." : ""}"`, tipo: "info", criado_por: user.id, destinatario_user_id: parentProf.user_id, metadata: { card_id: detailCard.id, comentario_id: novo.id } }); } } }
                      const mentioned = mentionedUsersRef.current;
                      if (mentioned.length > 0) {
                        for (const profileId of mentioned) {
                          await supabase.from("painel_mencoes").insert({ comentario_id: novo.id, card_id: detailCard.id, mencionado_user_id: profileId, mencionado_por: myProfile?.id || user.id });
                          const prof = (responsaveis as any[]).find((r: any) => r.id === profileId);
                          await supabase.from("notificacoes").insert({ titulo: `💬 ${autorNome} mencionou você`, mensagem: `Você foi mencionado em um comentário no projeto ${clienteNome}: "${novoComentario.trim().slice(0, 100)}${novoComentario.trim().length > 100 ? "..." : ""}"`, tipo: "info", criado_por: user.id, destinatario_user_id: prof?.user_id || profileId, metadata: { card_id: detailCard.id, comentario_id: novo.id } });
                          if (prof?.telefone) { try { const { data: intConfig } = await supabase.from("integracoes_config").select("*").eq("nome", "evolution_api").eq("ativo", true).maybeSingle(); if (intConfig?.server_url && intConfig?.token) { await supabase.functions.invoke("evolution-api", { body: { action: "send_message", server_url: intConfig.server_url, api_key: intConfig.token, instance_name: "Softflow_WhatsApp", phone: prof.telefone, message: `💬 *Menção em comentário*\n\n${autorNome} mencionou você no projeto *${clienteNome}*:\n\n"${novoComentario.trim().slice(0, 200)}${novoComentario.trim().length > 200 ? "..." : ""}"` } }); } } catch { } }
                        }
                      }
                      const mentionedUserIds = new Set(mentioned.map((pid: string) => { const prof = (responsaveis as any[]).find((r: any) => r.id === pid); return prof?.user_id || pid; }));
                      if (replyTo) { const parentCom = comentarios.find((c: any) => c.id === replyTo.id); if (parentCom) { const parentProf = (responsaveis as any[]).find((r: any) => r.id === parentCom.criado_por); if (parentProf?.user_id) mentionedUserIds.add(parentProf.user_id); } }
                      try { const { data: seguidores } = await (supabase as any).from("painel_seguidores").select("user_id").eq("card_id", detailCard.id).is("unfollowed_at", null); for (const seg of (seguidores || [])) { if (seg.user_id === user.id) continue; if (mentionedUserIds.has(seg.user_id)) continue; await supabase.from("notificacoes").insert({ titulo: `💬 ${autorNome} comentou no projeto`, mensagem: `${autorNome} fez um comentário no projeto ${clienteNome} que você segue: "${novoComentario.trim().slice(0, 100)}${novoComentario.trim().length > 100 ? "..." : ""}"`, tipo: "info", criado_por: user.id, destinatario_user_id: seg.user_id, metadata: { card_id: detailCard.id, comentario_id: novo.id } }); } } catch { }
                      setNovoComentario(""); setReplyTo(null); mentionedUsersRef.current = []; toast.success(replyTo ? "Resposta adicionada!" : "Comentário adicionado!");
                    } else { toast.error("Erro ao adicionar comentário."); }
                  }}>{replyTo ? "Responder" : "Incluir"}</Button>
                </div>
              </div>

              {/* Pedido Comentarios */}
              {detailCard.pedido_id && (
                <div className="rounded-lg border border-border bg-card p-3 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                  <PedidoComentarios pedidoId={detailCard.pedido_id} readOnly />
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-2 border-t">
                Criado em {new Date(detailCard.created_at).toLocaleDateString("pt-BR")} às {new Date(detailCard.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          )}
          {detailCard && (
            <DialogFooter className="border-t pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isChecklistCompleto(checklistEtapa, checklistProgresso) && detailCard.iniciado_em && <p className="text-[10px] text-muted-foreground">Complete todos os itens do checklist para finalizar</p>}
              </div>
              <div className="flex items-center gap-2">
                {(podePausarProjeto || podeRecusarProjeto || podeGerenciarApontamento || podeResetarProjeto) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1.5"><MoreHorizontal className="h-4 w-4" />Ações</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {podeGerenciarApontamento && <DropdownMenuItem className="gap-2" onClick={() => { setApontamentoCardId(detailCard.id); setApontamentoOpen(true); }}><UserPlus className="h-4 w-4" />Apontamento</DropdownMenuItem>}
                      {podePausarProjeto && !detailCard.pausado && <DropdownMenuItem className="gap-2 text-amber-600 focus:text-amber-600" onClick={() => setPausarOpen(true)}><PauseCircle className="h-4 w-4" />Pausar Projeto</DropdownMenuItem>}
                      {podeRecusarProjeto && !detailCard.pausado && <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={() => setRecusarOpen(true)}><XCircle className="h-4 w-4" />Recusar Projeto</DropdownMenuItem>}
                      {podeResetarProjeto && <DropdownMenuItem className="gap-2 text-orange-600 focus:text-orange-600" onClick={() => setResetarOpen(true)}><RefreshCw className="h-4 w-4" />Resetar Projeto</DropdownMenuItem>}
                      {podeCancelarProjeto && detailCard.status_projeto !== "cancelado" && <DropdownMenuItem className="gap-2 text-red-600 focus:text-red-600" onClick={() => setCancelarOpen(true)}><Ban className="h-4 w-4" />Cancelar Projeto</DropdownMenuItem>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button variant="outline" size="sm" onClick={() => fetchDetalhes(detailCard)}><Info className="h-4 w-4 mr-1" />Detalhes</Button>
                {(() => { const etapaAtualIdx = etapas.findIndex((e) => e.id === detailCard.etapa_id); if (etapaAtualIdx <= 0) return null; return <Button variant="outline" size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500 hover:border-amber-600" onClick={() => fetchHistorico(detailCard)}><History className="h-4 w-4 mr-1" />Histórico</Button>; })()}
                <Button size="sm" onClick={finalizarEtapa} disabled={!detailCard.iniciado_em || !isChecklistCompleto(checklistEtapa, checklistProgresso) || finalizando}><ChevronRight className="h-4 w-4 mr-1" />{finalizando ? "Finalizando..." : "Finalizar Etapa"}</Button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════ EXTRACTED DIALOGS ═══════════════════════════ */}
      <DetalhesDialog open={detalhesOpen} onOpenChange={setDetalhesOpen} data={detalhesData} loading={detalhesLoading} detailCard={detailCard} planoAnteriorNome={planoAnteriorNome} podeVerValores={podeVerValoresProjeto} onVerPedido={fetchVerPedido} />
      <HistoricoDialog open={historicoOpen} onOpenChange={setHistoricoOpen} data={historicoData} loading={historicoLoading} responsaveis={responsaveis} />
      <PausarDialog open={pausarOpen} onOpenChange={setPausarOpen} motivo={pausarMotivo} setMotivo={setPausarMotivo} onConfirm={handlePausarProjeto} loading={pausando} responsaveis={responsaveis} apontamentoUsuarios={apontamentoUsuarios} setApontamentoUsuarios={setApontamentoUsuarios} buscaApontamento={buscaApontamento} setBuscaApontamento={setBuscaApontamento} />
      <RecusarDialog open={recusarOpen} onOpenChange={setRecusarOpen} motivo={recusarMotivo} setMotivo={setRecusarMotivo} onConfirm={handleRecusarProjeto} loading={recusando} responsaveis={responsaveis} apontamentoUsuarios={apontamentoUsuarios} setApontamentoUsuarios={setApontamentoUsuarios} buscaApontamento={buscaApontamento} setBuscaApontamento={setBuscaApontamento} />
      <ResetarDialog open={resetarOpen} onOpenChange={setResetarOpen} motivo={resetarMotivo} setMotivo={setResetarMotivo} onConfirm={handleResetarProjeto} loading={resetando} />
      <CancelarDialog open={cancelarOpen} onOpenChange={setCancelarOpen} motivo={cancelarMotivo} setMotivo={setCancelarMotivo} onConfirm={handleCancelarProjeto} loading={cancelando} />
      <AgendamentosCancelDialog open={agendamentosCancelOpen} onOpenChange={setAgendamentosCancelOpen} agendamentos={agendamentosCancelados} onRemover={handleRemoverAgendamentosCancelados} removendo={removendoAgendamentos} onClose={() => { setAgendamentosCancelOpen(false); setAgendamentosCancelados([]); setDetailCard(null); }} />
      <ApontamentoDialog open={apontamentoOpen} onOpenChange={setApontamentoOpen} apontamentoUsuarios={apontamentoUsuarios} setApontamentoUsuarios={setApontamentoUsuarios} busca={buscaApontamento} setBusca={setBuscaApontamento} onConfirm={handleApontamento} loading={apontando} responsaveis={responsaveis} cardId={apontamentoCardId} cardApontamentosDetalhado={cardApontamentosDetalhado} podeGerenciar={podeGerenciarApontamento} onRemover={handleRemoverApontamento} />
      <RetomarDialog open={retomarOpen} onOpenChange={setRetomarOpen} comentario={retomarComentario} setComentario={setRetomarComentario} onConfirm={handleDespausar} loading={retomando} detailCard={detailCard} responsaveis={responsaveis} />
      <VerPedidoDialog open={verPedidoOpen} onOpenChange={setVerPedidoOpen} data={verPedidoData} loading={verPedidoLoading} />
    </AppLayout>
  );
}
