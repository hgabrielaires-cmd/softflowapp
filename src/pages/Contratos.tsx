import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { Filial } from "@/lib/supabase-types";
import type { Contrato, ZapSignRecord, ModuloAdicionadoItem } from "./contratos/types";
import { ITEMS_PER_PAGE, UF_LIST, ZAPSIGN_MSGS, WHATSAPP_MSGS, GERAR_MSGS_CONTRATO, GERAR_MSGS_OA } from "./contratos/constants";
import { fmtBRL } from "./contratos/helpers";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { PedidoComentarios } from "@/components/PedidoComentarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  CheckCircle2,
  Send,
  FileDown,
  RefreshCw,
  ClipboardCopy,
  ExternalLink,
  MinusCircle,
  UserPlus,
  Search,
  Plus,
  MapPin,
  AlertCircle,
  Star,
  Pencil,
  Trash2,
  Users,
  Tag,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TablePagination } from "@/components/TablePagination";

// Types, constants and helpers imported from ./contratos/

export default function Contratos() {
  const { isAdmin, roles, profile } = useAuth();
  const isFinanceiro = roles.includes("financeiro");
  const { canIncluir: crudIncluir, canEditar: crudEditar, canExcluir: crudExcluir } = useCrudPermissions("contratos", roles);
  const canManage = crudEditar || crudIncluir;
  const { filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais } = useUserFiliais();

  // Permissões do usuário
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  useEffect(() => {
    async function loadPerms() {
      if (!profile?.user_id) return;
      const { data: userRoles } = await supabase.from("user_roles").select("role").eq("user_id", profile.user_id);
      if (!userRoles || userRoles.length === 0) return;
      const roleNames = userRoles.map(r => r.role);
      const { data } = await supabase.from("role_permissions").select("permissao, ativo").in("role", roleNames).eq("ativo", true);
      setUserPermissions((data || []).map(p => p.permissao));
    }
    loadPerms();
  }, [profile?.user_id]);
  const podeCadastroRetroativo = userPermissions.includes("acao.cadastro_retroativo");
  const podeRegerarContrato = userPermissions.includes("acao.regerar_contrato");

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [filialParametros, setFilialParametros] = useState<Record<string, any>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterFilial, setFilterFilial] = useState("_init_");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDe, setFilterDe] = useState("");
  const [filterAte, setFilterAte] = useState("");
  const [filterBusca, setFilterBusca] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  

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
  const [gerando, setGerando] = useState(false);
  const [gerarSignedUrl, setGerarSignedUrl] = useState<string | null>(null);
  const [zapsignRecords, setZapsignRecords] = useState<Record<string, ZapSignRecord>>({});
  const [enviandoZapsign, setEnviandoZapsign] = useState(false);
  const [openZapsignDetail, setOpenZapsignDetail] = useState(false);
  const [zapsignDetailContrato, setZapsignDetailContrato] = useState<Contrato | null>(null);
  const [reenviandoWhatsapp, setReenviandoWhatsapp] = useState(false);
  const [linkedMessageTemplate, setLinkedMessageTemplate] = useState<{ conteudo: string } | null>(null);
  const [syncingStatuses, setSyncingStatuses] = useState(false);

  // ── Cadastro Retroativo ──
  const [openRetroativo, setOpenRetroativo] = useState(false);
  const [retroClientes, setRetroClientes] = useState<{ id: string; nome_fantasia: string; filial_id: string | null; cnpj_cpf: string; razao_social: string | null }[]>([]);
  const [retroPlanos, setRetroPlanos] = useState<{ id: string; nome: string; valor_implantacao_padrao: number | null; valor_mensalidade_padrao: number | null }[]>([]);
  const [retroModulos, setRetroModulos] = useState<{ id: string; nome: string; valor_implantacao_modulo: number | null; valor_mensalidade_modulo: number | null }[]>([]);
  const [retroForm, setRetroForm] = useState({
    cliente_id: "", plano_id: "", tipo: "Base", status: "Ativo",
    observacoes: "", segmento_id: "",
    data_lancamento: "",
    vendedor_id: "",
    filial_id: "",
    // Descontos
    desconto_implantacao_tipo: "R$" as "R$" | "%",
    desconto_implantacao_valor: "0",
    desconto_mensalidade_tipo: "R$" as "R$" | "%",
    desconto_mensalidade_valor: "0",
    motivo_desconto: "",
    // Pagamento
    pagamento_implantacao_forma: "",
    pagamento_implantacao_parcelas: "",
    pagamento_implantacao_observacao: "",
    pagamento_mensalidade_forma: "",
    pagamento_mensalidade_observacao: "",
  });
  const [retroVendedores, setRetroVendedores] = useState<{ id: string; user_id: string; full_name: string; filial_id: string | null }[]>([]);
  const [retroSegmentos, setRetroSegmentos] = useState<{ id: string; nome: string }[]>([]);
  const [retroModulosSelecionados, setRetroModulosSelecionados] = useState<{ modulo_id: string; nome: string; quantidade: number; valor_implantacao_modulo: number; valor_mensalidade_modulo: number }[]>([]);
  const [retroSaving, setRetroSaving] = useState(false);
  const [retroDescontoAtivo, setRetroDescontoAtivo] = useState(false);
  const [retroClienteSearch, setRetroClienteSearch] = useState("");
  const [retroClienteSearchFocused, setRetroClienteSearchFocused] = useState(false);

  // Novo cliente inline no retroativo
  
  const emptyRetroClienteForm = { nome_fantasia: "", razao_social: "", cnpj_cpf: "", contato_nome: "", telefone: "", email: "", cidade: "", uf: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "" };
  const [openRetroClienteDialog, setOpenRetroClienteDialog] = useState(false);
  const [retroClienteForm, setRetroClienteForm] = useState(emptyRetroClienteForm);
  const [retroSavingCliente, setRetroSavingCliente] = useState(false);
  const [retroLoadingCep, setRetroLoadingCep] = useState(false);
  const [retroLoadingCnpj, setRetroLoadingCnpj] = useState(false);
  const [retroCepError, setRetroCepError] = useState("");
  const [retroCnpjError, setRetroCnpjError] = useState("");
  const [retroClienteContatos, setRetroClienteContatos] = useState<{ nome: string; cargo: string; telefone: string; email: string; decisor: boolean; ativo: boolean }[]>([]);
  const [retroShowContatoForm, setRetroShowContatoForm] = useState(false);
  const [retroEditingContatoIdx, setRetroEditingContatoIdx] = useState<number | null>(null);
  const [retroInlineContatoForm, setRetroInlineContatoForm] = useState({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });

  // Retroativo computed values
  const retroPlanoSel = retroPlanos.find(p => p.id === retroForm.plano_id);
  const retroTotalModImp = retroModulosSelecionados.reduce((a, m) => a + m.valor_implantacao_modulo * m.quantidade, 0);
  const retroTotalModMens = retroModulosSelecionados.reduce((a, m) => a + m.valor_mensalidade_modulo * m.quantidade, 0);
  const retroValorImpOriginal = (retroPlanoSel?.valor_implantacao_padrao ?? 0) + retroTotalModImp;
  const retroValorMensOriginal = (retroPlanoSel?.valor_mensalidade_padrao ?? 0) + retroTotalModMens;

  function applyRetroDesconto(original: number, tipo: "R$" | "%", valor: number) {
    const raw = tipo === "%" ? original - (original * valor / 100) : original - valor;
    return Math.max(0, raw);
  }

  const retroValorImpFinal = retroDescontoAtivo
    ? applyRetroDesconto(retroValorImpOriginal, retroForm.desconto_implantacao_tipo, parseFloat(retroForm.desconto_implantacao_valor) || 0)
    : retroValorImpOriginal;
  const retroValorMensFinal = retroDescontoAtivo
    ? applyRetroDesconto(retroValorMensOriginal, retroForm.desconto_mensalidade_tipo, parseFloat(retroForm.desconto_mensalidade_valor) || 0)
    : retroValorMensOriginal;
  const retroValorTotal = retroValorImpFinal + retroValorMensFinal;

  async function openRetroativoDialog() {
    setRetroForm({ cliente_id: "", plano_id: "", tipo: "Base", status: "Ativo", observacoes: "", segmento_id: "", data_lancamento: "", vendedor_id: "", filial_id: "", desconto_implantacao_tipo: "R$", desconto_implantacao_valor: "0", desconto_mensalidade_tipo: "R$", desconto_mensalidade_valor: "0", motivo_desconto: "", pagamento_implantacao_forma: "", pagamento_implantacao_parcelas: "", pagamento_implantacao_observacao: "", pagamento_mensalidade_forma: "", pagamento_mensalidade_observacao: "" });
    setRetroModulosSelecionados([]);
    setRetroDescontoAtivo(false);
    setRetroClienteSearch("");
    setOpenRetroativo(true);
    const [{ data: cData }, { data: pData }, { data: mData }, { data: vData }] = await Promise.all([
      supabase.from("clientes").select("id, nome_fantasia, filial_id, cnpj_cpf, razao_social").eq("ativo", true).order("nome_fantasia"),
      supabase.from("planos").select("id, nome, valor_implantacao_padrao, valor_mensalidade_padrao").eq("ativo", true).order("nome"),
      supabase.from("modulos").select("id, nome, valor_implantacao_modulo, valor_mensalidade_modulo").eq("ativo", true).order("nome"),
      supabase.from("profiles").select("id, user_id, full_name, filial_id").eq("active", true).order("full_name"),
    ]);
    setRetroClientes((cData || []) as any[]);
    setRetroPlanos((pData || []) as any[]);
    setRetroModulos((mData || []) as any[]);
    setRetroVendedores((vData || []) as any[]);
  }

  // Auto-fill filial when client changes
  useEffect(() => {
    if (!retroForm.cliente_id) return;
    const clienteSel = retroClientes.find(c => c.id === retroForm.cliente_id);
    if (clienteSel?.filial_id) {
      setRetroForm(f => ({ ...f, filial_id: f.filial_id || clienteSel.filial_id || "" }));
    }
  }, [retroForm.cliente_id, retroClientes]);

  // Load segmentos when filial changes
  useEffect(() => {
    async function loadRetroSegmentos() {
      if (!retroForm.filial_id) { setRetroSegmentos([]); return; }
      const { data } = await supabase.from("segmentos").select("id, nome").eq("filial_id", retroForm.filial_id).eq("ativo", true).order("nome");
      setRetroSegmentos((data || []) as any);
    }
    loadRetroSegmentos();
  }, [retroForm.filial_id]);

  function handleRetroAddModulo(moduloId: string) {
    const mod = retroModulos.find(m => m.id === moduloId);
    if (!mod) return;
    if (retroModulosSelecionados.find(m => m.modulo_id === moduloId)) return;
    setRetroModulosSelecionados(prev => [...prev, {
      modulo_id: mod.id,
      nome: mod.nome,
      quantidade: 1,
      valor_implantacao_modulo: mod.valor_implantacao_modulo || 0,
      valor_mensalidade_modulo: mod.valor_mensalidade_modulo || 0,
    }]);
  }

  async function handleRetroCepBlur() {
    const raw = retroClienteForm.cep.replace(/\D/g, "");
    if (raw.length !== 8) return;
    setRetroLoadingCep(true);
    setRetroCepError("");
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await resp.json();
      if (data.erro) { setRetroCepError("CEP não encontrado"); } else {
        setRetroClienteForm(f => ({ ...f, logradouro: data.logradouro || f.logradouro, bairro: data.bairro || f.bairro, cidade: data.localidade || f.cidade, uf: data.uf || f.uf }));
      }
    } catch { setRetroCepError("Erro ao consultar CEP"); }
    finally { setRetroLoadingCep(false); }
  }

  async function handleRetroCnpjBlur() {
    const raw = retroClienteForm.cnpj_cpf.replace(/\D/g, "");
    if (raw.length !== 14) return;
    setRetroLoadingCnpj(true);
    setRetroCnpjError("");
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`);
      if (!resp.ok) { setRetroCnpjError("CNPJ não encontrado"); return; }
      const data = await resp.json();
      const logradouroApi = [data.descricao_tipo_de_logradouro, data.logradouro].filter(Boolean).join(" ");
      setRetroClienteForm(f => ({
        ...f,
        nome_fantasia: f.nome_fantasia || data.nome_fantasia || data.razao_social || "",
        razao_social: f.razao_social || data.razao_social || "",
        cidade: f.cidade || data.municipio || "",
        uf: f.uf || data.uf || "",
        logradouro: f.logradouro || logradouroApi,
        bairro: f.bairro || data.bairro || "",
        cep: f.cep || (data.cep ? data.cep.replace(/\D/g, "") : ""),
      }));
    } catch { setRetroCnpjError("CNPJ não encontrado"); }
    finally { setRetroLoadingCnpj(false); }
  }

  async function handleRetroSaveCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!retroClienteForm.nome_fantasia.trim() || !retroClienteForm.cnpj_cpf.trim()) { toast.error("Nome fantasia e CNPJ/CPF são obrigatórios"); return; }
    if (retroClienteContatos.length === 0) { toast.error("Cadastre pelo menos um contato"); return; }
    setRetroSavingCliente(true);
    const filial_id = profile?.filial_id || null;
    const { data, error } = await supabase.from("clientes").insert({
      nome_fantasia: retroClienteForm.nome_fantasia.trim(),
      razao_social: retroClienteForm.razao_social.trim() || null,
      cnpj_cpf: retroClienteForm.cnpj_cpf.trim(),
      contato_nome: retroClienteContatos[0]?.nome || null,
      telefone: retroClienteContatos[0]?.telefone || null,
      email: retroClienteContatos[0]?.email || null,
      cidade: retroClienteForm.cidade.trim() || null,
      uf: retroClienteForm.uf || null,
      cep: retroClienteForm.cep.trim() || null,
      logradouro: retroClienteForm.logradouro.trim() || null,
      numero: retroClienteForm.numero.trim() || null,
      complemento: retroClienteForm.complemento.trim() || null,
      bairro: retroClienteForm.bairro.trim() || null,
      filial_id,
      ativo: true,
    }).select("id, nome_fantasia, filial_id, cnpj_cpf, razao_social").single();
    if (error) { toast.error("Erro ao cadastrar cliente: " + error.message); setRetroSavingCliente(false); return; }
    for (const ct of retroClienteContatos) {
      await supabase.from("cliente_contatos").insert({ cliente_id: data.id, nome: ct.nome, cargo: ct.cargo || null, telefone: ct.telefone || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo });
    }
    setRetroClientes(prev => [...prev, data as any].sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia)));
    setRetroForm(f => ({ ...f, cliente_id: data.id }));
    setRetroClienteSearch("");
    toast.success("Cliente cadastrado e selecionado!");
    setRetroClienteForm(emptyRetroClienteForm);
    setRetroClienteContatos([]);
    setRetroShowContatoForm(false);
    setOpenRetroClienteDialog(false);
    setRetroSavingCliente(false);
  }

  async function handleSalvarRetroativo() {
    if (!retroForm.cliente_id) { toast.error("Selecione um cliente"); return; }
    if (!retroForm.segmento_id) { toast.error("Selecione um segmento"); return; }
    if (!retroForm.data_lancamento) { toast.error("Informe a data de lançamento"); return; }
    if (!retroForm.vendedor_id) { toast.error("Selecione o vendedor"); return; }
    if (!retroForm.filial_id) { toast.error("Selecione a filial"); return; }
    setRetroSaving(true);

    const filialId = retroForm.filial_id;
    const dataLancamento = new Date(retroForm.data_lancamento + "T12:00:00").toISOString();

    const pedidoInsert: any = {
      cliente_id: retroForm.cliente_id,
      plano_id: retroForm.plano_id || null,
      filial_id: filialId,
      vendedor_id: retroForm.vendedor_id,
      status_pedido: "Contrato Retroativo",
      financeiro_status: "Aprovado",
      tipo_pedido: retroForm.tipo === "Base" ? "Novo" : retroForm.tipo === "Aditivo" ? "Módulo Adicional" : retroForm.tipo,
      valor_implantacao: retroValorImpOriginal,
      valor_implantacao_original: retroValorImpOriginal,
      valor_implantacao_final: retroValorImpFinal,
      valor_mensalidade: retroValorMensOriginal,
      valor_mensalidade_original: retroValorMensOriginal,
      valor_mensalidade_final: retroValorMensFinal,
      valor_total: retroValorTotal,
      comissao_percentual: 0,
      comissao_valor: 0,
      modulos_adicionais: retroModulosSelecionados.length > 0 ? retroModulosSelecionados : null,
      observacoes: retroForm.observacoes.trim() || "Cadastro retroativo",
      contrato_liberado: true,
      desconto_implantacao_tipo: retroDescontoAtivo ? retroForm.desconto_implantacao_tipo : "R$",
      desconto_implantacao_valor: retroDescontoAtivo ? parseFloat(retroForm.desconto_implantacao_valor) || 0 : 0,
      desconto_mensalidade_tipo: retroDescontoAtivo ? retroForm.desconto_mensalidade_tipo : "R$",
      desconto_mensalidade_valor: retroDescontoAtivo ? parseFloat(retroForm.desconto_mensalidade_valor) || 0 : 0,
      motivo_desconto: retroDescontoAtivo ? retroForm.motivo_desconto.trim() || null : null,
      pagamento_implantacao_forma: retroForm.pagamento_implantacao_forma || null,
      pagamento_implantacao_parcelas: retroForm.pagamento_implantacao_parcelas ? parseInt(retroForm.pagamento_implantacao_parcelas) : null,
      pagamento_implantacao_observacao: retroForm.pagamento_implantacao_observacao.trim() || null,
      pagamento_mensalidade_forma: retroForm.pagamento_mensalidade_forma || null,
      pagamento_mensalidade_observacao: retroForm.pagamento_mensalidade_observacao.trim() || null,
      segmento_id: retroForm.segmento_id || null,
      created_at: dataLancamento,
    };

    const { data: pedidoData, error: pedidoError } = await supabase.from("pedidos").insert(pedidoInsert).select("id").single();
    if (pedidoError) { toast.error("Erro ao criar pedido retroativo: " + pedidoError.message); setRetroSaving(false); return; }

    const insertData: any = {
      cliente_id: retroForm.cliente_id,
      tipo: retroForm.tipo,
      status: retroForm.status,
      status_geracao: "Manual",
      pedido_id: pedidoData.id,
      segmento_id: retroForm.segmento_id || null,
      created_at: dataLancamento,
    };
    if (retroForm.plano_id) insertData.plano_id = retroForm.plano_id;

    const { error } = await supabase.from("contratos").insert(insertData);
    setRetroSaving(false);
    if (error) { toast.error("Erro ao cadastrar contrato: " + error.message); return; }
    toast.success("Contrato retroativo cadastrado com sucesso!");
    setOpenRetroativo(false);
    loadData();
  }

  // ── ZapSign + WhatsApp animated popup state ──
  const [openZapsignPopup, setOpenZapsignPopup] = useState(false);
  const [zapsignPopupStep, setZapsignPopupStep] = useState<"gerando" | "zapsign" | "whatsapp" | "done" | "erro">("zapsign");
  const [zapsignPopupMsgIndex, setZapsignPopupMsgIndex] = useState(0);
  const [zapsignPopupContrato, setZapsignPopupContrato] = useState<Contrato | null>(null);
  const [zapsignPopupError, setZapsignPopupError] = useState<string | null>(null);

  const ZAPSIGN_MSGS = [
    "🚀 Rumo à ativação",
    "⚡ O Softflow não para",
    "🏁 Pé no acelerador",
    "📂 Burocracia zero",
    "✨ Quase lá",
  ];

  const WHATSAPP_MSGS = [
    "📲 Conectando ao WhatsApp...",
    "⚡ Softflow em ação!",
    "✅ Quase pronto!",
    "💬 Disparando notificação automática...",
    "🤖 O Flowy robô do Softflow está enviando a mensagem de confirmação para o WhatsApp agora.",
  ];

  const GERAR_MSGS_CONTRATO = [
    "Ajustando os detalhes finais…",
    "Quase lá… deixando tudo redondo pra você!",
    "Montando seu contrato sob medida…",
    "Organizando tudo para assinatura…",
    "Preparando seu Termo de Aceite 💙",
  ];

  const GERAR_MSGS_OA = [
    "Montando sua Ordem de Atendimento…",
    "Ajustando os serviços…",
    "Quase lá… finalizando sua OA!",
    "Organizando tudo pra você 💙",
    "Preparando sua OA sob medida…",
  ];

  // (old gerarStatus effect removed - now unified in zapsignPopup)

  // ZapSign popup message cycling
  useEffect(() => {
    if (!openZapsignPopup || zapsignPopupStep === "done" || zapsignPopupStep === "erro") return;
    setZapsignPopupMsgIndex(0);
    const msgs = zapsignPopupStep === "gerando"
      ? (zapsignPopupContrato?.tipo === "OA" ? GERAR_MSGS_OA : GERAR_MSGS_CONTRATO)
      : zapsignPopupStep === "zapsign" ? ZAPSIGN_MSGS : WHATSAPP_MSGS;
    const interval = setInterval(() => {
      setZapsignPopupMsgIndex((prev) => (prev + 1) % msgs.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [openZapsignPopup, zapsignPopupStep]);

  // Contatos do cliente selecionado (para Termo de Aceite)
  const [contatosCliente, setContatosCliente] = useState<{ nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]>([]);
  const [enviandoWhatsapp, setEnviandoWhatsapp] = useState(false);

  async function syncZapsignStatuses(pendentes: any[], currentMap: Record<string, ZapSignRecord>) {
    const updatedMap = { ...currentMap };
    for (const zRec of pendentes) {
      try {
        const { data } = await supabase.functions.invoke("zapsign", {
          body: { action: "status", contrato_id: zRec.contrato_id },
        });
        if (data?.skippable) {
          // Token inválido / documento de outro token - atualizar localmente
          updatedMap[zRec.contrato_id] = {
            ...updatedMap[zRec.contrato_id],
            status: "Token Inválido",
          };
        } else if (data?.success && data.status !== zRec.status) {
          updatedMap[zRec.contrato_id] = {
            ...updatedMap[zRec.contrato_id],
            status: data.status,
            signers: data.signers,
          };
        }
      } catch {
        // silently skip
      }
    }
    setZapsignRecords(updatedMap);
  }

  async function loadData() {
    setLoading(true);
    const [{ data: contratosData, error: contratosError }, { data: filiaisData }, { data: paramsData }, { data: profilesData }] = await Promise.all([
      supabase
        .from("contratos")
        .select(`
          *,
          clientes(nome_fantasia, filial_id, razao_social, cnpj_cpf, inscricao_estadual, cidade, uf, cep, logradouro, numero, complemento, bairro, telefone, email, apelido, responsavel_nome),
          planos(nome, descricao, valor_mensalidade_padrao),
          pedidos(
            status_pedido, contrato_liberado, financeiro_status,
            valor_implantacao_final, valor_mensalidade_final,
            valor_implantacao_original, valor_mensalidade_original,
            valor_total, desconto_implantacao_tipo, desconto_implantacao_valor,
            desconto_mensalidade_tipo, desconto_mensalidade_valor,
            modulos_adicionais, observacoes, motivo_desconto,
            pagamento_mensalidade_observacao, pagamento_mensalidade_forma,
            pagamento_mensalidade_parcelas, pagamento_implantacao_observacao,
            pagamento_implantacao_forma, pagamento_implantacao_parcelas,
            filial_id, vendedor_id, tipo_pedido, servicos_pedido, tipo_atendimento
          )
        `)
        .order("numero_registro", { ascending: false }),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("filial_parametros").select("*"),
      supabase.from("profiles").select("user_id, full_name").eq("active", true),
    ]);
    if (contratosError) {
      toast.error("Erro ao carregar contratos: " + contratosError.message);
    }
    setContratos((contratosData || []) as unknown as Contrato[]);
    setFiliais((filiaisData || []) as Filial[]);
    // Indexar parâmetros por filial_id
    const paramsMap: Record<string, any> = {};
    (paramsData || []).forEach((p: any) => { paramsMap[p.filial_id] = p; });
    setFilialParametros(paramsMap);
    // Indexar profiles por user_id
    const pMap: Record<string, string> = {};
    (profilesData || []).forEach((p: any) => { pMap[p.user_id] = p.full_name; });
    setProfilesMap(pMap);
    setLoading(false);

    // Carregar registros ZapSign
    const { data: zapsignData } = await supabase
      .from("contratos_zapsign")
      .select("*");
    const zMap: Record<string, ZapSignRecord> = {};
    (zapsignData || []).forEach((z: any) => { zMap[z.contrato_id] = z as ZapSignRecord; });
    setZapsignRecords(zMap);

    // Sincronizar status dos contratos pendentes com ZapSign
    const pendentes = (zapsignData || []).filter(
      (z: any) => z.status === "Enviado" || z.status === "Pendente"
    );
    if (pendentes.length > 0) {
      syncZapsignStatuses(pendentes, zMap);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Default filial filter
  useEffect(() => {
    if (filterFilial === "_init_") {
      if (profile?.filial_favorita_id) {
        setFilterFilial(profile.filial_favorita_id);
      } else {
        setFilterFilial("all");
      }
    }
  }, [filialPadraoId, profile?.filial_favorita_id]);

  async function loadContatosCliente(clienteId: string) {
    const { data } = await supabase
      .from("cliente_contatos")
      .select("nome, telefone, decisor, ativo")
      .eq("cliente_id", clienteId)
      .eq("ativo", true);
    setContatosCliente((data || []) as { nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]);
  }

  async function handleOpenDetail(contrato: Contrato) {
    setSelected(contrato);
    setOpenDetail(true);
    setLinkedMessageTemplate(null);
    if (contrato.cliente_id) loadContatosCliente(contrato.cliente_id);
    // Load linked message template via document_template based on contract type
    const tipoTemplate = contrato.tipo === "OA" ? "ORDEM_ATENDIMENTO"
      : contrato.tipo === "Aditivo"
        ? (contrato.pedidos?.tipo_pedido === "Upgrade" ? "ADITIVO_UPGRADE" : "ADITIVO_MODULO")
        : contrato.tipo === "Cancelamento" ? "CANCELAMENTO"
        : "CONTRATO_BASE";
    try {
      const { data: docTemplate } = await supabase
        .from("document_templates")
        .select("message_template_id")
        .eq("tipo", tipoTemplate)
        .eq("ativo", true)
        .not("message_template_id", "is", null)
        .limit(1)
        .maybeSingle();
      if (docTemplate?.message_template_id) {
        const { data: msgTemplate } = await supabase
          .from("message_templates")
          .select("conteudo")
          .eq("id", docTemplate.message_template_id)
          .single();
        if (msgTemplate) setLinkedMessageTemplate(msgTemplate);
      }
    } catch { /* fallback to hardcoded */ }
  }

  const filtered = contratos.filter((c) => {
    if (filterFilial !== "all" && filterFilial !== "_init_" && c.clientes?.filial_id !== filterFilial) return false;
    if (filterStatus !== "all" && c.status !== filterStatus) return false;
    if (filterDe && c.created_at < filterDe) return false;
    if (filterAte && c.created_at > filterAte + "T23:59:59") return false;
    if (filterBusca.trim()) {
      const q = filterBusca.trim().toLowerCase();
      const nome = (c.clientes?.nome_fantasia || "").toLowerCase();
      const razao = (c.clientes?.razao_social || "").toLowerCase();
      const apelido = ((c.clientes as any)?.apelido || "").toLowerCase();
      const cnpj = (c.clientes?.cnpj_cpf || "").toLowerCase().replace(/\D/g, "");
      const qNum = q.replace(/\D/g, "");
      const numero = (c.numero_exibicao || "").toLowerCase();
      if (
        !nome.includes(q) &&
        !razao.includes(q) &&
        !apelido.includes(q) &&
        !numero.includes(q) &&
        !(qNum && cnpj.includes(qNum))
      ) return false;
    }
    return true;
  });

  const ativos = filtered.filter((c) => c.status === "Ativo").length;

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterFilial, filterStatus, filterDe, filterAte, filterBusca]);
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

  // ── Gerar Contrato + Auto ZapSign + WhatsApp ─────────────────────────────────
  async function handleGerarContrato(contrato: Contrato) {
    // Carregar contatos do cliente para WhatsApp (buscar direto para usar localmente)
    const { data: contatosFetched } = await supabase
      .from("cliente_contatos")
      .select("nome, telefone, decisor, ativo, email")
      .eq("cliente_id", contrato.cliente_id)
      .eq("ativo", true);
    const contatosLocais = (contatosFetched || []) as { nome: string; telefone: string | null; decisor: boolean; ativo: boolean; email: string | null }[];
    setContatosCliente(contatosLocais);

    // Abrir popup unificada com step "gerando"
    setZapsignPopupContrato(contrato);
    setZapsignPopupStep("gerando");
    setZapsignPopupMsgIndex(0);
    setZapsignPopupError(null);
    setOpenZapsignPopup(true);
    setGerando(true);

    try {
      // PASSO 1: Gerar PDF
      const { data, error } = await supabase.functions.invoke("gerar-contrato-pdf", {
        body: { contrato_id: contrato.id, action: "generate", tipo_documento: contrato.tipo },
      });

      if (error || data?.error || !data?.success) {
        setZapsignPopupStep("erro");
        setZapsignPopupError(data?.error || "Erro ao gerar contrato");
        setGerando(false);
        return;
      }

      // Atualizar estado local
      const updatedContrato = {
        ...contrato,
        status_geracao: "Gerado",
        pdf_url: data.storage_path,
      };
      setContratos((prev) =>
        prev.map((c) => (c.id === contrato.id ? updatedContrato : c))
      );
      if (selected?.id === contrato.id) {
        setSelected(updatedContrato);
      }
      setGerarSignedUrl(data.signed_url || null);
      setZapsignPopupContrato(updatedContrato);
      setGerando(false);

      // PASSO 2: Auto enviar para ZapSign
      setZapsignPopupStep("zapsign");
      setZapsignPopupMsgIndex(0);
      setEnviandoZapsign(true);

      const { data: zData, error: zError } = await supabase.functions.invoke("zapsign", {
        body: { action: "send", contrato_id: contrato.id },
      });
      if (zError || zData?.error) {
        setZapsignPopupStep("erro");
        setZapsignPopupError(zData?.error || "Erro ao enviar para ZapSign");
        setEnviandoZapsign(false);
        return;
      }

      // Atualizar registros locais
      setZapsignRecords((prev) => ({
        ...prev,
        [contrato.id]: {
          contrato_id: contrato.id,
          zapsign_doc_token: zData.doc_token,
          status: "Enviado",
          signers: zData.signers || [],
          sign_url: zData.signers?.[zData.signers.length - 1]?.sign_url || null,
        },
      }));

      // PDF foi apagado do storage pelo backend — limpar referência local
      const contratoSemPdf = { ...updatedContrato, pdf_url: null };
      setContratos((prev) =>
        prev.map((c) => (c.id === contrato.id ? contratoSemPdf : c))
      );
      if (selected?.id === contrato.id) {
        setSelected(contratoSemPdf);
      }
      setZapsignPopupContrato(contratoSemPdf);

      // PASSO 3: Auto enviar WhatsApp
      setZapsignPopupStep("whatsapp");
      setZapsignPopupMsgIndex(0);

      try {
        // Carregar linked message template
        const docTemplateType = contrato.tipo === "OA" ? "ORDEM_ATENDIMENTO"
          : contrato.tipo === "Aditivo"
            ? (contrato.pedidos?.tipo_pedido === "Upgrade" ? "ADITIVO_UPGRADE" : "ADITIVO_MODULO")
            : contrato.tipo === "Cancelamento" ? "CANCELAMENTO"
            : "CONTRATO_BASE";
        const { data: docTemplate } = await supabase
          .from("document_templates")
          .select("message_template_id")
          .eq("tipo", docTemplateType)
          .eq("ativo", true)
          .limit(1)
          .maybeSingle();

        let msgTemplate: { conteudo: string } | null = null;
        if (docTemplate?.message_template_id) {
          const { data: mt } = await supabase
            .from("message_templates")
            .select("conteudo")
            .eq("id", docTemplate.message_template_id)
            .maybeSingle();
          msgTemplate = mt;
        }
        if (msgTemplate) setLinkedMessageTemplate(msgTemplate);

        const signUrl = zData.signers?.[0]?.sign_url || "";
        const mensagem = gerarTermoAceite(updatedContrato, signUrl, msgTemplate || undefined, contatosLocais);

        // Verificar se decisor tem telefone

        const decisorContato = contatosLocais.find(c => c.decisor) || contatosLocais[0];
        if (!decisorContato?.telefone) {
          setZapsignPopupStep("done");
          setEnviandoZapsign(false);
          toast.info("ZapSign enviado! Decisor sem telefone para WhatsApp.");
          return;
        }

        const { error: whatsError } = await supabase.functions.invoke("evolution-api", {
          body: {
            action: "send_text",
            number: decisorContato.telefone,
            text: mensagem,
            template_id: docTemplate?.message_template_id || undefined,
          },
        });

        if (whatsError) throw whatsError;

        setZapsignPopupStep("done");
      } catch (whatsErr: any) {
        console.error("Erro WhatsApp:", whatsErr);
        setZapsignPopupStep("done");
        toast.warning("ZapSign enviado! Falha ao enviar WhatsApp: " + (whatsErr.message || ""));
      }
    } catch (err) {
      console.error("Erro no fluxo:", err);
      setZapsignPopupStep("erro");
      setZapsignPopupError("Erro inesperado no processo. Tente novamente.");
    } finally {
      setGerando(false);
      setEnviandoZapsign(false);
    }
  }

  // ── Baixar Contrato (gera nova signed URL) ─────────────────────────────────
  async function handleBaixarContrato(contrato: Contrato) {
    if (!contrato.pdf_url) return;
    setGerando(true);
    try {
      const { data, error } = await supabase.storage
        .from("contratos-pdf")
        .createSignedUrl(contrato.pdf_url, 3600);
      if (error || !data?.signedUrl) {
        toast.error("Erro ao gerar link de download.");
        return;
      }
      // Fetch as blob to force download (cross-origin URLs ignore the download attribute)
      const response = await fetch(data.signedUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `contrato-${contrato.numero_exibicao || contrato.numero_registro}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } finally {
      setGerando(false);
    }
  }

  // (handleEnviarZapSign removed - now integrated into handleGerarContrato)

  async function handleAtualizarStatusZapSign(contratoId: string) {
    try {
      const { data, error } = await supabase.functions.invoke("zapsign", {
        body: { action: "status", contrato_id: contratoId },
      });
      if (error || data?.error) {
        toast.error(data?.error || "Erro ao consultar status");
        return;
      }
      setZapsignRecords((prev) => ({
        ...prev,
        [contratoId]: {
          ...prev[contratoId],
          status: data.status,
          signers: data.signers || prev[contratoId]?.signers || [],
        },
      }));
      toast.success(`Status atualizado: ${data.status}`);
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
      toast.error("Erro ao consultar ZapSign");
    }
  }

  function getZapSignStatusBadge(status: string | undefined, contratoStatus?: string) {
    if (!status) return null;
    const canceladoBadge = contratoStatus === "Encerrado" ? (
      <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
        <XCircle className="h-3 w-3" />
        Cancelado
      </Badge>
    ) : null;

    if (status === "Assinado")
      return (
        <div className="flex flex-col gap-0.5 w-fit">
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Assinado
          </Badge>
          {canceladoBadge}
        </div>
      );
    if (status === "Recusado")
      return (
        <div className="flex flex-col gap-0.5 w-fit">
          <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
            <XCircle className="h-3 w-3" />
            Recusado
          </Badge>
          {canceladoBadge}
        </div>
      );
    if (status === "Enviado" || status === "Pendente")
      return (
        <div className="flex flex-col gap-0.5 w-fit">
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs flex items-center gap-1 w-fit">
            <Send className="h-3 w-3" />
            Enviado
          </Badge>
          <span className="text-[10px] text-amber-600 text-center w-full">Aguardando assinatura</span>
          {canceladoBadge}
        </div>
      );
    return (
      <div className="flex flex-col gap-0.5 w-fit">
        <Badge variant="secondary" className="text-xs w-fit">{status}</Badge>
        {canceladoBadge}
      </div>
    );
  }

  function getStatusBadge(status: string) {
    if (status === "Ativo")
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Ativo
        </Badge>
      );
    return (
      <Badge variant="secondary" className="text-xs flex items-center gap-1 w-fit">
        <MinusCircle className="h-3 w-3" />
        Encerrado
      </Badge>
    );
  }

  function getStatusGeracaoBadge(statusGeracao: string | null, contratoStatus?: string) {
    if (contratoStatus === "Encerrado") {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Cancelado
        </Badge>
      );
    }
    if (statusGeracao === "Gerado")
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs flex items-center gap-1 w-fit">
          <CheckCircle2 className="h-3 w-3" />
          Gerado
        </Badge>
      );
    return (
      <Badge variant="secondary" className="text-xs w-fit">
        Pendente
      </Badge>
    );
  }

  function getTipoBadge(tipo: string) {
    if (tipo === "Base")
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 text-xs flex items-center gap-1 w-fit">
          Base
        </Badge>
      );
    if (tipo === "Upgrade")
      return (
        <Badge className="bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400 text-xs flex items-center gap-1 w-fit">
          Upgrade
        </Badge>
      );
    if (tipo === "Aditivo")
      return (
        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs flex items-center gap-1 w-fit">
          <FilePen className="h-3 w-3" /> Aditivo
        </Badge>
      );
    if (tipo === "OA")
      return (
        <Badge className="bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400 text-xs flex items-center gap-1 w-fit">
          <FileOutput className="h-3 w-3" /> OA
        </Badge>
      );
    if (tipo === "Downgrade")
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 text-xs flex items-center gap-1 w-fit">
          Downgrade
        </Badge>
      );
    return <Badge variant="outline" className="text-xs w-fit">{tipo}</Badge>;
  }

  function getPedidoStatusBadges(contrato: Contrato) {
    if (!contrato.pedidos) return <span className="text-xs text-muted-foreground">—</span>;
    if (contrato.status === "Encerrado") {
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Cancelado
        </Badge>
      );
    }
    return (
      <div className="flex flex-col gap-1">
        {contrato.pedidos.financeiro_status === "Aprovado" && (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Aprovado
          </Badge>
        )}
        {contrato.pedidos.contrato_liberado && (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs flex items-center gap-1 w-fit">
            <CheckCircle2 className="h-3 w-3" />
            Liberado
          </Badge>
        )}
      </div>
    );
  }

  // ── Enviar WhatsApp via Evolution API (teste) ──
  async function handleEnviarWhatsapp(mensagem: string) {
    const decisor = contatosCliente.find(c => c.decisor) || contatosCliente[0];
    if (!decisor?.telefone) {
      toast.error("Decisor não possui telefone cadastrado");
      return;
    }

    setEnviandoWhatsapp(true);
    try {
      // Resolver template_id para roteamento de instância
      const selContrato = selected;
      const docType = selContrato?.tipo === "OA" ? "ORDEM_ATENDIMENTO"
        : selContrato?.tipo === "Aditivo"
          ? (selContrato?.pedidos?.tipo_pedido === "Upgrade" ? "ADITIVO_UPGRADE" : "ADITIVO_MODULO")
          : selContrato?.tipo === "Cancelamento" ? "CANCELAMENTO"
          : "CONTRATO_BASE";
      const { data: docTplEnvio } = await supabase
        .from("document_templates")
        .select("message_template_id")
        .eq("tipo", docType)
        .eq("ativo", true)
        .not("message_template_id", "is", null)
        .limit(1)
        .maybeSingle();

      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          number: decisor.telefone,
          text: mensagem,
          template_id: docTplEnvio?.message_template_id || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Mensagem enviada para ${decisor.nome} (${decisor.telefone})`);
    } catch (err: any) {
      toast.error("Erro ao enviar WhatsApp: " + (err.message || "Erro desconhecido"));
    } finally {
      setEnviandoWhatsapp(false);
    }
  }

  // ── Reenviar WhatsApp (para casos de falha no envio automático) ──
  async function handleReenviarWhatsapp(contrato: Contrato) {
    setReenviandoWhatsapp(true);
    try {
      // Carregar contatos do cliente
      const { data: contatos } = await supabase
        .from("cliente_contatos")
        .select("nome, email, telefone, decisor, ativo")
        .eq("cliente_id", contrato.cliente_id)
        .eq("ativo", true);

      const decisor = (contatos || []).find(c => c.decisor) || (contatos || [])[0];
      if (!decisor?.telefone) {
        toast.error("Decisor não possui telefone cadastrado");
        setReenviandoWhatsapp(false);
        return;
      }

      // Buscar sign_url do ZapSign
      const zRec = zapsignRecords[contrato.id];
      const signUrl = zRec?.signers?.[0]?.sign_url || "";

      // Resolver template_id do setor para roteamento de instância
      const docTemplateType = contrato.tipo === "OA" ? "OA"
        : contrato.tipo === "Aditivo"
          ? (contrato.pedidos?.tipo_pedido === "Upgrade" ? "ADITIVO_UPGRADE" : "ADITIVO_MODULO")
          : contrato.tipo === "Cancelamento" ? "CANCELAMENTO"
          : "CONTRATO_BASE";
      const { data: docTpl } = await supabase
        .from("document_templates")
        .select("message_template_id")
        .eq("tipo", docTemplateType)
        .eq("ativo", true)
        .not("message_template_id", "is", null)
        .limit(1)
        .maybeSingle();

      const mensagem = gerarTermoAceite(contrato, signUrl, undefined, (contatos || []) as any);

      const { error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          number: decisor.telefone,
          text: mensagem,
          template_id: docTpl?.message_template_id || undefined,
        },
      });

      if (error) throw error;
      toast.success(`WhatsApp reenviado para ${decisor.nome} (${decisor.telefone})`);
    } catch (err: any) {
      toast.error("Erro ao reenviar WhatsApp: " + (err.message || "Erro desconhecido"));
    } finally {
      setReenviandoWhatsapp(false);
    }
  }

  // ── Gerador de Termo de Aceite ──────────────────────────────────────────────
  function gerarTermoAceite(contrato: Contrato, linkAssinatura?: string, templateOverride?: { conteudo: string }, contatosOverride?: { nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]): string {
    const pedido = contrato.pedidos;
    const plano = contrato.planos;
    // FIX #1: Nome do vendedor do pedido, não do usuário logado
    const nomeVendedorPedido = pedido?.vendedor_id ? (profilesMap[pedido.vendedor_id] || profile?.full_name || "{vendedor}") : (profile?.full_name || "{vendedor}");
    const nomeUsuario = profile?.full_name || "{nome_usuario}";
    // FIX #3: Saudação baseada no horário
    const hora = new Date().getHours();
    const saudacao = hora >= 0 && hora < 12 ? "bom dia" : hora < 18 ? "boa tarde" : "boa noite";
    const nomeFantasia = contrato.clientes?.nome_fantasia || "{nome_fantasia}";
    const razaoSocial = contrato.clientes?.razao_social || "{razao_social}";
    const nomePlano = plano?.nome || "{plano}";
    const descricaoPlano = plano?.descricao || "";
    const modulosTexto = descricaoPlano
      ? descricaoPlano.split(",").map((m: string) => `• ${m.trim()}`).join("\n")
      : "";
    const valorMensBaseCheio = plano?.valor_mensalidade_padrao ?? 0;
    let valorMensBase = fmtBRL(valorMensBaseCheio);
    const adicionais = (pedido?.modulos_adicionais || []) as ModuloAdicionadoItem[];
    const totalAdicionais = adicionais.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
    const adicionaisTexto = adicionais.length > 0
      ? adicionais.map(m => `✔️ ${m.nome} (${m.quantidade}x ${fmtBRL(m.valor_mensalidade_modulo)}) - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}`).join("\n")
      : "";

    const impFinal = pedido?.valor_implantacao_final ?? 0;
    const mensFinal = pedido?.valor_mensalidade_final ?? 0;

    // Parâmetros da filial do pedido
    const filialId = pedido?.filial_id || "";
    const params = filialParametros[filialId] || {};
    const regrasMens = pedido?.pagamento_mensalidade_observacao || params.regras_padrao_mensalidade || "";
    const regrasImpl = pedido?.pagamento_implantacao_observacao || params.regras_padrao_implantacao || "";
    const parcelasCartao = params.parcelas_maximas_cartao;
    const pixDesconto = params.pix_desconto_percentual;

    // Nome do decisor
    const contatosEfetivos = contatosOverride || contatosCliente;
    const decisor = contatosEfetivos.find(c => c.decisor) || contatosEfetivos[0];
    const nomeDecisor = decisor?.nome || "{nome_decisor}";

    // Se há template vinculado, usa ele com substituição de variáveis
    const effectiveTemplate = templateOverride || linkedMessageTemplate;
    if (effectiveTemplate) {
      const formasPagamento = parcelasCartao || pixDesconto > 0
        ? `Formas disponíveis:${parcelasCartao ? `\n- Até ${parcelasCartao}x no cartão sem juros` : ""}${pixDesconto > 0 ? `\n- PIX ${pixDesconto}% desconto` : ""}`
        : "";
      const adicionaisBlock = adicionais.length > 0
        ? `🔘 *ADICIONAIS*\n\n${adicionaisTexto}\n\nTotal adicionais: ${fmtBRL(totalAdicionais)}`
        : "";

      // Variáveis específicas para aditivo de módulos adicionais
      const adicionaisNovosTexto = adicionais.length > 0
        ? adicionais.map(m => `• ${m.nome} (${m.quantidade}x) - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês`).join("\n")
        : "";
      const totalAdicionaisNovos = fmtBRL(totalAdicionais);

      // Variáveis específicas para upgrade de plano (buscar dados do contrato de origem)
      let planoNomeAnterior = "";
      let planoValorAnterior = "";
      let adicionaisAnterioresTexto = "";
      let valorAdicionaisAnteriores = "";
      let totalAnterior = "";
      let mensalidadeTotalUpgrade = mensFinal; // fallback: valor do pedido

      if (contrato.contrato_origem_id) {
        const contratoOrigem = contratos.find(c => c.id === contrato.contrato_origem_id);
        if (contratoOrigem) {
          // Para upgrade: buscar o plano vigente real (último upgrade ativo, se existir)
          const contratoBaseId = contrato.contrato_origem_id;
          let contratoPlanoVigente = contratoOrigem; // fallback: contrato base
          
          if (pedido?.tipo_pedido === "Upgrade") {
            // Buscar último upgrade ativo na hierarquia (excluindo o contrato atual)
            const upgradesAnteriores = contratos.filter(c =>
              c.status === "Ativo" &&
              c.id !== contrato.id &&
              c.contrato_origem_id === contratoBaseId &&
              c.pedidos?.tipo_pedido === "Upgrade" &&
              c.plano_id
            ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            if (upgradesAnteriores.length > 0) {
              contratoPlanoVigente = upgradesAnteriores[0];
            }
          }

          const planoAnterior = contratoPlanoVigente.planos;
          planoNomeAnterior = planoAnterior?.nome || "";
          const valorMensPlanoAntCheio = planoAnterior?.valor_mensalidade_padrao ?? 0;

          // Buscar adicionais da hierarquia do contrato de origem (apenas ativos)
          const contratosHierarquia = contratos.filter(c => 
            c.status === "Ativo" &&
            c.id !== contrato.id &&
            (c.id === contratoBaseId || c.contrato_origem_id === contratoBaseId)
          );
          const todosAdicionaisExistentes: ModuloAdicionadoItem[] = [];
          for (const c of contratosHierarquia) {
            const tipoPed = c.pedidos?.tipo_pedido;
            if (tipoPed === "Novo" || tipoPed === "Módulo Adicional" || tipoPed === "Aditivo") {
              const mods = (c.pedidos?.modulos_adicionais || []) as ModuloAdicionadoItem[];
              todosAdicionaisExistentes.push(...mods);
            }
          }
          const totalAdAnt = todosAdicionaisExistentes.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
          adicionaisAnterioresTexto = todosAdicionaisExistentes.length > 0
            ? todosAdicionaisExistentes.map(m => `• ${m.nome} (${m.quantidade}x) - ${fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês`).join("\n")
            : "Nenhum";
          valorAdicionaisAnteriores = todosAdicionaisExistentes.length > 0 ? fmtBRL(totalAdAnt) : fmtBRL(0);

          // Usar valor final do pedido vigente (com desconto) se disponível
          const pedidoVigente = contratoPlanoVigente.pedidos;
          const valorMensPlanoAntReal = pedidoVigente?.valor_mensalidade_final != null
            ? Number(pedidoVigente.valor_mensalidade_final)
            : valorMensPlanoAntCheio;
          const mensOrigVigente = pedidoVigente?.valor_mensalidade_original != null ? Number(pedidoVigente.valor_mensalidade_original) : valorMensPlanoAntCheio;
          const descontoMensBase = mensOrigVigente - valorMensPlanoAntReal;
          
          // planoValorAnterior com formato riscado se houver desconto
          const valorPlanoAntComDesconto = descontoMensBase > 0
            ? valorMensPlanoAntCheio - descontoMensBase
            : valorMensPlanoAntCheio;
          if (descontoMensBase > 0) {
            planoValorAnterior = `~${fmtBRL(valorMensPlanoAntCheio)}~ Desconto: ${fmtBRL(descontoMensBase)} — ${fmtBRL(valorPlanoAntComDesconto)}`;
            totalAnterior = `~${fmtBRL(valorMensPlanoAntCheio + totalAdAnt)}~ ${fmtBRL(valorPlanoAntComDesconto + totalAdAnt)}`;
          } else {
            planoValorAnterior = fmtBRL(valorMensPlanoAntCheio);
            totalAnterior = fmtBRL(valorMensPlanoAntCheio + totalAdAnt);
          }

          // Para upgrade: mensalidade total = novo plano + adicionais existentes - desconto
          if (pedido?.tipo_pedido === "Upgrade") {
            const novoPlanoMens = plano?.valor_mensalidade_padrao ?? 0;
            const novaMensTotal = novoPlanoMens + totalAdAnt;
            const descontoMens = (pedido?.valor_mensalidade_original ?? 0) - (pedido?.valor_mensalidade_final ?? 0);
            mensalidadeTotalUpgrade = descontoMens > 0 ? novaMensTotal - descontoMens : novaMensTotal;
          }
        }
      }

      // Variáveis de valor do plano com desconto para upgrade
      let planoValorFinal = fmtBRL(plano?.valor_mensalidade_padrao ?? 0);
      let planoDescontoTexto = "";
      let novoTotalDescontoTexto = "";
      let mensalidadeUpgradeComDesconto = "";
      if (pedido?.tipo_pedido === "Upgrade") {
        const novoPlanoMens = plano?.valor_mensalidade_padrao ?? 0;
        const descontoMens = (pedido?.valor_mensalidade_original ?? 0) - (pedido?.valor_mensalidade_final ?? 0);
        if (descontoMens > 0) {
          const planoComDesconto = novoPlanoMens - descontoMens;
          planoValorFinal = `~${fmtBRL(novoPlanoMens)}~ Desconto: ${fmtBRL(descontoMens)} — ${fmtBRL(planoComDesconto)}`;
          // Atualizar também valor_base para mostrar desconto no upgrade
          valorMensBase = `~${fmtBRL(novoPlanoMens)}~ Desconto: ${fmtBRL(descontoMens)} — ${fmtBRL(planoComDesconto)}`;
          planoDescontoTexto = `⚡ Desconto na mensalidade: ${fmtBRL(descontoMens)}`;
          novoTotalDescontoTexto = `~${fmtBRL(novoPlanoMens)}~ *${fmtBRL(planoComDesconto)}*`;
          // Total com adicionais existentes
          const totalAdAntUpgrade = contrato.contrato_origem_id
            ? (() => {
                const contratoOrigem = contratos.find(c => c.id === contrato.contrato_origem_id);
                if (!contratoOrigem) return 0;
                const contratoBaseId = contrato.contrato_origem_id;
                const contratosHierarquia = contratos.filter(c =>
                  c.status === "Ativo" && c.id !== contrato.id &&
                  (c.id === contratoBaseId || c.contrato_origem_id === contratoBaseId)
                );
                let total = 0;
                for (const c of contratosHierarquia) {
                  const tipoPed = c.pedidos?.tipo_pedido;
                  if (tipoPed === "Novo" || tipoPed === "Módulo Adicional" || tipoPed === "Aditivo") {
                    const mods = (c.pedidos?.modulos_adicionais || []) as ModuloAdicionadoItem[];
                    total += mods.reduce((s, m) => s + m.valor_mensalidade_modulo * m.quantidade, 0);
                  }
                }
                return total;
              })()
            : 0;
          const novoTotalComDesconto = planoComDesconto + totalAdAntUpgrade;
          const totalSemDesconto = novoPlanoMens + totalAdAntUpgrade;
          mensalidadeUpgradeComDesconto = `~${fmtBRL(totalSemDesconto)}~ Desconto: ${fmtBRL(descontoMens)} — *${fmtBRL(novoTotalComDesconto)}*`;
        }
      }

      // Variáveis de serviços (OA)
      const servicosPedido = (pedido?.servicos_pedido || []) as any[];
      const servicosListaTexto = servicosPedido.length > 0
        ? servicosPedido.map((s: any) => {
            const qty = s.quantidade || 1;
            const valor = s.valor_unitario || s.valor || 0;
            return `• ${s.nome} - ${qty}x ${s.unidade_medida || "un."} - ${fmtBRL(valor * qty)}`;
          }).join("\n")
        : "";
      const servicosValorTotal = fmtBRL(servicosPedido.reduce((sum: number, s: any) => sum + ((s.valor_unitario || s.valor || 0) * (s.quantidade || 1)), 0));
      const servicosQtdTotal = String(servicosPedido.reduce((sum: number, s: any) => sum + (s.quantidade || 1), 0));

      // Número do contrato de origem
      let numeroContratoOrigem = "";
      if (contrato.contrato_origem_id) {
        const cOrigem = contratos.find(c => c.id === contrato.contrato_origem_id);
        if (cOrigem) numeroContratoOrigem = cOrigem.numero_exibicao;
      }

      // FIX #2: Variáveis de desconto (original vs final)
      const impOriginal = pedido?.valor_implantacao_original ?? 0;
      const mensOriginal = pedido?.valor_mensalidade_original ?? 0;
      const descontoImpl = impOriginal - impFinal;
      const descontoMens = mensOriginal - mensFinal;
      const implantacaoComDesconto = descontoImpl > 0
        ? `~${fmtBRL(impOriginal)}~ *${fmtBRL(impFinal)}*`
        : `*${fmtBRL(impFinal)}*`;
      const mensalidadeComDesconto = descontoMens > 0
        ? `~${fmtBRL(mensOriginal)}~ *${fmtBRL(mensFinal)}*`
        : `*${fmtBRL(mensFinal)}*`;

      // FIX #4: Observações de pagamento do pedido (não formas disponíveis)
      const obsPagamentoImpl = pedido?.pagamento_implantacao_observacao || "";
      const obsPagamentoMens = pedido?.pagamento_mensalidade_observacao || "";

      return effectiveTemplate.conteudo
        .replace(/\{saudacao\}/g, saudacao)
        .replace(/\{contato\.nome\}/g, nomeDecisor)
        .replace(/\{nome_decisor\}/g, nomeDecisor)
        .replace(/\{cliente\.nome_fantasia\}/g, nomeFantasia)
        .replace(/\{cliente\.razao_social\}/g, razaoSocial)
        .replace(/\{contrato\.numero\}/g, contrato.numero_exibicao)
        .replace(/\{contrato\.numero_origem\}/g, numeroContratoOrigem)
        .replace(/\{plano\.nome\}/g, nomePlano)
        .replace(/\{plano\.nome_anterior\}/g, planoNomeAnterior)
        .replace(/\{plano\.modulos\}/g, modulosTexto)
        .replace(/\{plano\.valor_base\}/g, valorMensBase)
        .replace(/\{plano\.valor_final\}/g, planoValorFinal)
        .replace(/\{plano\.desconto_texto\}/g, planoDescontoTexto)
        .replace(/\{plano\.valor_com_desconto\}/g, novoTotalDescontoTexto || `*${valorMensBase}*`)
        .replace(/\{valores\.plano_anterior\}/g, planoValorAnterior)
        .replace(/\{modulos\.adicionais\}/g, adicionaisBlock)
        .replace(/\{modulos\.adicionais_novos\}/g, adicionaisNovosTexto)
        .replace(/\{modulos\.adicionais_anteriores\}/g, adicionaisAnterioresTexto)
        .replace(/\{valores\.total_adicionais_novos\}/g, totalAdicionaisNovos)
        .replace(/\{valores\.adicionais_anteriores\}/g, valorAdicionaisAnteriores)
        .replace(/\{valores\.total_anterior\}/g, totalAnterior)
        .replace(/\{valores\.implantacao\}/g, fmtBRL(impFinal))
        .replace(/\{valores\.implantacao_original\}/g, fmtBRL(impOriginal))
        .replace(/\{valores\.implantacao_com_desconto\}/g, implantacaoComDesconto)
        .replace(/\{valores\.mensalidade\}/g, fmtBRL(pedido?.tipo_pedido === "Upgrade" ? mensalidadeTotalUpgrade : mensFinal))
        .replace(/\{valores\.mensalidade_upgrade_com_desconto\}/g, mensalidadeUpgradeComDesconto || fmtBRL(pedido?.tipo_pedido === "Upgrade" ? mensalidadeTotalUpgrade : mensFinal))
        .replace(/\{valores\.mensalidade_original\}/g, fmtBRL(mensOriginal))
        .replace(/\{valores\.mensalidade_com_desconto\}/g, mensalidadeComDesconto)
        .replace(/\{valores\.desconto_implantacao\}/g, descontoImpl > 0 ? fmtBRL(descontoImpl) : "")
        .replace(/\{valores\.desconto_mensalidade\}/g, descontoMens > 0 ? fmtBRL(descontoMens) : "")
        .replace(/\{regras\.mensalidade\}/g, regrasMens)
        .replace(/\{regras\.implantacao\}/g, regrasImpl)
        .replace(/\{formas\.pagamento\}/g, formasPagamento)
        .replace(/\{link_assinatura\}/g, linkAssinatura || "{link_assinatura}")
        .replace(/\{servicos\.lista_html\}/g, servicosListaTexto)
        .replace(/\{servicos\.valor_total\}/g, servicosValorTotal)
        .replace(/\{servicos\.quantidade_total\}/g, servicosQtdTotal)
        .replace(/\{servicos\.tipo_atendimento\}/g, pedido?.tipo_atendimento || "")
        .replace(/\{pagamento\.observacoes\}/g, obsPagamentoMens || obsPagamentoImpl || "")
        .replace(/\{pagamento\.implantacao\.forma\}/g, pedido?.pagamento_implantacao_forma || "")
        .replace(/\{pagamento\.implantacao\.parcelas\}/g, pedido?.pagamento_implantacao_parcelas ? `${pedido.pagamento_implantacao_parcelas}x` : "")
        .replace(/\{pagamento\.implantacao\.observacao\}/g, obsPagamentoImpl)
        .replace(/\{pagamento\.mensalidade\.forma\}/g, pedido?.pagamento_mensalidade_forma || "")
        .replace(/\{pagamento\.mensalidade\.parcelas\}/g, pedido?.pagamento_mensalidade_parcelas ? `${pedido.pagamento_mensalidade_parcelas}x` : "")
        .replace(/\{pagamento\.mensalidade\.observacao\}/g, obsPagamentoMens)
        .replace(/\{desconto\.oa_html\}/g, (() => {
          const descImpl2 = impOriginal - impFinal;
          if (descImpl2 <= 0) return "";
          let txt = `⚡ *Desconto:* ~${fmtBRL(impOriginal)}~ → *${fmtBRL(impFinal)}* (economia de ${fmtBRL(descImpl2)})`;
          if (pedido?.motivo_desconto) txt += `\n📋 *Motivo:* ${pedido.motivo_desconto}`;
          return txt;
        })())
        .replace(/\{pedido\.observacoes_geral\}/g, pedido?.observacoes || "")
        .replace(/\{empresa\.nome\}/g, "Softplus Tecnologia")
        .replace(/\{vendedor\.nome\}/g, nomeVendedorPedido)
        .replace(/\{usuario\.nome\}/g, nomeUsuario);
    }

    // Fallback hardcoded
    const impOrigFb = pedido?.valor_implantacao_original ?? 0;
    const mensOrigFb = pedido?.valor_mensalidade_original ?? 0;
    const descImplFb = impOrigFb - impFinal;
    const descMensFb = mensOrigFb - mensFinal;
    const obsImplFb = pedido?.pagamento_implantacao_observacao || "";
    const obsMensFb = pedido?.pagamento_mensalidade_observacao || "";

    return `Olá ${nomeDecisor}, ${saudacao}!

Tudo bem?

Me chamo *${nomeUsuario}*, sou do financeiro da Softplus Tecnologia. 

Primeiro queria agradecer por ter escolhido nosso sistema para auxiliar nos processos da *${nomeFantasia}*. 

Saiba que vamos nos empenhar ao máximo para que tudo corra como o esperado. ☺️💙

Passando para alinhar o que ficou acertado com ${nomeVendedorPedido}:

☑️ *Módulos Contratados*

Plano ${nomePlano}${modulosTexto ? "\n" + modulosTexto : ""}

Valor base do plano: ${valorMensBase}${adicionais.length > 0 ? `\n\n🔘 *ADICIONAIS*\n\n${adicionaisTexto}\n\nTotal adicionais: ${fmtBRL(totalAdicionais)}` : ""}

*MENSALIDADE TOTAL*

${descMensFb > 0 ? `~${fmtBRL(mensOrigFb)}~\n` : ""}*${fmtBRL(mensFinal)}*

${obsMensFb || "Valor pré-pago."}${regrasMens ? "\n" + regrasMens : ""}

*IMPLANTAÇÃO E TREINAMENTO*

${descImplFb > 0 ? `~${fmtBRL(impOrigFb)}~\n` : ""}*${fmtBRL(impFinal)}*${obsImplFb ? "\n" + obsImplFb : ""}${regrasImpl ? "\n" + regrasImpl : ""}

✍️ *TERMO DE ACEITE:*

${linkAssinatura || "{link_assinatura}"}

Implantação confirmada para:

{datas_implantacao}

Os boletos referentes à implantação e primeira mensalidade foram enviados por e-mail.

Caso prefira, posso encaminhar novamente.

Estou à disposição.`;
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
              <Button variant="outline" size="sm" className="gap-1.5" onClick={openRetroativoDialog}>
                <FilePen className="h-4 w-4" />
                Cadastrar Retroativo
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              title="Atualizar status de assinaturas"
              disabled={syncingStatuses}
              onClick={async () => {
                setSyncingStatuses(true);
                try {
                  const { data: zapsignData } = await supabase.from("contratos_zapsign").select("*");
                  const zMap: Record<string, ZapSignRecord> = {};
                  (zapsignData || []).forEach((z: any) => { zMap[z.contrato_id] = z as ZapSignRecord; });
                  const pendentes = (zapsignData || []).filter(
                    (z: any) => z.status === "Enviado" || z.status === "Pendente"
                  );
                  if (pendentes.length > 0) {
                    await syncZapsignStatuses(pendentes, zMap);
                    toast.success("Status das assinaturas atualizados!");
                  } else {
                    setZapsignRecords(zMap);
                    toast.info("Nenhum contrato pendente de assinatura.");
                  }
                } catch {
                  toast.error("Erro ao sincronizar status.");
                } finally {
                  setSyncingStatuses(false);
                }
              }}
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
        <Dialog open={openDetail} onOpenChange={setOpenDetail}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="contrato-desc">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                Contrato {selected.numero_exibicao || `#${selected.numero_registro}`}
              </DialogTitle>
              <DialogDescription id="contrato-desc">
                Detalhes completos do contrato selecionado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 text-sm">
              {/* Dados básicos */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div>
                  <p className="text-muted-foreground text-xs">Número</p>
                  <p className="font-mono font-semibold">
                    {selected.numero_exibicao || `#${selected.numero_registro}`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  {getStatusBadge(selected.status)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Cliente</p>
                  <p className="font-semibold">{selected.clientes?.nome_fantasia || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Plano</p>
                  <p className="font-semibold">{selected.planos?.nome || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Tipo</p>
                  {getTipoBadge(selected.tipo)}
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Data de criação</p>
                  <p>
                    {format(new Date(selected.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {/* Contratos vinculados (aditivos do contrato base) */}
              {(() => {
                const vinculados = contratos.filter(c => c.contrato_origem_id === selected.id);
                if (vinculados.length === 0) return null;
                return (
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contratos Vinculados</p>
                    <div className="rounded-lg border border-border divide-y divide-border">
                      {vinculados.map(v => (
                        <button
                          key={v.id}
                          type="button"
                          className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => { setSelected(v); }}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold">{v.numero_exibicao}</span>
                            {getTipoBadge(v.tipo)}
                            {v.pedidos?.tipo_pedido && (
                              <span className="text-muted-foreground">
                                {v.pedidos.tipo_pedido === "Upgrade" ? "↑ Upgrade de Plano" : v.pedidos.tipo_pedido === "Aditivo" ? "＋ Módulos Adicionais" : v.pedidos.tipo_pedido === "OA" ? "📋 Ordem de Atendimento" : v.pedidos.tipo_pedido}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(v.status)}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Dados do pedido vinculado */}
              {selected.pedidos && (() => {
                const p = selected.pedidos!;
                const adicionais = (p.modulos_adicionais || []) as ModuloAdicionadoItem[];
                const hasDescImp = p.desconto_implantacao_valor > 0;
                const hasDescMens = p.desconto_mensalidade_valor > 0;

                return (
                  <div className="border-t border-border pt-4 space-y-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Valores do Pedido</p>

                    {/* Valores */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Implantação</p>
                        {hasDescImp && (
                          <p className="text-xs line-through text-muted-foreground">{fmtBRL(p.valor_implantacao_original)}</p>
                        )}
                        <p className="font-semibold text-foreground">{fmtBRL(p.valor_implantacao_final)}</p>
                        {hasDescImp && (
                          <p className="text-xs text-emerald-600">
                            Desconto: {p.desconto_implantacao_tipo === "%" ? `${p.desconto_implantacao_valor}%` : fmtBRL(p.desconto_implantacao_valor)}
                          </p>
                        )}
                      </div>
                      <div className="rounded-lg bg-muted/40 p-3 space-y-0.5">
                        <p className="text-xs text-muted-foreground">Mensalidade</p>
                        {hasDescMens && (
                          <p className="text-xs line-through text-muted-foreground">{fmtBRL(p.valor_mensalidade_original)}</p>
                        )}
                        <p className="font-semibold text-foreground">{fmtBRL(p.valor_mensalidade_final)}</p>
                        {hasDescMens && (
                          <p className="text-xs text-emerald-600">
                            Desconto: {p.desconto_mensalidade_tipo === "%" ? `${p.desconto_mensalidade_valor}%` : fmtBRL(p.desconto_mensalidade_valor)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/20 p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Valor Total</span>
                      <span className="font-bold text-foreground">{fmtBRL(p.valor_total)}</span>
                    </div>

                    {/* Módulos adicionais */}
                    {adicionais.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Módulos Adicionais</p>
                        <div className="rounded-lg border border-border divide-y divide-border">
                          {adicionais.map((m, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2 text-xs">
                              <span className="text-foreground">{m.nome} <span className="text-muted-foreground">× {m.quantidade}</span></span>
                              <span className="font-medium">{fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}/mês</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {p.observacoes && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Observações</p>
                        <p className="text-xs text-foreground bg-muted/40 rounded-lg p-3">{p.observacoes}</p>
                      </div>
                    )}

                    {/* Status do pedido */}
                    <div className="flex flex-wrap gap-1.5">
                      {selected.status === "Encerrado" ? (
                        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">
                          Cancelado
                        </Badge>
                      ) : (
                        <>
                          {p.financeiro_status === "Aprovado" && (
                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">
                              ✓ Aprovado Financeiro
                            </Badge>
                          )}
                          {p.contrato_liberado ? (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 text-xs">
                              Contrato Liberado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Contrato Pendente
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Mensagem — Termo de Aceite / OA — apenas admin/financeiro */}
              {canManage && selected.pedidos && (() => {
                const zRec = zapsignRecords[selected.id];
                const linkAssinatura = zRec?.signers?.[1]?.sign_url || zRec?.signers?.[0]?.sign_url || undefined;
                const mensagem = gerarTermoAceite(selected, linkAssinatura);
                const isOA = selected.tipo === "OA";
                const msgLabel = isOA ? "Mensagem — Ordem de Atendimento" : "Mensagem — Termo de Aceite";
                return (
                  <div className="border-t border-border pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{msgLabel}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => {
                          navigator.clipboard.writeText(mensagem);
                          toast.success("Mensagem copiada!");
                        }}
                      >
                        📋 Copiar
                      </Button>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/40 p-3 max-h-64 overflow-y-auto">
                      <pre className="text-xs whitespace-pre-wrap font-sans text-foreground leading-relaxed">{mensagem}</pre>
                    </div>
                    {!linkAssinatura && (
                      <p className="text-xs text-muted-foreground">
                        💡 Envie o contrato para assinatura eletrônica para preencher automaticamente o <code className="bg-muted px-1 rounded">{"{link_assinatura}"}</code>. Substitua <code className="bg-muted px-1 rounded">{"{datas_implantacao}"}</code> antes de enviar.
                      </p>
                    )}
                    {linkAssinatura && (
                      <p className="text-xs text-muted-foreground">
                        ✅ Link de assinatura preenchido automaticamente. Substitua <code className="bg-muted px-1 rounded">{"{datas_implantacao}"}</code> antes de enviar.
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 mt-2"
                      disabled={enviandoWhatsapp}
                      onClick={() => handleEnviarWhatsapp(mensagem)}
                    >
                      {enviandoWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {enviandoWhatsapp ? "Enviando..." : "Enviar WhatsApp"}
                    </Button>
                  </div>
                );
              })()}

              {/* Ações de Contrato */}
              <div className="border-t border-border pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{selected.tipo === "OA" ? "Documento da OA" : "Documento do Contrato"}</p>
                  {getStatusGeracaoBadge(selected.status_geracao)}
                </div>

                {/* Se já enviado para ZapSign — mostrar link e bloquear ações */}
                {zapsignRecords[selected.id] ? (
                  <div className="space-y-2">
                    <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        📄 Documento enviado para assinatura. Visualize pelo link abaixo:
                      </p>
                      {zapsignRecords[selected.id].sign_url && (
                        <div className="flex gap-2">
                          <Button
                            variant="default"
                            className="flex-1 gap-2"
                            onClick={() => window.open(zapsignRecords[selected.id].sign_url!, "_blank")}
                          >
                            <ExternalLink className="h-4 w-4" />
                            Visualizar Documento
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              navigator.clipboard.writeText(zapsignRecords[selected.id].sign_url!);
                              toast.success("Link copiado!");
                            }}
                          >
                            <ClipboardCopy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {podeRegerarContrato ? (
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          className="flex-1 gap-2"
                          onClick={() => handleGerarContrato(selected)}
                          disabled={gerando}
                        >
                          {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          {selected.tipo === "OA" ? "Regerar OA" : "Regerar Contrato"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        🔒 Geração e reenvio bloqueados — documento já registrado na ZapSign.
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleGerarContrato(selected)}
                        disabled={gerando}
                      >
                        {gerando ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileOutput className="h-4 w-4 mr-2" />
                        )}
                        {selected.tipo === "OA"
                          ? (selected.status_geracao === "Gerado" ? "Regerar OA" : "Gerar OA")
                          : (selected.status_geracao === "Gerado" ? "Regerar Contrato" : "Gerar Contrato")}
                      </Button>

                      {selected.status_geracao === "Gerado" && selected.pdf_url && (
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => handleBaixarContrato(selected)}
                          disabled={gerando}
                        >
                          {gerando ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          {selected.tipo === "OA" ? "Baixar OA" : "Baixar Contrato"}
                        </Button>
                      )}
                    </div>

                    {selected.status_geracao === "Gerado" && (
                      <p className="text-xs text-muted-foreground">
                        💡 {selected.tipo === "OA" ? "OA gerada" : "Contrato gerado"} em PDF e pronto para download.
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Comentários Internos do Pedido */}
              {selected.pedido_id && (
                <div className="border-t border-border pt-4">
                  <PedidoComentarios pedidoId={selected.pedido_id} />
                </div>
              )}

              {/* Cancelar */}
              {canManage && selected.status === "Ativo" && (
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => { setOpenDetail(false); setOpenEncerrar(true); }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancelar Contrato
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Encerrar AlertDialog */}
      <AlertDialog open={openEncerrar} onOpenChange={(open) => { setOpenEncerrar(open); if (!open) setMotivoCancelamento(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar contrato?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação cancelará o contrato{" "}
              <strong>{selected?.numero_exibicao}</strong> do cliente{" "}
              <strong>{selected?.clientes?.nome_fantasia}</strong>. Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo do cancelamento</label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
              placeholder="Informe o motivo do cancelamento..."
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEncerrar}
              disabled={processando || !motivoCancelamento.trim()}
            >
              {processando ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancelar Projeto vinculado Dialog */}
      <Dialog open={openCancelarProjeto} onOpenChange={(open) => { if (!open) { setOpenCancelarProjeto(false); setCancelarProjetoMotivo(""); setProjetosAtivos([]); } }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Projeto encontrado no Painel
            </DialogTitle>
            <DialogDescription>
              Este contrato possui projeto(s) ativo(s) no painel de atendimento. O que deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {projetosAtivos.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-3 text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{(p.clientes as any)?.nome_fantasia}</span>
                  <Badge variant="outline" className="text-xs">{p.tipo_operacao}</Badge>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Etapa atual: <strong className="text-foreground">{(p.painel_etapas as any)?.nome || "Desconhecida"}</strong></span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              variant="destructive"
              onClick={handleCancelarProjetosVinculados}
              disabled={processando}
              className="w-full"
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Sim, excluir do painel
            </Button>
            <Button
              variant="outline"
              onClick={handleManterProjetoComTagCancelado}
              disabled={processando}
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Tag className="h-4 w-4 mr-2" />}
              Não, manter com tag "Cancelado"
            </Button>
            <Button variant="ghost" onClick={() => { setOpenCancelarProjeto(false); setCancelarProjetoMotivo(""); setProjetosAtivos([]); }} className="w-full text-muted-foreground">
              Ignorar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Agendamentos de Projeto Cancelado Dialog */}
      <Dialog open={agendamentosCancelOpen} onOpenChange={(open) => { if (!open) { setAgendamentosCancelOpen(false); setAgendamentosCancelados([]); } }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <CalendarDays className="h-5 w-5" />
              Compromissos Agendados
            </DialogTitle>
            <DialogDescription>
              Existem {agendamentosCancelados.length} compromisso(s) agendado(s) para o(s) projeto(s) cancelado(s). Deseja removê-los da agenda?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {agendamentosCancelados.map((ag: any) => (
              <div key={ag.id} className="rounded-md border border-border p-2.5 text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{new Date(ag.data + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                </div>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {(ag.painel_atendimento as any)?.clientes?.nome_fantasia || ""} — {(ag.painel_atendimento as any)?.contratos?.numero_exibicao || ""}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Button
              variant="destructive"
              onClick={handleRemoverAgendamentosCancelados}
              disabled={removendoAgendamentos}
              className="w-full"
            >
              {removendoAgendamentos ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Remover todos os compromissos
            </Button>
            <Button
              variant="outline"
              onClick={() => { setAgendamentosCancelOpen(false); setAgendamentosCancelados([]); }}
              className="w-full"
            >
              Manter compromissos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancelar Aditivos Vinculados Dialog */}
      <Dialog open={openCancelarAditivos} onOpenChange={(open) => {
        if (!open) {
          handleManterTodosAtivos();
        }
      }}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Cancelar contratos vinculados?
            </DialogTitle>
            <DialogDescription>
              O contrato base <strong>{contratoBaseCancelado?.numero_exibicao}</strong> foi cancelado. Existem{" "}
              <strong>{aditivosVinculados.length}</strong> contrato(s) vinculado(s) ativo(s). Selecione quais deseja cancelar também:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {aditivosVinculados.map((aditivo) => (
              <label
                key={aditivo.id}
                className="flex items-center gap-3 rounded-md border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={aditivosSelecionados.includes(aditivo.id)}
                  onCheckedChange={(checked) => {
                    setAditivosSelecionados(prev =>
                      checked
                        ? [...prev, aditivo.id]
                        : prev.filter(id => id !== aditivo.id)
                    );
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-sm">{aditivo.numero_exibicao}</span>
                    {getTipoBadge(aditivo.tipo)}
                  </div>
                  {aditivo.pedidos?.tipo_pedido && (
                    <span className="text-xs text-muted-foreground">
                      {aditivo.pedidos.tipo_pedido === "Upgrade" ? "↑ Upgrade de Plano" : aditivo.pedidos.tipo_pedido === "Aditivo" ? "＋ Módulos Adicionais" : aditivo.pedidos.tipo_pedido === "OA" ? "📋 Ordem de Atendimento" : aditivo.pedidos.tipo_pedido}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  title="Visualizar contrato"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleOpenDetail(aditivo);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={handleManterTodosAtivos} disabled={processando}>
              Manter todos ativos
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelarAditivosSelecionados}
              disabled={aditivosSelecionados.length === 0 || processando}
            >
              {processando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancelar {aditivosSelecionados.length} selecionado(s)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* (Old generation popup removed - now unified in ZapSign popup below) */}

      {/* ZapSign Detail Dialog */}
      {zapsignDetailContrato && zapsignRecords[zapsignDetailContrato.id] && (
        <Dialog open={openZapsignDetail} onOpenChange={setOpenZapsignDetail}>
          <DialogContent className="max-w-md" aria-describedby="zapsign-desc">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Send className="h-5 w-5 text-primary" />
                ZapSign — {zapsignDetailContrato.numero_exibicao}
              </DialogTitle>
              <DialogDescription id="zapsign-desc" className="sr-only">
                Detalhes da assinatura no ZapSign
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getZapSignStatusBadge(zapsignRecords[zapsignDetailContrato.id].status)}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Signatários</p>
                {zapsignRecords[zapsignDetailContrato.id].signers.map((signer, i) => (
                  <div key={i} className="rounded-lg border border-border p-3 space-y-1">
                    <span className="text-sm font-medium">{signer.name}</span>
                    {signer.email && <p className="text-xs text-muted-foreground">{signer.email}</p>}
                    {signer.sign_url && (
                      <div className="flex gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => {
                            navigator.clipboard.writeText(signer.sign_url);
                            toast.success("Link copiado!");
                          }}
                        >
                          <ClipboardCopy className="h-3 w-3" />
                          Copiar Link
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs gap-1"
                          onClick={() => window.open(signer.sign_url, "_blank")}
                        >
                          <ExternalLink className="h-3 w-3" />
                          Abrir
                        </Button>
                      </div>
                    )}
                    <div className="pt-1">
                      {(() => {
                        const s = signer.status?.toLowerCase();
                        if (s === "signed")
                          return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">Assinado</Badge>;
                        if (s === "refused" || s === "canceled")
                          return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">Recusado</Badge>;
                        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 text-xs">Aguardando assinatura</Badge>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  onClick={() => handleAtualizarStatusZapSign(zapsignDetailContrato.id)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Atualizar Status
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-1"
                  disabled={reenviandoWhatsapp}
                  onClick={() => handleReenviarWhatsapp(zapsignDetailContrato)}
                >
                  {reenviandoWhatsapp ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Reenviar WhatsApp
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Popup ZapSign + WhatsApp Animada ──────────────────────────── */}
      <Dialog
        open={openZapsignPopup}
        onOpenChange={(open) => {
          if (zapsignPopupStep === "done" || zapsignPopupStep === "erro") setOpenZapsignPopup(open);
        }}
      >
        <DialogContent className="max-w-sm" aria-describedby="zapsign-popup-desc" onPointerDownOutside={(e) => {
          if (zapsignPopupStep !== "done" && zapsignPopupStep !== "erro") e.preventDefault();
        }} onEscapeKeyDown={(e) => {
          if (zapsignPopupStep !== "done" && zapsignPopupStep !== "erro") e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              {zapsignPopupStep === "gerando" ? (
                <FileOutput className="h-5 w-5 text-primary" />
              ) : (
                <Send className="h-5 w-5 text-primary" />
              )}
              {zapsignPopupStep === "gerando"
                ? (zapsignPopupContrato?.tipo === "OA" ? "Gerando OA" : "Gerando Contrato")
                : zapsignPopupStep === "whatsapp" ? "Enviando WhatsApp"
                : zapsignPopupStep === "done" ? "Tudo pronto!"
                : zapsignPopupStep === "erro" ? "Erro"
                : "Enviando para ZapSign"}
            </DialogTitle>
            <DialogDescription id="zapsign-popup-desc" className="sr-only">
              Progresso da geração, envio para assinatura e notificação
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex flex-col items-center gap-5">
            {/* Passo 0: Gerando PDF */}
            {zapsignPopupStep === "gerando" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/10 animate-ping" />
                  <span className="absolute inline-flex h-14 w-14 rounded-full bg-primary/20 animate-ping [animation-delay:0.3s]" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/30">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">
                    {zapsignPopupContrato?.tipo === "OA" ? "Gerando OA…" : "Gerando contrato…"}
                  </p>
                  <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[1.5rem]">
                    {(zapsignPopupContrato?.tipo === "OA" ? GERAR_MSGS_OA : GERAR_MSGS_CONTRATO)[zapsignPopupMsgIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* Passo 1: ZapSign */}
            {zapsignPopupStep === "zapsign" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-primary/10 animate-ping" />
                  <span className="absolute inline-flex h-14 w-14 rounded-full bg-primary/20 animate-ping [animation-delay:0.3s]" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-primary/15 border-2 border-primary/30">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Enviando para ZapSign…</p>
                  <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[1.5rem]">
                    {ZAPSIGN_MSGS[zapsignPopupMsgIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* Passo 2: WhatsApp */}
            {zapsignPopupStep === "whatsapp" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-emerald-500/10 animate-ping" />
                  <span className="absolute inline-flex h-14 w-14 rounded-full bg-emerald-500/20 animate-ping [animation-delay:0.3s]" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700">
                    <Loader2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Disparando WhatsApp…</p>
                  <p className="text-sm text-muted-foreground transition-all duration-500 min-h-[2.5rem]">
                    {WHATSAPP_MSGS[zapsignPopupMsgIndex]}
                  </p>
                </div>
              </div>
            )}

            {/* Concluído */}
            {zapsignPopupStep === "done" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="relative flex items-center justify-center">
                  <span className="absolute inline-flex h-20 w-20 rounded-full bg-emerald-500/10" />
                  <div className="relative flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border-2 border-emerald-300 dark:border-emerald-700">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="font-semibold text-foreground text-base">
                    ✅ Tudo pronto!
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    🤖 O Flowy acabou de disparar a mensagem no WhatsApp do cliente!
                  </p>
                </div>

                <Button
                  className="w-full gap-2 mt-2"
                  onClick={() => setOpenZapsignPopup(false)}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Fechar
                </Button>
              </div>
            )}

            {/* Erro */}
            {zapsignPopupStep === "erro" && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-destructive/10 border-2 border-destructive/30">
                  <XCircle className="h-8 w-8 text-destructive" />
                </div>
                <div className="text-center space-y-1">
                  <p className="font-semibold text-foreground">Falha no envio</p>
                  <p className="text-xs text-muted-foreground">
                    {zapsignPopupError || "Erro inesperado. Tente novamente."}
                  </p>
                </div>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => setOpenZapsignPopup(false)}
                >
                  Fechar
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* Dialog Cadastro Retroativo */}
      <Dialog open={openRetroativo} onOpenChange={setOpenRetroativo}>
        <DialogContent className="max-w-2xl flex flex-col h-[90vh] p-0 gap-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
            <DialogTitle>Cadastrar Contrato Retroativo</DialogTitle>
            <DialogDescription>
              Registre um contrato existente sem gerar documento, ZapSign ou WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* ── Cliente ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Cliente *</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                  onClick={() => { setRetroClienteForm(emptyRetroClienteForm); setRetroClienteContatos([]); setOpenRetroClienteDialog(true); }}>
                  <UserPlus className="h-3.5 w-3.5" /> Novo cliente
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  className="pl-9 pr-8"
                  placeholder={retroForm.cliente_id ? retroClientes.find(c => c.id === retroForm.cliente_id)?.nome_fantasia || "Cliente selecionado" : "Buscar cliente pelo nome ou CNPJ..."}
                  value={retroClienteSearch}
                  autoComplete="off"
                  onFocus={() => setRetroClienteSearchFocused(true)}
                  onBlur={() => setTimeout(() => setRetroClienteSearchFocused(false), 300)}
                  onChange={(e) => {
                    setRetroClienteSearch(e.target.value);
                    if (!e.target.value && retroForm.cliente_id) setRetroForm(f => ({ ...f, cliente_id: "" }));
                  }}
                />
                {retroForm.cliente_id && (
                  <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => { setRetroForm(f => ({ ...f, cliente_id: "" })); setRetroClienteSearch(""); }}>
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
                {retroClienteSearchFocused && retroClienteSearch.trim() && !retroForm.cliente_id && (() => {
                  const q = retroClienteSearch.trim().toLowerCase();
                  const qNum = q.replace(/\D/g, "");
                  const filtered = retroClientes.filter(c =>
                    c.nome_fantasia.toLowerCase().includes(q) ||
                    (c.razao_social || "").toLowerCase().includes(q) ||
                    (qNum.length > 0 && (c.cnpj_cpf || "").replace(/\D/g, "").includes(qNum))
                  );
                  return (
                    <div className="absolute z-[9999] top-full mt-1 left-0 right-0 bg-background border border-border rounded-md shadow-xl max-h-52 overflow-y-auto">
                      {filtered.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum cliente encontrado</div>
                      ) : filtered.slice(0, 20).map(c => (
                        <button key={c.id} type="button"
                          className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b border-border last:border-0"
                          onMouseDown={(e) => { e.preventDefault(); setRetroForm(f => ({ ...f, cliente_id: c.id })); setRetroClienteSearch(""); setRetroClienteSearchFocused(false); }}>
                          <div className="font-medium text-foreground">{c.nome_fantasia}</div>
                          {c.cnpj_cpf && <div className="text-xs text-muted-foreground font-mono">{c.cnpj_cpf}</div>}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
              {retroForm.cliente_id && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {retroClientes.find(c => c.id === retroForm.cliente_id)?.nome_fantasia} selecionado
                </p>
              )}
            </div>

            {/* ── Data de Lançamento + Vendedor + Filial ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Data de Lançamento *</Label>
                <Input type="date" value={retroForm.data_lancamento} onChange={(e) => setRetroForm(f => ({ ...f, data_lancamento: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Vendedor *</Label>
                <Select value={retroForm.vendedor_id || "_none"} onValueChange={(v) => setRetroForm(f => ({ ...f, vendedor_id: v === "_none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Selecione...</SelectItem>
                    {retroVendedores.map(v => (
                      <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Filial *</Label>
                <Select value={retroForm.filial_id || "_none"} onValueChange={(v) => setRetroForm(f => ({ ...f, filial_id: v === "_none" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none" disabled>Selecione...</SelectItem>
                    {filiais.filter(f => f.ativa).map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Plano ── */}
            <div className="space-y-1.5">
              <Label>Plano</Label>
              <Select value={retroForm.plano_id || "_none"} onValueChange={(v) => setRetroForm(f => ({ ...f, plano_id: v === "_none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano (opcional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhum</SelectItem>
                  {retroPlanos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nome} {p.valor_mensalidade_padrao ? `— ${fmtBRL(p.valor_mensalidade_padrao)}/mês` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── Tipo + Status ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={retroForm.tipo} onValueChange={(v) => setRetroForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Base">Base</SelectItem>
                    <SelectItem value="Aditivo">Aditivo</SelectItem>
                    <SelectItem value="OA">OA</SelectItem>
                    <SelectItem value="Cancelamento">Cancelamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={retroForm.status} onValueChange={(v) => setRetroForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Encerrado">Encerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ── Segmento ── */}
            <div className="space-y-1.5">
              <Label>Segmento *</Label>
              <Select value={retroForm.segmento_id || "_none"} onValueChange={(v) => setRetroForm(f => ({ ...f, segmento_id: v === "_none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none" disabled>Selecione...</SelectItem>
                  {retroSegmentos.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {retroForm.cliente_id && retroSegmentos.length === 0 && (
                <p className="text-xs text-amber-600">Nenhum segmento cadastrado para a filial deste cliente. Cadastre em Filiais → CRM.</p>
              )}
            </div>

            {/* ── Módulos Adicionais ── */}
            <div className="space-y-2">
              <Label>Módulos Adicionais</Label>
              <Select value="" onValueChange={handleRetroAddModulo}>
                <SelectTrigger><SelectValue placeholder="Adicionar módulo..." /></SelectTrigger>
                <SelectContent>
                  {retroModulos.filter(m => !retroModulosSelecionados.find(s => s.modulo_id === m.id)).map(m => (
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
                  ))}
                </SelectContent>
              </Select>
              {retroModulosSelecionados.length > 0 && (
                <div className="rounded-lg border border-border divide-y divide-border">
                  {retroModulosSelecionados.map((mod, idx) => (
                    <div key={mod.modulo_id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{mod.nome}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {mod.valor_implantacao_modulo > 0 && `Impl: ${fmtBRL(mod.valor_implantacao_modulo)}`}
                          {mod.valor_implantacao_modulo > 0 && mod.valor_mensalidade_modulo > 0 && " · "}
                          {mod.valor_mensalidade_modulo > 0 && `Mens: ${fmtBRL(mod.valor_mensalidade_modulo)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} value={mod.quantidade}
                          onChange={(e) => { const qty = parseInt(e.target.value) || 1; setRetroModulosSelecionados(prev => prev.map((m, i) => i === idx ? { ...m, quantidade: qty } : m)); }}
                          className="w-16 h-7 text-xs text-center" />
                        <div className="text-right text-xs font-mono text-foreground">
                          {mod.valor_implantacao_modulo > 0 && <div>Impl: {fmtBRL(mod.valor_implantacao_modulo * mod.quantidade)}</div>}
                          {mod.valor_mensalidade_modulo > 0 && <div>Mens: {fmtBRL(mod.valor_mensalidade_modulo * mod.quantidade)}</div>}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setRetroModulosSelecionados(prev => prev.filter((_, i) => i !== idx))}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Precificação ── */}
            {(retroForm.plano_id || retroModulosSelecionados.length > 0) && (
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-muted-foreground" /> Precificação
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <span className="text-xs text-muted-foreground">Aplicar desconto</span>
                    <Switch checked={retroDescontoAtivo} onCheckedChange={(v) => {
                      setRetroDescontoAtivo(v);
                      if (!v) setRetroForm(f => ({ ...f, desconto_implantacao_valor: "0", desconto_mensalidade_valor: "0" }));
                    }} />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Implantação</Label>
                    <Input readOnly value={fmtBRL(retroDescontoAtivo ? retroValorImpOriginal : retroValorImpFinal)} className="bg-background font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mensalidade</Label>
                    <Input readOnly value={fmtBRL(retroDescontoAtivo ? retroValorMensOriginal : retroValorMensFinal)} className="bg-background font-mono text-sm" />
                  </div>
                </div>

                {retroDescontoAtivo && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Descontos</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Desconto — Implantação</Label>
                      <div className="flex gap-2">
                        <Select value={retroForm.desconto_implantacao_tipo} onValueChange={(v) => setRetroForm(f => ({ ...f, desconto_implantacao_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="R$">R$</SelectItem><SelectItem value="%">%</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" min="0" step="0.01" value={retroForm.desconto_implantacao_valor} onChange={(e) => setRetroForm(f => ({ ...f, desconto_implantacao_valor: e.target.value }))} className="flex-1" placeholder="0" />
                        <Input readOnly value={fmtBRL(retroValorImpFinal)} className="w-36 bg-background font-mono text-sm text-primary font-semibold" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Desconto — Mensalidade</Label>
                      <div className="flex gap-2">
                        <Select value={retroForm.desconto_mensalidade_tipo} onValueChange={(v) => setRetroForm(f => ({ ...f, desconto_mensalidade_tipo: v as "R$" | "%" }))}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="R$">R$</SelectItem><SelectItem value="%">%</SelectItem></SelectContent>
                        </Select>
                        <Input type="number" min="0" step="0.01" value={retroForm.desconto_mensalidade_valor} onChange={(e) => setRetroForm(f => ({ ...f, desconto_mensalidade_valor: e.target.value }))} className="flex-1" placeholder="0" />
                        <Input readOnly value={fmtBRL(retroValorMensFinal)} className="w-36 bg-background font-mono text-sm text-primary font-semibold" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Motivo do desconto</Label>
                      <Textarea placeholder="Informe o motivo do desconto..." value={retroForm.motivo_desconto} onChange={(e) => setRetroForm(f => ({ ...f, motivo_desconto: e.target.value }))} rows={2} />
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-border">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Valor total</Label>
                    <Input readOnly value={fmtBRL(retroValorTotal)} className="bg-background font-mono font-bold text-foreground" />
                  </div>
                </div>
              </div>
            )}

            {/* ── Forma de Pagamento ── */}
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">Forma de Pagamento</p>
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Mensalidade</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Forma de pagamento</Label>
                    <Select value={retroForm.pagamento_mensalidade_forma} onValueChange={(v) => setRetroForm(f => ({ ...f, pagamento_mensalidade_forma: v }))}>
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
                    <Label className="text-xs">Observação</Label>
                    <Input placeholder="Ex: Vencimento todo dia 10" value={retroForm.pagamento_mensalidade_observacao} onChange={(e) => setRetroForm(f => ({ ...f, pagamento_mensalidade_observacao: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Implantação</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Forma de pagamento</Label>
                    <Select value={retroForm.pagamento_implantacao_forma} onValueChange={(v) => setRetroForm(f => ({ ...f, pagamento_implantacao_forma: v }))}>
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
                    <Input type="number" min="1" placeholder="Nº de parcelas" value={retroForm.pagamento_implantacao_parcelas} onChange={(e) => setRetroForm(f => ({ ...f, pagamento_implantacao_parcelas: e.target.value }))} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">Observação</Label>
                    <Input placeholder="Ex: À vista no ato da implantação" value={retroForm.pagamento_implantacao_observacao} onChange={(e) => setRetroForm(f => ({ ...f, pagamento_implantacao_observacao: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Observações ── */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Observações adicionais..." value={retroForm.observacoes} onChange={(e) => setRetroForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>
          </div>

          {/* Footer fixo */}
          <div className="px-6 py-4 border-t border-border shrink-0 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenRetroativo(false)}>Cancelar</Button>
            <Button onClick={handleSalvarRetroativo} disabled={retroSaving}>
              {retroSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Cadastrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Novo Cliente (dentro do retroativo) ── */}
      <Dialog open={openRetroClienteDialog} onOpenChange={(open) => { setOpenRetroClienteDialog(open); if (!open) { setRetroClienteContatos([]); setRetroShowContatoForm(false); } }}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Cadastrar Novo Cliente</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRetroSaveCliente} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>CNPJ / CPF *</Label>
                <div className="relative">
                  <Input placeholder="00.000.000/0000-00" value={retroClienteForm.cnpj_cpf}
                    onChange={(e) => { setRetroCnpjError(""); setRetroClienteForm(f => ({ ...f, cnpj_cpf: e.target.value })); }}
                    onBlur={handleRetroCnpjBlur} required autoFocus
                    className={retroCnpjError ? "border-destructive pr-9" : "pr-9"} />
                  {retroLoadingCnpj && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {retroCnpjError && <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{retroCnpjError}</p>}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input placeholder="Nome fantasia..." value={retroClienteForm.nome_fantasia} onChange={(e) => setRetroClienteForm(f => ({ ...f, nome_fantasia: e.target.value }))} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Razão Social</Label>
                <Input placeholder="Razão social..." value={retroClienteForm.razao_social} onChange={(e) => setRetroClienteForm(f => ({ ...f, razao_social: e.target.value }))} />
              </div>

              <div className="col-span-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  <MapPin className="h-3 w-3" /> Endereço
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>CEP</Label>
                <div className="relative">
                  <Input placeholder="00000-000" value={retroClienteForm.cep}
                    onChange={(e) => { setRetroCepError(""); setRetroClienteForm(f => ({ ...f, cep: e.target.value })); }}
                    onBlur={handleRetroCepBlur} maxLength={9}
                    className={retroCepError ? "border-destructive pr-9" : "pr-9"} />
                  {retroLoadingCep && <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {retroCepError && <p className="flex items-center gap-1 text-xs text-destructive"><AlertCircle className="h-3 w-3" />{retroCepError}</p>}
              </div>
              <div className="space-y-1.5"><Label>Logradouro</Label><Input placeholder="Rua / Avenida..." value={retroClienteForm.logradouro} onChange={(e) => setRetroClienteForm(f => ({ ...f, logradouro: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Número</Label><Input placeholder="Ex: 123" value={retroClienteForm.numero} onChange={(e) => setRetroClienteForm(f => ({ ...f, numero: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Complemento</Label><Input placeholder="Apto, Sala..." value={retroClienteForm.complemento} onChange={(e) => setRetroClienteForm(f => ({ ...f, complemento: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Bairro</Label><Input placeholder="Bairro" value={retroClienteForm.bairro} onChange={(e) => setRetroClienteForm(f => ({ ...f, bairro: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Cidade</Label><Input placeholder="Cidade" value={retroClienteForm.cidade} onChange={(e) => setRetroClienteForm(f => ({ ...f, cidade: e.target.value }))} /></div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={retroClienteForm.uf} onValueChange={(v) => setRetroClienteForm(f => ({ ...f, uf: v }))}>
                  <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                  <SelectContent>{UF_LIST.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* ── Contatos ── */}
              <div className="col-span-2 pt-2">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    <Users className="h-3.5 w-3.5" /> Contatos <span className="text-destructive">*</span>
                    <span className="text-xs font-normal normal-case">(obrigatório ao menos 1)</span>
                  </div>
                  {!retroShowContatoForm && (
                    <Button type="button" size="sm" variant="outline" className="gap-1.5 h-7 text-xs"
                      onClick={() => { setRetroEditingContatoIdx(null); setRetroInlineContatoForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true }); setRetroShowContatoForm(true); }}>
                      <Plus className="h-3 w-3" /> Adicionar contato
                    </Button>
                  )}
                </div>

                {retroClienteContatos.length > 0 && (
                  <div className="rounded-lg border border-border divide-y divide-border mb-2">
                    {retroClienteContatos.map((ct, idx) => (
                      <div key={idx} className="flex items-center gap-3 px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{ct.nome}</p>
                            {ct.decisor && <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0"><Star className="h-2.5 w-2.5 fill-current" /> Decisor</span>}
                          </div>
                          <div className="flex gap-2 mt-0.5">
                            {ct.cargo && <span className="text-xs text-muted-foreground">{ct.cargo}</span>}
                            {ct.telefone && <span className="text-xs text-muted-foreground">{ct.telefone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button type="button" variant="ghost" size="icon" className={`h-6 w-6 ${ct.decisor ? "text-primary" : "text-muted-foreground"}`}
                            onClick={() => setRetroClienteContatos(prev => prev.map((c, i) => ({ ...c, decisor: i === idx ? !c.decisor : (ct.decisor ? c.decisor : false) })))}>
                            <Star className={`h-3 w-3 ${ct.decisor ? "fill-current" : ""}`} />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => { setRetroEditingContatoIdx(idx); setRetroInlineContatoForm({ ...ct }); setRetroShowContatoForm(true); }}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setRetroClienteContatos(prev => prev.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {retroClienteContatos.length === 0 && !retroShowContatoForm && (
                  <div className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-muted-foreground text-center mb-2">
                    <Users className="h-4 w-4 mx-auto mb-1" /> Nenhum contato cadastrado. Adicione pelo menos um contato.
                  </div>
                )}

                {retroShowContatoForm && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                    <p className="text-xs font-medium text-foreground">{retroEditingContatoIdx !== null ? "Editar contato" : "Novo contato"}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2 space-y-1"><Label className="text-xs">Nome *</Label><Input className="h-8 text-sm" value={retroInlineContatoForm.nome} onChange={(e) => setRetroInlineContatoForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" /></div>
                      <div className="space-y-1"><Label className="text-xs">Cargo</Label><Input className="h-8 text-sm" value={retroInlineContatoForm.cargo} onChange={(e) => setRetroInlineContatoForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Cargo / função" /></div>
                      <div className="space-y-1"><Label className="text-xs">Telefone</Label><Input className="h-8 text-sm" value={retroInlineContatoForm.telefone} onChange={(e) => setRetroInlineContatoForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" /></div>
                      <div className="col-span-2 space-y-1"><Label className="text-xs">E-mail</Label><Input className="h-8 text-sm" type="email" value={retroInlineContatoForm.email} onChange={(e) => setRetroInlineContatoForm(f => ({ ...f, email: e.target.value }))} placeholder="email@empresa.com" /></div>
                      <div className="col-span-2 flex items-center gap-3">
                        <Checkbox id="retro-cli-decisor" checked={retroInlineContatoForm.decisor} onCheckedChange={(v) => setRetroInlineContatoForm(f => ({ ...f, decisor: !!v }))} />
                        <Label htmlFor="retro-cli-decisor" className="text-xs cursor-pointer">Decisor (tomador de decisão)</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setRetroShowContatoForm(false); setRetroEditingContatoIdx(null); }}>Cancelar</Button>
                      <Button type="button" size="sm" className="h-7 text-xs" onClick={() => {
                        if (!retroInlineContatoForm.nome.trim()) { toast.error("Nome do contato é obrigatório"); return; }
                        if (retroEditingContatoIdx !== null) {
                          setRetroClienteContatos(prev => prev.map((c, i) => i === retroEditingContatoIdx ? { ...retroInlineContatoForm } : c));
                        } else {
                          setRetroClienteContatos(prev => [...(retroInlineContatoForm.decisor ? prev.map(c => ({ ...c, decisor: false })) : prev), { ...retroInlineContatoForm }]);
                        }
                        setRetroShowContatoForm(false);
                        setRetroEditingContatoIdx(null);
                        setRetroInlineContatoForm({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });
                      }}>
                        {retroEditingContatoIdx !== null ? "Salvar" : "Adicionar"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenRetroClienteDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={retroSavingCliente || retroLoadingCep || retroLoadingCnpj}>
                {retroLoadingCep || retroLoadingCnpj ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Consultando...</> :
                 retroSavingCliente ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Salvando...</> : "Cadastrar cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

