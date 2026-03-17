import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PainelCard, PainelEtapa, AtividadeExecucao } from "./types";
import { getSlaEtapaForCard } from "./helpers";

interface CardActionsDeps {
  detailCard: PainelCard | null;
  setDetailCard: (c: PainelCard | null) => void;
  etapas: PainelEtapa[];
  profile: any;
  responsaveis: any[];
  cards: PainelCard[];
  jornadaSlaMap: Record<string, Record<string, number>>;
  checklistEtapa: any[];
  checklistProgresso: Record<string, any>;
  setChecklistProgresso: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  slaEtapaJornada: number | null;
  atividadeExecucaoMap: Record<string, AtividadeExecucao[]>;
  todasAtividadesConcluidas: (map: Record<string, AtividadeExecucao[]>, cardId: string, atividadeIds: string[]) => boolean;
  cardApontamentosDetalhado: Record<string, any[]>;
}

export function usePainelCardActions(deps: CardActionsDeps) {
  const {
    detailCard, setDetailCard, etapas, profile, responsaveis, cards,
    jornadaSlaMap, checklistEtapa, checklistProgresso, setChecklistProgresso,
    slaEtapaJornada, atividadeExecucaoMap, todasAtividadesConcluidas,
    cardApontamentosDetalhado,
  } = deps;

  const queryClient = useQueryClient();

  // ─── Action Dialog State ─────────────────────────────────────────────────
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
  const [finalizando, setFinalizando] = useState(false);
  const [detalhesOpen, setDetalhesOpen] = useState(false);
  const [detalhesData, setDetalhesData] = useState<any>(null);
  const [detalhesLoading, setDetalhesLoading] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [historicoData, setHistoricoData] = useState<any[]>([]);
  const [historicoLoading, setHistoricoLoading] = useState(false);

  // ─── Helper Functions ────────────────────────────────────────────────────
  async function registrarEntradaEtapa(cardId: string, etapaId: string, etapaNome: string) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("painel_historico_etapas").insert({ card_id: cardId, etapa_id: etapaId, etapa_nome: etapaNome, entrada_em: new Date().toISOString(), usuario_id: user?.id || null });
  }

  async function registrarSaidaEtapa(cardId: string, etapaId: string, slaPrevisto?: number | null) {
    const { data } = await supabase.from("painel_historico_etapas").select("id, entrada_em").eq("card_id", cardId).eq("etapa_id", etapaId).is("saida_em", null).order("entrada_em", { ascending: false }).limit(1);
    if (data && data.length > 0) {
      const now = new Date(); const tempoReal = Math.round(((now.getTime() - new Date(data[0].entrada_em).getTime()) / (1000 * 60 * 60)) * 100) / 100;
      const slaCumprido = slaPrevisto != null && slaPrevisto > 0 ? tempoReal <= slaPrevisto : null;
      await supabase.from("painel_historico_etapas").update({ saida_em: now.toISOString(), sla_previsto_horas: slaPrevisto ?? null, tempo_real_horas: tempoReal, sla_cumprido: slaCumprido }).eq("id", data[0].id);
    }
  }

  async function notificarSeguidoresAvanco(cardId: string, novaEtapaNome: string, clienteNome: string) {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      const autorNome = profile?.full_name || "Usuário";
      const { data: seguidores } = await supabase.from("painel_seguidores").select("user_id").eq("card_id", cardId).is("unfollowed_at", null);
      if (!seguidores || seguidores.length === 0) return;
      for (const seg of seguidores) {
        if (seg.user_id === currentUser.id) continue;
        await supabase.from("notificacoes").insert({ titulo: `🔄 ${autorNome} avançou etapa`, mensagem: `${autorNome} avançou a etapa para ${novaEtapaNome} no projeto ${clienteNome}.`, criado_por: currentUser.id, destinatario_user_id: seg.user_id, metadata: { card_id: cardId } });
      }
    } catch (err) { console.error("Erro ao notificar seguidores sobre avanço:", err); }
  }

  // ─── Mutations ───────────────────────────────────────────────────────────
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
        await supabase.from("painel_historico_etapas").update({ atraso_inicio_horas: atrasoInicioHoras }).eq("id", histOpen[0].id);
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); toast.success("Atendimento iniciado! Você é o responsável."); },
    onError: () => toast.error("Erro ao iniciar atendimento."),
  });

  // ─── Checklist ───────────────────────────────────────────────────────────
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

  // ─── Fetch Functions ─────────────────────────────────────────────────────
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
        result.push({ etapa_nome: h.etapa_nome, entrada_em: h.entrada_em, saida_em: h.saida_em, sla_previsto_horas: h.sla_previsto_horas, tempo_real_horas: h.tempo_real_horas, sla_cumprido: h.sla_cumprido, atraso_inicio_horas: h.atraso_inicio_horas, atividades, progressoMap, comentarios: stageComments });
      }
      setHistoricoData(result);
    } catch { toast.error("Erro ao carregar histórico."); } finally { setHistoricoLoading(false); }
  }

  // ─── Action Handlers ─────────────────────────────────────────────────────
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
      const { error } = await supabase.from("painel_atendimento").update({ pausado: true, pausado_em: new Date().toISOString(), pausado_por: user.id, pausado_motivo: pausarMotivo.trim(), iniciado_em: null, iniciado_por: null, etapa_id: standbyEtapa.id, status_projeto: "pausado", etapa_origem_id: detailCard.etapa_id }).eq("id", detailCard.id);
      if (error) throw error;
      if (apontamentoUsuarios.length > 0) {
        const clienteNome = detailCard.clientes?.nome_fantasia || "Cliente";
        await supabase.from("painel_apontamentos").insert(apontamentoUsuarios.map(uid => ({ card_id: detailCard.id, usuario_id: uid, apontado_por: user.id, motivo: pausarMotivo.trim() })));
        for (const uid of apontamentoUsuarios) { const prof = responsaveis.find((r) => r.id === uid); await supabase.from("notificacoes").insert({ titulo: "📌 Apontamento - Projeto Pausado", mensagem: `Você foi designado(a) para resolver uma pendência do projeto ${clienteNome}. Motivo: ${pausarMotivo.trim()}`, tipo: "alerta", criado_por: user.id, destinatario_user_id: prof?.user_id || uid, metadata: { card_id: detailCard.id } }); }
        const nomes = apontamentoUsuarios.map(uid => { const p = responsaveis.find((r) => r.id === uid); return p?.full_name?.split(" ")[0] || "Usuário"; });
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
      const { error } = await supabase.from("painel_atendimento").update({ pausado: true, pausado_em: new Date().toISOString(), pausado_por: user.id, pausado_motivo: recusarMotivo.trim(), iniciado_em: null, iniciado_por: null, etapa_id: standbyEtapa.id, status_projeto: "recusado", etapa_origem_id: detailCard.etapa_id }).eq("id", detailCard.id);
      if (error) throw error;
      if (apontamentoUsuarios.length > 0) {
        const clienteNome = detailCard.clientes?.nome_fantasia || "Cliente";
        await supabase.from("painel_apontamentos").insert(apontamentoUsuarios.map(uid => ({ card_id: detailCard.id, usuario_id: uid, apontado_por: user.id, motivo: recusarMotivo.trim() })));
        for (const uid of apontamentoUsuarios) { const prof = responsaveis.find((r) => r.id === uid); await supabase.from("notificacoes").insert({ titulo: "📌 Apontamento - Projeto Recusado", mensagem: `Você foi designado(a) para resolver uma pendência do projeto ${clienteNome}. Motivo: ${recusarMotivo.trim()}`, tipo: "alerta", criado_por: user.id, destinatario_user_id: prof?.user_id || uid, metadata: { card_id: detailCard.id } }); }
        const nomes = apontamentoUsuarios.map(uid => { const p = responsaveis.find((r) => r.id === uid); return p?.full_name?.split(" ")[0] || "Usuário"; });
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
      if (etapaDestinoId) {
        const etapaInicialAtiva = etapas.find(e => e.id === etapaDestinoId && e.ativo);
        if (!etapaInicialAtiva) { toast.error("A etapa inicial configurada para esta filial está inativa ou não existe. Verifique a configuração."); setResetando(false); return; }
      } else {
        const etapasOrdenadas = [...etapas].filter(e => e.ativo).sort((a, b) => a.ordem - b.ordem);
        if (etapasOrdenadas.length === 0) { toast.error("Nenhuma etapa ativa encontrada para resetar o projeto."); setResetando(false); return; }
        etapaDestinoId = etapasOrdenadas[0].id;
      }
      await supabase.from("painel_historico_etapas").delete().eq("card_id", detailCard.id);
      await supabase.from("painel_checklist_progresso").delete().eq("card_id", detailCard.id);
      await supabase.from("painel_agendamentos").delete().eq("card_id", detailCard.id);
      await supabase.from("painel_atividade_execucao").delete().eq("card_id", detailCard.id);
      await supabase.from("painel_apontamentos").delete().eq("card_id", detailCard.id);
      const etapaDestino = etapas.find(e => e.id === etapaDestinoId);
      await registrarEntradaEtapa(detailCard.id, etapaDestinoId!, etapaDestino?.nome || "Etapa Inicial");
      const { error } = await supabase.from("painel_atendimento").update({ etapa_id: etapaDestinoId, iniciado_em: null, iniciado_por: null, pausado: false, pausado_em: null, pausado_por: null, pausado_motivo: null, status_projeto: "ativo", etapa_origem_id: null }).eq("id", detailCard.id);
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
      await supabase.from("projetos_cancelados" as any).insert({ card_id: detailCard.id, contrato_id: detailCard.contrato_id, cliente_id: detailCard.cliente_id, filial_id: detailCard.filial_id, motivo: cancelarMotivo.trim(), cancelado_por: user.id, tipo_operacao: detailCard.tipo_operacao, plano_nome: detailCard.planos?.nome || null, cliente_nome: detailCard.clientes?.nome_fantasia || null, contrato_numero: detailCard.contratos?.numero_exibicao || null } as any);
      const { error } = await supabase.from("painel_atendimento").update({ status_projeto: "cancelado" }).eq("id", detailCard.id);
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
      const { error } = await supabase.from("painel_apontamentos").insert(novosUsuarios.map(uid => ({ card_id: apontamentoCardId, usuario_id: uid, apontado_por: user.id, motivo: card?.pausado_motivo || null })));
      if (error) throw error;
      for (const uid of novosUsuarios) { const prof = responsaveis.find((r) => r.id === uid); await supabase.from("notificacoes").insert({ titulo: "📌 Apontamento de Resolução", mensagem: `Você foi designado(a) para resolver uma pendência do projeto ${clienteNome}. Motivo: ${card?.pausado_motivo || "Não informado"}`, tipo: "alerta", criado_por: user.id, destinatario_user_id: prof?.user_id || uid, metadata: { card_id: card?.id || detailCard?.id } }); }
      const nomes = novosUsuarios.map(uid => { const p = responsaveis.find((r) => r.id === uid); return p?.full_name?.split(" ")[0] || "Usuário"; });
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
      const { error } = await supabase.from("painel_atendimento").update({ pausado: false, pausado_em: null, pausado_por: null, pausado_motivo: null, iniciado_em: null, iniciado_por: null, responsavel_id: prof?.id || null, status_projeto: "ativo", etapa_origem_id: null, etapa_id: targetEtapaId, updated_at: now }).eq("id", cardId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] }); toast.success("Projeto retomado!"); setRetomarOpen(false); setRetomarComentario(""); setDetailCard(null);
    } catch (err: any) { toast.error("Erro ao retomar projeto: " + (err.message || "")); } finally { setRetomando(false); }
  }

  async function finalizarEtapa() {
    if (!detailCard) return;
    setFinalizando(true);
    try {
      const atividadeIds = checklistEtapa.map((a: any) => a.id);
      if (atividadeIds.length > 0 && !todasAtividadesConcluidas(atividadeExecucaoMap, detailCard.id, atividadeIds)) {
        toast.error("Conclua todas as atividades da etapa antes de finalizar.");
        setFinalizando(false);
        return;
      }
      if (checklistEtapa.length > 0) {
        const totalItens = checklistEtapa.reduce((acc: number, a: any) => acc + (Array.isArray(a.checklist) ? a.checklist.length : 0), 0);
        const totalConcluidos = checklistEtapa.reduce((acc: number, a: any) => {
          const items = Array.isArray(a.checklist) ? a.checklist : [];
          return acc + items.filter((_: any, idx: number) => checklistProgresso[`${a.id}_${idx}`]?.concluido).length;
        }, 0);
        if (totalItens > 0 && totalConcluidos < totalItens) {
          toast.error("Conclua todos os itens do checklist antes de finalizar a etapa.");
          setFinalizando(false);
          return;
        }
      }
      const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
      const etapaAtualIdx = etapasOrdenadas.findIndex((e) => e.id === detailCard.etapa_id);
      if (etapaAtualIdx === -1) { toast.error("Etapa atual não encontrada na lista de etapas ativas. Verifique a configuração."); return; }
      const proximaEtapa = etapasOrdenadas[etapaAtualIdx + 1];
      if (!proximaEtapa) { toast.error("Não há próxima etapa configurada após a etapa atual."); return; }
      await registrarSaidaEtapa(detailCard.id, detailCard.etapa_id, slaEtapaJornada);
      await registrarEntradaEtapa(detailCard.id, proximaEtapa.id, proximaEtapa.nome);
      const { error } = await supabase.from("painel_atendimento").update({ etapa_id: proximaEtapa.id, iniciado_em: null, iniciado_por: null }).eq("id", detailCard.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["painel_atendimento"] });
      queryClient.invalidateQueries({ queryKey: ["painel_atividade_execucao"] });
      toast.success(`Avançado para etapa: ${proximaEtapa.nome}`);
      const clienteNomeNotif = detailCard.clientes?.apelido || detailCard.clientes?.nome_fantasia || "Projeto";
      notificarSeguidoresAvanco(detailCard.id, proximaEtapa.nome, clienteNomeNotif);
      setDetailCard(null);
    } catch { toast.error("Erro ao finalizar etapa."); } finally { setFinalizando(false); }
  }

  return {
    // State
    pausarOpen, setPausarOpen, pausarMotivo, setPausarMotivo, pausando,
    recusarOpen, setRecusarOpen, recusarMotivo, setRecusarMotivo, recusando,
    apontamentoOpen, setApontamentoOpen, apontamentoCardId, setApontamentoCardId,
    apontamentoUsuarios, setApontamentoUsuarios, apontando,
    buscaApontamento, setBuscaApontamento,
    retomarOpen, setRetomarOpen, retomarComentario, setRetomarComentario, retomando,
    resetarOpen, setResetarOpen, resetarMotivo, setResetarMotivo, resetando,
    cancelarOpen, setCancelarOpen, cancelarMotivo, setCancelarMotivo, cancelando,
    agendamentosCancelOpen, setAgendamentosCancelOpen, agendamentosCancelados, setAgendamentosCancelados, removendoAgendamentos,
    verPedidoOpen, setVerPedidoOpen, verPedidoData, verPedidoLoading,
    finalizando,
    detalhesOpen, setDetalhesOpen, detalhesData, detalhesLoading,
    historicoOpen, setHistoricoOpen, historicoData, historicoLoading,
    // Mutations
    moverCard, atribuirResponsavel, iniciarAtendimento,
    // Functions
    saveChecklistItem, fetchDetalhes, fetchVerPedido, fetchHistorico,
    registrarEntradaEtapa, registrarSaidaEtapa, notificarSeguidoresAvanco,
    handlePausarProjeto, handleRecusarProjeto, handleResetarProjeto, handleCancelarProjeto,
    handleRemoverAgendamentosCancelados, handleApontamento, handleRemoverApontamento,
    handleDespausar, finalizarEtapa,
  };
}
