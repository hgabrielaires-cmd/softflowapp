import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────

export interface RetroForm {
  cliente_id: string;
  plano_id: string;
  tipo: string;
  status: string;
  observacoes: string;
  segmento_id: string;
  data_lancamento: string;
  vendedor_id: string;
  filial_id: string;
  contrato_origem_id: string;
  desconto_implantacao_tipo: "R$" | "%";
  desconto_implantacao_valor: string;
  desconto_mensalidade_tipo: "R$" | "%";
  desconto_mensalidade_valor: string;
  motivo_desconto: string;
  pagamento_implantacao_forma: string;
  pagamento_implantacao_parcelas: string;
  pagamento_implantacao_observacao: string;
  pagamento_mensalidade_forma: string;
  pagamento_mensalidade_observacao: string;
  dia_mensalidade: string;
}

export interface RetroClienteOption {
  id: string;
  nome_fantasia: string;
  filial_id: string | null;
  cnpj_cpf: string;
  razao_social: string | null;
}

export interface RetroPlanoOption {
  id: string;
  nome: string;
  valor_implantacao_padrao: number | null;
  valor_mensalidade_padrao: number | null;
}

export interface RetroModuloOption {
  id: string;
  nome: string;
  valor_implantacao_modulo: number | null;
  valor_mensalidade_modulo: number | null;
}

export interface RetroModuloSelecionado {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
}

export interface RetroVendedorOption {
  id: string;
  user_id: string;
  full_name: string;
  filial_id: string | null;
}

export interface RetroSegmentoOption {
  id: string;
  nome: string;
}

export interface RetroClienteFormData {
  nome_fantasia: string;
  razao_social: string;
  cnpj_cpf: string;
  contato_nome: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
}

export interface RetroContatoForm {
  nome: string;
  cargo: string;
  telefone: string;
  email: string;
  decisor: boolean;
  ativo: boolean;
}

// ─── Default values ─────────────────────────────────────────────────────

const defaultRetroForm: RetroForm = {
  cliente_id: "", plano_id: "", tipo: "Base", status: "Ativo",
  observacoes: "", segmento_id: "", data_lancamento: "", vendedor_id: "", filial_id: "",
  contrato_origem_id: "",
  desconto_implantacao_tipo: "R$", desconto_implantacao_valor: "0",
  desconto_mensalidade_tipo: "R$", desconto_mensalidade_valor: "0",
  motivo_desconto: "",
  pagamento_implantacao_forma: "", pagamento_implantacao_parcelas: "",
  pagamento_implantacao_observacao: "", pagamento_mensalidade_forma: "",
  pagamento_mensalidade_observacao: "",
  dia_mensalidade: "",
};

export const emptyRetroClienteForm: RetroClienteFormData = {
  nome_fantasia: "", razao_social: "", cnpj_cpf: "", contato_nome: "",
  telefone: "", email: "", cidade: "", uf: "", cep: "", logradouro: "",
  numero: "", complemento: "", bairro: "",
};

// ─── Hook ───────────────────────────────────────────────────────────────

interface UseCadastroRetroativoParams {
  profileFilialId: string | null | undefined;
  loadData: () => void;
}

export function useCadastroRetroativo({ profileFilialId, loadData }: UseCadastroRetroativoParams) {
  // ── Dialog open state ──
  const [openRetroativo, setOpenRetroativo] = useState(false);

  // ── Data lists ──
  const [retroClientes, setRetroClientes] = useState<RetroClienteOption[]>([]);
  const [retroPlanos, setRetroPlanos] = useState<RetroPlanoOption[]>([]);
  const [retroModulos, setRetroModulos] = useState<RetroModuloOption[]>([]);
  const [retroVendedores, setRetroVendedores] = useState<RetroVendedorOption[]>([]);
  const [retroSegmentos, setRetroSegmentos] = useState<RetroSegmentoOption[]>([]);
  const [retroContratosBase, setRetroContratosBase] = useState<{ id: string; numero_exibicao: string }[]>([]);

  // ── Form state ──
  const [retroForm, setRetroForm] = useState<RetroForm>(defaultRetroForm);
  const [retroModulosSelecionados, setRetroModulosSelecionados] = useState<RetroModuloSelecionado[]>([]);
  const [retroSaving, setRetroSaving] = useState(false);
  const [retroDescontoAtivo, setRetroDescontoAtivo] = useState(false);
  const [retroClienteSearch, setRetroClienteSearch] = useState("");
  const [retroClienteSearchFocused, setRetroClienteSearchFocused] = useState(false);

  // ── Inline cliente form ──
  const [openRetroClienteDialog, setOpenRetroClienteDialog] = useState(false);
  const [retroClienteForm, setRetroClienteForm] = useState<RetroClienteFormData>(emptyRetroClienteForm);
  const [retroSavingCliente, setRetroSavingCliente] = useState(false);
  const [retroLoadingCep, setRetroLoadingCep] = useState(false);
  const [retroLoadingCnpj, setRetroLoadingCnpj] = useState(false);
  const [retroCepError, setRetroCepError] = useState("");
  const [retroCnpjError, setRetroCnpjError] = useState("");
  const [retroClienteContatos, setRetroClienteContatos] = useState<RetroContatoForm[]>([]);
  const [retroShowContatoForm, setRetroShowContatoForm] = useState(false);
  const [retroEditingContatoIdx, setRetroEditingContatoIdx] = useState<number | null>(null);
  const [retroInlineContatoForm, setRetroInlineContatoForm] = useState<RetroContatoForm>({ nome: "", cargo: "", telefone: "", email: "", decisor: false, ativo: true });

  // ── Computed values ──
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

  // ── Open dialog & load lists ──
  async function openRetroativoDialog() {
    setRetroForm({ ...defaultRetroForm });
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

  // ── Auto-fill filial when client changes ──
  useEffect(() => {
    if (!retroForm.cliente_id) return;
    const clienteSel = retroClientes.find(c => c.id === retroForm.cliente_id);
    if (clienteSel?.filial_id) {
      setRetroForm(f => ({ ...f, filial_id: f.filial_id || clienteSel.filial_id || "" }));
    }
  }, [retroForm.cliente_id, retroClientes]);

  // ── Load segmentos when filial changes ──
  useEffect(() => {
    async function loadRetroSegmentos() {
      if (!retroForm.filial_id) { setRetroSegmentos([]); return; }
      const { data } = await supabase.from("segmentos").select("id, nome").eq("filial_id", retroForm.filial_id).eq("ativo", true).order("nome");
      setRetroSegmentos((data || []) as any);
    }
    loadRetroSegmentos();
  }, [retroForm.filial_id]);

  // ── Module helpers ──
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

  // ── CEP lookup ──
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

  // ── CNPJ lookup ──
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

  // ── Save new inline client ──
  async function handleRetroSaveCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!retroClienteForm.nome_fantasia.trim() || !retroClienteForm.cnpj_cpf.trim()) { toast.error("Nome fantasia e CNPJ/CPF são obrigatórios"); return; }
    if (retroClienteContatos.length === 0) { toast.error("Cadastre pelo menos um contato"); return; }
    setRetroSavingCliente(true);
    const filial_id = profileFilialId || null;
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
      await supabase.from("cliente_contatos").insert({ cliente_id: data.id, nome: ct.nome, cargo: ct.cargo || null, telefone: normalizeBRPhone(ct.telefone) || null, email: ct.email || null, decisor: ct.decisor, ativo: ct.ativo });
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

  // ── Save retroactive contract ──
  async function handleSalvarRetroativo() {
    if (!retroForm.cliente_id) { toast.error("Selecione um cliente"); return; }
    if (!retroForm.segmento_id) { toast.error("Selecione um segmento"); return; }
    if (!retroForm.data_lancamento) { toast.error("Informe a data de lançamento"); return; }
    if (!retroForm.vendedor_id) { toast.error("Selecione o vendedor"); return; }
    if (!retroForm.filial_id) { toast.error("Selecione a filial"); return; }
    if (retroForm.tipo !== "Base" && !retroForm.contrato_origem_id) { toast.error("Selecione o contrato base"); return; }
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
      dia_mensalidade: retroForm.dia_mensalidade ? parseInt(retroForm.dia_mensalidade) : null,
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
      contrato_origem_id: retroForm.tipo !== "Base" && retroForm.contrato_origem_id ? retroForm.contrato_origem_id : null,
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

  // ── Load contratos base when client changes ──
  useEffect(() => {
    async function loadContratosBase() {
      if (!retroForm.cliente_id) { setRetroContratosBase([]); return; }
      const { data } = await supabase
        .from("contratos")
        .select("id, numero_exibicao")
        .eq("cliente_id", retroForm.cliente_id)
        .eq("tipo", "Base")
        .in("status", ["Ativo", "Assinado"])
        .order("created_at", { ascending: false })
        .limit(10);
      setRetroContratosBase((data || []) as any[]);
    }
    loadContratosBase();
  }, [retroForm.cliente_id]);

  return {
    // Dialog
    openRetroativo, setOpenRetroativo, openRetroativoDialog,
    // Form
    retroForm, setRetroForm,
    retroClientes, retroPlanos, retroModulos, retroVendedores, retroSegmentos,
    retroModulosSelecionados, setRetroModulosSelecionados,
    retroDescontoAtivo, setRetroDescontoAtivo,
    retroClienteSearch, setRetroClienteSearch,
    retroClienteSearchFocused, setRetroClienteSearchFocused,
    retroSaving,
    handleRetroAddModulo, handleSalvarRetroativo,
    retroContratosBase,
    // Computed
    retroValorImpOriginal, retroValorMensOriginal,
    retroValorImpFinal, retroValorMensFinal, retroValorTotal,
    // Inline cliente
    openRetroClienteDialog, setOpenRetroClienteDialog,
    retroClienteForm, setRetroClienteForm, emptyRetroClienteForm,
    retroSavingCliente,
    retroLoadingCep, retroLoadingCnpj,
    retroCepError, retroCnpjError,
    setRetroCepError, setRetroCnpjError,
    handleRetroCepBlur, handleRetroCnpjBlur, handleRetroSaveCliente,
    retroClienteContatos, setRetroClienteContatos,
    retroShowContatoForm, setRetroShowContatoForm,
    retroEditingContatoIdx, setRetroEditingContatoIdx,
    retroInlineContatoForm, setRetroInlineContatoForm,
  };
}
