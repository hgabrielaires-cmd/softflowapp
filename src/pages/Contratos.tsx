import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useCrudPermissions } from "@/hooks/useCrudPermissions";
import { Filial } from "@/lib/supabase-types";
import type { Contrato, ZapSignRecord, ModuloAdicionadoItem } from "./contratos/types";
import { ITEMS_PER_PAGE, UF_LIST } from "./contratos/constants";
import { fmtBRL, gerarTermoAceite, type GerarTermoAceiteContext } from "./contratos/helpers";
import { CadastroRetroativoDialog } from "./contratos/components/CadastroRetroativoDialog";
import { EncerrarContratoDialog } from "./contratos/components/EncerrarContratoDialog";
import { CancelarProjetoDialog } from "./contratos/components/CancelarProjetoDialog";
import { AgendamentosCancelDialog } from "./contratos/components/AgendamentosCancelDialog";
import { CancelarAditivosDialog } from "./contratos/components/CancelarAditivosDialog";
import { ZapsignPopupDialog } from "./contratos/components/ZapsignPopupDialog";
import { ZapsignDetailDialog } from "./contratos/components/ZapsignDetailDialog";
import { useContratoGeracaoZapsign } from "./contratos/useContratoGeracaoZapsign";
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
  const [linkedMessageTemplate, setLinkedMessageTemplate] = useState<{ conteudo: string } | null>(null);

  // Contatos do cliente selecionado (para Termo de Aceite)
  const [contatosCliente, setContatosCliente] = useState<{ nome: string; telefone: string | null; decisor: boolean; ativo: boolean }[]>([]);

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

    // Carregar registros ZapSign via hook
    loadZapsignRecords();
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
                const mensagem = gerarTermoAceite(selected, buildTermoCtx(), linkAssinatura);
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

