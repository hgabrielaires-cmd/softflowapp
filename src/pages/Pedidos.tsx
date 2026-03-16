import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dispararAutomacaoPedidoStatus } from "@/lib/automacoes";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { Navigate } from "react-router-dom";
import { Cliente, Filial, Profile, Contrato } from "@/lib/supabase-types";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Pencil, XCircle, Loader2, Filter, RefreshCw, CheckCircle, Tag, ArrowUpCircle, FileText, AlertCircle, Eye, Send, MessageSquare, Paperclip, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TablePagination } from "@/components/TablePagination";

// ─── Extracted modules ────────────────────────────────────────────────────────
import type { PedidoWithJoins, FormState, ModuloOpcional, ModuloAdicionadoItem, ServicoAdicionadoItem, DraftComentario, ClienteFormState, ClienteContatoInline } from "./pedidos/types";
import { emptyClienteForm, STATUS_OPTIONS, STATUS_COLORS, FIN_STATUS_COLORS, emptyForm, PRIORIDADE_MAP_DRAFT, MAX_FILE_SIZE_DRAFT, ITEMS_PER_PAGE } from "./pedidos/constants";
import { fmtBRL, applyDesconto, applyAcrescimo, validatePedidoForm } from "./pedidos/helpers";
import { usePedidoSave } from "./pedidos/usePedidoSave";
import { VisualizarPedidoDialog } from "./pedidos/components/VisualizarPedidoDialog";
import { ClienteRapidoDialog } from "./pedidos/components/ClienteRapidoDialog";
import { ComentarioDraftDialog } from "./pedidos/components/ComentarioDraftDialog";
import { UpgradePlanoDialog } from "./pedidos/components/UpgradePlanoDialog";
import { PedidoFormDialog } from "./pedidos/components/PedidoFormDialog";
import { usePedidosQueries } from "./pedidos/usePedidosQueries";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Pedidos() {
  const { user, profile, roles, isAdmin } = useAuth();
  const { filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais, loading: loadingFiliais } = useUserFiliais();
  const { canIncluir: crudIncluir, canEditar: crudEditar, canExcluir: crudExcluir } = useCrudPermissions("pedidos", roles);
  const isFinanceiro = roles.includes("financeiro");
  const isVendedor = roles.includes("vendedor");
  const isTecnico = roles.includes("tecnico") && !isAdmin && !isFinanceiro && !isVendedor;
  const canSeeAllBranches = filiaisDoUsuario.length > 1;

  // ─── Data from queries hook ──────────────────────────────────────────────
  const {
    pedidos, clientes, planos, filiais, vendedores, servicosCatalogo,
    loading, zapsignMap, contratoStatusMap, loadData,
    planoSelecionado, setPlanoSelecionado, modulosDisponiveis, setModulosDisponiveis,
    precosFilialMap, setPrecosFilialMap, loadingModulos,
    loadPlano: loadPlanoRaw,
    filialParametros, loadFilialParametros,
    contratoAtivo, setContratoAtivo, loadingContrato, buscarContratoAtivo,
    limiteDesconto, setLimiteDesconto, carregarLimitesDesconto,
  } = usePedidosQueries();

  const { savePedido } = usePedidoSave();

  const [filialFavoritaId, setFilialFavoritaId] = useState<string | null>(null);
  const [servicoBuscaId, setServicoBuscaId] = useState("");
  const [servicoBuscaQtd, setServicoBuscaQtd] = useState("1");

  // Estado do seletor de módulo adicional
  const [moduloBuscaId, setModuloBuscaId] = useState("");
  const [moduloBuscaQtd, setModuloBuscaQtd] = useState("1");

  // Filters
  const [search, setSearch] = useState("");
  const [filterFilial, setFilterFilial] = useState("_init_");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVendedor, setFilterVendedor] = useState("all");
  const [filterDe, setFilterDe] = useState("");
  const [filterAte, setFilterAte] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog pedido
  const [openDialog, setOpenDialog] = useState(false);
  const [viewingPedido, setViewingPedido] = useState<PedidoWithJoins | null>(null);
  const [editingPedido, setEditingPedido] = useState<PedidoWithJoins | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [descontoAtivo, setDescontoAtivo] = useState(false);
  const [acrescimoAtivo, setAcrescimoAtivo] = useState(false);
  const [saving, setSaving] = useState(false);



  // Modal de upgrade
  const [openUpgradeDialog, setOpenUpgradeDialog] = useState(false);
  // Módulos já contratados (para Aditivo — excluir do seletor)
  const [modulosJaContratados, setModulosJaContratados] = useState<ModuloAdicionadoItem[]>([]);
  // Valores do plano anterior (para calcular diferença no Upgrade)
  const [planoAnteriorValores, setPlanoAnteriorValores] = useState<{ implantacao: number; mensalidade: number } | null>(null);
  const [upgradePlanoId, setUpgradePlanoId] = useState("");

  // Dialog novo cliente rápido
  const [openClienteDialog, setOpenClienteDialog] = useState(false);
  const [clienteForm, setClienteForm] = useState(emptyClienteForm);
  const [savingCliente, setSavingCliente] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const [cepError, setCepError] = useState("");
  const [cnpjError, setCnpjError] = useState("");
  const isQuerying = loadingCep || loadingCnpj;

  // Busca de cliente no form
  const [clienteSearch, setClienteSearch] = useState("");
  const [clienteSearchFocused, setClienteSearchFocused] = useState(false);

  // Contatos inline do form novo cliente
   const [clienteContatos, setClienteContatos] = useState<ClienteContatoInline[]>([]);

  // All users for @mentions
  const [allMentionUsers, setAllMentionUsers] = useState<{ id: string; user_id: string; full_name: string }[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("id, user_id, full_name").then(({ data }) => {
      if (data) setAllMentionUsers(data as { id: string; user_id: string; full_name: string }[]);
    });
  }, []);

  // Draft comments (antes de salvar pedido)
  const [draftComentarios, setDraftComentarios] = useState<DraftComentario[]>([]);
  const [openComentarioDialog, setOpenComentarioDialog] = useState(false);
  const [draftTexto, setDraftTexto] = useState("");
  const [draftPrioridade, setDraftPrioridade] = useState("normal");
  const [draftArquivo, setDraftArquivo] = useState<File | null>(null);
  const draftFileRef = useRef<HTMLInputElement>(null);
  const [editingDraftIdx, setEditingDraftIdx] = useState<number | null>(null);


  function handleAddDraftComentario() {
    if (!draftTexto.trim()) { toast.error("Digite um comentário."); return; }
    if (editingDraftIdx !== null) {
      setDraftComentarios(prev => prev.map((c, i) => i === editingDraftIdx ? { texto: draftTexto.trim(), prioridade: draftPrioridade, arquivo: draftArquivo, arquivo_nome: draftArquivo?.name || null } : c));
    } else {
      setDraftComentarios(prev => [...prev, { texto: draftTexto.trim(), prioridade: draftPrioridade, arquivo: draftArquivo, arquivo_nome: draftArquivo?.name || null }]);
    }
    setDraftTexto("");
    setDraftPrioridade("normal");
    setDraftArquivo(null);
    setEditingDraftIdx(null);
    if (draftFileRef.current) draftFileRef.current.value = "";
    setOpenComentarioDialog(false);
  }

  function handleDraftFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_DRAFT) {
      toast.error("Arquivo excede o limite de 11 MB.");
      e.target.value = "";
      return;
    }
    setDraftArquivo(file);
  }

  async function salvarDraftComentarios(pedidoId: string) {
    if (!user || draftComentarios.length === 0) return;
    for (const draft of draftComentarios) {
      let anexo_url: string | null = null;
      let anexo_nome: string | null = null;
      if (draft.arquivo) {
        const ext = draft.arquivo.name.split(".").pop();
        const path = `${pedidoId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("pedido-anexos").upload(path, draft.arquivo);
        if (!uploadErr) {
          const { data: signedData } = await supabase.storage.from("pedido-anexos").createSignedUrl(path, 60 * 60 * 24 * 365);
          anexo_url = signedData?.signedUrl || null;
          anexo_nome = draft.arquivo.name;
        }
      }
      await supabase.from("pedido_comentarios").insert({
        pedido_id: pedidoId,
        user_id: user.id,
        texto: draft.texto,
        prioridade: draft.prioridade,
        anexo_url,
        anexo_nome,
      });

      // Extract @mentions and create notifications
      const mentionRegex = /@([\w\u00C0-\u024F]+)/g;
      let mentionMatch;
      const meuNome = profile?.full_name || "Usuário";
      while ((mentionMatch = mentionRegex.exec(draft.texto)) !== null) {
        const name = mentionMatch[1].trim();
        const mentioned = allMentionUsers.find(
          (u) => u.full_name.toLowerCase() === name.toLowerCase() ||
            u.full_name.split(" ")[0].toLowerCase() === name.toLowerCase()
        );
        if (mentioned && mentioned.user_id !== user.id) {
          await supabase.from("notificacoes").insert({
            titulo: "Você foi mencionado em um pedido",
            mensagem: `${meuNome} mencionou você em um comentário de pedido`,
            tipo: "info",
            destinatario_user_id: mentioned.user_id,
            criado_por: user.id,
          });
        }
      }
    }
  }




  // ─── Computed values ─────────────────────────────────────────────────────

  // Total dos módulos adicionais na lista
  const totalAdicionaisImp = form.modulos_adicionais.reduce(
    (acc, m) => acc + m.valor_implantacao_modulo * m.quantidade, 0
  );
  const totalAdicionaisMens = form.modulos_adicionais.reduce(
    (acc, m) => acc + m.valor_mensalidade_modulo * m.quantidade, 0
  );

  // Total dos serviços OA
  const totalServicosOA = form.servicos_pedido.reduce(
    (acc, s) => acc + s.valor_unitario * s.quantidade, 0
  );

  // Resolve plan prices considering filial overrides
  const planoImplFilial = form.filial_id && planoSelecionado
    ? (precosFilialMap[`plano:${planoSelecionado.id}:${form.filial_id}`]?.valor_implantacao ?? planoSelecionado.valor_implantacao_padrao ?? 0)
    : (planoSelecionado?.valor_implantacao_padrao ?? 0);
  const planoMensFilial = form.filial_id && planoSelecionado
    ? (precosFilialMap[`plano:${planoSelecionado.id}:${form.filial_id}`]?.valor_mensalidade ?? planoSelecionado.valor_mensalidade_padrao ?? 0)
    : (planoSelecionado?.valor_mensalidade_padrao ?? 0);

  const valorImplantacaoOriginal = form.tipo_pedido === "OA"
    ? totalServicosOA
    : form.tipo_pedido === "Aditivo"
      ? totalAdicionaisImp // Aditivo: só cobra os módulos novos
      : form.tipo_pedido === "Upgrade" && planoAnteriorValores
        ? Math.max(0, planoImplFilial - planoAnteriorValores.implantacao)
        : (planoSelecionado ? planoImplFilial : form.valor_implantacao_original) + totalAdicionaisImp;
  const valorMensalidadeOriginal = form.tipo_pedido === "OA"
    ? 0
    : form.tipo_pedido === "Aditivo"
      ? totalAdicionaisMens // Aditivo: só cobra os módulos novos
      : form.tipo_pedido === "Upgrade" && planoAnteriorValores
        ? Math.max(0, planoMensFilial - planoAnteriorValores.mensalidade)
        : (planoSelecionado ? planoMensFilial : form.valor_mensalidade_original) + totalAdicionaisMens;

  // Aplicar acréscimo primeiro, depois desconto
  const valorImpComAcrescimo = applyAcrescimo(
    valorImplantacaoOriginal,
    form.acrescimo_implantacao_tipo,
    parseFloat(form.acrescimo_implantacao_valor) || 0
  );
  const valorMensComAcrescimo = applyAcrescimo(
    valorMensalidadeOriginal,
    form.acrescimo_mensalidade_tipo,
    parseFloat(form.acrescimo_mensalidade_valor) || 0
  );

  const valorImplantacaoFinal = applyDesconto(
    valorImpComAcrescimo,
    form.desconto_implantacao_tipo,
    parseFloat(form.desconto_implantacao_valor) || 0
  );

  const valorMensalidadeFinal = applyDesconto(
    valorMensComAcrescimo,
    form.desconto_mensalidade_tipo,
    parseFloat(form.desconto_mensalidade_valor) || 0
  );

  const valorTotal = valorImplantacaoFinal + valorMensalidadeFinal;
  // Comissões separadas por tipo
  const comissaoImpPerc = parseFloat(form.comissao_implantacao_percentual) || 0;
  const comissaoMensPerc = parseFloat(form.comissao_mensalidade_percentual) || 0;
  const comissaoServPerc = parseFloat(form.comissao_servico_percentual) || 0;
  const comissaoImpValor = valorImplantacaoFinal * comissaoImpPerc / 100;
  const comissaoMensValor = valorMensalidadeFinal * comissaoMensPerc / 100;
  const comissaoServValor = form.tipo_pedido === "OA" ? valorTotal * comissaoServPerc / 100 : 0;
  const comissaoValorTotal = form.tipo_pedido === "OA" ? comissaoServValor : comissaoImpValor + comissaoMensValor;
  // Campo legado mantido para compatibilidade
  const comissaoValor = comissaoValorTotal;
  const comissaoPercentualLegado = parseFloat(form.comissao_percentual) || 0;

  // ─── Cálculo de desconto em % para comparação com limites ───────────────────
  const descontoImpPercAtual = form.desconto_implantacao_tipo === "%"
    ? parseFloat(form.desconto_implantacao_valor) || 0
    : valorImplantacaoOriginal > 0 ? ((parseFloat(form.desconto_implantacao_valor) || 0) / valorImplantacaoOriginal) * 100 : 0;
  const descontoMensPercAtual = form.desconto_mensalidade_tipo === "%"
    ? parseFloat(form.desconto_mensalidade_valor) || 0
    : valorMensalidadeOriginal > 0 ? ((parseFloat(form.desconto_mensalidade_valor) || 0) / valorMensalidadeOriginal) * 100 : 0;

  const limiteImpAtual = limiteDesconto?.implantacao ?? 100;
  const limiteMensAtual = limiteDesconto?.mensalidade ?? 100;

  const descontoImpExcedido = descontoAtivo && (parseFloat(form.desconto_implantacao_valor) || 0) > 0 && limiteDesconto !== null && descontoImpPercAtual > limiteImpAtual;
  const descontoMensExcedido = descontoAtivo && (parseFloat(form.desconto_mensalidade_valor) || 0) > 0 && limiteDesconto !== null && descontoMensPercAtual > limiteMensAtual;
  const descontoExcedido = descontoImpExcedido || descontoMensExcedido;
  // Qualquer usuário (inclusive admin) é bloqueado se exceder o limite
  const bloqueadoPorDesconto = descontoExcedido;

  // ─── Load plano wrapper (delegates to hook, updates form) ─────────────────

  const loadPlano = useCallback(async (planoId: string, modulosAdicionaisExistentes: ModuloAdicionadoItem[] = [], filialIdOverride?: string) => {
    const resolvedFilialId = filialIdOverride || form.filial_id;
    const result = await loadPlanoRaw(planoId, modulosAdicionaisExistentes, resolvedFilialId);
    if (!result && !planoId) {
      setForm((f) => ({ ...f, valor_implantacao_original: 0, valor_mensalidade_original: 0 }));
      return;
    }
    if (result) {
      setForm((f) => ({
        ...f,
        valor_implantacao_original: result.planoImplantacao,
        valor_mensalidade_original: result.planoMensalidade,
        modulos_adicionais: result.updatedModulos,
      }));
    }
  }, [form.filial_id, loadPlanoRaw]);

  // ─── Handlers de módulos adicionais ──────────────────────────────────────

  function handleAdicionarModulo() {
    if (!moduloBuscaId) { toast.error("Selecione um módulo"); return; }
    const qtd = parseInt(moduloBuscaQtd) || 1;
    const modulo = modulosDisponiveis.find((m) => m.id === moduloBuscaId);
    if (!modulo) return;

    // Validar quantidade máxima
    const jaExiste = form.modulos_adicionais.find((m) => m.modulo_id === moduloBuscaId);
    const qtdAtual = jaExiste ? jaExiste.quantidade : 0;
    const novaQtd = qtdAtual + qtd;

    if (modulo.quantidade_maxima != null && novaQtd > modulo.quantidade_maxima) {
      toast.error(`Quantidade máxima excedida para "${modulo.nome}". Máximo permitido: ${modulo.quantidade_maxima} por contrato.`);
      return;
    }

    // Se já existe, só incrementa quantidade
    if (jaExiste) {
      setForm((f) => ({
        ...f,
        modulos_adicionais: f.modulos_adicionais.map((m) =>
          m.modulo_id === moduloBuscaId ? { ...m, quantidade: m.quantidade + qtd } : m
        ),
      }));
    } else {
      const item: ModuloAdicionadoItem = {
        modulo_id: modulo.id,
        nome: modulo.nome,
        quantidade: qtd,
        valor_implantacao_modulo: modulo.valor_implantacao_modulo ?? 0,
        valor_mensalidade_modulo: modulo.valor_mensalidade_modulo ?? 0,
      };
      setForm((f) => ({ ...f, modulos_adicionais: [...f.modulos_adicionais, item] }));
    }
    setModuloBuscaId("");
    setModuloBuscaQtd("1");
  }

  function handleRemoverModulo(moduloId: string) {
    setForm((f) => ({
      ...f,
      modulos_adicionais: f.modulos_adicionais.filter((m) => m.modulo_id !== moduloId),
    }));
  }

  function handlePlanoChange(planoId: string) {
    setModuloBuscaId("");
    setModuloBuscaQtd("1");
    setForm((f) => ({
      ...f,
      plano_id: planoId,
      modulos_adicionais: [],
      desconto_implantacao_valor: "0",
      desconto_mensalidade_valor: "0",
    }));
    loadPlano(planoId, []);
  }
  // ─── Filial favorita ──────────────────────────────────────────────────────

  // Use filialPadraoId from hook as filialFavoritaId
  useEffect(() => {
    if (filialPadraoId) setFilialFavoritaId(filialPadraoId);
  }, [filialPadraoId]);

  // Atualiza parametros quando filial muda no form
  useEffect(() => {
    if (form.filial_id) loadFilialParametros(form.filial_id);
  }, [form.filial_id, loadFilialParametros]);

  // Default filial filter from user access
  useEffect(() => {
    if (filterFilial === "_init_") {
      if (profile?.filial_favorita_id) {
        setFilterFilial(profile.filial_favorita_id);
      } else {
        setFilterFilial("all");
      }
    }
  }, [filialPadraoId, profile?.filial_favorita_id]);

  async function handleClienteChange(clienteId: string) {
    setForm((f) => ({ ...f, cliente_id: clienteId, plano_id: "", tipo_pedido: "Novo", contrato_id: null }));
    setPlanoSelecionado(null);
    setModulosDisponiveis([]);
    setModulosJaContratados([]);
    setPlanoAnteriorValores(null);
    await buscarContratoAtivo(clienteId);
  }

  // Estado para armazenar o plano vigente real (considerando upgrades anteriores)
  const [planoVigenteId, setPlanoVigenteId] = useState<string | null>(null);

  async function handleIniciarUpgrade() {
    setUpgradePlanoId("");
    // Buscar o plano vigente real: se houver um upgrade ativo vinculado ao contrato base, usar esse plano
    let planoAtualId = contratoAtivo?.plano_id || null;
    if (contratoAtivo) {
      const { data: upgradesAtivos } = await supabase
        .from("contratos")
        .select("plano_id")
        .eq("contrato_origem_id", contratoAtivo.id)
        .eq("status", "Ativo")
        .eq("tipo", "Aditivo")
        .not("plano_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (upgradesAtivos && upgradesAtivos.length > 0 && upgradesAtivos[0].plano_id) {
        // Verificar se esse aditivo é realmente um upgrade (plano diferente do base)
        if (upgradesAtivos[0].plano_id !== contratoAtivo.plano_id) {
          planoAtualId = upgradesAtivos[0].plano_id;
        }
      }
    }
    setPlanoVigenteId(planoAtualId);
    setOpenUpgradeDialog(true);
  }

  async function handleConfirmarUpgrade() {
    if (!upgradePlanoId) { toast.error("Selecione o novo plano"); return; }
    if (!contratoAtivo) return;
    // Buscar valores do plano anterior (vigente) para calcular diferença
    const planoAnteriorId = planoVigenteId || contratoAtivo.plano_id;
    if (planoAnteriorId) {
      const { data: planoAntigo } = await supabase
        .from("planos")
        .select("valor_implantacao_padrao, valor_mensalidade_padrao")
        .eq("id", planoAnteriorId)
        .single();
      if (planoAntigo) {
        setPlanoAnteriorValores({
          implantacao: planoAntigo.valor_implantacao_padrao ?? 0,
          mensalidade: planoAntigo.valor_mensalidade_padrao ?? 0,
        });
      }
    }
    setModulosJaContratados([]);
    setForm((f) => ({
      ...f,
      plano_id: upgradePlanoId,
      tipo_pedido: "Upgrade",
      contrato_id: contratoAtivo.id,
      modulos_adicionais: [], // Upgrade não permite módulos adicionais
    }));
    loadPlano(upgradePlanoId, []);
    setOpenUpgradeDialog(false);
  }

  async function handleIniciarAditivo() {
    if (!contratoAtivo) return;
    // Buscar módulos já contratados no pedido vinculado ao contrato
    let modulosExistentes: ModuloAdicionadoItem[] = [];
    if (contratoAtivo.pedido_id) {
      const { data: pedidoOriginal } = await supabase
        .from("pedidos")
        .select("modulos_adicionais")
        .eq("id", contratoAtivo.pedido_id)
        .maybeSingle();
      if (pedidoOriginal?.modulos_adicionais) {
        modulosExistentes = (pedidoOriginal.modulos_adicionais as unknown as ModuloAdicionadoItem[]) || [];
      }
    }
    setModulosJaContratados(modulosExistentes);
    setPlanoAnteriorValores(null);
    // Usar plano vigente (último upgrade) em vez do plano base
    const planoIdVigente = planoVigenteId || contratoAtivo.plano_id || "";
    setForm((f) => ({
      ...f,
      plano_id: planoIdVigente,
      tipo_pedido: "Aditivo",
      contrato_id: contratoAtivo.id,
      modulos_adicionais: [], // Começa vazio — só módulos NOVOS
    }));
    if (planoIdVigente) loadPlano(planoIdVigente, []);
  }

  function handleIniciarOA() {
    if (!contratoAtivo) return;
    const planoIdVigente = planoVigenteId || contratoAtivo.plano_id || "";
    setForm((f) => ({
      ...f,
      plano_id: planoIdVigente,
      tipo_pedido: "OA",
      contrato_id: contratoAtivo.id,
      servicos_pedido: [],
      tipo_atendimento: "",
    }));
    if (planoIdVigente) loadPlano(planoIdVigente, []);
  }

  function handleAdicionarServico() {
    if (!servicoBuscaId) { toast.error("Selecione um serviço"); return; }
    const qtd = parseInt(servicoBuscaQtd) || 1;
    const servico = servicosCatalogo.find((s) => s.id === servicoBuscaId);
    if (!servico) return;
    const jaExiste = form.servicos_pedido.find((s) => s.servico_id === servicoBuscaId);
    if (jaExiste) {
      setForm((f) => ({
        ...f,
        servicos_pedido: f.servicos_pedido.map((s) =>
          s.servico_id === servicoBuscaId ? { ...s, quantidade: s.quantidade + qtd } : s
        ),
      }));
    } else {
      setForm((f) => ({
        ...f,
        servicos_pedido: [...f.servicos_pedido, {
          servico_id: servico.id,
          nome: servico.nome,
          quantidade: qtd,
          valor_unitario: servico.valor,
          unidade_medida: servico.unidade_medida,
        }],
      }));
    }
    setServicoBuscaId("");
    setServicoBuscaQtd("1");
  }

  function handleRemoverServico(servicoId: string) {
    setForm((f) => ({
      ...f,
      servicos_pedido: f.servicos_pedido.filter((s) => s.servico_id !== servicoId),
    }));
  }

  // ─── Open create/edit ─────────────────────────────────────────────────────




  async function openCreate() {
    const defaultImp = profile?.comissao_implantacao_percentual?.toString() ?? profile?.comissao_percentual?.toString() ?? "5";
    const defaultMens = profile?.comissao_mensalidade_percentual?.toString() ?? profile?.comissao_percentual?.toString() ?? "5";
    const defaultServ = profile?.comissao_servico_percentual?.toString() ?? "5";

    // Usar filialPadraoId do hook (favorita > filial_id > primeira vinculada)
    let resolvedFilialId = filialPadraoId || filialFavoritaId || profile?.filial_favorita_id || profile?.filial_id || "";
    if (!resolvedFilialId && profile?.user_id) {
      const { data: pData } = await supabase.from("profiles").select("filial_favorita_id, filial_id").eq("user_id", profile.user_id).maybeSingle();
      resolvedFilialId = pData?.filial_favorita_id || pData?.filial_id || "";
      if (pData?.filial_favorita_id) setFilialFavoritaId(pData.filial_favorita_id);
    }

    const defaultVendedor = profile?.user_id ?? "";
    setForm({
      ...emptyForm,
      comissao_percentual: defaultImp,
      comissao_implantacao_percentual: defaultImp,
      comissao_mensalidade_percentual: defaultMens,
      comissao_servico_percentual: defaultServ,
      filial_id: resolvedFilialId,
      vendedor_id: defaultVendedor,
    });
    setClienteSearch("");
    setPlanoSelecionado(null);
    setModulosDisponiveis([]);
    setModuloBuscaId("");
    setModuloBuscaQtd("1");
    setDescontoAtivo(false);
    setAcrescimoAtivo(false);
    setEditingPedido(null);
    setLimiteDesconto(null);
    setContratoAtivo(null);
    setModulosJaContratados([]);
    setPlanoAnteriorValores(null);
    setDraftComentarios([]);
    setOpenDialog(true);
    // Carregar limites do vendedor atual
    if (profile?.user_id) carregarLimitesDesconto(profile.user_id);
  }

  function openEdit(pedido: PedidoWithJoins) {
    const adicionais = (pedido.modulos_adicionais || []) as ModuloAdicionadoItem[];
    const temDesconto = (pedido.desconto_implantacao_valor ?? 0) > 0 || (pedido.desconto_mensalidade_valor ?? 0) > 0;
    setForm({
      cliente_id: pedido.cliente_id,
      plano_id: pedido.plano_id,
      filial_id: pedido.filial_id,
      vendedor_id: pedido.vendedor_id,
      comissao_percentual: pedido.comissao_percentual.toString(),
      comissao_implantacao_percentual: (pedido.comissao_implantacao_percentual ?? pedido.comissao_percentual ?? 5).toString(),
      comissao_mensalidade_percentual: (pedido.comissao_mensalidade_percentual ?? pedido.comissao_percentual ?? 5).toString(),
      comissao_servico_percentual: (pedido.comissao_servico_percentual ?? 5).toString(),
      observacoes: pedido.observacoes || "",
      motivo_desconto: pedido.motivo_desconto || "",
      valor_implantacao_original: pedido.valor_implantacao_original ?? pedido.valor_implantacao,
      valor_mensalidade_original: pedido.valor_mensalidade_original ?? pedido.valor_mensalidade,
      desconto_implantacao_tipo: (pedido.desconto_implantacao_tipo as "R$" | "%") || "R$",
      desconto_implantacao_valor: (pedido.desconto_implantacao_valor ?? 0).toString(),
      desconto_mensalidade_tipo: (pedido.desconto_mensalidade_tipo as "R$" | "%") || "R$",
      desconto_mensalidade_valor: (pedido.desconto_mensalidade_valor ?? 0).toString(),
      modulos_adicionais: adicionais,
      tipo_pedido: (pedido.tipo_pedido as "Novo" | "Upgrade" | "Aditivo" | "OA") || "Novo",
      tipo_atendimento: (pedido.tipo_atendimento as "Interno" | "Externo" | "") || "",
      servicos_pedido: (pedido.servicos_pedido || []) as ServicoAdicionadoItem[],
      contrato_id: pedido.contrato_id || null,
      pagamento_mensalidade_tipo: (pedido.pagamento_mensalidade_forma === "Pós-pago" ? "Pós-pago" : "Pré-pago") as "Pré-pago" | "Pós-pago",
      pagamento_mensalidade_observacao: pedido.pagamento_mensalidade_observacao || "",
      pagamento_mensalidade_forma: pedido.pagamento_mensalidade_forma || "",
      pagamento_mensalidade_parcelas: pedido.pagamento_mensalidade_parcelas?.toString() || "",
      pagamento_mensalidade_desconto_percentual: (pedido.pagamento_mensalidade_desconto_percentual ?? 0).toString(),
      pagamento_implantacao_forma: pedido.pagamento_implantacao_forma || "",
      pagamento_implantacao_parcelas: pedido.pagamento_implantacao_parcelas?.toString() || "",
      pagamento_implantacao_desconto_percentual: (pedido.pagamento_implantacao_desconto_percentual ?? 0).toString(),
      pagamento_implantacao_observacao: pedido.pagamento_implantacao_observacao || "",
      acrescimo_implantacao_tipo: (pedido.acrescimo_implantacao_tipo as "R$" | "%") || "R$",
      acrescimo_implantacao_valor: (pedido.acrescimo_implantacao_valor ?? 0).toString(),
      acrescimo_mensalidade_tipo: (pedido.acrescimo_mensalidade_tipo as "R$" | "%") || "R$",
      acrescimo_mensalidade_valor: (pedido.acrescimo_mensalidade_valor ?? 0).toString(),
    });
    // Limpar a busca de cliente ao editar (o nome será exibido via form.cliente_id)
    setClienteSearch("");
    setModuloBuscaId("");
    setModuloBuscaQtd("1");
    setDescontoAtivo(temDesconto);
    const temAcrescimo = (pedido.acrescimo_implantacao_valor ?? 0) > 0 || (pedido.acrescimo_mensalidade_valor ?? 0) > 0;
    setAcrescimoAtivo(temAcrescimo);
    setEditingPedido(pedido);
    setOpenDialog(true);
    loadPlano(pedido.plano_id, adicionais);
    buscarContratoAtivo(pedido.cliente_id);
    // Carregar limites do vendedor do pedido
    carregarLimitesDesconto(pedido.vendedor_id || profile?.user_id || "");
  }


  // ─── Save ────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validatePedidoForm(form);
    if (validationError) { toast.error(validationError); return; }

    const vendedorId = form.vendedor_id || profile?.user_id || "";
    if (!vendedorId) { toast.error("Vendedor não identificado"); return; }

    const filialId = form.filial_id || profile?.filial_id || "";
    if (!filialId) { toast.error("Filial não identificada"); return; }

    setSaving(true);
    try {
      await savePedido({
        form,
        computed: {
          valorImplantacaoOriginal,
          valorMensalidadeOriginal,
          valorImplantacaoFinal,
          valorMensalidadeFinal,
          valorTotal,
          comissaoPercentualLegado,
          comissaoValorTotal,
          comissaoImpPerc,
          comissaoImpValor,
          comissaoMensPerc,
          comissaoMensValor,
          comissaoServPerc,
          comissaoServValor,
        },
        vendedorId,
        filialId,
        descontoAtivo,
        editingPedido,
        salvarDraftComentarios,
      });
      setOpenDialog(false);
      setDraftComentarios([]);
      loadData();
    } catch (err: unknown) {
      console.error("Erro ao salvar pedido:", err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar pedido";
      toast.error(msg);
    }
    setSaving(false);
  }


  async function cancelarPedido(pedido: PedidoWithJoins) {
    const { error } = await supabase.from("pedidos").update({ status_pedido: "Cancelado", financeiro_status: "Cancelado", comissao_valor: 0 }).eq("id", pedido.id);
    if (error) { toast.error("Erro ao cancelar pedido"); return; }
    dispararAutomacaoPedidoStatus(pedido.id, pedido.status_pedido, "Cancelado", pedido.tipo_pedido);
    toast.success("Pedido cancelado");
    loadData();
  }

  async function handleEnviarPedido(pedido: PedidoWithJoins) {
    const { error } = await supabase.from("pedidos").update({
      status_pedido: "Aguardando Financeiro",
      financeiro_status: "Aguardando",
      financeiro_motivo: null,
      financeiro_aprovado_em: null,
      financeiro_aprovado_por: null,
    }).eq("id", pedido.id);
    if (error) { toast.error("Erro ao enviar pedido: " + error.message); return; }
    dispararAutomacaoPedidoStatus(pedido.id, pedido.status_pedido, "Aguardando Financeiro", pedido.tipo_pedido);
    toast.success("Pedido enviado para o financeiro!");
    loadData();
  }

  // ─── Cliente rápido ───────────────────────────────────────────────────────

  async function handleCepBlurCliente() {
    const cep = clienteForm.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepError("");
    setLoadingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError("CEP não encontrado");
      } else {
        setClienteForm((f) => ({
          ...f,
          logradouro: f.logradouro || data.logradouro || "",
          bairro: f.bairro || data.bairro || "",
          cidade: f.cidade || data.localidade || "",
          uf: f.uf || data.uf || "",
        }));
      }
    } catch {
      setCepError("Erro ao consultar CEP");
    } finally {
      setLoadingCep(false);
    }
  }

  async function handleCnpjBlurCliente() {
    const cnpj = clienteForm.cnpj_cpf.replace(/\D/g, "");
    if (cnpj.length !== 14) return;
    setCnpjError("");
    setLoadingCnpj(true);
    try {
      let data = null;
      // Try BrasilAPI first
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
        if (res.ok) data = await res.json();
      } catch {}
      // Fallback to ReceitaWS
      if (!data) {
        try {
          const res2 = await fetch(`https://receitaws.com.br/v1/cnpj/${cnpj}`);
          if (res2.ok) {
            const d = await res2.json();
            if (d.status !== "ERROR") {
              data = {
                razao_social: d.nome || "",
                nome_fantasia: d.fantasia || "",
                email: d.email || "",
                ddd_telefone_1: d.telefone ? d.telefone.split("/")[0].replace(/[^\d]/g, "").slice(0, 2) : "",
                telefone_1: d.telefone ? d.telefone.split("/")[0].replace(/[^\d]/g, "").slice(2) : "",
                municipio: d.municipio || "",
                uf: d.uf || "",
                tipo_logradouro: "",
                logradouro: d.logradouro || "",
                bairro: d.bairro || "",
                cep: d.cep ? d.cep.replace(/\D/g, "") : "",
              };
            }
          }
        } catch {}
      }
      if (!data) {
        setCnpjError("CNPJ não encontrado. Verifique o número ou tente novamente.");
      } else {
        const telefoneApi = data.ddd_telefone_1
          ? `(${data.ddd_telefone_1}) ${data.telefone_1 || ""}`.trim()
          : "";
        const logradouroApi = data.logradouro
          ? `${data.tipo_logradouro || ""} ${data.logradouro}`.trim()
          : "";
        setClienteForm((f) => ({
          ...f,
          razao_social: f.razao_social || data.razao_social || "",
          nome_fantasia: f.nome_fantasia || data.nome_fantasia || "",
          email: f.email || data.email || "",
          telefone: f.telefone || telefoneApi,
          cidade: f.cidade || data.municipio || "",
          uf: f.uf || data.uf || "",
          logradouro: f.logradouro || logradouroApi,
          bairro: f.bairro || data.bairro || "",
          cep: f.cep || (data.cep ? data.cep.replace(/\D/g, "") : ""),
        }));
      }
    } catch {
      setCnpjError("Erro de conexão ao consultar CNPJ. Tente novamente.");
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function handleSaveCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteForm.nome_fantasia.trim() || !clienteForm.cnpj_cpf.trim() || !clienteForm.razao_social.trim()) {
      toast.error("Nome fantasia, Razão social e CNPJ/CPF são obrigatórios");
      return;
    }
    if (!clienteForm.ie_isento && !clienteForm.inscricao_estadual.trim()) {
      toast.error("Inscrição Estadual é obrigatória. Se não possuir, marque 'Isento de IE'.");
      return;
    }
    if (!clienteForm.responsavel_nome.trim()) {
      toast.error("Nome completo do responsável é obrigatório");
      return;
    }
    if (clienteContatos.length === 0) {
      toast.error("Cadastre pelo menos um contato antes de salvar");
      return;
    }
    const contatoInvalido = clienteContatos.find((c) => !c.email?.trim() || !c.cargo?.trim());
    if (contatoInvalido) {
      toast.error("Todos os contatos devem ter E-mail e Cargo preenchidos");
      return;
    }
    setSavingCliente(true);
    const filial_id = form.filial_id || filialFavoritaId || profile?.filial_favorita_id || profile?.filial_id || null;
    const { data, error } = await supabase.from("clientes").insert({
      nome_fantasia: clienteForm.nome_fantasia.trim(),
      razao_social: clienteForm.razao_social.trim(),
      apelido: clienteForm.apelido.trim() || null,
      cnpj_cpf: clienteForm.cnpj_cpf.trim(),
      inscricao_estadual: clienteForm.ie_isento ? "ISENTO" : (clienteForm.inscricao_estadual.trim() || null),
      responsavel_nome: clienteForm.responsavel_nome.trim() || null,
      contato_nome: clienteContatos[0]?.nome || clienteForm.contato_nome.trim() || null,
      telefone: clienteContatos[0]?.telefone || clienteForm.telefone.trim() || null,
      email: clienteContatos[0]?.email || clienteForm.email.trim() || null,
      cidade: clienteForm.cidade.trim() || null,
      uf: clienteForm.uf || null,
      logradouro: clienteForm.logradouro?.trim() || null,
      bairro: clienteForm.bairro?.trim() || null,
      cep: clienteForm.cep?.trim()?.replace(/\D/g, "") || null,
      numero: clienteForm.numero?.trim() || null,
      complemento: clienteForm.complemento?.trim() || null,
      filial_id,
      ativo: true,
    }).select().single();
    if (error) { toast.error("Erro ao cadastrar cliente: " + error.message); setSavingCliente(false); return; }
    // Salvar contatos
    for (const ct of clienteContatos) {
      await supabase.from("cliente_contatos").insert({
        cliente_id: data.id, nome: ct.nome, cargo: ct.cargo || null,
        telefone: ct.telefone || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo,
      });
    }
    // Recarregar dados (inclui clientes) e selecionar o novo
    await loadData();
    // Selecionar o cliente recém-criado e limpar busca
    setForm((f) => ({ ...f, cliente_id: data.id }));
    setClienteSearch("");
    // Verificar contrato ativo para o novo cliente
    buscarContratoAtivo(data.id);
    toast.success("Cliente cadastrado e selecionado no pedido!");
    setClienteForm(emptyClienteForm);
    setClienteContatos([]);
    setClienteContatos([]);
    setOpenClienteDialog(false);
    setSavingCliente(false);
  }

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filtered = pedidos.filter((p) => {
    const clienteNome = p.clientes?.nome_fantasia?.toLowerCase() || "";
    if (search && !clienteNome.includes(search.toLowerCase())) return false;
    if (filterFilial !== "all" && filterFilial !== "_init_" && p.filial_id !== filterFilial) return false;
    if (filterStatus !== "all" && p.status_pedido !== filterStatus) return false;
    if (filterVendedor !== "all" && p.vendedor_id !== filterVendedor) return false;
    if (filterDe && p.created_at < filterDe) return false;
    if (filterAte && p.created_at > filterAte + "T23:59:59") return false;
    return true;
  });

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [search, filterFilial, filterStatus, filterVendedor, filterDe, filterAte]);

  const canCreate = crudIncluir;
  // A RLS já restringe os clientes por filial para vendedores, não filtrar novamente
  const clientesDisponiveis = clientes;

  if (isTecnico) return <Navigate to="/dashboard" replace />;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pedidos de Venda</h1>
            <p className="text-sm text-muted-foreground">Registre e acompanhe os pedidos comerciais</p>
          </div>
          {canCreate && (
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Novo Pedido
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger><SelectValue placeholder="Filial" /></SelectTrigger>
              <SelectContent>
                {filiaisDoUsuario.length > 1 && <SelectItem value="all">Todas as filiais</SelectItem>}
                {(filiaisDoUsuario.length > 0 ? filiaisDoUsuario : todasFiliais).map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {canSeeAllBranches && (
              <Select value={filterVendedor} onValueChange={setFilterVendedor}>
                <SelectTrigger><SelectValue placeholder="Todos os vendedores" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {vendedores.map((v) => <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            <div className="flex gap-2">
              <Input type="date" value={filterDe} onChange={(e) => setFilterDe(e.target.value)} className="text-xs" title="Data inicial" />
              <Input type="date" value={filterAte} onChange={(e) => setFilterAte(e.target.value)} className="text-xs" title="Data final" />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                   <TableHead>Nº Pedido</TableHead>
                   <TableHead>Cliente</TableHead>
                  {canSeeAllBranches && <TableHead>Filial</TableHead>}
                  {canSeeAllBranches && <TableHead>Vendedor</TableHead>}
                   <TableHead className="text-right">Implantação</TableHead>
                   <TableHead className="text-right">Mensalidade</TableHead>
                   <TableHead className="text-right">Valor Serviço</TableHead>
                   <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Financeiro</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">Nenhum pedido encontrado</TableCell>
                  </TableRow>
                ) : filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((pedido) => {
                  const finStatus = pedido.financeiro_status as string || "Aguardando";
                  const finMotivo = pedido.financeiro_motivo as string | null;
                  const contratoLiberado = pedido.contrato_liberado as boolean;
                  const isReprovado = finStatus === "Reprovado";
                  const isAprovado = finStatus === "Aprovado";
                  const temContratoVigente = contratoLiberado && isAprovado;

                  // Vendedor só edita se: APENAS reprovado financeiro (não aprovado, não enviado, não cancelado)
                  const statusBloqueadoVendedor = [
                    "Aprovado Financeiro",
                    "Aguardando Financeiro",
                    "Aguardando Aprovação de Desconto",
                    "Desconto Aprovado",
                    "Cancelado",
                  ];
                   const canEditVendedor = isVendedor && pedido.vendedor_id === profile?.user_id
                    && isReprovado
                    && !temContratoVigente
                    && !statusBloqueadoVendedor.includes(pedido.status_pedido);
                   const canEditAdmin = isAdmin && !temContratoVigente && pedido.status_pedido !== "Cancelado";
                   const canEditCrud = crudEditar && !temContratoVigente && pedido.status_pedido !== "Cancelado";
                   const canEdit = canEditAdmin || canEditVendedor || canEditCrud;

                   // Cancelar: admin ou perfil com permissão de excluir (sem contrato vigente)
                   const canCancel = (isAdmin || crudExcluir) && pedido.status_pedido !== "Cancelado" && !temContratoVigente;

                  const vendedorNome = vendedores.find((v) => v.user_id === pedido.vendedor_id)?.full_name || "—";
                   const filialNome = pedido.filiais?.nome || filiais.find(f => f.id === pedido.filial_id)?.nome || "—";
                   const impFinal = pedido.valor_implantacao_final ?? pedido.valor_implantacao;
                   const mensFinal = pedido.valor_mensalidade_final ?? pedido.valor_mensalidade;
                   return (
                     <TableRow key={pedido.id} className={isReprovado ? "bg-destructive/5" : undefined}>
                       <TableCell className="font-mono text-xs font-semibold text-primary">{pedido.numero_exibicao || "—"}</TableCell>
                       <TableCell className="font-medium">{pedido.clientes?.nome_fantasia || "—"}</TableCell>
                       {canSeeAllBranches && <TableCell className="text-sm text-muted-foreground">{filialNome}</TableCell>}
                       {canSeeAllBranches && <TableCell className="text-sm text-muted-foreground">{vendedorNome}</TableCell>}
                       <TableCell className="text-right font-mono text-sm">{pedido.tipo_pedido === "OA" ? "—" : fmtBRL(impFinal)}</TableCell>
                       <TableCell className="text-right font-mono text-sm">{pedido.tipo_pedido === "OA" ? "—" : fmtBRL(mensFinal)}</TableCell>
                       <TableCell className="text-right font-mono text-sm">{pedido.tipo_pedido === "OA" ? fmtBRL(pedido.valor_total) : "—"}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{fmtBRL(pedido.valor_total)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[pedido.status_pedido] || "bg-muted text-muted-foreground"}`}>
                          {pedido.status_pedido}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {(() => {
                            const zsStatus = zapsignMap[pedido.id];
                            if (finStatus === "Aguardando") {
                              return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Aguardando</span>;
                            }
                            if (finStatus === "Reprovado") {
                              return (
                                <>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">Reprovado</span>
                                  {finMotivo && <p className="text-xs text-destructive max-w-[180px] truncate" title={finMotivo}>⚠ {finMotivo}</p>}
                                </>
                              );
                            }
                            if (finStatus === "Cancelado") {
                              return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Cancelado</span>;
                            }
                            // Aprovado - progressão
                            if (zsStatus === "Recusado") {
                              return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600"><XCircle className="h-3 w-3" />Assinatura recusada</span>;
                            }
                            if (zsStatus === "Assinado") {
                              return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3" />Contrato assinado</span>;
                            }
                            if (zsStatus === "Enviado" || zsStatus === "Pendente") {
                              return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><Send className="h-3 w-3" />Aguardando assinatura</span>;
                            }
                            if (contratoLiberado) {
                              const stGeracao = contratoStatusMap[pedido.id];
                              if (stGeracao === 'Pendente' || stGeracao === 'Gerando') {
                                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 animate-spin" />Aguardando geração</span>;
                              }
                              return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><FileText className="h-3 w-3" />Contrato gerado</span>;
                            }
                            if (isAprovado) {
                              return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Aprovado</span>;
                            }
                            return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FIN_STATUS_COLORS[finStatus] || "bg-muted text-muted-foreground"}`}>{finStatus}</span>;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                        <div className="text-xs">{format(new Date(pedido.created_at), "HH:mm", { locale: ptBR })}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Visualizar — sempre disponível */}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setViewingPedido(pedido)} title="Visualizar pedido">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {/* Enviar pedido — desconto aprovado, vendedor dono */}
                          {pedido.status_pedido === "Desconto Aprovado" && (isVendedor && pedido.vendedor_id === profile?.user_id || isAdmin) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-teal-600 hover:text-teal-700" title="Enviar pedido para o financeiro">
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Enviar pedido para o financeiro?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O desconto já foi aprovado. O pedido será enviado para análise do financeiro.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleEnviarPedido(pedido)}>
                                    Enviar pedido
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          {/* Reenviar após reprovação (vendedor do pedido) */}
                          {isVendedor && isReprovado && pedido.vendedor_id === profile?.user_id && !temContratoVigente && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-warning hover:text-warning" onClick={() => openEdit(pedido)} title="Editar e reenviar">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Editar (aguardando, sem contrato vigente) */}
                          {canEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pedido)} title="Editar pedido">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {/* Cancelar — somente admin e sem contrato vigente */}
                          {canCancel && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Cancelar pedido">
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancelar pedido?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    O pedido de {pedido.clientes?.nome_fantasia} será cancelado e a comissão zerada.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => cancelarPedido(pedido)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Cancelar pedido
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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
          {!loading && (
            <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
              {filtered.length} pedido(s) encontrado(s)
            </div>
          )}
        </div>
      </div>

      {/* ─── Create/Edit Dialog ─────────────────────────────────────────────── */}
      <PedidoFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        editingPedido={editingPedido}
        saving={saving}
        onSubmit={handleSave}
        form={form}
        setForm={setForm}
        clienteSearch={clienteSearch}
        setClienteSearch={setClienteSearch}
        clienteSearchFocused={clienteSearchFocused}
        setClienteSearchFocused={setClienteSearchFocused}
        clientesDisponiveis={clientesDisponiveis}
        onClienteChange={handleClienteChange}
        setClienteContatos={setClienteContatos}
        setOpenClienteDialog={setOpenClienteDialog}
        setClienteForm={setClienteForm}
        contratoAtivo={contratoAtivo}
        loadingContrato={loadingContrato}
        onIniciarUpgrade={handleIniciarUpgrade}
        onIniciarAditivo={handleIniciarAditivo}
        onIniciarOA={handleIniciarOA}
        planos={planos}
        planoSelecionado={planoSelecionado}
        onPlanoChange={handlePlanoChange}
        planoAnteriorValores={planoAnteriorValores}
        planoImplFilial={planoImplFilial}
        planoMensFilial={planoMensFilial}
        modulosDisponiveis={modulosDisponiveis}
        loadingModulos={loadingModulos}
        moduloBuscaId={moduloBuscaId}
        setModuloBuscaId={setModuloBuscaId}
        moduloBuscaQtd={moduloBuscaQtd}
        setModuloBuscaQtd={setModuloBuscaQtd}
        modulosJaContratados={modulosJaContratados}
        onAdicionarModulo={handleAdicionarModulo}
        onRemoverModulo={handleRemoverModulo}
        servicosCatalogo={servicosCatalogo}
        servicoBuscaId={servicoBuscaId}
        setServicoBuscaId={setServicoBuscaId}
        servicoBuscaQtd={servicoBuscaQtd}
        setServicoBuscaQtd={setServicoBuscaQtd}
        onAdicionarServico={handleAdicionarServico}
        onRemoverServico={handleRemoverServico}
        totalServicosOA={totalServicosOA}
        filiais={filiais}
        filiaisDoUsuario={filiaisDoUsuario}
        todasFiliais={todasFiliais}
        vendedores={vendedores}
        isAdmin={isAdmin}
        profile={profile}
        loadPlano={loadPlano}
        descontoAtivo={descontoAtivo}
        setDescontoAtivo={setDescontoAtivo}
        acrescimoAtivo={acrescimoAtivo}
        setAcrescimoAtivo={setAcrescimoAtivo}
        valorImplantacaoOriginal={valorImplantacaoOriginal}
        valorMensalidadeOriginal={valorMensalidadeOriginal}
        valorImpComAcrescimo={valorImpComAcrescimo}
        valorMensComAcrescimo={valorMensComAcrescimo}
        valorImplantacaoFinal={valorImplantacaoFinal}
        valorMensalidadeFinal={valorMensalidadeFinal}
        valorTotal={valorTotal}
        limiteDesconto={limiteDesconto}
        descontoImpExcedido={descontoImpExcedido}
        descontoMensExcedido={descontoMensExcedido}
        descontoExcedido={descontoExcedido}
        bloqueadoPorDesconto={bloqueadoPorDesconto}
        descontoImpPercAtual={descontoImpPercAtual}
        descontoMensPercAtual={descontoMensPercAtual}
        limiteImpAtual={limiteImpAtual}
        limiteMensAtual={limiteMensAtual}
        filialParametros={filialParametros}
        draftComentarios={draftComentarios}
        setDraftComentarios={setDraftComentarios}
        setOpenComentarioDialog={setOpenComentarioDialog}
        setEditingDraftIdx={setEditingDraftIdx}
        setDraftTexto={setDraftTexto}
        setDraftPrioridade={setDraftPrioridade}
        setDraftArquivo={setDraftArquivo}
        clientes={clientes}
      />

      {/* ─── Dialog Comentário Interno (draft) ────────────────────────────── */}
      <ComentarioDraftDialog
        open={openComentarioDialog}
        onOpenChange={setOpenComentarioDialog}
        texto={draftTexto}
        setTexto={setDraftTexto}
        prioridade={draftPrioridade}
        setPrioridade={setDraftPrioridade}
        arquivo={draftArquivo}
        setArquivo={setDraftArquivo}
        fileRef={draftFileRef}
        isEditing={editingDraftIdx !== null}
        onSave={handleAddDraftComentario}
        onFileChange={handleDraftFileChange}
        users={allMentionUsers}

      <ClienteRapidoDialog
        open={openClienteDialog}
        onOpenChange={(open) => { setOpenClienteDialog(open); }}
        clienteForm={clienteForm}
        setClienteForm={setClienteForm}
        clienteContatos={clienteContatos}
        setClienteContatos={setClienteContatos}
        savingCliente={savingCliente}
        isQuerying={isQuerying}
        loadingCep={loadingCep}
        loadingCnpj={loadingCnpj}
        cepError={cepError}
        cnpjError={cnpjError}
        setCepError={setCepError}
        setCnpjError={setCnpjError}
        onSave={handleSaveCliente}
        onCepBlur={handleCepBlurCliente}
        onCnpjBlur={handleCnpjBlurCliente}
      />


      <UpgradePlanoDialog
        open={openUpgradeDialog}
        onOpenChange={setOpenUpgradeDialog}
        contratoAtivo={contratoAtivo}
        planoVigenteId={planoVigenteId}
        planos={planos}
        upgradePlanoId={upgradePlanoId}
        setUpgradePlanoId={setUpgradePlanoId}
        onConfirm={handleConfirmarUpgrade}
      />

      <VisualizarPedidoDialog
        pedido={viewingPedido}
        onClose={() => setViewingPedido(null)}
        vendedores={vendedores}
        filiais={filiais}
        zapsignMap={zapsignMap}
        contratoStatusMap={contratoStatusMap}
        isAdmin={isAdmin}
        isFinanceiro={isFinanceiro}
        isVendedor={isVendedor}
      />
    </AppLayout>
  );
}


