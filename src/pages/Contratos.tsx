import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import type { Contrato } from "./contratos/types";
import { ITEMS_PER_PAGE, UF_LIST } from "./contratos/constants";
import { fmtBRL, type GerarTermoAceiteContext } from "./contratos/helpers";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

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

