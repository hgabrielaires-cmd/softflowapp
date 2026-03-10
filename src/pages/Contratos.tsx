import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import type { Contrato } from "./contratos/types";
import { ITEMS_PER_PAGE } from "./contratos/constants";
import { type GerarTermoAceiteContext, getZapSignStatusBadge, getStatusBadge, getStatusGeracaoBadge, getTipoBadge, getPedidoStatusBadges } from "./contratos/helpers";
import { CadastroRetroativoDialog } from "./contratos/components/CadastroRetroativoDialog";
import { EncerrarContratoDialog } from "./contratos/components/EncerrarContratoDialog";
import { CancelarProjetoDialog } from "./contratos/components/CancelarProjetoDialog";
import { AgendamentosCancelDialog } from "./contratos/components/AgendamentosCancelDialog";
import { CancelarAditivosDialog } from "./contratos/components/CancelarAditivosDialog";
import { ContratoDetailDialog } from "./contratos/components/ContratoDetailDialog";
import { ZapsignPopupDialog } from "./contratos/components/ZapsignPopupDialog";
import { ZapsignDetailDialog } from "./contratos/components/ZapsignDetailDialog";
import { useContratoGeracaoZapsign } from "./contratos/useContratoGeracaoZapsign";
import { useContratosQueries } from "./contratos/useContratosQueries";
import { useCadastroRetroativo } from "./contratos/useCadastroRetroativo";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Eye,
  Filter,
  Loader2,
  FileCheck,
  XCircle,
  MoreHorizontal,
  FilePen,
  FileOutput,
  Download,
  FileDown,
  RefreshCw,
  ClipboardCopy,
  ExternalLink,
  UserPlus,
  Search,
  Plus,
  MapPin,
  AlertCircle,
  Star,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TablePagination } from "@/components/TablePagination";

// Types, constants and helpers imported from ./contratos/

export default function Contratos() {
  const queries = useContratosQueries();
  const {
    isAdmin, roles, profile, isFinanceiro,
    canManage, crudIncluir, crudEditar, crudExcluir,
    podeCadastroRetroativo, podeRegerarContrato,
    filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais,
    contratos, setContratos,
    filiais, filialParametros, profilesMap,
    contatosCliente, setContatosCliente,
    linkedMessageTemplate, setLinkedMessageTemplate,
    loading,
    filterFilial, setFilterFilial,
    filterStatus, setFilterStatus,
    filterDe, setFilterDe,
    filterAte, setFilterAte,
    filterBusca, setFilterBusca,
    currentPage, setCurrentPage,
    filtered, ativos,
    loadData, loadDetailData,
  } = queries;

  const [selected, setSelected] = useState<Contrato | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openEncerrar, setOpenEncerrar] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [openCancelarProjeto, setOpenCancelarProjeto] = useState(false);
  const [cancelarProjetoMotivo, setCancelarProjetoMotivo] = useState("");
  const [projetosAtivos, setProjetosAtivos] = useState<any[]>([]);
  const [processando, setProcessando] = useState(false);
  const [agendamentosCancelOpen, setAgendamentosCancelOpen] = useState(false);
  const [agendamentosCancelados, setAgendamentosCancelados] = useState<any[]>([]);
  const [removendoAgendamentos, setRemovendoAgendamentos] = useState(false);

  // Cancelar aditivos vinculados
  const [openCancelarAditivos, setOpenCancelarAditivos] = useState(false);
  const [aditivosVinculados, setAditivosVinculados] = useState<Contrato[]>([]);
  const [aditivosSelecionados, setAditivosSelecionados] = useState<string[]>([]);
  const [contratoBaseCancelado, setContratoBaseCancelado] = useState<Contrato | null>(null);

  // ── Contexto para gerarTermoAceite (helper extraído) ─────────────────────
  function buildTermoCtx(): GerarTermoAceiteContext {
    return { profilesMap, profileFullName: profile?.full_name, contatosCliente, linkedMessageTemplate, filialParametros, contratos };
  }

  // ── Hook de Geração/ZapSign/WhatsApp ─────────────────────
  const zapsign = useContratoGeracaoZapsign({
    selected,
    setSelected,
    contratos,
    setContratos,
    setContatosCliente,
    setLinkedMessageTemplate,
    buildTermoCtx,
  });
  const {
    zapsignRecords, gerando, gerarSignedUrl, enviandoZapsign,
    reenviandoWhatsapp, enviandoWhatsapp, syncingStatuses,
    openZapsignDetail, setOpenZapsignDetail,
    zapsignDetailContrato, setZapsignDetailContrato,
    openZapsignPopup, setOpenZapsignPopup,
    zapsignPopupStep, zapsignPopupMsgIndex, zapsignPopupContrato, zapsignPopupError,
    loadZapsignRecords, handleSyncAllStatuses,
    handleGerarContrato, handleBaixarContrato,
    handleAtualizarStatusZapSign, handleEnviarWhatsapp: hookEnviarWhatsapp,
    handleReenviarWhatsapp,
  } = zapsign;

  // ── Cadastro Retroativo (hook extraído) ──
  const retro = useCadastroRetroativo({ profileFilialId: profile?.filial_id, loadData });

  // Load ZapSign records when contratos change
  useEffect(() => {
    if (contratos.length > 0) loadZapsignRecords();
  }, [contratos.length]);

  async function handleOpenDetail(contrato: Contrato) {
    setSelected(contrato);
    setOpenDetail(true);
    await loadDetailData(contrato);
  }

  async function handleEncerrar() {
    if (!selected) return;

    // Se for contrato Base, verificar aditivos vinculados ANTES de cancelar
    if (selected.tipo === "Base") {
      const aditivosAtivos = contratos.filter(c => c.contrato_origem_id === selected.id && c.status === "Ativo");
      if (aditivosAtivos.length > 0) {
        setContratoBaseCancelado(selected);
        setAditivosVinculados(aditivosAtivos);
        setAditivosSelecionados(aditivosAtivos.map(a => a.id));
        setOpenEncerrar(false);
        setOpenCancelarAditivos(true);
        return; // Não cancela ainda — espera decisão dos aditivos
      }
    }

    // Executar cancelamento efetivo
    await executarCancelamentoContrato(selected, motivoCancelamento || "Cancelamento direto");
  }

  async function executarCancelamentoContrato(contrato: Contrato, motivo: string) {
    setProcessando(true);
    const { error } = await supabase
      .from("contratos")
      .update({ status: "Encerrado" })
      .eq("id", contrato.id);
    if (error) { toast.error("Erro ao encerrar contrato: " + error.message); setProcessando(false); return; }
    // Cancelar pedido vinculado
    if (contrato.pedido_id) {
      await supabase
        .from("pedidos")
        .update({ status_pedido: "Cancelado", financeiro_status: "Cancelado" })
        .eq("id", contrato.pedido_id);
    }
    // Registrar cancelamento para relatórios
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("contratos_cancelados").insert({
        contrato_id: contrato.id,
        contrato_numero: contrato.numero_exibicao,
        contrato_tipo: contrato.tipo,
        cliente_id: contrato.cliente_id,
        cliente_nome: contrato.clientes?.nome_fantasia || null,
        filial_id: contrato.pedidos?.filial_id || contrato.clientes?.filial_id || null,
        plano_nome: contrato.planos?.nome || null,
        tipo_pedido: contrato.pedidos?.tipo_pedido || null,
        cancelado_por: user.id,
        motivo: motivo,
      } as any);
    }
    setProcessando(false);
    toast.success("Contrato encerrado.");
    setOpenEncerrar(false);
    setOpenDetail(false);
    setMotivoCancelamento("");

    // Verificar se há projetos ativos no painel de atendimento para este contrato
    await verificarProjetosAtivos(contrato);
    loadData();
  }

  async function verificarProjetosAtivos(contrato: Contrato) {
    const { data: projetos } = await supabase
      .from("painel_atendimento")
      .select("id, tipo_operacao, filial_id, etapa_id, clientes(nome_fantasia), contratos(numero_exibicao), planos(nome), painel_etapas(nome)")
      .eq("contrato_id", contrato.id)
      .neq("status_projeto", "cancelado");

    if (projetos && projetos.length > 0) {
      setProjetosAtivos(projetos);
      setCancelarProjetoMotivo("");
      setOpenCancelarProjeto(true);
    }
  }

  async function handleCancelarAditivosSelecionados() {
    if (!contratoBaseCancelado) return;
    setProcessando(true);
    try {
      // Primeiro cancelar o contrato base
      await executarCancelamentoContrato(contratoBaseCancelado, motivoCancelamento || "Cancelamento direto");

      const { data: { user } } = await supabase.auth.getUser();

      // Depois cancelar os aditivos selecionados
      const allCancelledCardIds: string[] = [];
      for (const aditivoId of aditivosSelecionados) {
        const aditivo = aditivosVinculados.find(a => a.id === aditivoId);
        if (!aditivo) continue;

        await supabase.from("contratos").update({ status: "Encerrado" }).eq("id", aditivoId);

        if (aditivo.pedido_id) {
          await supabase.from("pedidos").update({ status_pedido: "Cancelado", financeiro_status: "Cancelado" }).eq("id", aditivo.pedido_id);
        }

        if (user) {
          await supabase.from("contratos_cancelados").insert({
            contrato_id: aditivo.id,
            contrato_numero: aditivo.numero_exibicao,
            contrato_tipo: aditivo.tipo,
            contrato_base_id: contratoBaseCancelado?.id || null,
            contrato_base_numero: contratoBaseCancelado?.numero_exibicao || null,
            cliente_id: aditivo.cliente_id,
            cliente_nome: aditivo.clientes?.nome_fantasia || null,
            filial_id: aditivo.pedidos?.filial_id || aditivo.clientes?.filial_id || null,
            plano_nome: aditivo.planos?.nome || null,
            tipo_pedido: aditivo.pedidos?.tipo_pedido || null,
            cancelado_por: user.id,
            motivo: `Cancelamento vinculado ao contrato base ${contratoBaseCancelado?.numero_exibicao || ""}`,
          } as any);
        }

        const { data: projetos } = await supabase
          .from("painel_atendimento")
          .select("id")
          .eq("contrato_id", aditivoId)
          .neq("status_projeto", "cancelado");

        const cancelledCardIds: string[] = [];
        if (projetos && projetos.length > 0 && user) {
          for (const p of projetos) {
            await supabase.from("painel_atendimento").update({ status_projeto: "cancelado" } as any).eq("id", p.id);
            await supabase.from("painel_comentarios").insert({
              card_id: p.id,
              criado_por: user.id,
              texto: `❌ Projeto cancelado automaticamente pelo cancelamento do contrato base ${contratoBaseCancelado?.numero_exibicao || ""}.`,
            });
            cancelledCardIds.push(p.id);
          }
        }
        allCancelledCardIds.push(...cancelledCardIds);
      }

      if (aditivosSelecionados.length > 0) {
        toast.success(`${aditivosSelecionados.length} contrato(s) vinculado(s) cancelado(s).`);
      }

      // Verificar agendamentos de todos os projetos cancelados
      await verificarAgendamentosProjetos(allCancelledCardIds);
    } catch (err: any) {
      toast.error("Erro ao cancelar: " + (err.message || ""));
    } finally {
      setProcessando(false);
      setOpenCancelarAditivos(false);
      setAditivosVinculados([]);
      setAditivosSelecionados([]);
      setContratoBaseCancelado(null);
      setMotivoCancelamento("");
      loadData();
    }
  }

  async function handleManterTodosAtivos() {
    if (!contratoBaseCancelado) return;
    // Cancelar apenas o contrato base, sem tocar nos aditivos
    await executarCancelamentoContrato(contratoBaseCancelado, motivoCancelamento || "Cancelamento direto");
    setOpenCancelarAditivos(false);
    setAditivosVinculados([]);
    setAditivosSelecionados([]);
    setContratoBaseCancelado(null);
    setMotivoCancelamento("");
    loadData();
  }

  async function handleCancelarProjetosVinculados() {
    if (projetosAtivos.length === 0) return;
    setProcessando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      for (const projeto of projetosAtivos) {
        // Salvar no relatório
        await supabase.from("projetos_cancelados").insert({
          card_id: projeto.id,
          contrato_id: selected!.id,
          cliente_id: selected!.cliente_id,
          filial_id: projeto.filial_id,
          motivo: cancelarProjetoMotivo.trim() || "Cancelamento de contrato",
          cancelado_por: user.id,
          tipo_operacao: projeto.tipo_operacao,
          plano_nome: (projeto.planos as any)?.nome || null,
          cliente_nome: (projeto.clientes as any)?.nome_fantasia || null,
          contrato_numero: (projeto.contratos as any)?.numero_exibicao || null,
        } as any);

        // Remover do painel (excluir)
        await supabase
          .from("painel_atendimento")
          .delete()
          .eq("id", projeto.id);
      }

      toast.success("Projeto(s) removido(s) do painel e salvo(s) em cancelados!");

      // Verificar agendamentos pendentes dos projetos cancelados
      await verificarAgendamentosProjetos(projetosAtivos.map(p => p.id));
    } catch (err: any) {
      toast.error("Erro ao remover projeto(s): " + (err.message || ""));
    } finally {
      setProcessando(false);
      setOpenCancelarProjeto(false);
      setCancelarProjetoMotivo("");
      setProjetosAtivos([]);
    }
  }

  async function handleManterProjetoComTagCancelado() {
    if (projetosAtivos.length === 0) return;
    setProcessando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const autorNome = profile?.full_name?.split(" ")[0] || "Usuário";

      for (const projeto of projetosAtivos) {
        // Marcar como cancelado (tag) mas manter no painel
        await supabase
          .from("painel_atendimento")
          .update({ status_projeto: "cancelado" } as any)
          .eq("id", projeto.id);

        // Comentário
        await supabase.from("painel_comentarios").insert({
          card_id: projeto.id,
          criado_por: user.id,
          texto: `🚫 Contrato cancelado. Projeto marcado como cancelado por ${autorNome}. Nenhuma ação permitida.`,
        });
      }

      toast.success("Projeto(s) marcado(s) como cancelado no painel.");

      // Verificar agendamentos pendentes dos projetos cancelados
      await verificarAgendamentosProjetos(projetosAtivos.map(p => p.id));
    } catch (err: any) {
      toast.error("Erro: " + (err.message || ""));
    } finally {
      setProcessando(false);
      setOpenCancelarProjeto(false);
      setCancelarProjetoMotivo("");
      setProjetosAtivos([]);
    }
  }

  async function verificarAgendamentosProjetos(cardIds: string[]) {
    if (cardIds.length === 0) return;
    const { data: agendamentos } = await supabase
      .from("painel_agendamentos")
      .select("*, painel_atendimento!inner(clientes(nome_fantasia), contratos(numero_exibicao))")
      .in("card_id", cardIds)
      .order("data");
    
    if (agendamentos && agendamentos.length > 0) {
      setAgendamentosCancelados(agendamentos);
      setAgendamentosCancelOpen(true);
    }
  }

  async function handleRemoverAgendamentosCancelados() {
    setRemovendoAgendamentos(true);
    try {
      const ids = agendamentosCancelados.map((a: any) => a.id);
      await supabase.from("painel_agendamentos").delete().in("id", ids);
      toast.success(`${ids.length} agendamento(s) removido(s)!`);
    } catch (err: any) {
      toast.error("Erro ao remover agendamentos: " + (err.message || ""));
    } finally {
      setRemovendoAgendamentos(false);
      setAgendamentosCancelOpen(false);
      setAgendamentosCancelados([]);
    }
  }


  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contratos</h1>
            <p className="text-sm text-muted-foreground">Gestão e visualização de contratos ativos</p>
          </div>
            <div className="flex items-center gap-3">
            {podeCadastroRetroativo && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={retro.openRetroativoDialog}>
                <FilePen className="h-4 w-4" />
                Cadastrar Retroativo
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              title="Atualizar status de assinaturas"
              disabled={syncingStatuses}
              onClick={handleSyncAllStatuses}
            >
              <RefreshCw className={`h-4 w-4 ${syncingStatuses ? "animate-spin" : ""}`} />
            </Button>
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <FileCheck className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-700">
                {ativos} ativo{ativos !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <div className="relative sm:col-span-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, apelido, CNPJ, razão social ou nº contrato..."
              value={filterBusca}
              onChange={(e) => setFilterBusca(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as filiais" />
              </SelectTrigger>
              <SelectContent>
                {filiaisDoUsuario.length > 1 && <SelectItem value="all">Todas as filiais</SelectItem>}
                {(filiaisDoUsuario.length > 0 ? filiaisDoUsuario : todasFiliais).map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Encerrado">Encerrado</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDe}
              onChange={(e) => setFilterDe(e.target.value)}
              title="Data inicial"
            />
            <Input
              type="date"
              value={filterAte}
              onChange={(e) => setFilterAte(e.target.value)}
              title="Data final"
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Nº Contrato</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Doc.</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nenhum contrato encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((contrato) => (
                  <TableRow key={contrato.id}>
                    <TableCell className="font-mono font-semibold text-sm">
                      <div>{contrato.numero_exibicao || `#${contrato.numero_registro}`}</div>
                      {contrato.contrato_origem_id && (() => {
                        const origem = contratos.find(c => c.id === contrato.contrato_origem_id);
                        return origem ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleOpenDetail(origem); }}
                            className="text-[10px] text-primary/70 hover:text-primary font-normal flex items-center gap-0.5 hover:underline cursor-pointer transition-colors"
                          >
                            ↳ {origem.numero_exibicao}
                          </button>
                        ) : null;
                      })()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {contrato.clientes?.nome_fantasia || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {contrato.planos?.nome || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {getTipoBadge(contrato.tipo)}
                        {contrato.tipo === "Aditivo" && contrato.pedidos?.tipo_pedido && (
                          <span className="text-[10px] text-muted-foreground pl-0.5">
                            {contrato.pedidos.tipo_pedido === "Upgrade" ? "↑ Upgrade" : contrato.pedidos.tipo_pedido === "Aditivo" ? "＋ Módulos Adicionais" : ""}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                    <TableCell>{getPedidoStatusBadges(contrato)}</TableCell>
                    <TableCell>{getStatusGeracaoBadge(contrato.status_geracao, contrato.status)}</TableCell>
                    <TableCell>{getZapSignStatusBadge(zapsignRecords[contrato.id]?.status, contrato.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div>{format(new Date(contrato.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                      <div className="text-xs">{format(new Date(contrato.created_at), "HH:mm", { locale: ptBR })}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-card border border-border shadow-lg z-50">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => handleOpenDetail(contrato)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar
                          </DropdownMenuItem>
                          {/* Gerar/Regerar — bloqueado se já enviado para ZapSign (exceto com permissão) */}
                          {(!zapsignRecords[contrato.id] || podeRegerarContrato) && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleGerarContrato(contrato)}
                              disabled={gerando}
                            >
                              {gerando ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <FileOutput className="h-4 w-4 mr-2" />
                              )}
                              {contrato.tipo === "OA"
                                ? (contrato.status_geracao === "Gerado" ? "Regerar OA" : "Gerar OA")
                                : (contrato.status_geracao === "Gerado" ? "Regerar Contrato" : "Gerar Contrato")}
                            </DropdownMenuItem>
                          )}
                          {/* Baixar PDF — só se tem pdf_url e NÃO foi enviado para ZapSign */}
                          {contrato.status_geracao === "Gerado" && contrato.pdf_url && !zapsignRecords[contrato.id] && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleBaixarContrato(contrato)}
                              disabled={gerando}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              {contrato.tipo === "OA" ? "Baixar OA" : "Baixar Contrato"}
                            </DropdownMenuItem>
                          )}
                          {/* Visualizar via ZapSign — quando já enviado */}
                          {zapsignRecords[contrato.id]?.sign_url && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => window.open(zapsignRecords[contrato.id].sign_url!, "_blank")}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Visualizar Documento
                            </DropdownMenuItem>
                          )}
                          {canManage && zapsignRecords[contrato.id] && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setZapsignDetailContrato(contrato);
                                  setOpenZapsignDetail(true);
                                }}
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                Ver ZapSign
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => handleAtualizarStatusZapSign(contrato.id)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Atualizar Status
                              </DropdownMenuItem>
                            </>
                          )}
                          {canManage && (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => toast.info("Edição de contrato em desenvolvimento.")}
                            >
                              <FilePen className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                          )}
                          {canManage && contrato.status === "Ativo" && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={() => { setSelected(contrato); setOpenEncerrar(true); }}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar Contrato
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={currentPage}
            totalPages={Math.ceil(filtered.length / ITEMS_PER_PAGE)}
            totalItems={filtered.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Detail Dialog */}
      {selected && (
        <ContratoDetailDialog
          open={openDetail}
          onOpenChange={setOpenDetail}
          selected={selected}
          contratos={contratos}
          zapsignRecords={zapsignRecords}
          canManage={canManage}
          podeRegerarContrato={podeRegerarContrato}
          gerando={gerando}
          enviandoWhatsapp={enviandoWhatsapp}
          contatosCliente={contatosCliente}
          buildTermoCtx={buildTermoCtx}
          getStatusBadge={getStatusBadge}
          getTipoBadge={getTipoBadge}
          getStatusGeracaoBadge={getStatusGeracaoBadge}
          onSetSelected={setSelected}
          onGerarContrato={handleGerarContrato}
          onBaixarContrato={handleBaixarContrato}
          onEnviarWhatsapp={hookEnviarWhatsapp}
          onCancelar={() => { setOpenDetail(false); setOpenEncerrar(true); }}
        />
      )}

      {/* Encerrar AlertDialog */}
      <EncerrarContratoDialog
        open={openEncerrar}
        onOpenChange={setOpenEncerrar}
        contratoNumero={selected?.numero_exibicao}
        clienteNome={selected?.clientes?.nome_fantasia}
        motivoCancelamento={motivoCancelamento}
        setMotivoCancelamento={setMotivoCancelamento}
        onConfirm={handleEncerrar}
        processando={processando}
      />

      {/* Cancelar Projeto vinculado Dialog */}
      <CancelarProjetoDialog
        open={openCancelarProjeto}
        onOpenChange={setOpenCancelarProjeto}
        projetosAtivos={projetosAtivos}
        processando={processando}
        onExcluirProjetos={handleCancelarProjetosVinculados}
        onManterComTag={handleManterProjetoComTagCancelado}
        onIgnorar={() => { setOpenCancelarProjeto(false); setCancelarProjetoMotivo(""); setProjetosAtivos([]); }}
      />

      {/* Agendamentos de Projeto Cancelado Dialog */}
      <AgendamentosCancelDialog
        open={agendamentosCancelOpen}
        onOpenChange={setAgendamentosCancelOpen}
        agendamentos={agendamentosCancelados}
        removendo={removendoAgendamentos}
        onRemover={handleRemoverAgendamentosCancelados}
        onManter={() => { setAgendamentosCancelOpen(false); setAgendamentosCancelados([]); }}
      />

      {/* Cancelar Aditivos Vinculados Dialog */}
      <CancelarAditivosDialog
        open={openCancelarAditivos}
        onOpenChange={setOpenCancelarAditivos}
        contratoBaseCancelado={contratoBaseCancelado}
        aditivosVinculados={aditivosVinculados}
        aditivosSelecionados={aditivosSelecionados}
        setAditivosSelecionados={setAditivosSelecionados}
        processando={processando}
        onManterTodos={handleManterTodosAtivos}
        onCancelarSelecionados={handleCancelarAditivosSelecionados}
        getTipoBadge={getTipoBadge}
        onOpenDetail={handleOpenDetail}
      />

      {/* (Old generation popup removed - now unified in ZapSign popup below) */}

      {/* ZapSign Detail Dialog */}
      <ZapsignDetailDialog
        open={openZapsignDetail}
        onOpenChange={setOpenZapsignDetail}
        contrato={zapsignDetailContrato}
        zapsignRecord={zapsignDetailContrato ? zapsignRecords[zapsignDetailContrato.id] : undefined}
        getZapSignStatusBadge={getZapSignStatusBadge}
        onAtualizarStatus={handleAtualizarStatusZapSign}
        onReenviarWhatsapp={handleReenviarWhatsapp}
        reenviandoWhatsapp={reenviandoWhatsapp}
      />

      {/* ── Popup ZapSign + WhatsApp Animada ──────────────────────────── */}
      <ZapsignPopupDialog
        open={openZapsignPopup}
        onOpenChange={setOpenZapsignPopup}
        step={zapsignPopupStep}
        msgIndex={zapsignPopupMsgIndex}
        contratoTipo={zapsignPopupContrato?.tipo}
        error={zapsignPopupError}
      />
      {/* Dialog Cadastro Retroativo */}
      <CadastroRetroativoDialog
        open={openRetroativo}
        onOpenChange={setOpenRetroativo}
        retroForm={retroForm}
        setRetroForm={setRetroForm}
        retroClientes={retroClientes}
        retroPlanos={retroPlanos}
        retroModulos={retroModulos}
        retroVendedores={retroVendedores}
        retroSegmentos={retroSegmentos}
        retroModulosSelecionados={retroModulosSelecionados}
        setRetroModulosSelecionados={setRetroModulosSelecionados}
        retroDescontoAtivo={retroDescontoAtivo}
        setRetroDescontoAtivo={setRetroDescontoAtivo}
        retroClienteSearch={retroClienteSearch}
        setRetroClienteSearch={setRetroClienteSearch}
        retroClienteSearchFocused={retroClienteSearchFocused}
        setRetroClienteSearchFocused={setRetroClienteSearchFocused}
        retroSaving={retroSaving}
        handleRetroAddModulo={handleRetroAddModulo}
        handleSalvarRetroativo={handleSalvarRetroativo}
        retroValorImpOriginal={retroValorImpOriginal}
        retroValorMensOriginal={retroValorMensOriginal}
        retroValorImpFinal={retroValorImpFinal}
        retroValorMensFinal={retroValorMensFinal}
        retroValorTotal={retroValorTotal}
        filiais={filiais}
        openRetroClienteDialog={openRetroClienteDialog}
        setOpenRetroClienteDialog={setOpenRetroClienteDialog}
        retroClienteForm={retroClienteForm}
        setRetroClienteForm={setRetroClienteForm}
        emptyRetroClienteForm={emptyRetroClienteForm}
        retroSavingCliente={retroSavingCliente}
        retroLoadingCep={retroLoadingCep}
        retroLoadingCnpj={retroLoadingCnpj}
        retroCepError={retroCepError}
        retroCnpjError={retroCnpjError}
        setRetroCepError={setRetroCepError}
        setRetroCnpjError={setRetroCnpjError}
        handleRetroCepBlur={handleRetroCepBlur}
        handleRetroCnpjBlur={handleRetroCnpjBlur}
        handleRetroSaveCliente={handleRetroSaveCliente}
        retroClienteContatos={retroClienteContatos}
        setRetroClienteContatos={setRetroClienteContatos}
        retroShowContatoForm={retroShowContatoForm}
        setRetroShowContatoForm={setRetroShowContatoForm}
        retroEditingContatoIdx={retroEditingContatoIdx}
        setRetroEditingContatoIdx={setRetroEditingContatoIdx}
        retroInlineContatoForm={retroInlineContatoForm}
        setRetroInlineContatoForm={setRetroInlineContatoForm}
      />
    </AppLayout>
  );
}

