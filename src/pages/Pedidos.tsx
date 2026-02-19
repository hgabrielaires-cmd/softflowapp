import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Cliente, Filial, Profile, Contrato } from "@/lib/supabase-types";
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
import { Plus, Search, Pencil, XCircle, Loader2, Filter, RefreshCw, CheckCircle, UserPlus, Tag, ArrowUpCircle, FileText, AlertCircle, Eye, Users, Star, Trash2, MapPin } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Constants ────────────────────────────────────────────────────────────────

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const emptyClienteForm = {
  nome_fantasia: "", razao_social: "", cnpj_cpf: "",
  contato_nome: "", telefone: "", email: "", cidade: "", uf: "",
  cep: "", logradouro: "", bairro: "",
};

const STATUS_OPTIONS = ["Aguardando Financeiro", "Aprovado Financeiro", "Reprovado Financeiro", "Cancelado"] as const;

const STATUS_COLORS: Record<string, string> = {
  "Aguardando Financeiro": "bg-amber-100 text-amber-700",
  "Aprovado Financeiro": "bg-emerald-100 text-emerald-700",
  "Reprovado Financeiro": "bg-red-100 text-red-600",
  "Cancelado": "bg-gray-100 text-gray-500",
};

const FIN_STATUS_COLORS: Record<string, string> = {
  Aguardando: "bg-amber-100 text-amber-700",
  Aprovado: "bg-emerald-100 text-emerald-700",
  Reprovado: "bg-red-100 text-red-600",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuloOpcional {
  id: string;
  nome: string;
  valor_implantacao_modulo: number | null;
  valor_mensalidade_modulo: number | null;
  incluso_no_plano: boolean;
}

interface ModuloAdicionadoItem {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
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
  modulos_adicionais?: ModuloAdicionadoItem[];
  tipo_pedido?: string;
  contrato_id?: string | null;
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
  observacoes: string;
  // Valores originais (auto-preenchidos, readonly)
  valor_implantacao_original: number;
  valor_mensalidade_original: number;
  // Descontos
  desconto_implantacao_tipo: "R$" | "%";
  desconto_implantacao_valor: string;
  desconto_mensalidade_tipo: "R$" | "%";
  desconto_mensalidade_valor: string;
  // Módulos adicionais (lista de itens com quantidade)
  modulos_adicionais: ModuloAdicionadoItem[];
  // Tipo do pedido
  tipo_pedido: "Novo" | "Upgrade" | "Aditivo";
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
  observacoes: "",
  valor_implantacao_original: 0,
  valor_mensalidade_original: 0,
  desconto_implantacao_tipo: "R$",
  desconto_implantacao_valor: "0",
  desconto_mensalidade_tipo: "R$",
  desconto_mensalidade_valor: "0",
  modulos_adicionais: [],
  tipo_pedido: "Novo",
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

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Pedidos() {
  const { profile, roles, isAdmin } = useAuth();
  const isFinanceiro = roles.includes("financeiro");
  const isVendedor = roles.includes("vendedor");
  const isTecnico = roles.includes("tecnico") && !isAdmin && !isFinanceiro && !isVendedor;
  const canSeeAllBranches = isAdmin || isFinanceiro;

  const [pedidos, setPedidos] = useState<PedidoWithJoins[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [vendedores, setVendedores] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filialFavoritaId, setFilialFavoritaId] = useState<string | null>(null);
  const [filialParametros, setFilialParametros] = useState<any | null>(null);

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
  const [filterFilial, setFilterFilial] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVendedor, setFilterVendedor] = useState("all");
  const [filterDe, setFilterDe] = useState("");
  const [filterAte, setFilterAte] = useState("");

  // Dialog pedido
  const [openDialog, setOpenDialog] = useState(false);
  const [viewingPedido, setViewingPedido] = useState<PedidoWithJoins | null>(null);
  const [editingPedido, setEditingPedido] = useState<PedidoWithJoins | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [descontoAtivo, setDescontoAtivo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Contrato ativo do cliente selecionado
  const [contratoAtivo, setContratoAtivo] = useState<Contrato | null>(null);
  const [loadingContrato, setLoadingContrato] = useState(false);
  // Modal de upgrade
  const [openUpgradeDialog, setOpenUpgradeDialog] = useState(false);
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

  // Contatos inline do form novo cliente
  const [clienteContatos, setClienteContatos] = useState<{ nome: string; cargo: string; telefone: string; email: string; decisor: boolean; ativo: boolean }[]>([]);
  const [showContatoClienteForm, setShowContatoClienteForm] = useState(false);
  const [editingContatoClienteIdx, setEditingContatoClienteIdx] = useState<number | null>(null);
  const [inlineContatoClienteForm, setInlineContatoClienteForm] = useState({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });

  // ─── Computed values ─────────────────────────────────────────────────────

  // Total dos módulos adicionais na lista
  const totalAdicionaisImp = form.modulos_adicionais.reduce(
    (acc, m) => acc + m.valor_implantacao_modulo * m.quantidade, 0
  );
  const totalAdicionaisMens = form.modulos_adicionais.reduce(
    (acc, m) => acc + m.valor_mensalidade_modulo * m.quantidade, 0
  );

  const valorImplantacaoOriginal = (planoSelecionado?.valor_implantacao_padrao ?? form.valor_implantacao_original) + totalAdicionaisImp;
  const valorMensalidadeOriginal = (planoSelecionado?.valor_mensalidade_padrao ?? form.valor_mensalidade_original) + totalAdicionaisMens;

  const valorImplantacaoFinal = applyDesconto(
    valorImplantacaoOriginal,
    form.desconto_implantacao_tipo,
    parseFloat(form.desconto_implantacao_valor) || 0
  );

  const valorMensalidadeFinal = applyDesconto(
    valorMensalidadeOriginal,
    form.desconto_mensalidade_tipo,
    parseFloat(form.desconto_mensalidade_valor) || 0
  );

  const valorTotal = valorImplantacaoFinal + valorMensalidadeFinal;
  // Comissões separadas por tipo
  const comissaoImpPerc = parseFloat(form.comissao_implantacao_percentual) || 0;
  const comissaoMensPerc = parseFloat(form.comissao_mensalidade_percentual) || 0;
  const comissaoImpValor = valorImplantacaoFinal * comissaoImpPerc / 100;
  const comissaoMensValor = valorMensalidadeFinal * comissaoMensPerc / 100;
  const comissaoValorTotal = comissaoImpValor + comissaoMensValor;
  // Campo legado mantido para compatibilidade
  const comissaoValor = comissaoValorTotal;
  const comissaoPercentualLegado = parseFloat(form.comissao_percentual) || 0;

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

    // Se já existe, só incrementa quantidade
    const jaExiste = form.modulos_adicionais.find((m) => m.modulo_id === moduloBuscaId);
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

  useEffect(() => {
    if (profile?.user_id) {
      supabase.from("profiles").select("filial_favorita_id").eq("user_id", profile.user_id).single().then(({ data }) => {
        if (data) setFilialFavoritaId((data as any).filial_favorita_id || null);
      });
    }
  }, [profile?.user_id]);

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
    ] = await Promise.all([
      supabase.from("pedidos").select("*, clientes(nome_fantasia), planos(nome), filiais(nome)").order("created_at", { ascending: false }),
      supabase.from("clientes").select("*").eq("ativo", true).order("nome_fantasia"),
      supabase.from("planos").select("*").eq("ativo", true).order("nome"),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("profiles").select("*").order("full_name"),
    ]);
    setPedidos((pedidosData || []) as unknown as PedidoWithJoins[]);
    setClientes((clientesData || []) as Cliente[]);
    setPlanos(planosData || []);
    setFiliais((filiaisData || []) as Filial[]);
    setVendedores((vendedoresData || []) as Profile[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

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
      .maybeSingle();
    setContratoAtivo(data as unknown as Contrato | null);
    setLoadingContrato(false);
  }

  async function handleClienteChange(clienteId: string) {
    setForm((f) => ({ ...f, cliente_id: clienteId, plano_id: "", tipo_pedido: "Novo", contrato_id: null }));
    setPlanoSelecionado(null);
    setModulosDisponiveis([]);
    await buscarContratoAtivo(clienteId);
  }

  function handleIniciarUpgrade() {
    setUpgradePlanoId("");
    setOpenUpgradeDialog(true);
  }

  function handleConfirmarUpgrade() {
    if (!upgradePlanoId) { toast.error("Selecione o novo plano"); return; }
    if (!contratoAtivo) return;
    setForm((f) => ({
      ...f,
      plano_id: upgradePlanoId,
      tipo_pedido: "Upgrade",
      contrato_id: contratoAtivo.id,
    }));
    loadPlano(upgradePlanoId, []);
    setOpenUpgradeDialog(false);
  }

  function handleIniciarAditivo() {
    if (!contratoAtivo) return;
    // Mantém o plano atual do contrato para buscar módulos
    setForm((f) => ({
      ...f,
      plano_id: contratoAtivo.plano_id || "",
      tipo_pedido: "Aditivo",
      contrato_id: contratoAtivo.id,
    }));
    if (contratoAtivo.plano_id) loadPlano(contratoAtivo.plano_id, []);
  }

  // ─── Open create/edit ─────────────────────────────────────────────────────

  function openCreate() {
    const defaultImp = (profile as any)?.comissao_implantacao_percentual?.toString() ?? profile?.comissao_percentual?.toString() ?? "5";
    const defaultMens = (profile as any)?.comissao_mensalidade_percentual?.toString() ?? profile?.comissao_percentual?.toString() ?? "5";
    const defaultFilial = filialFavoritaId || profile?.filial_id || "";
    const defaultVendedor = profile?.user_id ?? "";
    setForm({
      ...emptyForm,
      comissao_percentual: defaultImp,
      comissao_implantacao_percentual: defaultImp,
      comissao_mensalidade_percentual: defaultMens,
      filial_id: defaultFilial,
      vendedor_id: defaultVendedor,
    });
    setPlanoSelecionado(null);
    setModulosDisponiveis([]);
    setModuloBuscaId("");
    setModuloBuscaQtd("1");
    setDescontoAtivo(false);
    setEditingPedido(null);
    setOpenDialog(true);
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
      observacoes: pedido.observacoes || "",
      valor_implantacao_original: pedido.valor_implantacao_original ?? pedido.valor_implantacao,
      valor_mensalidade_original: pedido.valor_mensalidade_original ?? pedido.valor_mensalidade,
      desconto_implantacao_tipo: (pedido.desconto_implantacao_tipo as "R$" | "%") || "R$",
      desconto_implantacao_valor: (pedido.desconto_implantacao_valor ?? 0).toString(),
      desconto_mensalidade_tipo: (pedido.desconto_mensalidade_tipo as "R$" | "%") || "R$",
      desconto_mensalidade_valor: (pedido.desconto_mensalidade_valor ?? 0).toString(),
      modulos_adicionais: adicionais,
      tipo_pedido: (pedido.tipo_pedido as "Novo" | "Upgrade" | "Aditivo") || "Novo",
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
    });
    setModuloBuscaId("");
    setModuloBuscaQtd("1");
    setDescontoAtivo(temDesconto);
    setEditingPedido(pedido);
    setOpenDialog(true);
    loadPlano(pedido.plano_id, adicionais);
  }

  // ─── Save ────────────────────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_id) { toast.error("Selecione um cliente"); return; }
    if (!form.plano_id) { toast.error("Selecione um plano"); return; }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        cliente_id: form.cliente_id,
        plano_id: form.plano_id,
        filial_id: form.filial_id || profile?.filial_id,
        vendedor_id: form.vendedor_id || profile?.user_id,
        // Legado
        valor_implantacao: valorImplantacaoFinal,
        valor_mensalidade: valorMensalidadeFinal,
        valor_total: valorTotal,
        comissao_percentual: comissaoPercentualLegado,
        comissao_valor: comissaoValorTotal,
        observacoes: form.observacoes || null,
        // Campos de valor
        valor_implantacao_original: valorImplantacaoOriginal,
        valor_mensalidade_original: valorMensalidadeOriginal,
        desconto_implantacao_tipo: form.desconto_implantacao_tipo,
        desconto_implantacao_valor: parseFloat(form.desconto_implantacao_valor) || 0,
        valor_implantacao_final: valorImplantacaoFinal,
        desconto_mensalidade_tipo: form.desconto_mensalidade_tipo,
        desconto_mensalidade_valor: parseFloat(form.desconto_mensalidade_valor) || 0,
        valor_mensalidade_final: valorMensalidadeFinal,
        modulos_adicionais: form.modulos_adicionais,
        tipo_pedido: form.tipo_pedido,
        contrato_id: form.contrato_id || null,
        // Comissões separadas
        comissao_implantacao_percentual: comissaoImpPerc,
        comissao_implantacao_valor: comissaoImpValor,
        comissao_mensalidade_percentual: comissaoMensPerc,
        comissao_mensalidade_valor: comissaoMensValor,
        // Forma de pagamento
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
        if (isReprovado) {
          payload.financeiro_status = "Aguardando";
          payload.financeiro_motivo = null;
          payload.financeiro_aprovado_em = null;
          payload.financeiro_aprovado_por = null;
          payload.contrato_liberado = false;
          payload.status_pedido = "Aguardando Financeiro";
        }
        const { error } = await supabase.from("pedidos").update(payload).eq("id", editingPedido.id);
        if (error) throw error;
        toast.success(isReprovado ? "Pedido reenviado para o financeiro!" : "Pedido atualizado com sucesso!");
      } else {
        const insertPayload = {
          ...payload,
          status_pedido: "Aguardando Financeiro" as string,
          financeiro_status: "Aguardando",
          contrato_liberado: false,
        };
        const { error } = await supabase.from("pedidos").insert(insertPayload as any);
        if (error) throw error;
        toast.success("Pedido criado com sucesso!");
      }
      setOpenDialog(false);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar pedido");
    }
    setSaving(false);
  }

  async function cancelarPedido(pedido: PedidoWithJoins) {
    const { error } = await supabase.from("pedidos").update({ status_pedido: "Cancelado", comissao_valor: 0 }).eq("id", pedido.id);
    if (error) { toast.error("Erro ao cancelar pedido"); return; }
    toast.success("Pedido cancelado");
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
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      if (!res.ok) {
        setCnpjError("CNPJ não encontrado");
      } else {
        const data = await res.json();
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
      setCnpjError("CNPJ não encontrado");
    } finally {
      setLoadingCnpj(false);
    }
  }

  async function handleSaveCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteForm.nome_fantasia.trim() || !clienteForm.cnpj_cpf.trim()) {
      toast.error("Nome fantasia e CNPJ/CPF são obrigatórios");
      return;
    }
    if (clienteContatos.length === 0) {
      toast.error("Cadastre pelo menos um contato antes de salvar");
      return;
    }
    setSavingCliente(true);
    const filial_id = profile?.filial_id || (isAdmin ? form.filial_id || null : null);
    const { data, error } = await supabase.from("clientes").insert({
      nome_fantasia: clienteForm.nome_fantasia.trim(),
      razao_social: clienteForm.razao_social.trim() || null,
      cnpj_cpf: clienteForm.cnpj_cpf.trim(),
      contato_nome: clienteContatos[0]?.nome || clienteForm.contato_nome.trim() || null,
      telefone: clienteContatos[0]?.telefone || clienteForm.telefone.trim() || null,
      email: clienteContatos[0]?.email || clienteForm.email.trim() || null,
      cidade: clienteForm.cidade.trim() || null,
      uf: clienteForm.uf || null,
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
    toast.success("Cliente cadastrado! Já selecionado no pedido.");
    const { data: novosClientes } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome_fantasia");
    setClientes((novosClientes || []) as Cliente[]);
    if (data) setForm((f) => ({ ...f, cliente_id: data.id }));
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
    if (filterFilial !== "all" && p.filial_id !== filterFilial) return false;
    if (filterStatus !== "all" && p.status_pedido !== filterStatus) return false;
    if (filterVendedor !== "all" && p.vendedor_id !== filterVendedor) return false;
    if (filterDe && p.created_at < filterDe) return false;
    if (filterAte && p.created_at > filterAte + "T23:59:59") return false;
    return true;
  });

  const canCreate = isAdmin || isVendedor;
  const clientesDisponiveis = canSeeAllBranches ? clientes : clientes.filter((c) => c.filial_id === profile?.filial_id);

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
            {canSeeAllBranches && (
              <Select value={filterFilial} onValueChange={setFilterFilial}>
                <SelectTrigger><SelectValue placeholder="Todas as filiais" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
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
                  <TableHead>Cliente</TableHead>
                  {canSeeAllBranches && <TableHead>Filial</TableHead>}
                  {canSeeAllBranches && <TableHead>Vendedor</TableHead>}
                  <TableHead className="text-right">Implantação</TableHead>
                  <TableHead className="text-right">Mensalidade</TableHead>
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
                    <TableCell colSpan={11} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">Nenhum pedido encontrado</TableCell>
                  </TableRow>
                ) : filtered.map((pedido) => {
                  const finStatus = pedido.financeiro_status as string || "Aguardando";
                  const finMotivo = pedido.financeiro_motivo as string | null;
                  const contratoLiberado = pedido.contrato_liberado as boolean;
                  const isReprovado = finStatus === "Reprovado";
                  const isAprovado = finStatus === "Aprovado";
                  const temContratoVigente = contratoLiberado && isAprovado;

                  // Vendedor só edita se: reprovado OU aguardando financeiro E sem contrato vigente
                  const canEditVendedor = isVendedor && pedido.vendedor_id === profile?.user_id
                    && !temContratoVigente
                    && (isReprovado || pedido.status_pedido === "Aguardando Financeiro");
                  const canEditAdmin = isAdmin && !temContratoVigente;
                  const canEdit = canEditAdmin || (canEditVendedor && !isReprovado);

                  // Cancelar: apenas admin (sem contrato vigente); vendedor nunca exclui
                  const canCancel = isAdmin && pedido.status_pedido !== "Cancelado" && !temContratoVigente;

                  const vendedorNome = vendedores.find((v) => v.user_id === pedido.vendedor_id)?.full_name || "—";
                  const filialNome = (pedido as any).filiais?.nome || filiais.find(f => f.id === pedido.filial_id)?.nome || "—";
                  const impFinal = pedido.valor_implantacao_final ?? pedido.valor_implantacao;
                  const mensFinal = pedido.valor_mensalidade_final ?? pedido.valor_mensalidade;
                  return (
                    <TableRow key={pedido.id} className={isReprovado ? "bg-destructive/5" : undefined}>
                      <TableCell className="font-medium">{(pedido as any).clientes?.nome_fantasia || "—"}</TableCell>
                      {canSeeAllBranches && <TableCell className="text-sm text-muted-foreground">{filialNome}</TableCell>}
                      {canSeeAllBranches && <TableCell className="text-sm text-muted-foreground">{vendedorNome}</TableCell>}
                      <TableCell className="text-right font-mono text-sm">{fmtBRL(impFinal)}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{fmtBRL(mensFinal)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{fmtBRL(pedido.valor_total)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[pedido.status_pedido] || "bg-muted text-muted-foreground"}`}>
                          {pedido.status_pedido}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FIN_STATUS_COLORS[finStatus] || "bg-muted text-muted-foreground"}`}>
                            {finStatus}
                          </span>
                          {contratoLiberado && (
                            <div className="flex items-center gap-1 text-xs text-success font-medium">
                              <CheckCircle className="h-3 w-3" /> Contrato liberado
                            </div>
                          )}
                          {isReprovado && finMotivo && (
                            <p className="text-xs text-destructive max-w-[180px] truncate" title={finMotivo}>⚠ {finMotivo}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Visualizar — sempre disponível */}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setViewingPedido(pedido)} title="Visualizar pedido">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
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
        <DialogContent className="max-w-2xl flex flex-col h-[90vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle className="flex items-center gap-2">
              {form.tipo_pedido === "Upgrade" && <ArrowUpCircle className="h-4 w-4 text-primary" />}
              {form.tipo_pedido === "Aditivo" && <FileText className="h-4 w-4 text-primary" />}
              {editingPedido ? "Editar Pedido" : `Novo Pedido${form.tipo_pedido !== "Novo" ? ` — ${form.tipo_pedido}` : ""}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* ── Cliente ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Cliente *</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                  onClick={() => { setClienteForm(emptyClienteForm); setOpenClienteDialog(true); }}>
                  <UserPlus className="h-3.5 w-3.5" /> Novo cliente
                </Button>
              </div>
              <Select value={form.cliente_id} onValueChange={handleClienteChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                <SelectContent>
                  {clientesDisponiveis.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}
                </SelectContent>
              </Select>

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
                    <div className="flex gap-2 mt-2">
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={handleIniciarUpgrade}>
                        <ArrowUpCircle className="h-3.5 w-3.5" /> Upgrade de Plano
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs gap-1.5 border-amber-300 text-amber-800 hover:bg-amber-100"
                        onClick={handleIniciarAditivo}>
                        <FileText className="h-3.5 w-3.5" /> Adicionar Módulo (Aditivo)
                      </Button>
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
                <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                  <ArrowUpCircle className="h-3 w-3 inline mr-1" />
                  Upgrade do contrato Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})
                </div>
              )}
            </div>

            {/* ── Plano ── */}
            {form.tipo_pedido !== "Aditivo" && (
              <div className="space-y-1.5">
                <Label>Plano *</Label>
                {contratoAtivo && form.tipo_pedido === "Novo" ? (
                  // Bloqueado pois tem contrato ativo e ainda não escolheu a ação
                  <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed">
                    Selecione uma ação acima (Upgrade ou Aditivo)
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

            {/* ── Filial e Vendedor ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Filial *</Label>
                {isAdmin ? (
                  <Select value={form.filial_id} onValueChange={(v) => setForm((f) => ({ ...f, filial_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input readOnly value={filiais.find((f) => f.id === form.filial_id)?.nome || "—"} className="bg-muted cursor-not-allowed" />
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
            {form.plano_id && (
              <div className="space-y-3">
                <Label>Módulos Adicionais</Label>

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
                          {modulosDisponiveis.length === 0
                            ? <SelectItem value="_none" disabled>Nenhum módulo vinculado</SelectItem>
                            : modulosDisponiveis.map((m) => (
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
                            ))
                          }
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
            {form.plano_id && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                {/* Header com toggle de desconto */}
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-muted-foreground" /> Precificação
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-muted-foreground">Aplicar desconto</span>
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

                {/* Valores originais (readonly) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Implantação</Label>
                    <Input readOnly value={fmtBRL(descontoAtivo ? valorImplantacaoOriginal : valorImplantacaoFinal)} className="bg-background font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mensalidade</Label>
                    <Input readOnly value={fmtBRL(descontoAtivo ? valorMensalidadeOriginal : valorMensalidadeFinal)} className="bg-background font-mono text-sm" />
                  </div>
                </div>

                {/* Descontos — só exibe quando toggle ativo */}
                {descontoAtivo && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descontos</p>

                    {/* Desconto implantação */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Desconto — Implantação</Label>
                      <div className="flex gap-2">
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
                          className="flex-1"
                          placeholder="0"
                        />
                        <Input readOnly value={fmtBRL(valorImplantacaoFinal)} className="w-36 bg-background font-mono text-sm text-primary font-semibold" />
                      </div>
                    </div>

                    {/* Desconto mensalidade */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Desconto — Mensalidade</Label>
                      <div className="flex gap-2">
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
                          className="flex-1"
                          placeholder="0"
                        />
                        <Input readOnly value={fmtBRL(valorMensalidadeFinal)} className="w-36 bg-background font-mono text-sm text-primary font-semibold" />
                      </div>
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
                    <Label className="text-xs">Forma de pagamento</Label>
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
                    <Label className="text-xs">Desconto adicional (%)</Label>
                    <Input
                      type="number" min="0" max="100" step="0.01"
                      placeholder="0"
                      value={form.pagamento_implantacao_desconto_percentual}
                      onChange={(e) => setForm((f) => ({ ...f, pagamento_implantacao_desconto_percentual: e.target.value }))}
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
            </div>

            {/* ── Observações ── */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Observações opcionais..." value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>

            </div>{/* end scrollable area */}
            <DialogFooter className="px-6 py-4 border-t border-border shrink-0">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving || !form.cliente_id || !form.plano_id}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingPedido ? "Salvar alterações" : "Criar pedido"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog rápido novo cliente ─────────────────────────────────────── */}
      <Dialog open={openClienteDialog} onOpenChange={(open) => { setOpenClienteDialog(open); if (!open) { setClienteContatos([]); setShowContatoClienteForm(false); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
                <Label>Razão Social</Label>
                <Input placeholder="Razão social..." value={clienteForm.razao_social} onChange={(e) => setClienteForm((f) => ({ ...f, razao_social: e.target.value }))} />
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
                        <Label className="text-xs">Cargo</Label>
                        <Input className="h-8 text-sm" value={inlineContatoClienteForm.cargo} onChange={(e) => setInlineContatoClienteForm((f) => ({ ...f, cargo: e.target.value }))} placeholder="Cargo / função" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Telefone</Label>
                        <Input className="h-8 text-sm" value={inlineContatoClienteForm.telefone} onChange={(e) => setInlineContatoClienteForm((f) => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">E-mail</Label>
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
                  {planos
                    .filter((p) => p.id !== contratoAtivo?.plano_id)
                    .map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">O plano atual do contrato não é exibido.</p>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Visualizar Pedido
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
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p>{format(new Date(vp.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                </div>

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
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Implantação / Treinamento</p>
                        <p className="text-xs">{(vp as any).comissao_implantacao_percentual ?? vp.comissao_percentual}% → <span className="font-mono">{fmtBRL((vp as any).comissao_implantacao_valor ?? 0)}</span></p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Mensalidade</p>
                        <p className="text-xs">{(vp as any).comissao_mensalidade_percentual ?? vp.comissao_percentual}% → <span className="font-mono">{fmtBRL((vp as any).comissao_mensalidade_valor ?? 0)}</span></p>
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FIN_STATUS_COLORS[finStatus] || "bg-muted text-muted-foreground"}`}>
                      {finStatus}
                    </span>
                  </div>
                  {vp.contrato_liberado && (
                    <div className="col-span-2 flex items-center gap-1 text-xs text-success font-medium">
                      <CheckCircle className="h-3 w-3" /> Contrato liberado
                    </div>
                  )}
                  {vp.financeiro_motivo && (
                    <div className="col-span-2 space-y-0.5">
                      <p className="text-xs text-muted-foreground">Motivo reprovação</p>
                      <p className="text-destructive text-xs">{vp.financeiro_motivo}</p>
                    </div>
                  )}
                </div>

                {adicionais.length > 0 && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Módulos adicionais</p>
                    {adicionais.map((m) => (
                      <div key={m.modulo_id} className="flex justify-between text-xs">
                        <span>{m.nome} {m.quantidade > 1 ? `(x${m.quantidade})` : ""}</span>
                        <span className="font-mono text-muted-foreground">{fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês</span>
                      </div>
                    ))}
                  </div>
                )}

                {vp.observacoes && (
                  <div className="border-t border-border pt-3 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Observações</p>
                    <p className="text-xs">{vp.observacoes}</p>
                  </div>
                )}

                {/* ── Mensagem Termo de Aceite ── */}
                {(isAdmin || isFinanceiro) && (() => {
                  const cliente = clientes.find(c => c.id === vp.cliente_id);
                  const plano = planos.find(p => p.id === vp.plano_id);
                  const nomeDecisor = "{nome_decisor}"; // será substituído dinamicamente do banco
                  const nomeUsuario = profile?.full_name || "{nome_usuario}";
                  const nomeFantasia = cliente?.nome_fantasia || "{nome_fantasia}";
                  const nomePlano = plano?.nome || "{plano}";
                  const descricaoPlano = plano?.descricao || "";
                  const modulosTexto = descricaoPlano
                    ? descricaoPlano.split(",").map((m: string) => `• ${m.trim()}`).join("\n")
                    : "";
                  const valorPlano = fmtBRL(plano?.valor_mensalidade_padrao ?? 0);
                  const adicionais = (vp.modulos_adicionais || []) as ModuloAdicionadoItem[];
                  const totalAdicionais = adicionais.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
                  const adicionaisTexto = adicionais.length > 0
                    ? adicionais.map(m => `✔️ ${m.nome} (${m.quantidade}x ${fmtBRL(m.valor_mensalidade_modulo)}) - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}`).join("\n")
                    : "";

                  const regrasMens = (vp as any).pagamento_mensalidade_observacao || filialParametros?.regras_padrao_mensalidade || "";
                  const regrasImpl = (vp as any).pagamento_implantacao_observacao || filialParametros?.regras_padrao_implantacao || "";
                  const parcelasCartao = filialParametros?.parcelas_maximas_cartao;
                  const pixDesconto = filialParametros?.pix_desconto_percentual;

                  const mensagem = `Olá {nome_decisor}, bom dia!

Tudo bem?

Me chamo *${nomeUsuario}*, sou do financeiro da Softplus Tecnologia. 

Primeiro queria agradecer por ter escolhido nosso sistema para auxiliar nos processos da *${nomeFantasia}*. 

Saiba que vamos nos empenhar ao máximo para que tudo corra como o esperado. ☺️💙

Passando para alinhar o que ficou acertado com nossa equipe:

☑️ *Módulos Contratados*

Plano ${nomePlano}${modulosTexto ? "\n" + modulosTexto : ""}

Valor base do plano: R$ ${valorPlano}${adicionais.length > 0 ? `

🔘 *ADICIONAIS*

${adicionaisTexto}

Total adicionais: ${fmtBRL(totalAdicionais)}` : ""}

*MENSALIDADE TOTAL*

*${fmtBRL(mensFinal)}*

Valor pré-pago.${regrasMens ? "\n" + regrasMens : ""}

*IMPLANTAÇÃO E TREINAMENTO*

*${fmtBRL(impFinal)}*${regrasImpl ? "\n" + regrasImpl : ""}${parcelasCartao || pixDesconto > 0 ? `

Formas disponíveis:${parcelasCartao ? `\n- Até ${parcelasCartao}x no cartão sem juros` : ""}${pixDesconto > 0 ? `\n- PIX ${pixDesconto}% desconto` : ""}` : ""}

✍️ *TERMO DE ACEITE:*

{link_assinatura}

Implantação confirmada para:

{datas_implantacao}

Os boletos referentes à implantação e primeira mensalidade foram enviados por e-mail.

Caso prefira, posso encaminhar novamente.

Estou à disposição.`;

                  return (
                    <div className="border-t border-border pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensagem — Termo de Aceite</p>
                        <Button
                          type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(mensagem);
                            toast.success("Mensagem copiada!");
                          }}
                        >
                          📋 Copiar
                        </Button>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/40 p-3">
                        <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">{mensagem}</pre>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        💡 Substitua <code className="bg-muted px-1 rounded">{"{nome_decisor}"}</code>, <code className="bg-muted px-1 rounded">{"{link_assinatura}"}</code> e <code className="bg-muted px-1 rounded">{"{datas_implantacao}"}</code> antes de enviar.
                      </p>
                    </div>
                  );
                })()}
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


