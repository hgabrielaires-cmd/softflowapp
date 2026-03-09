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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Plus, Search, Pencil, XCircle, Loader2, Filter, RefreshCw, CheckCircle, UserPlus, Tag, ArrowUpCircle, FileText, AlertCircle, Eye, Users, Star, Trash2, MapPin, Send, MessageSquare, Paperclip, Download } from "lucide-react";
import { ClientePlanViewer } from "@/components/ClientePlanViewer";
import { PedidoComentarios } from "@/components/PedidoComentarios";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TablePagination } from "@/components/TablePagination";

// ─── Constants ────────────────────────────────────────────────────────────────

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const emptyClienteForm = {
  nome_fantasia: "", razao_social: "", apelido: "", cnpj_cpf: "",
  responsavel_nome: "",
  contato_nome: "", telefone: "", email: "", cidade: "", uf: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "",
  inscricao_estadual: "", ie_isento: false,
};

const STATUS_OPTIONS = ["Aguardando Financeiro", "Aprovado Financeiro", "Reprovado Financeiro", "Aguardando Aprovação de Desconto", "Desconto Aprovado", "Cancelado"] as const;

const STATUS_COLORS: Record<string, string> = {
  "Aguardando Financeiro": "bg-amber-100 text-amber-700",
  "Aprovado Financeiro": "bg-emerald-100 text-emerald-700",
  "Reprovado Financeiro": "bg-red-100 text-red-600",
  "Aguardando Aprovação de Desconto": "bg-purple-100 text-purple-700",
  "Desconto Aprovado": "bg-teal-100 text-teal-700",
  "Cancelado": "bg-gray-100 text-gray-500",
};

const FIN_STATUS_COLORS: Record<string, string> = {
  Aguardando: "bg-amber-100 text-amber-700",
  Aprovado: "bg-emerald-100 text-emerald-700",
  Reprovado: "bg-red-100 text-red-600",
  Cancelado: "bg-gray-100 text-gray-500",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuloOpcional {
  id: string;
  nome: string;
  valor_implantacao_modulo: number | null;
  valor_mensalidade_modulo: number | null;
  incluso_no_plano: boolean;
  permite_revenda: boolean;
  quantidade_maxima: number | null;
}

interface ModuloAdicionadoItem {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
}

interface ServicoAdicionadoItem {
  servico_id: string;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  unidade_medida: string;
}

interface PedidoWithJoins {
  id: string;
  cliente_id: string;
  plano_id: string;
  filial_id: string;
  vendedor_id: string;
  valor_implantacao: number;
  valor_mensalidade: number;
  valor_total: number;
  comissao_percentual: number;
  comissao_valor: number;
  status_pedido: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  financeiro_status?: string;
  financeiro_motivo?: string | null;
  contrato_liberado?: boolean;
  valor_implantacao_original?: number;
  valor_mensalidade_original?: number;
  desconto_implantacao_tipo?: string;
  desconto_implantacao_valor?: number;
  valor_implantacao_final?: number;
  desconto_mensalidade_tipo?: string;
  desconto_mensalidade_valor?: number;
  valor_mensalidade_final?: number;
  acrescimo_implantacao_tipo?: string;
  acrescimo_implantacao_valor?: number;
  acrescimo_mensalidade_tipo?: string;
  acrescimo_mensalidade_valor?: number;
  modulos_adicionais?: ModuloAdicionadoItem[];
  tipo_pedido?: string;
  contrato_id?: string | null;
  servicos_pedido?: ServicoAdicionadoItem[] | null;
  tipo_atendimento?: string | null;
  numero_exibicao?: string;
  clientes?: { nome_fantasia: string } | null;
  planos?: { nome: string } | null;
  filiais?: { nome: string } | null;
}

interface FormState {
  cliente_id: string;
  plano_id: string;
  filial_id: string;
  vendedor_id: string;
  comissao_percentual: string;
  comissao_implantacao_percentual: string;
  comissao_mensalidade_percentual: string;
  comissao_servico_percentual: string;
  observacoes: string;
  motivo_desconto: string;
  // Valores originais (auto-preenchidos, readonly)
  valor_implantacao_original: number;
  valor_mensalidade_original: number;
  // Descontos
  desconto_implantacao_tipo: "R$" | "%";
  desconto_implantacao_valor: string;
  desconto_mensalidade_tipo: "R$" | "%";
  desconto_mensalidade_valor: string;
  // Acréscimos
  acrescimo_implantacao_tipo: "R$" | "%";
  acrescimo_implantacao_valor: string;
  acrescimo_mensalidade_tipo: "R$" | "%";
  acrescimo_mensalidade_valor: string;
  // Módulos adicionais (lista de itens com quantidade)
  modulos_adicionais: ModuloAdicionadoItem[];
  // Tipo do pedido
  tipo_pedido: "Novo" | "Upgrade" | "Aditivo" | "OA";
  // Tipo de atendimento OA
  tipo_atendimento: "Interno" | "Externo" | "";
  // Serviços para OA
  servicos_pedido: ServicoAdicionadoItem[];
  contrato_id: string | null;
  // Forma de pagamento mensalidade (simplificado)
  pagamento_mensalidade_tipo: "Pré-pago" | "Pós-pago";
  pagamento_mensalidade_observacao: string;
  // Forma de pagamento implantação
  pagamento_mensalidade_forma: string;
  pagamento_mensalidade_parcelas: string;
  pagamento_mensalidade_desconto_percentual: string;
  pagamento_implantacao_forma: string;
  pagamento_implantacao_parcelas: string;
  pagamento_implantacao_desconto_percentual: string;
  pagamento_implantacao_observacao: string;
}

const emptyForm: FormState = {
  cliente_id: "", plano_id: "", filial_id: "", vendedor_id: "",
  comissao_percentual: "5",
  comissao_implantacao_percentual: "5",
  comissao_mensalidade_percentual: "5",
  comissao_servico_percentual: "5",
  observacoes: "",
  motivo_desconto: "",
  valor_implantacao_original: 0,
  valor_mensalidade_original: 0,
  desconto_implantacao_tipo: "R$",
  desconto_implantacao_valor: "0",
  desconto_mensalidade_tipo: "R$",
  desconto_mensalidade_valor: "0",
  acrescimo_implantacao_tipo: "R$",
  acrescimo_implantacao_valor: "0",
  acrescimo_mensalidade_tipo: "R$",
  acrescimo_mensalidade_valor: "0",
  modulos_adicionais: [],
  tipo_pedido: "Novo",
  tipo_atendimento: "",
  servicos_pedido: [],
  contrato_id: null,
  // Mensalidade (simplificado)
  pagamento_mensalidade_tipo: "Pré-pago",
  pagamento_mensalidade_observacao: "",
  // Implantação
  pagamento_mensalidade_forma: "",
  pagamento_mensalidade_parcelas: "",
  pagamento_mensalidade_desconto_percentual: "0",
  pagamento_implantacao_forma: "",
  pagamento_implantacao_parcelas: "",
  pagamento_implantacao_desconto_percentual: "0",
  pagamento_implantacao_observacao: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function applyDesconto(original: number, tipo: "R$" | "%", valor: number): number {
  const raw = tipo === "%" ? original - (original * valor / 100) : original - valor;
  return Math.max(0, raw);
}

function applyAcrescimo(original: number, tipo: "R$" | "%", valor: number): number {
  return tipo === "%" ? original + (original * valor / 100) : original + valor;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Pedidos() {
  const { user, profile, roles, isAdmin } = useAuth();
  const { filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais, loading: loadingFiliais } = useUserFiliais();
  const { canIncluir: crudIncluir, canEditar: crudEditar, canExcluir: crudExcluir } = useCrudPermissions("pedidos", roles);
  const isFinanceiro = roles.includes("financeiro");
  const isVendedor = roles.includes("vendedor");
  const isTecnico = roles.includes("tecnico") && !isAdmin && !isFinanceiro && !isVendedor;
  const canSeeAllBranches = filiaisDoUsuario.length > 1;

  const [pedidos, setPedidos] = useState<PedidoWithJoins[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [vendedores, setVendedores] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialFavoritaId, setFilialFavoritaId] = useState<string | null>(null);
  const [filialParametros, setFilialParametros] = useState<any | null>(null);
  const [zapsignMap, setZapsignMap] = useState<Record<string, string>>({});
  const [contratoStatusMap, setContratoStatusMap] = useState<Record<string, string>>({});
  const [servicosCatalogo, setServicosCatalogo] = useState<{ id: string; nome: string; valor: number; unidade_medida: string }[]>([]);
  const [servicoBuscaId, setServicoBuscaId] = useState("");
  const [servicoBuscaQtd, setServicoBuscaQtd] = useState("1");

  // Módulos disponíveis do plano selecionado (para busca)
  const [modulosDisponiveis, setModulosDisponiveis] = useState<ModuloOpcional[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(false);

  // Estado do seletor de módulo adicional
  const [moduloBuscaId, setModuloBuscaId] = useState("");
  const [moduloBuscaQtd, setModuloBuscaQtd] = useState("1");

  // Plano selecionado info
  const [planoSelecionado, setPlanoSelecionado] = useState<any | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterFilial, setFilterFilial] = useState("_init_");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVendedor, setFilterVendedor] = useState("all");
  const [filterDe, setFilterDe] = useState("");
  const [filterAte, setFilterAte] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  // Dialog pedido
  const [openDialog, setOpenDialog] = useState(false);
  const [viewingPedido, setViewingPedido] = useState<PedidoWithJoins | null>(null);
  const [editingPedido, setEditingPedido] = useState<PedidoWithJoins | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [descontoAtivo, setDescontoAtivo] = useState(false);
  const [acrescimoAtivo, setAcrescimoAtivo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Limites de desconto do vendedor atual
  const [limiteDesconto, setLimiteDesconto] = useState<{ implantacao: number; mensalidade: number } | null>(null);

  // Contrato ativo do cliente selecionado
  const [contratoAtivo, setContratoAtivo] = useState<Contrato | null>(null);
  const [loadingContrato, setLoadingContrato] = useState(false);
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
  const [clienteContatos, setClienteContatos] = useState<{ nome: string; cargo: string; telefone: string; email: string; decisor: boolean; ativo: boolean }[]>([]);
  const [showContatoClienteForm, setShowContatoClienteForm] = useState(false);
  const [editingContatoClienteIdx, setEditingContatoClienteIdx] = useState<number | null>(null);
  const [inlineContatoClienteForm, setInlineContatoClienteForm] = useState({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });

  // Draft comments (antes de salvar pedido)
  interface DraftComentario {
    texto: string;
    prioridade: string;
    arquivo: File | null;
    arquivo_nome: string | null;
  }
  const [draftComentarios, setDraftComentarios] = useState<DraftComentario[]>([]);
  const [openComentarioDialog, setOpenComentarioDialog] = useState(false);
  const [draftTexto, setDraftTexto] = useState("");
  const [draftPrioridade, setDraftPrioridade] = useState("normal");
  const [draftArquivo, setDraftArquivo] = useState<File | null>(null);
  const draftFileRef = useRef<HTMLInputElement>(null);
  const [editingDraftIdx, setEditingDraftIdx] = useState<number | null>(null);

  const PRIORIDADES_DRAFT = [
    { value: "normal", label: "Normal", emoji: "🟢" },
    { value: "medio", label: "Médio", emoji: "🟡" },
    { value: "urgente", label: "Urgente", emoji: "🔴" },
    { value: "prioridade", label: "Alta Prioridade", emoji: "⚡" },
  ] as const;

  const PRIORIDADE_MAP_DRAFT: Record<string, { label: string; emoji: string }> = {
    normal: { label: "Normal", emoji: "🟢" },
    medio: { label: "Médio", emoji: "🟡" },
    urgente: { label: "Urgente", emoji: "🔴" },
    prioridade: { label: "Alta Prioridade", emoji: "⚡" },
  };

  const MAX_FILE_SIZE_DRAFT = 11 * 1024 * 1024;

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

  const valorImplantacaoOriginal = form.tipo_pedido === "OA"
    ? totalServicosOA
    : form.tipo_pedido === "Aditivo"
      ? totalAdicionaisImp // Aditivo: só cobra os módulos novos
      : form.tipo_pedido === "Upgrade" && planoAnteriorValores
        ? Math.max(0, (planoSelecionado?.valor_implantacao_padrao ?? 0) - planoAnteriorValores.implantacao)
        : (planoSelecionado?.valor_implantacao_padrao ?? form.valor_implantacao_original) + totalAdicionaisImp;
  const valorMensalidadeOriginal = form.tipo_pedido === "OA"
    ? 0
    : form.tipo_pedido === "Aditivo"
      ? totalAdicionaisMens // Aditivo: só cobra os módulos novos
      : form.tipo_pedido === "Upgrade" && planoAnteriorValores
        ? Math.max(0, (planoSelecionado?.valor_mensalidade_padrao ?? 0) - planoAnteriorValores.mensalidade)
        : (planoSelecionado?.valor_mensalidade_padrao ?? form.valor_mensalidade_original) + totalAdicionaisMens;

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

  // ─── Load plano + módulos disponíveis ──────────────────────────────────────

  const loadPlano = useCallback(async (planoId: string, modulosAdicionaisExistentes: ModuloAdicionadoItem[] = []) => {
    if (!planoId) {
      setPlanoSelecionado(null);
      setModulosDisponiveis([]);
      setForm((f) => ({ ...f, valor_implantacao_original: 0, valor_mensalidade_original: 0 }));
      return;
    }

    setLoadingModulos(true);

    const [{ data: planoData }, { data: vinculosData }] = await Promise.all([
      supabase.from("planos").select("*").eq("id", planoId).single(),
      supabase.from("plano_modulos")
        .select("*, modulo:modulos(*)")
        .eq("plano_id", planoId)
        .order("ordem"),
    ]);

    setPlanoSelecionado(planoData);

    const disponiveis: ModuloOpcional[] = [];
    (vinculosData || []).forEach((v: any) => {
      if (v.modulo) {
        disponiveis.push({
          id: v.modulo.id,
          nome: v.modulo.nome,
          valor_implantacao_modulo: v.modulo.valor_implantacao_modulo ?? 0,
          valor_mensalidade_modulo: v.modulo.valor_mensalidade_modulo ?? 0,
          incluso_no_plano: v.incluso_no_plano,
          permite_revenda: v.modulo.permite_revenda ?? false,
          quantidade_maxima: v.modulo.quantidade_maxima ?? null,
        });
      }
    });
    setModulosDisponiveis(disponiveis);

    setForm((f) => ({
      ...f,
      valor_implantacao_original: planoData?.valor_implantacao_padrao ?? 0,
      valor_mensalidade_original: planoData?.valor_mensalidade_padrao ?? 0,
      modulos_adicionais: modulosAdicionaisExistentes,
    }));

    setLoadingModulos(false);
  }, []);

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

  // ─── Buscar parâmetros da filial ──────────────────────────────────────────

  async function loadFilialParametros(filialId: string) {
    if (!filialId) { setFilialParametros(null); return; }
    const { data } = await supabase
      .from("filial_parametros")
      .select("*")
      .eq("filial_id", filialId)
      .maybeSingle();
    setFilialParametros(data || null);
  }

  // Atualiza parametros quando filial muda no form
  useEffect(() => {
    if (form.filial_id) loadFilialParametros(form.filial_id);
  }, [form.filial_id]);



  async function loadData() {
    setLoading(true);
    const [
      { data: pedidosData },
      { data: clientesData },
      { data: planosData },
      { data: filiaisData },
      { data: vendedoresData },
      { data: servicosData },
    ] = await Promise.all([
      supabase.from("pedidos").select("*, clientes(nome_fantasia), planos(nome), filiais(nome)").order("created_at", { ascending: false }),
      supabase.from("clientes").select("*").eq("ativo", true).order("nome_fantasia"),
      supabase.from("planos").select("*").eq("ativo", true).order("ordem").order("nome"),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("profiles").select("*").eq("active", true).order("full_name"),
      supabase.from("servicos").select("id, nome, valor, unidade_medida").eq("ativo", true).order("nome"),
    ]);
    const pedidosList = (pedidosData || []) as unknown as PedidoWithJoins[];
    setPedidos(pedidosList);
    setClientes((clientesData || []) as Cliente[]);
    setPlanos(planosData || []);
    setFiliais((filiaisData || []) as Filial[]);
    setVendedores((vendedoresData || []) as Profile[]);
    setServicosCatalogo((servicosData || []) as any[]);

    // Buscar status ZapSign para pedidos — via contratos.pedido_id → contratos_zapsign
    const pedidoIds = pedidosList.map(p => p.id);
    if (pedidoIds.length > 0) {
      const { data: contratosData } = await supabase
        .from("contratos")
        .select("id, pedido_id, status_geracao, contratos_zapsign(status)")
        .in("pedido_id", pedidoIds);
      const map: Record<string, string> = {};
      const statusMap: Record<string, string> = {};
      (contratosData || []).forEach((c: any) => {
        if (c.pedido_id && c.contratos_zapsign?.status) {
          map[c.pedido_id] = c.contratos_zapsign.status;
        }
        if (c.pedido_id && c.status_geracao) {
          statusMap[c.pedido_id] = c.status_geracao;
        }
      });
      setZapsignMap(map);
      setContratoStatusMap(statusMap);
    } else {
      setZapsignMap({});
      setContratoStatusMap({});
    }

    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

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

  // ─── Buscar contrato ativo do cliente ─────────────────────────────────────

  async function buscarContratoAtivo(clienteId: string) {
    if (!clienteId) { setContratoAtivo(null); return; }
    setLoadingContrato(true);
    const { data } = await supabase
      .from("contratos")
      .select("*")
      .eq("cliente_id", clienteId)
      .eq("status", "Ativo")
      .eq("tipo", "Base")
      .order("created_at", { ascending: false })
      .limit(1);
    setContratoAtivo(data && data.length > 0 ? (data[0] as unknown as Contrato) : null);
    setLoadingContrato(false);
  }

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

  async function carregarLimitesDesconto(vendedorUserId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("desconto_limite_implantacao, desconto_limite_mensalidade")
      .eq("user_id", vendedorUserId)
      .single();
    if (data) {
      setLimiteDesconto({
        implantacao: (data as any).desconto_limite_implantacao ?? 100,
        mensalidade: (data as any).desconto_limite_mensalidade ?? 100,
      });
    } else {
      setLimiteDesconto({ implantacao: 100, mensalidade: 100 });
    }
  }

  async function openCreate() {
    const defaultImp = (profile as any)?.comissao_implantacao_percentual?.toString() ?? profile?.comissao_percentual?.toString() ?? "5";
    const defaultMens = (profile as any)?.comissao_mensalidade_percentual?.toString() ?? profile?.comissao_percentual?.toString() ?? "5";
    const defaultServ = (profile as any)?.comissao_servico_percentual?.toString() ?? "5";

    // Usar filialPadraoId do hook (favorita > filial_id > primeira vinculada)
    let resolvedFilialId = filialPadraoId || filialFavoritaId || profile?.filial_favorita_id || profile?.filial_id || "";
    if (!resolvedFilialId && profile?.user_id) {
      const { data: pData } = await supabase.from("profiles").select("filial_favorita_id, filial_id").eq("user_id", profile.user_id).maybeSingle();
      resolvedFilialId = (pData as any)?.filial_favorita_id || (pData as any)?.filial_id || "";
      if ((pData as any)?.filial_favorita_id) setFilialFavoritaId((pData as any).filial_favorita_id);
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
      comissao_implantacao_percentual: ((pedido as any).comissao_implantacao_percentual ?? pedido.comissao_percentual ?? 5).toString(),
      comissao_mensalidade_percentual: ((pedido as any).comissao_mensalidade_percentual ?? pedido.comissao_percentual ?? 5).toString(),
      comissao_servico_percentual: ((pedido as any).comissao_servico_percentual ?? 5).toString(),
      observacoes: pedido.observacoes || "",
      motivo_desconto: (pedido as any).motivo_desconto || "",
      valor_implantacao_original: pedido.valor_implantacao_original ?? pedido.valor_implantacao,
      valor_mensalidade_original: pedido.valor_mensalidade_original ?? pedido.valor_mensalidade,
      desconto_implantacao_tipo: (pedido.desconto_implantacao_tipo as "R$" | "%") || "R$",
      desconto_implantacao_valor: (pedido.desconto_implantacao_valor ?? 0).toString(),
      desconto_mensalidade_tipo: (pedido.desconto_mensalidade_tipo as "R$" | "%") || "R$",
      desconto_mensalidade_valor: (pedido.desconto_mensalidade_valor ?? 0).toString(),
      modulos_adicionais: adicionais,
      tipo_pedido: (pedido.tipo_pedido as "Novo" | "Upgrade" | "Aditivo" | "OA") || "Novo",
      tipo_atendimento: ((pedido as any).tipo_atendimento as "Interno" | "Externo" | "") || "",
      servicos_pedido: ((pedido as any).servicos_pedido || []) as ServicoAdicionadoItem[],
      contrato_id: pedido.contrato_id || null,
      pagamento_mensalidade_tipo: ((pedido as any).pagamento_mensalidade_forma === "Pós-pago" ? "Pós-pago" : "Pré-pago") as "Pré-pago" | "Pós-pago",
      pagamento_mensalidade_observacao: (pedido as any).pagamento_mensalidade_observacao || "",
      pagamento_mensalidade_forma: (pedido as any).pagamento_mensalidade_forma || "",
      pagamento_mensalidade_parcelas: (pedido as any).pagamento_mensalidade_parcelas?.toString() || "",
      pagamento_mensalidade_desconto_percentual: ((pedido as any).pagamento_mensalidade_desconto_percentual ?? 0).toString(),
      pagamento_implantacao_forma: (pedido as any).pagamento_implantacao_forma || "",
      pagamento_implantacao_parcelas: (pedido as any).pagamento_implantacao_parcelas?.toString() || "",
      pagamento_implantacao_desconto_percentual: ((pedido as any).pagamento_implantacao_desconto_percentual ?? 0).toString(),
      pagamento_implantacao_observacao: (pedido as any).pagamento_implantacao_observacao || "",
      acrescimo_implantacao_tipo: ((pedido as any).acrescimo_implantacao_tipo as "R$" | "%") || "R$",
      acrescimo_implantacao_valor: ((pedido as any).acrescimo_implantacao_valor ?? 0).toString(),
      acrescimo_mensalidade_tipo: ((pedido as any).acrescimo_mensalidade_tipo as "R$" | "%") || "R$",
      acrescimo_mensalidade_valor: ((pedido as any).acrescimo_mensalidade_valor ?? 0).toString(),
    });
    // Limpar a busca de cliente ao editar (o nome será exibido via form.cliente_id)
    setClienteSearch("");
    setModuloBuscaId("");
    setModuloBuscaQtd("1");
    setDescontoAtivo(temDesconto);
    const temAcrescimo = ((pedido as any).acrescimo_implantacao_valor ?? 0) > 0 || ((pedido as any).acrescimo_mensalidade_valor ?? 0) > 0;
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
    if (!form.cliente_id) { toast.error("Selecione um cliente"); return; }
    if (form.tipo_pedido === "OA") {
      if (form.servicos_pedido.length === 0) { toast.error("Adicione pelo menos um serviço"); return; }
      if (!form.tipo_atendimento) { toast.error("Selecione o tipo de atendimento (Interno/Externo)"); return; }
    } else {
      if (!form.plano_id) { toast.error("Selecione um plano"); return; }
    }
    if (!form.pagamento_implantacao_forma) { toast.error("Selecione a forma de pagamento da implantação"); return; }
    setSaving(true);
    try {
      // Garantir que vendedorId nunca seja undefined
      const vendedorId = form.vendedor_id || profile?.user_id || "";
      if (!vendedorId) { toast.error("Vendedor não identificado"); setSaving(false); return; }

      const filialId = form.filial_id || profile?.filial_id || "";
      if (!filialId) { toast.error("Filial não identificada"); setSaving(false); return; }

      // Buscar limites de desconto do vendedor
      const { data: vendedorProfile } = await supabase
        .from("profiles")
        .select("desconto_limite_implantacao, desconto_limite_mensalidade")
        .eq("user_id", vendedorId)
        .maybeSingle();

      const limiteImp = (vendedorProfile as any)?.desconto_limite_implantacao ?? 100;
      const limiteMens = (vendedorProfile as any)?.desconto_limite_mensalidade ?? 100;

      // Calcular percentual de desconto aplicado
      const descontoImpPerc = form.desconto_implantacao_tipo === "%"
        ? parseFloat(form.desconto_implantacao_valor) || 0
        : valorImplantacaoOriginal > 0 ? ((parseFloat(form.desconto_implantacao_valor) || 0) / valorImplantacaoOriginal) * 100 : 0;
      const descontoMensPerc = form.desconto_mensalidade_tipo === "%"
        ? parseFloat(form.desconto_mensalidade_valor) || 0
        : valorMensalidadeOriginal > 0 ? ((parseFloat(form.desconto_mensalidade_valor) || 0) / valorMensalidadeOriginal) * 100 : 0;

      const precisaAprovacaoImp = descontoAtivo && descontoImpPerc > 0 && descontoImpPerc > limiteImp;
      const precisaAprovacaoMens = descontoAtivo && descontoMensPerc > 0 && descontoMensPerc > limiteMens;
      const precisaAprovacao = precisaAprovacaoImp || precisaAprovacaoMens;

      const payload: Record<string, unknown> = {
        cliente_id: form.cliente_id,
        plano_id: form.plano_id,
        filial_id: filialId,
        vendedor_id: vendedorId,
        valor_implantacao: valorImplantacaoFinal,
        valor_mensalidade: valorMensalidadeFinal,
        valor_total: valorTotal,
        comissao_percentual: comissaoPercentualLegado,
        comissao_valor: comissaoValorTotal,
        observacoes: form.observacoes || null,
        motivo_desconto: form.motivo_desconto || null,
        valor_implantacao_original: valorImplantacaoOriginal,
        valor_mensalidade_original: valorMensalidadeOriginal,
        desconto_implantacao_tipo: form.desconto_implantacao_tipo,
        desconto_implantacao_valor: parseFloat(form.desconto_implantacao_valor) || 0,
        valor_implantacao_final: valorImplantacaoFinal,
        desconto_mensalidade_tipo: form.desconto_mensalidade_tipo,
        desconto_mensalidade_valor: parseFloat(form.desconto_mensalidade_valor) || 0,
        valor_mensalidade_final: valorMensalidadeFinal,
        acrescimo_implantacao_tipo: form.acrescimo_implantacao_tipo,
        acrescimo_implantacao_valor: parseFloat(form.acrescimo_implantacao_valor) || 0,
        acrescimo_mensalidade_tipo: form.acrescimo_mensalidade_tipo,
        acrescimo_mensalidade_valor: parseFloat(form.acrescimo_mensalidade_valor) || 0,
        modulos_adicionais: form.modulos_adicionais,
        servicos_pedido: form.servicos_pedido,
        tipo_pedido: form.tipo_pedido,
        tipo_atendimento: form.tipo_pedido === "OA" ? form.tipo_atendimento : null,
        contrato_id: form.contrato_id || null,
        comissao_implantacao_percentual: comissaoImpPerc,
        comissao_implantacao_valor: comissaoImpValor,
        comissao_mensalidade_percentual: comissaoMensPerc,
        comissao_mensalidade_valor: comissaoMensValor,
        comissao_servico_percentual: comissaoServPerc,
        comissao_servico_valor: comissaoServValor,
        pagamento_mensalidade_forma: form.pagamento_mensalidade_tipo || null,
        pagamento_mensalidade_parcelas: null,
        pagamento_mensalidade_desconto_percentual: 0,
        pagamento_mensalidade_observacao: form.pagamento_mensalidade_observacao || null,
        pagamento_implantacao_forma: form.pagamento_implantacao_forma || null,
        pagamento_implantacao_parcelas: form.pagamento_implantacao_parcelas ? parseInt(form.pagamento_implantacao_parcelas) : null,
        pagamento_implantacao_desconto_percentual: parseFloat(form.pagamento_implantacao_desconto_percentual) || 0,
        pagamento_implantacao_observacao: form.pagamento_implantacao_observacao || null,
      };

      if (editingPedido) {
        const isReprovado = editingPedido.financeiro_status === "Reprovado";
        const wasAwaitingDesconto = editingPedido.status_pedido === "Aguardando Aprovação de Desconto";
        const wasDescontoAprovado = editingPedido.status_pedido === "Desconto Aprovado";

        // Verificar se os valores de desconto mudaram em relação ao pedido original
        const descontoImpValorNovo = parseFloat(form.desconto_implantacao_valor) || 0;
        const descontoMensValorNovo = parseFloat(form.desconto_mensalidade_valor) || 0;
        const descontoImpValorOriginal = editingPedido.desconto_implantacao_valor ?? 0;
        const descontoMensValorOriginal = editingPedido.desconto_mensalidade_valor ?? 0;
        const descontoImpTipoOriginal = editingPedido.desconto_implantacao_tipo;
        const descontoMensTipoOriginal = editingPedido.desconto_mensalidade_tipo;
        const descontoValoresMudaram =
          descontoImpValorNovo !== descontoImpValorOriginal ||
          descontoMensValorNovo !== descontoMensValorOriginal ||
          form.desconto_implantacao_tipo !== descontoImpTipoOriginal ||
          form.desconto_mensalidade_tipo !== descontoMensTipoOriginal;

        // Se desconto já foi aprovado e os valores não mudaram, não reenviar para aprovação
        const descontoJaAprovadoSemMudanca = wasDescontoAprovado && precisaAprovacao && !descontoValoresMudaram;

        if (precisaAprovacao && !descontoJaAprovadoSemMudanca) {
          payload.financeiro_status = "Aguardando";
          payload.financeiro_motivo = null;
          payload.financeiro_aprovado_em = null;
          payload.financeiro_aprovado_por = null;
          payload.contrato_liberado = false;
          payload.status_pedido = "Aguardando Aprovação de Desconto";
          const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
          if (error) throw error;
          dispararAutomacaoPedidoStatus(editingPedido.id, editingPedido.status_pedido, "Aguardando Aprovação de Desconto", form.tipo_pedido);
          await supabase.from("solicitacoes_desconto").upsert({
            pedido_id: editingPedido.id,
            vendedor_id: vendedorId,
            desconto_implantacao_tipo: form.desconto_implantacao_tipo,
            desconto_implantacao_valor: parseFloat(form.desconto_implantacao_valor) || 0,
            desconto_mensalidade_tipo: form.desconto_mensalidade_tipo,
            desconto_mensalidade_valor: parseFloat(form.desconto_mensalidade_valor) || 0,
            desconto_implantacao_percentual: descontoImpPerc,
            desconto_mensalidade_percentual: descontoMensPerc,
            status: "Aguardando",
            aprovado_por: null,
            aprovado_em: null,
            motivo_reprovacao: null,
          }, { onConflict: "pedido_id" });
          await salvarDraftComentarios(editingPedido.id);
          toast.warning("Desconto acima do limite! Solicitação de aprovação enviada ao gestor.");
        } else if (descontoJaAprovadoSemMudanca) {
          // Desconto já aprovado e valores não mudaram: salvar mantendo status "Desconto Aprovado"
          const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
          if (error) throw error;
          await salvarDraftComentarios(editingPedido.id);
          toast.success("Pedido atualizado com sucesso!");
        } else if (isReprovado || wasAwaitingDesconto) {
          payload.financeiro_status = "Aguardando";
          payload.financeiro_motivo = null;
          payload.financeiro_aprovado_em = null;
          payload.financeiro_aprovado_por = null;
          payload.contrato_liberado = false;
          payload.status_pedido = "Aguardando Financeiro";
          const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
          if (error) throw error;
          dispararAutomacaoPedidoStatus(editingPedido.id, editingPedido.status_pedido, "Aguardando Financeiro", form.tipo_pedido);
          toast.success(isReprovado ? "Pedido reenviado para o financeiro!" : "Pedido enviado para o financeiro!");
          await salvarDraftComentarios(editingPedido.id);
        } else {
          const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
          if (error) throw error;
          await salvarDraftComentarios(editingPedido.id);
          toast.success("Pedido atualizado com sucesso!");
        }
      } else {
        if (precisaAprovacao) {
          const insertPayload = {
            ...payload,
            status_pedido: "Aguardando Aprovação de Desconto",
            financeiro_status: "Aguardando",
            contrato_liberado: false,
          };
          const { data: novoPedido, error } = await supabase.from("pedidos").insert(insertPayload as any).select().single();
          if (error) throw error;
          dispararAutomacaoPedidoStatus(novoPedido.id, "Novo", "Aguardando Aprovação de Desconto", form.tipo_pedido);
          await salvarDraftComentarios(novoPedido.id);
          const { error: solError } = await supabase.from("solicitacoes_desconto").insert({
            pedido_id: novoPedido.id,
            vendedor_id: vendedorId,
            desconto_implantacao_tipo: form.desconto_implantacao_tipo,
            desconto_implantacao_valor: parseFloat(form.desconto_implantacao_valor) || 0,
            desconto_mensalidade_tipo: form.desconto_mensalidade_tipo,
            desconto_mensalidade_valor: parseFloat(form.desconto_mensalidade_valor) || 0,
            desconto_implantacao_percentual: descontoImpPerc,
            desconto_mensalidade_percentual: descontoMensPerc,
            status: "Aguardando",
          });
          if (solError) {
            console.error("Erro ao criar solicitação de desconto:", solError);
            toast.error("Pedido criado, mas houve erro ao enviar a solicitação de desconto. Contate o administrador.");
          }
          toast.warning("Desconto acima do seu limite! Solicitação enviada ao gestor de descontos para aprovação.");
        } else {
          const insertPayload = {
            ...payload,
            status_pedido: "Aguardando Financeiro",
            financeiro_status: "Aguardando",
            contrato_liberado: false,
          };
          const { data: novoPedido2, error } = await supabase.from("pedidos").insert(insertPayload as any).select().single();
          if (error) throw error;
          await salvarDraftComentarios(novoPedido2.id);
          toast.success("Pedido criado com sucesso!");
        }
      }
      setOpenDialog(false);
      setDraftComentarios([]);
      loadData();
    } catch (err: unknown) {
      console.error("Erro ao salvar pedido:", err);
      const msg = err instanceof Error ? err.message : (err as any)?.message || "Erro ao salvar pedido";
      toast.error(msg);
    }
    setSaving(false);
  }


  async function cancelarPedido(pedido: PedidoWithJoins) {
    const { error } = await supabase.from("pedidos").update({ status_pedido: "Cancelado", financeiro_status: "Cancelado", comissao_valor: 0 }).eq("id", pedido.id);
    if (error) { toast.error("Erro ao cancelar pedido"); return; }
    dispararAutomacaoPedidoStatus(pedido.id, pedido.status_pedido, "Cancelado", (pedido as any).tipo_pedido);
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
    dispararAutomacaoPedidoStatus(pedido.id, pedido.status_pedido, "Aguardando Financeiro", (pedido as any).tipo_pedido);
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
    // Recarregar lista de clientes e selecionar o novo
    const { data: novosClientes } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome_fantasia");
    const listaAtualizada = (novosClientes || []) as Cliente[];
    setClientes(listaAtualizada);
    // Selecionar o cliente recém-criado e limpar busca
    setForm((f) => ({ ...f, cliente_id: data.id }));
    setClienteSearch("");
    // Verificar contrato ativo para o novo cliente
    buscarContratoAtivo(data.id);
    toast.success("Cliente cadastrado e selecionado no pedido!");
    setClienteForm(emptyClienteForm);
    setClienteContatos([]);
    setShowContatoClienteForm(false);
    setOpenClienteDialog(false);
    setSavingCliente(false);
  }

  // ─── Filtering ────────────────────────────────────────────────────────────

  const filtered = pedidos.filter((p) => {
    const clienteNome = (p as any).clientes?.nome_fantasia?.toLowerCase() || "";
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
                  const filialNome = (pedido as any).filiais?.nome || filiais.find(f => f.id === pedido.filial_id)?.nome || "—";
                  const impFinal = pedido.valor_implantacao_final ?? pedido.valor_implantacao;
                  const mensFinal = pedido.valor_mensalidade_final ?? pedido.valor_mensalidade;
                  return (
                    <TableRow key={pedido.id} className={isReprovado ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">{(pedido as any).numero_exibicao || "—"}</TableCell>
                      <TableCell className="font-medium">{(pedido as any).clientes?.nome_fantasia || "—"}</TableCell>
                      {canSeeAllBranches && <TableCell className="text-sm text-muted-foreground">{filialNome}</TableCell>}
                      {canSeeAllBranches && <TableCell className="text-sm text-muted-foreground">{vendedorNome}</TableCell>}
                      <TableCell className="text-right font-mono text-sm">{(pedido as any).tipo_pedido === "OA" ? "—" : fmtBRL(impFinal)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{(pedido as any).tipo_pedido === "OA" ? "—" : fmtBRL(mensFinal)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{(pedido as any).tipo_pedido === "OA" ? fmtBRL(pedido.valor_total) : "—"}</TableCell>
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
                                    O pedido de {(pedido as any).clientes?.nome_fantasia} será cancelado e a comissão zerada.
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
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl flex flex-col h-[90vh] p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {form.tipo_pedido === "Upgrade" && <ArrowUpCircle className="h-4 w-4 text-primary" />}
              {form.tipo_pedido === "Aditivo" && <FileText className="h-4 w-4 text-primary" />}
              {form.tipo_pedido === "OA" && <Tag className="h-4 w-4 text-teal-600" />}
              {editingPedido ? "Editar Pedido" : `Novo Pedido${form.tipo_pedido !== "Novo" ? ` — ${form.tipo_pedido === "OA" ? "Ordem de Atendimento" : form.tipo_pedido}` : ""}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* ── Cliente ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Cliente *</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                  onClick={() => { setClienteForm(emptyClienteForm); setClienteContatos([]); setOpenClienteDialog(true); }}>
                  <UserPlus className="h-3.5 w-3.5" /> Novo cliente
                </Button>
              </div>
              {/* Campo de busca com dropdown de clientes */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 pr-8"
                  placeholder={form.cliente_id
                    ? clientesDisponiveis.find(c => c.id === form.cliente_id)?.nome_fantasia || "Cliente selecionado"
                    : "Buscar cliente pelo nome ou CNPJ..."}
                  value={clienteSearch}
                  autoComplete="off"
                  onFocus={() => setClienteSearchFocused(true)}
                  onBlur={() => setTimeout(() => setClienteSearchFocused(false), 300)}
                  onChange={(e) => {
                    setClienteSearch(e.target.value);
                    if (!e.target.value && form.cliente_id) {
                      setForm(f => ({ ...f, cliente_id: "", plano_id: "", tipo_pedido: "Novo", contrato_id: null }));
                      setContratoAtivo(null);
                    }
                  }}
                />
                {form.cliente_id && (
                  <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setForm(f => ({ ...f, cliente_id: "", plano_id: "", tipo_pedido: "Novo", contrato_id: null })); setClienteSearch(""); setContratoAtivo(null); }}>
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
                {/* Dropdown de resultados */}
                {clienteSearchFocused && clienteSearch.trim() && !form.cliente_id && (() => {
                  const q = clienteSearch.trim().toLowerCase();
                  const qNum = q.replace(/\D/g, "");
                  const filtered = clientesDisponiveis.filter(c =>
                    c.nome_fantasia.toLowerCase().includes(q) ||
                    (c.razao_social || "").toLowerCase().includes(q) ||
                    (qNum.length > 0 && (c.cnpj_cpf || "").replace(/\D/g, "").includes(qNum))
                  );
                  return (
                    <div className="absolute z-[9999] top-full mt-1 left-0 right-0 bg-white border border-border rounded-md shadow-xl max-h-52 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                      ) : (
                        filtered.slice(0, 20).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-0"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleClienteChange(c.id);
                              setClienteSearch("");
                              setClienteSearchFocused(false);
                            }}
                          >
                            <div className="font-medium text-foreground">{c.nome_fantasia}</div>
                            {c.razao_social && c.razao_social !== c.nome_fantasia && (
                              <div className="text-xs text-muted-foreground">{c.razao_social}</div>
                            )}
                            {c.cnpj_cpf && <div className="text-xs text-muted-foreground font-mono">{c.cnpj_cpf}</div>}
                          </button>
                        ))
                      )}
                    </div>
                  );
                })()}
              </div>
              {form.cliente_id && (
                <p className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {clientesDisponiveis.find(c => c.id === form.cliente_id)?.nome_fantasia} selecionado
                </p>
              )}

              {/* Contrato ativo detectado */}
              {loadingContrato && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Verificando contratos...
                </p>
              )}
              {!loadingContrato && contratoAtivo && form.tipo_pedido === "Novo" && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-800">
                      Contrato ativo: Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">Este cliente já possui contrato ativo. Selecione a ação desejada:</p>
                    <div className="flex flex-wrap gap-2 mt-2 items-center">
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={handleIniciarUpgrade}>
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Upgrade de Plano
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={handleIniciarAditivo}>
                        <FileText className="h-3.5 w-3.5" /> Adicionar Módulo (Aditivo)
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-teal-300 text-teal-800 hover:bg-teal-100"
                        onClick={handleIniciarOA}>
                        <Tag className="h-3.5 w-3.5" /> Ordem de Atendimento
                      </Button>
                      <ClientePlanViewer
                        clienteId={form.cliente_id}
                        clienteNome={clientes.find(c => c.id === form.cliente_id)?.nome_fantasia}
                        variant="text"
                        className="border-primary/30 text-primary hover:bg-primary/10"
                      />
                    </div>
                  </div>
                </div>
              )}
              {!loadingContrato && contratoAtivo && form.tipo_pedido === "Aditivo" && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Aditivo ao contrato Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
                </div>
              )}
              {!loadingContrato && contratoAtivo && form.tipo_pedido === "Upgrade" && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 space-y-1">
                  <p className="text-xs text-green-800">
                    <ArrowUpCircle className="h-3 w-3 inline mr-1" />
                    Upgrade do contrato Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
                  </p>
                  {planoAnteriorValores && planoSelecionado && (
                    <p className="text-xs text-green-700 font-mono">
                      Diferença Impl: {fmtBRL(Math.max(0, (planoSelecionado.valor_implantacao_padrao ?? 0) - planoAnteriorValores.implantacao))}
                      {" · "}
                      Diferença Mens: {fmtBRL(Math.max(0, (planoSelecionado.valor_mensalidade_padrao ?? 0) - planoAnteriorValores.mensalidade))}
                    </p>
                  )}
                </div>
              )}
              {!loadingContrato && contratoAtivo && form.tipo_pedido === "OA" && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800">
                  <Tag className="h-3 w-3 inline mr-1" />
                  Ordem de Atendimento vinculada ao contrato Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
                </div>
              )}
            </div>

            {/* ── Plano ── */}
            {form.tipo_pedido !== "Aditivo" && form.tipo_pedido !== "OA" && (
              <div className="space-y-1.5">
                <Label>Plano *</Label>
                {contratoAtivo && form.tipo_pedido === "Novo" ? (
                  // Bloqueado pois tem contrato ativo e ainda não escolheu a ação
                  <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                    Selecione uma ação acima (Upgrade, Aditivo ou OA)
                  </div>
                ) : (
                  <Select value={form.plano_id} onValueChange={handlePlanoChange} disabled={form.tipo_pedido === "Upgrade" && !!form.plano_id}>
                    <SelectTrigger><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                    <SelectContent>
                      {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {form.tipo_pedido === "Aditivo" && form.plano_id && (
              <div className="space-y-1.5">
                <Label>Plano de referência</Label>
                <Input readOnly value={planos.find(p => p.id === form.plano_id)?.nome || "—"} className="bg-muted cursor-not-allowed" />
              </div>
            )}
            {form.tipo_pedido === "OA" && form.plano_id && (
              <div className="space-y-1.5">
                <Label>Plano de referência</Label>
                <Input readOnly value={planos.find(p => p.id === form.plano_id)?.nome || "—"} className="bg-muted cursor-not-allowed" />
              </div>
            )}

            {/* ── Serviços (para OA) ── */}
            {form.tipo_pedido === "OA" && (
              <div className="space-y-3">
                <Label>Serviços *</Label>
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Serviço</Label>
                    <Select value={servicoBuscaId} onValueChange={setServicoBuscaId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o serviço..." />
                      </SelectTrigger>
                      <SelectContent>
                        {servicosCatalogo.length === 0
                          ? <SelectItem value="_none" disabled>Nenhum serviço cadastrado</SelectItem>
                          : servicosCatalogo.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.nome} — {fmtBRL(s.valor)}/{s.unidade_medida}
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input
                      type="number" min="1" step="1"
                      value={servicoBuscaQtd}
                      onChange={(e) => setServicoBuscaQtd(e.target.value)}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={handleAdicionarServico} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>

                {form.servicos_pedido.length > 0 && (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {form.servicos_pedido.map((s) => (
                      <div key={s.servico_id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.nome}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {fmtBRL(s.valor_unitario)}/{s.unidade_medida}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Qtd: <strong>{s.quantidade}</strong></span>
                          <div className="text-right text-xs font-mono text-foreground">
                            {fmtBRL(s.valor_unitario * s.quantidade)}
                          </div>
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoverServico(s.servico_id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="px-4 py-2 bg-muted/50 text-sm font-semibold flex justify-between">
                      <span>Total Serviços</span>
                      <span className="font-mono">{fmtBRL(totalServicosOA)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Tipo de Atendimento (OA) ── */}
            {form.tipo_pedido === "OA" && (
              <div className="space-y-1.5">
                <Label>Tipo de Atendimento *</Label>
                <Select value={form.tipo_atendimento} onValueChange={(v) => setForm((f) => ({ ...f, tipo_atendimento: v as "Interno" | "Externo" }))}>
                  <SelectTrigger className={!form.tipo_atendimento ? "border-destructive" : ""}>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Interno">Interno</SelectItem>
                    <SelectItem value="Externo">Externo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Filial *</Label>
                {isAdmin || filiaisDoUsuario.length > 1 ? (
                  <Select value={form.filial_id} onValueChange={(v) => setForm((f) => ({ ...f, filial_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {(filiaisDoUsuario.length > 0 ? filiaisDoUsuario : todasFiliais).map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input readOnly value={filiaisDoUsuario.find((f) => f.id === form.filial_id)?.nome || filiais.find((f) => f.id === form.filial_id)?.nome || "—"} className="bg-muted cursor-not-allowed" />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Vendedor *</Label>
                {isAdmin ? (
                  <Select value={form.vendedor_id} onValueChange={(v) => {
                    const vend = vendedores.find((vv) => vv.user_id === v);
                    setForm((f) => ({
                      ...f,
                      vendedor_id: v,
                      comissao_percentual: (vend as any)?.comissao_implantacao_percentual?.toString() ?? vend?.comissao_percentual?.toString() ?? f.comissao_percentual,
                      comissao_implantacao_percentual: (vend as any)?.comissao_implantacao_percentual?.toString() ?? vend?.comissao_percentual?.toString() ?? f.comissao_implantacao_percentual,
                      comissao_mensalidade_percentual: (vend as any)?.comissao_mensalidade_percentual?.toString() ?? vend?.comissao_percentual?.toString() ?? f.comissao_mensalidade_percentual,
                      comissao_servico_percentual: (vend as any)?.comissao_servico_percentual?.toString() ?? f.comissao_servico_percentual,
                    }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {vendedores.map((v) => <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input readOnly value={vendedores.find((v) => v.user_id === form.vendedor_id)?.full_name || profile?.full_name || "—"} className="bg-muted cursor-not-allowed" />
                )}
              </div>
            </div>

            {/* ── Módulos Adicionais ── */}
            {form.plano_id && form.tipo_pedido !== "OA" && form.tipo_pedido !== "Upgrade" && (
              <div className="space-y-3">
                <Label>Módulos Adicionais</Label>

                {/* Info: módulos já contratados (Aditivo) */}
                {form.tipo_pedido === "Aditivo" && modulosJaContratados.length > 0 && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 space-y-1">
                    <p className="text-xs font-medium text-blue-800">Módulos já contratados (não serão cobrados novamente):</p>
                    {modulosJaContratados.map((m) => (
                      <p key={m.modulo_id} className="text-xs text-blue-700">
                        • {m.nome} (Qtd: {m.quantidade})
                        {m.valor_mensalidade_modulo > 0 && ` — Mens: ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}`}
                      </p>
                    ))}
                  </div>
                )}

                {/* Seletor + quantidade + botão adicionar */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Módulo</Label>
                    {loadingModulos ? (
                      <p className="text-sm text-muted-foreground">Carregando...</p>
                    ) : (
                      <Select value={moduloBuscaId} onValueChange={setModuloBuscaId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o módulo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {(() => {
                            // Para Aditivo, filtrar módulos já contratados
                            const idsJaContratados = form.tipo_pedido === "Aditivo"
                              ? modulosJaContratados.map(m => m.modulo_id)
                              : [];
                            const modulosFiltrados = modulosDisponiveis.filter(
                              m => !idsJaContratados.includes(m.id) || m.permite_revenda
                            );
                            return modulosFiltrados.length === 0
                              ? <SelectItem value="_none" disabled>
                                  {form.tipo_pedido === "Aditivo" ? "Todos os módulos já estão contratados" : "Nenhum módulo disponível"}
                                </SelectItem>
                              : modulosFiltrados.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.nome}
                                  {(m.valor_implantacao_modulo || m.valor_mensalidade_modulo) && (
                                    <span className="ml-2 text-xs text-muted-foreground">
                                      {m.valor_implantacao_modulo ? `Impl: ${fmtBRL(m.valor_implantacao_modulo)}` : ""}
                                      {m.valor_implantacao_modulo && m.valor_mensalidade_modulo ? " · " : ""}
                                      {m.valor_mensalidade_modulo ? `Mens: ${fmtBRL(m.valor_mensalidade_modulo)}` : ""}
                                    </span>
                                  )}
                                </SelectItem>
                              ));
                          })()}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-muted-foreground">Qtd</Label>
                    <Input
                      type="number" min="1" step="1"
                      value={moduloBuscaQtd}
                      onChange={(e) => setModuloBuscaQtd(e.target.value)}
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={handleAdicionarModulo} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>

                {/* Lista dos módulos adicionados */}
                {form.modulos_adicionais.length > 0 && (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {form.modulos_adicionais.map((m) => (
                      <div key={m.modulo_id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.nome}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {m.valor_implantacao_modulo > 0 && `Impl: ${fmtBRL(m.valor_implantacao_modulo)}`}
                            {m.valor_implantacao_modulo > 0 && m.valor_mensalidade_modulo > 0 && " · "}
                            {m.valor_mensalidade_modulo > 0 && `Mens: ${fmtBRL(m.valor_mensalidade_modulo)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Qtd: <strong>{m.quantidade}</strong></span>
                          <div className="text-right text-xs font-mono text-foreground">
                            {m.valor_implantacao_modulo > 0 && <div>Impl: {fmtBRL(m.valor_implantacao_modulo * m.quantidade)}</div>}
                            {m.valor_mensalidade_modulo > 0 && <div>Mens: {fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}</div>}
                          </div>
                          <Button
                            type="button" variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleRemoverModulo(m.modulo_id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Precificação ── */}
            {(form.plano_id || (form.tipo_pedido === "OA" && form.servicos_pedido.length > 0)) && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                {/* Header com toggles de acréscimo e desconto */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-muted-foreground" /> Precificação
                  </p>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs text-muted-foreground">Acréscimo</span>
                      <Switch
                        checked={acrescimoAtivo}
                        onCheckedChange={(v) => {
                          setAcrescimoAtivo(v);
                          if (!v) {
                            setForm((f) => ({
                              ...f,
                              acrescimo_implantacao_valor: "0",
                              acrescimo_mensalidade_valor: "0",
                            }));
                          }
                        }}
                      />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <span className="text-xs text-muted-foreground">Desconto</span>
                      <Switch
                        checked={descontoAtivo}
                        onCheckedChange={(v) => {
                          setDescontoAtivo(v);
                          if (!v) {
                            setForm((f) => ({
                              ...f,
                              desconto_implantacao_valor: "0",
                              desconto_mensalidade_valor: "0",
                            }));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>

                {/* Valores originais (readonly) */}
                {form.tipo_pedido === "OA" ? (
                  /* OA: Campo único "Valor do Serviço" */
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Valor do Serviço</Label>
                    <Input readOnly value={fmtBRL((acrescimoAtivo || descontoAtivo) ? valorImplantacaoOriginal : valorImplantacaoFinal)} className="bg-background font-mono text-sm" />
                  </div>
                ) : (
                  /* Outros tipos: Implantação + Mensalidade */
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Implantação</Label>
                      <Input readOnly value={fmtBRL((acrescimoAtivo || descontoAtivo) ? valorImplantacaoOriginal : valorImplantacaoFinal)} className="bg-background font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Mensalidade</Label>
                      <Input readOnly value={fmtBRL((acrescimoAtivo || descontoAtivo) ? valorMensalidadeOriginal : valorMensalidadeFinal)} className="bg-background font-mono text-sm" />
                    </div>
                  </div>
                )}

                {/* Acréscimos — só exibe quando toggle ativo */}
                {acrescimoAtivo && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Acréscimos</p>

                    {/* Acréscimo implantação / serviço */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Acréscimo — {form.tipo_pedido === "OA" ? "Serviço" : "Implantação"}</Label>
                      <div className="flex gap-2">
                        <Select value={form.acrescimo_implantacao_tipo} onValueChange={(v) => setForm((f) => ({ ...f, acrescimo_implantacao_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="R$">R$</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min="0" step="0.01"
                          value={form.acrescimo_implantacao_valor}
                          onChange={(e) => setForm((f) => ({ ...f, acrescimo_implantacao_valor: e.target.value }))}
                          className="flex-1"
                          placeholder="0"
                        />
                        <Input readOnly value={fmtBRL(valorImpComAcrescimo)} className="w-36 bg-background font-mono text-sm text-emerald-600 font-semibold" />
                      </div>
                    </div>

                    {/* Acréscimo mensalidade — oculto para OA */}
                    {form.tipo_pedido !== "OA" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Acréscimo — Mensalidade</Label>
                        <div className="flex gap-2">
                          <Select value={form.acrescimo_mensalidade_tipo} onValueChange={(v) => setForm((f) => ({ ...f, acrescimo_mensalidade_tipo: v as "R$" | "%" }))}>
                            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="R$">R$</SelectItem>
                              <SelectItem value="%">%</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number" min="0" step="0.01"
                            value={form.acrescimo_mensalidade_valor}
                            onChange={(e) => setForm((f) => ({ ...f, acrescimo_mensalidade_valor: e.target.value }))}
                            className="flex-1"
                            placeholder="0"
                          />
                          <Input readOnly value={fmtBRL(valorMensComAcrescimo)} className="w-36 bg-background font-mono text-sm text-emerald-600 font-semibold" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {descontoAtivo && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descontos</p>

                    {/* Desconto implantação / serviço */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Desconto — {form.tipo_pedido === "OA" ? "Serviço" : "Implantação"}</Label>
                        {limiteDesconto && (
                          <span className={`text-xs font-medium ${descontoImpExcedido ? "text-destructive" : "text-muted-foreground"}`}>
                            Limite: {limiteDesconto.implantacao}% · Aplicado: {descontoImpPercAtual.toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className={`flex gap-2 ${descontoImpExcedido ? "ring-1 ring-destructive rounded-md p-1" : ""}`}>
                        <Select value={form.desconto_implantacao_tipo} onValueChange={(v) => setForm((f) => ({ ...f, desconto_implantacao_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="R$">R$</SelectItem>
                            <SelectItem value="%">%</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number" min="0" step="0.01"
                          value={form.desconto_implantacao_valor}
                          onChange={(e) => setForm((f) => ({ ...f, desconto_implantacao_valor: e.target.value }))}
                          className={`flex-1 ${descontoImpExcedido ? "border-destructive" : ""}`}
                          placeholder="0"
                        />
                        <Input
                          type="number" min="0" step="0.01"
                          value={valorImplantacaoFinal.toFixed(2)}
                          onChange={(e) => {
                            const novoFinal = parseFloat(e.target.value) || 0;
                            const descontoCalc = Math.max(0, valorImpComAcrescimo - novoFinal);
                            setForm((f) => ({
                              ...f,
                              desconto_implantacao_tipo: "R$" as const,
                              desconto_implantacao_valor: descontoCalc.toFixed(2),
                            }));
                          }}
                          className="w-36 bg-background font-mono text-sm text-primary font-semibold"
                        />
                      </div>
                    </div>

                    {/* Desconto mensalidade — oculto para OA */}
                    {form.tipo_pedido !== "OA" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Desconto — Mensalidade</Label>
                          {limiteDesconto && (
                            <span className={`text-xs font-medium ${descontoMensExcedido ? "text-destructive" : "text-muted-foreground"}`}>
                              Limite: {limiteDesconto.mensalidade}% · Aplicado: {descontoMensPercAtual.toFixed(1)}%
                            </span>
                          )}
                        </div>
                        <div className={`flex gap-2 ${descontoMensExcedido ? "ring-1 ring-destructive rounded-md p-1" : ""}`}>
                          <Select value={form.desconto_mensalidade_tipo} onValueChange={(v) => setForm((f) => ({ ...f, desconto_mensalidade_tipo: v as "R$" | "%" }))}>
                            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="R$">R$</SelectItem>
                              <SelectItem value="%">%</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            type="number" min="0" step="0.01"
                            value={form.desconto_mensalidade_valor}
                            onChange={(e) => setForm((f) => ({ ...f, desconto_mensalidade_valor: e.target.value }))}
                            className={`flex-1 ${descontoMensExcedido ? "border-destructive" : ""}`}
                            placeholder="0"
                          />
                          <Input readOnly value={fmtBRL(valorMensalidadeFinal)} className="w-36 bg-background font-mono text-sm text-primary font-semibold" />
                        </div>
                      </div>
                    )}

                    {/* Motivo do desconto */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Motivo do desconto</Label>
                      <Textarea
                        placeholder="Informe o motivo do desconto..."
                        value={form.motivo_desconto}
                        onChange={(e) => setForm((f) => ({ ...f, motivo_desconto: e.target.value }))}
                        rows={2}
                      />
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="pt-2 border-t border-border">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Valor total</Label>
                    <Input readOnly value={fmtBRL(valorTotal)} className="bg-background font-mono font-bold text-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Comissões — oculto no form, exibido apenas na visualização ── */}

            {/* ── Forma de Pagamento ── */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">Forma de Pagamento</p>

              {filialParametros && (
                <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                  <p className="font-medium text-foreground">Parâmetros da Filial</p>
                  {filialParametros.parcelas_maximas_cartao && <p>Cartão: até {filialParametros.parcelas_maximas_cartao}x sem juros</p>}
                  {filialParametros.pix_desconto_percentual > 0 && <p>PIX: {filialParametros.pix_desconto_percentual}% de desconto</p>}
                </div>
              )}

              {form.tipo_pedido === "OA" ? (
                /* OA: Forma de pagamento única (sem mensalidade/implantação separadas) */
                <div className="space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pagamento do Serviço</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Forma de pagamento <span className="text-destructive">*</span></Label>
                      <Select value={form.pagamento_implantacao_forma} onValueChange={(v) => setForm((f) => ({ ...f, pagamento_implantacao_forma: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Boleto">Boleto</SelectItem>
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="Cartão">Cartão</SelectItem>
                          <SelectItem value="Transferência">Transferência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Parcelas</Label>
                      <Input
                        type="number" min="1"
                        placeholder={filialParametros ? `Máx ${filialParametros.parcelas_maximas_cartao}x` : "Nº de parcelas"}
                        value={form.pagamento_implantacao_parcelas}
                        onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_parcelas: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Observação</Label>
                      <Input
                        placeholder="Ex: Pagamento após conclusão do serviço"
                        value={form.pagamento_implantacao_observacao}
                        onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_observacao: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Outros tipos: Mensalidade + Implantação separados */
                <>
                  {/* Mensalidade — simplificado */}
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensalidade</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tipo de cobrança</Label>
                        <Select
                          value={form.pagamento_mensalidade_tipo}
                          onValueChange={(v) => setForm((f) => ({ ...f, pagamento_mensalidade_tipo: v as "Pré-pago" | "Pós-pago" }))}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pré-pago">Pré-pago</SelectItem>
                            <SelectItem value="Pós-pago">Pós-pago</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Observação</Label>
                        <Input
                          placeholder={filialParametros?.regras_padrao_mensalidade || "Ex: Vencimento todo dia 10"}
                          value={form.pagamento_mensalidade_observacao}
                          onChange={(e) => setForm((f) => ({ ...f, pagamento_mensalidade_observacao: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Implantação */}
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Implantação</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Forma de pagamento <span className="text-destructive">*</span></Label>
                        <Select value={form.pagamento_implantacao_forma} onValueChange={(v) => setForm((f) => ({ ...f, pagamento_implantacao_forma: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Boleto">Boleto</SelectItem>
                            <SelectItem value="PIX">PIX</SelectItem>
                            <SelectItem value="Cartão">Cartão</SelectItem>
                            <SelectItem value="Transferência">Transferência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Parcelas</Label>
                        <Input
                          type="number" min="1"
                          placeholder={filialParametros ? `Máx ${filialParametros.parcelas_maximas_cartao}x` : "Nº de parcelas"}
                          value={form.pagamento_implantacao_parcelas}
                          onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_parcelas: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Observação</Label>
                        <Input
                          placeholder={filialParametros?.regras_padrao_implantacao || "Ex: À vista no ato da implantação"}
                          value={form.pagamento_implantacao_observacao}
                          onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_observacao: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Observações ── */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Observações opcionais..." value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>

            {/* ── Alerta de desconto excedido ── */}
            {descontoExcedido && (
              <div className="mx-6 mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
                <div className="flex-1 min-w-0 text-sm">
                  <p className="font-semibold text-destructive">Desconto acima do limite permitido</p>
                  <p className="text-muted-foreground mt-0.5">
                    {descontoImpExcedido && `Implantação: ${descontoImpPercAtual.toFixed(1)}% (limite: ${limiteImpAtual}%)`}
                    {descontoImpExcedido && descontoMensExcedido && " · "}
                    {descontoMensExcedido && `Mensalidade: ${descontoMensPercAtual.toFixed(1)}% (limite: ${limiteMensAtual}%)`}
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">Você pode <strong>enviar para aprovação do gestor</strong> — o pedido ficará aguardando revisão.</p>
                </div>
              </div>
            )}

            {/* ─── Comentários Internos (draft) ──────────────────────────── */}
            <div className="border border-border rounded-md p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Comentários Internos
                  {draftComentarios.length > 0 && (
                    <span className="ml-1 bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5">{draftComentarios.length}</span>
                  )}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1"
                  onClick={() => {
                    setEditingDraftIdx(null);
                    setDraftTexto("");
                    setDraftPrioridade("normal");
                    setDraftArquivo(null);
                    setOpenComentarioDialog(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Comentário
                </Button>
              </div>
              {draftComentarios.length > 0 && (
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {draftComentarios.map((dc, idx) => {
                    const pri = PRIORIDADE_MAP_DRAFT[dc.prioridade] || PRIORIDADE_MAP_DRAFT.normal;
                    return (
                      <div key={idx} className="bg-muted/40 border border-border rounded-md p-2 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{pri.emoji} {pri.label}</span>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => {
                                setEditingDraftIdx(idx);
                                setDraftTexto(dc.texto);
                                setDraftPrioridade(dc.prioridade);
                                setDraftArquivo(dc.arquivo);
                                setOpenComentarioDialog(true);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={() => setDraftComentarios(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs whitespace-pre-wrap">{dc.texto}</p>
                        {dc.arquivo_nome && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Paperclip className="h-3 w-3" /> {dc.arquivo_nome}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            </div>{/* end scrollable area */}
            <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              {(() => {
                const canSubmit = form.cliente_id && (form.tipo_pedido === "OA" ? form.servicos_pedido.length > 0 : !!form.plano_id);
                return bloqueadoPorDesconto ? (
                  <Button type="submit" disabled={saving || !canSubmit} variant="secondary" className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <ArrowUpCircle className="h-4 w-4" />
                    Enviar para aprovação
                  </Button>
                ) : (
                  <Button type="submit" disabled={saving || !canSubmit}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingPedido ? "Salvar alterações" : "Criar pedido"}
                  </Button>
                );
              })()}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Comentário Interno (draft) ────────────────────────────── */}
      <Dialog open={openComentarioDialog} onOpenChange={setOpenComentarioDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> {editingDraftIdx !== null ? "Editar Comentário" : "Novo Comentário Interno"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Escreva um comentário..."
              value={draftTexto}
              onChange={(e) => setDraftTexto(e.target.value)}
              className="min-h-[80px] text-sm"
            />
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Prioridade:</Label>
              <div className="flex flex-wrap gap-2">
                {PRIORIDADES_DRAFT.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setDraftPrioridade(p.value)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors ${
                      draftPrioridade === p.value
                        ? "border-primary bg-primary/10 font-semibold"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {p.emoji} {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => draftFileRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5 mr-1" />
                {draftArquivo ? draftArquivo.name : "Anexar (máx 11MB)"}
              </Button>
              <input
                type="file"
                ref={draftFileRef}
                className="hidden"
                onChange={handleDraftFileChange}
              />
              {draftArquivo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => { setDraftArquivo(null); if (draftFileRef.current) draftFileRef.current.value = ""; }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpenComentarioDialog(false)}>Cancelar</Button>
            <Button type="button" onClick={handleAddDraftComentario} disabled={!draftTexto.trim()}>
              {editingDraftIdx !== null ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openClienteDialog} onOpenChange={(open) => { setOpenClienteDialog(open); if (!open) { setClienteContatos([]); setShowContatoClienteForm(false); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Cadastrar Novo Cliente
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCliente} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">

              {/* CNPJ com busca automática */}
              <div className="col-span-2 space-y-1.5">
                <Label>CNPJ / CPF *</Label>
                <div className="relative">
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={clienteForm.cnpj_cpf}
                    onChange={(e) => { setCnpjError(""); setClienteForm((f) => ({ ...f, cnpj_cpf: e.target.value })); }}
                    onBlur={handleCnpjBlurCliente}
                    required
                    autoFocus
                    className={cnpjError ? "border-destructive pr-9" : "pr-9"}
                  />
                  {loadingCnpj && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {cnpjError && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />{cnpjError}
                  </p>
                )}
              </div>

              <div className="col-span-2 space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input placeholder="Nome fantasia..." value={clienteForm.nome_fantasia} onChange={(e) => setClienteForm((f) => ({ ...f, nome_fantasia: e.target.value }))} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Razão Social *</Label>
                <Input placeholder="Razão social..." value={clienteForm.razao_social} onChange={(e) => setClienteForm((f) => ({ ...f, razao_social: e.target.value }))} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Apelido</Label>
                <Input placeholder="Ex: Bar do João Loja 01 Centro" value={clienteForm.apelido} onChange={(e) => setClienteForm((f) => ({ ...f, apelido: e.target.value }))} />
                <p className="text-xs text-muted-foreground">Identificação interna da loja/unidade</p>
              </div>

              {/* Inscrição Estadual */}
              <div className="space-y-1.5">
                <Label>Inscrição estadual *</Label>
                <Input
                  value={clienteForm.inscricao_estadual}
                  onChange={(e) => setClienteForm((f) => ({ ...f, inscricao_estadual: e.target.value }))}
                  placeholder="000.000.000.000"
                  disabled={clienteForm.ie_isento}
                />
              </div>
              <div className="flex items-center gap-2 h-10">
                <Switch
                  checked={clienteForm.ie_isento}
                  onCheckedChange={(v) => setClienteForm((f) => ({ ...f, ie_isento: v, inscricao_estadual: v ? "" : f.inscricao_estadual }))}
                />
                <Label className="cursor-pointer select-none">Isento de IE</Label>
              </div>

              {/* Responsável */}
              <div className="col-span-2 space-y-1.5">
                <Label>Nome completo do responsável *</Label>
                <Input value={clienteForm.responsavel_nome} onChange={(e) => setClienteForm((f) => ({ ...f, responsavel_nome: e.target.value }))} placeholder="Nome completo do responsável pela empresa" />
              </div>

              {/* Separador endereço */}
              <div className="col-span-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  <MapPin className="h-3 w-3" /> Endereço
                </div>
              </div>

              {/* CEP com busca automática */}
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <div className="relative">
                  <Input
                    placeholder="00000-000"
                    value={clienteForm.cep}
                    onChange={(e) => { setCepError(""); setClienteForm((f) => ({ ...f, cep: e.target.value })); }}
                    onBlur={handleCepBlurCliente}
                    maxLength={9}
                    className={cepError ? "border-destructive pr-9" : "pr-9"}
                  />
                  {loadingCep && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {cepError && (
                  <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />{cepError}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Logradouro</Label>
                <Input placeholder="Rua / Avenida..." value={clienteForm.logradouro} onChange={(e) => setClienteForm((f) => ({ ...f, logradouro: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Número</Label>
                <Input placeholder="Ex: 123" value={clienteForm.numero} onChange={(e) => setClienteForm((f) => ({ ...f, numero: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Complemento</Label>
                <Input placeholder="Apto, Sala, Bloco..." value={clienteForm.complemento} onChange={(e) => setClienteForm((f) => ({ ...f, complemento: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Bairro</Label>
                <Input placeholder="Bairro" value={clienteForm.bairro} onChange={(e) => setClienteForm((f) => ({ ...f, bairro: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input placeholder="Cidade" value={clienteForm.cidade} onChange={(e) => setClienteForm((f) => ({ ...f, cidade: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={clienteForm.uf} onValueChange={(v) => setClienteForm((f) => ({ ...f, uf: v }))}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* ── Seção Contatos ── */}
              <div className="col-span-2 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    <Users className="h-3.5 w-3.5" />
                    Contatos <span className="text-destructive">*</span>
                    <span className="text-xs font-normal normal-case">(obrigatório ao menos 1)</span>
                  </div>
                  {!showContatoClienteForm && (
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                      onClick={() => { setEditingContatoClienteIdx(null); setInlineContatoClienteForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true }); setShowContatoClienteForm(true); }}>
                      <Plus className="h-3 w-3" /> Adicionar contato
                    </Button>
                  )}
                </div>

                {clienteContatos.length > 0 && (
                  <div className="rounded-lg border border-border divide-y divide-border mb-2">
                    {clienteContatos.map((ct, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{ct.nome}</p>
                            {ct.decisor && (
                              <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                                <Star className="h-2.5 w-2.5 fill-current" /> Decisor
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-0.5">
                            {ct.cargo && <span className="text-xs text-muted-foreground">{ct.cargo}</span>}
                            {ct.telefone && <span className="text-xs text-muted-foreground">{ct.telefone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className={`h-6 w-6 ${ct.decisor ? "text-primary" : "text-muted-foreground"}`}
                            onClick={() => setClienteContatos((prev) => prev.map((c, i) => ({ ...c, decisor: i === idx ? !c.decisor : (ct.decisor ? c.decisor : false) })))}>
                            <Star className={`h-3 w-3 ${ct.decisor ? "fill-current" : ""}`} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => { setEditingContatoClienteIdx(idx); setInlineContatoClienteForm({ ...ct }); setShowContatoClienteForm(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setClienteContatos((prev) => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {clienteContatos.length === 0 && !showContatoClienteForm && (
                  <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground text-center mb-2">
                    <Users className="h-4 w-4 mx-auto mb-1" />
                    Nenhum contato cadastrado. Adicione pelo menos um contato.
                  </div>
                )}

                {showContatoClienteForm && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs font-medium text-foreground">{editingContatoClienteIdx !== null ? "Editar contato" : "Novo contato"}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Nome *</Label>
                        <Input className="h-8 text-sm" value={inlineContatoClienteForm.nome} onChange={(e) => setInlineContatoClienteForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Cargo *</Label>
                        <Input className="h-8 text-sm" value={inlineContatoClienteForm.cargo} onChange={(e) => setInlineContatoClienteForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Cargo / função" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Telefone</Label>
                        <Input className="h-8 text-sm" value={inlineContatoClienteForm.telefone} onChange={(e) => setInlineContatoClienteForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">E-mail *</Label>
                        <Input className="h-8 text-sm" type="email" value={inlineContatoClienteForm.email} onChange={(e) => setInlineContatoClienteForm((f) => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" />
                      </div>
                      <div className="col-span-2 flex items-center gap-3">
                        <Checkbox id="cli-decisor" checked={inlineContatoClienteForm.decisor} onCheckedChange={(v) => setInlineContatoClienteForm((f) => ({ ...f, decisor: !!v }))} />
                        <Label htmlFor="cli-decisor" className="text-xs cursor-pointer">Decisor (tomador de decisão)</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowContatoClienteForm(false); setEditingContatoClienteIdx(null); }}>Cancelar</Button>
                      <Button type="button" size="sm" className="h-7 text-xs" onClick={() => {
                        if (!inlineContatoClienteForm.nome.trim()) { toast.error("Nome do contato é obrigatório"); return; }
                        if (!inlineContatoClienteForm.email?.trim()) { toast.error("E-mail do contato é obrigatório"); return; }
                        if (!inlineContatoClienteForm.cargo?.trim()) { toast.error("Cargo do contato é obrigatório"); return; }
                        if (editingContatoClienteIdx !== null) {
                          setClienteContatos((prev) => prev.map((c, i) => i === editingContatoClienteIdx ? { ...inlineContatoClienteForm } : c));
                        } else {
                          setClienteContatos((prev) => [
                            ...(inlineContatoClienteForm.decisor ? prev.map((c) => ({ ...c, decisor: false })) : prev),
                            { ...inlineContatoClienteForm },
                          ]);
                        }
                        setShowContatoClienteForm(false);
                        setEditingContatoClienteIdx(null);
                        setInlineContatoClienteForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });
                      }}>
                        {editingContatoClienteIdx !== null ? "Salvar" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenClienteDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingCliente || isQuerying}>
                {isQuerying ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Consultando...</>
                ) : savingCliente ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</>
                ) : "Cadastrar cliente"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
        </Dialog>


      {/* ─── Modal Upgrade de Plano ──────────────────────────────────────────── */}
      <Dialog open={openUpgradeDialog} onOpenChange={setOpenUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-primary" /> Upgrade de Plano
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {contratoAtivo && (
              <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                <p className="text-muted-foreground text-xs">Contrato atual</p>
                <p className="font-medium">Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Novo plano *</Label>
              <Select value={upgradePlanoId} onValueChange={setUpgradePlanoId}>
                <SelectTrigger><SelectValue placeholder="Selecione o novo plano..." /></SelectTrigger>
                <SelectContent>
                  {(() => {
                    const planoAtualId = planoVigenteId || contratoAtivo?.plano_id;
                    const planoAtual = planos.find((p) => p.id === planoAtualId);
                    const ordemAtual = planoAtual?.ordem ?? 0;
                    const planosUpgrade = planos.filter((p) => p.id !== planoAtualId && p.ordem > ordemAtual);
                    return planosUpgrade.length === 0
                      ? <SelectItem value="__none__" disabled>Nenhum plano disponível para upgrade</SelectItem>
                      : planosUpgrade.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>);
                  })()}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Apenas planos com ordem superior ao atual são exibidos.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUpgradeDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirmarUpgrade} disabled={!upgradePlanoId}>
              <ArrowUpCircle className="h-4 w-4 mr-1.5" /> Confirmar Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog Visualizar Pedido ─────────────────────────────────────────── */}
      <Dialog open={!!viewingPedido} onOpenChange={(open) => { if (!open) setViewingPedido(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Visualizar Pedido
              {viewingPedido?.numero_exibicao && <span className="ml-auto font-mono text-sm text-primary">{viewingPedido.numero_exibicao}</span>}
            </DialogTitle>
          </DialogHeader>
          {viewingPedido && (() => {
            const vp = viewingPedido;
            const finStatus = vp.financeiro_status || "Aguardando";
            const impFinal = vp.valor_implantacao_final ?? vp.valor_implantacao;
            const mensFinal = vp.valor_mensalidade_final ?? vp.valor_mensalidade;
            const vendedorNome = vendedores.find((v) => v.user_id === vp.vendedor_id)?.full_name || "—";
            const filialNome = (vp as any).filiais?.nome || filiais.find(f => f.id === vp.filial_id)?.nome || "—";
            const adicionais = (vp.modulos_adicionais || []) as ModuloAdicionadoItem[];
            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-medium">{(vp as any).clientes?.nome_fantasia || "—"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Plano</p>
                    <p className="font-medium">{(vp as any).planos?.nome || "—"}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Filial</p>
                    <p>{filialNome}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Vendedor</p>
                    <p>{vendedorNome}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p>{vp.tipo_pedido || "Novo"}</p>
                  </div>
                  {(vp as any).tipo_pedido === "OA" && (
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Tipo Atendimento</p>
                      <p>{(vp as any).tipo_atendimento || "—"}</p>
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p>{format(new Date(vp.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                </div>

                {/* ── Detalhes do que foi lançado ── */}
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📋 Itens do Pedido</p>
                  
                  {/* Plano (Novo ou Upgrade) */}
                  {(vp.tipo_pedido === "Novo" || vp.tipo_pedido === "Upgrade") && (vp as any).planos?.nome && (
                    <div className="bg-muted/50 rounded-md p-2.5 space-y-1">
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        {vp.tipo_pedido === "Upgrade" ? "⬆️ Upgrade de Plano" : "📦 Plano Contratado"}
                      </p>
                      <p className="text-sm font-semibold">{(vp as any).planos?.nome}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Impl: <span className="font-mono">{fmtBRL(vp.valor_implantacao_original ?? vp.valor_implantacao)}</span></span>
                        <span>Mens: <span className="font-mono">{fmtBRL(vp.valor_mensalidade_original ?? vp.valor_mensalidade)}</span></span>
                      </div>
                    </div>
                  )}

                  {/* Módulos Adicionais (Aditivo ou junto com outros tipos) */}
                  {adicionais.length > 0 && (
                    <div className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                      <p className="text-xs font-medium flex items-center gap-1.5">
                        {vp.tipo_pedido === "Aditivo" ? "➕ Módulos Adicionais (Aditivo)" : "➕ Módulos Adicionais"}
                      </p>
                      {adicionais.map((m) => (
                        <div key={m.modulo_id} className="flex justify-between text-xs">
                          <span>{m.nome} {m.quantidade > 1 ? `(x${m.quantidade})` : ""}</span>
                          <div className="flex gap-3 font-mono text-muted-foreground">
                            <span>Impl: {fmtBRL(m.valor_implantacao_modulo * m.quantidade)}</span>
                            <span>Mens: {fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Serviços OA */}
                  {vp.tipo_pedido === "OA" && (() => {
                    const servicos = (vp.servicos_pedido || []) as ServicoAdicionadoItem[];
                    if (servicos.length === 0) return null;
                    return (
                      <div className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                        <p className="text-xs font-medium flex items-center gap-1.5">🔧 Serviços (Ordem de Atendimento)</p>
                        {servicos.map((s, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span>{s.nome} — {s.quantidade}x {s.unidade_medida || "un."}</span>
                            <span className="font-mono text-muted-foreground">{fmtBRL(s.valor_unitario * s.quantidade)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-xs font-semibold border-t border-border pt-1 mt-1">
                          <span>Total serviços</span>
                          <span className="font-mono">{fmtBRL(servicos.reduce((sum, s) => sum + s.valor_unitario * s.quantidade, 0))}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Se nenhum item foi encontrado */}
                  {!((vp.tipo_pedido === "Novo" || vp.tipo_pedido === "Upgrade") && (vp as any).planos?.nome) && adicionais.length === 0 && !(vp.tipo_pedido === "OA" && ((vp.servicos_pedido || []) as any[]).length > 0) && (
                    <p className="text-xs text-muted-foreground italic">Nenhum detalhe de itens disponível.</p>
                  )}
                </div>

                {/* Acréscimo info */}
                {(((vp as any).acrescimo_implantacao_valor ?? 0) > 0 || ((vp as any).acrescimo_mensalidade_valor ?? 0) > 0) && (
                  <div className="border-t border-border pt-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Acréscimos aplicados</p>
                    <div className="grid grid-cols-2 gap-3">
                      {((vp as any).acrescimo_implantacao_valor ?? 0) > 0 && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Implantação</p>
                          <p className="text-xs font-mono text-emerald-600">+{(vp as any).acrescimo_implantacao_valor} {(vp as any).acrescimo_implantacao_tipo === "%" ? "%" : "R$"}</p>
                        </div>
                      )}
                      {((vp as any).acrescimo_mensalidade_valor ?? 0) > 0 && (
                        <div className="space-y-0.5">
                          <p className="text-xs text-muted-foreground">Mensalidade</p>
                          <p className="text-xs font-mono text-emerald-600">+{(vp as any).acrescimo_mensalidade_valor} {(vp as any).acrescimo_mensalidade_tipo === "%" ? "%" : "R$"}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-3 grid grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Implantação</p>
                    <p className="font-mono font-semibold">{fmtBRL(impFinal)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Mensalidade</p>
                    <p className="font-mono font-semibold">{fmtBRL(mensFinal)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-mono font-bold text-primary">{fmtBRL(vp.valor_total)}</p>
                  </div>
                </div>

                {(isAdmin || isFinanceiro || isVendedor) && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Comissões</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Implantação / Treinamento</p>
                        <p className="text-xs">{(vp as any).comissao_implantacao_percentual ?? vp.comissao_percentual}% → <span className="font-mono">{fmtBRL((vp as any).comissao_implantacao_valor ?? 0)}</span></p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Mensalidade</p>
                        <p className="text-xs">{(vp as any).comissao_mensalidade_percentual ?? vp.comissao_percentual}% → <span className="font-mono">{fmtBRL((vp as any).comissao_mensalidade_valor ?? 0)}</span></p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Serviço</p>
                        <p className="text-xs">{(vp as any).comissao_servico_percentual ?? 0}% → <span className="font-mono">{fmtBRL((vp as any).comissao_servico_valor ?? 0)}</span></p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-border">
                      <span className="text-xs text-muted-foreground">Total comissão</span>
                      <span className="font-mono font-semibold text-sm">{fmtBRL(vp.comissao_valor)}</span>
                    </div>
                  </div>
                )}

                <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Status pedido</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[vp.status_pedido] || "bg-muted text-muted-foreground"}`}>
                      {vp.status_pedido}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Status financeiro</p>
                    {(() => {
                      const zsStatus = zapsignMap[vp.id];
                      if (zsStatus === "Assinado") {
                        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3" />Contrato assinado</span>;
                      }
                      if (zsStatus === "Recusado") {
                        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600"><XCircle className="h-3 w-3" />Assinatura recusada</span>;
                      }
                      if (zsStatus === "Enviado" || zsStatus === "Pendente") {
                        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><Send className="h-3 w-3" />Aguardando assinatura</span>;
                      }
                      if (vp.contrato_liberado) {
                        const stGeracao = contratoStatusMap[vp.id];
                        if (stGeracao === 'Pendente' || stGeracao === 'Gerando') {
                          return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 animate-spin" />Aguardando geração</span>;
                        }
                        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><FileText className="h-3 w-3" />Contrato gerado</span>;
                      }
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FIN_STATUS_COLORS[finStatus] || "bg-muted text-muted-foreground"}`}>
                          {finStatus}
                        </span>
                      );
                    })()}
                  </div>
                  {vp.financeiro_motivo && (
                    <div className="col-span-2 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Motivo reprovação</p>
                      <p className="text-destructive text-xs">{vp.financeiro_motivo}</p>
                    </div>
                  )}
                </div>


                {(vp as any).motivo_desconto && (
                  <div className="border-t border-border pt-3 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Motivo do Desconto</p>
                    <p className="text-xs">{(vp as any).motivo_desconto}</p>
                  </div>
                )}

                {vp.observacoes && (
                  <div className="border-t border-border pt-3 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-xs">{vp.observacoes}</p>
                  </div>
                )}

                <PedidoComentarios pedidoId={vp.id} />
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingPedido(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}


