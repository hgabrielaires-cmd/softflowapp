import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Cliente, Filial, Profile } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Search, Pencil, XCircle, Loader2, Filter, RefreshCw, CheckCircle, UserPlus, Tag } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Constants ────────────────────────────────────────────────────────────────

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const emptyClienteForm = {
  nome_fantasia: "", razao_social: "", cnpj_cpf: "",
  contato_nome: "", telefone: "", email: "", cidade: "", uf: "",
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
  modulos_adicionais?: string[];
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
  observacoes: string;
  // Valores originais (auto-preenchidos, readonly)
  valor_implantacao_original: number;
  valor_mensalidade_original: number;
  // Descontos
  desconto_implantacao_tipo: "R$" | "%";
  desconto_implantacao_valor: string;
  desconto_mensalidade_tipo: "R$" | "%";
  desconto_mensalidade_valor: string;
  // Módulos opcionais selecionados
  modulos_adicionais: string[];
}

const emptyForm: FormState = {
  cliente_id: "", plano_id: "", filial_id: "", vendedor_id: "",
  comissao_percentual: "5", observacoes: "",
  valor_implantacao_original: 0,
  valor_mensalidade_original: 0,
  desconto_implantacao_tipo: "R$",
  desconto_implantacao_valor: "0",
  desconto_mensalidade_tipo: "R$",
  desconto_mensalidade_valor: "0",
  modulos_adicionais: [],
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

  // Módulos opcionais do plano selecionado
  const [modulosOpcionais, setModulosOpcionais] = useState<ModuloOpcional[]>([]);
  const [loadingModulos, setLoadingModulos] = useState(false);

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
  const [editingPedido, setEditingPedido] = useState<PedidoWithJoins | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [descontoAtivo, setDescontoAtivo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Dialog novo cliente rápido
  const [openClienteDialog, setOpenClienteDialog] = useState(false);
  const [clienteForm, setClienteForm] = useState(emptyClienteForm);
  const [savingCliente, setSavingCliente] = useState(false);

  // ─── Computed values ─────────────────────────────────────────────────────

  const valorImplantacaoFinal = applyDesconto(
    form.valor_implantacao_original,
    form.desconto_implantacao_tipo,
    parseFloat(form.desconto_implantacao_valor) || 0
  );

  const valorMensalidadeFinal = applyDesconto(
    form.valor_mensalidade_original,
    form.desconto_mensalidade_tipo,
    parseFloat(form.desconto_mensalidade_valor) || 0
  );

  const valorTotal = valorImplantacaoFinal + valorMensalidadeFinal;
  const comissaoValor = valorTotal * (parseFloat(form.comissao_percentual) || 0) / 100;

  // ─── Load plano + módulos opcionais ──────────────────────────────────────

  const loadPlano = useCallback(async (planoId: string, modulosAdicionais: string[] = []) => {
    if (!planoId) {
      setPlanoSelecionado(null);
      setModulosOpcionais([]);
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

    const todos: ModuloOpcional[] = [];
    (vinculosData || []).forEach((v: any) => {
      if (v.modulo) {
        todos.push({
          id: v.modulo.id,
          nome: v.modulo.nome,
          valor_implantacao_modulo: v.modulo.valor_implantacao_modulo,
          valor_mensalidade_modulo: v.modulo.valor_mensalidade_modulo,
          incluso_no_plano: v.incluso_no_plano,
        });
      }
    });
    setModulosOpcionais(todos);

    // Calcular originais com base no plano + módulos adicionais marcados (só opcionais somam)
    const baseImp = planoData?.valor_implantacao_padrao ?? 0;
    const baseMens = planoData?.valor_mensalidade_padrao ?? 0;
    const adicionaisImp = todos
      .filter((m) => !m.incluso_no_plano && modulosAdicionais.includes(m.id))
      .reduce((acc, m) => acc + (m.valor_implantacao_modulo ?? 0), 0);
    const adicionaisMens = todos
      .filter((m) => !m.incluso_no_plano && modulosAdicionais.includes(m.id))
      .reduce((acc, m) => acc + (m.valor_mensalidade_modulo ?? 0), 0);

    setForm((f) => ({
      ...f,
      valor_implantacao_original: baseImp + adicionaisImp,
      valor_mensalidade_original: baseMens + adicionaisMens,
    }));

    setLoadingModulos(false);
  }, []);

  // Recalcular originais quando módulos adicionais mudam
  const recalcularOriginais = useCallback((modulosAdicionais: string[]) => {
    if (!planoSelecionado) return;
    const baseImp = planoSelecionado.valor_implantacao_padrao ?? 0;
    const baseMens = planoSelecionado.valor_mensalidade_padrao ?? 0;
    const adicionaisImp = modulosOpcionais
      .filter((m) => !m.incluso_no_plano && modulosAdicionais.includes(m.id))
      .reduce((acc, m) => acc + (m.valor_implantacao_modulo ?? 0), 0);
    const adicionaisMens = modulosOpcionais
      .filter((m) => !m.incluso_no_plano && modulosAdicionais.includes(m.id))
      .reduce((acc, m) => acc + (m.valor_mensalidade_modulo ?? 0), 0);
    setForm((f) => ({
      ...f,
      valor_implantacao_original: baseImp + adicionaisImp,
      valor_mensalidade_original: baseMens + adicionaisMens,
    }));
  }, [planoSelecionado, modulosOpcionais]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  function toggleModuloAdicional(moduloId: string, checked: boolean) {
    const next = checked
      ? [...form.modulos_adicionais, moduloId]
      : form.modulos_adicionais.filter((id) => id !== moduloId);
    setForm((f) => ({ ...f, modulos_adicionais: next }));
    recalcularOriginais(next);
  }

  function handlePlanoChange(planoId: string) {
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

  // ─── Data loading ─────────────────────────────────────────────────────────

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
    setPedidos((pedidosData || []) as PedidoWithJoins[]);
    setClientes((clientesData || []) as Cliente[]);
    setPlanos(planosData || []);
    setFiliais((filiaisData || []) as Filial[]);
    setVendedores((vendedoresData || []) as Profile[]);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  // ─── Open create/edit ─────────────────────────────────────────────────────

  function openCreate() {
    const defaultComissao = profile?.comissao_percentual?.toString() ?? "5";
    const defaultFilial = filialFavoritaId || profile?.filial_id || "";
    const defaultVendedor = profile?.user_id ?? "";
    setForm({ ...emptyForm, comissao_percentual: defaultComissao, filial_id: defaultFilial, vendedor_id: defaultVendedor });
    setPlanoSelecionado(null);
    setModulosOpcionais([]);
    setDescontoAtivo(false);
    setEditingPedido(null);
    setOpenDialog(true);
  }

  function openEdit(pedido: PedidoWithJoins) {
    const adicionais = pedido.modulos_adicionais || [];
    const temDesconto = (pedido.desconto_implantacao_valor ?? 0) > 0 || (pedido.desconto_mensalidade_valor ?? 0) > 0;
    setForm({
      cliente_id: pedido.cliente_id,
      plano_id: pedido.plano_id,
      filial_id: pedido.filial_id,
      vendedor_id: pedido.vendedor_id,
      comissao_percentual: pedido.comissao_percentual.toString(),
      observacoes: pedido.observacoes || "",
      valor_implantacao_original: pedido.valor_implantacao_original ?? pedido.valor_implantacao,
      valor_mensalidade_original: pedido.valor_mensalidade_original ?? pedido.valor_mensalidade,
      desconto_implantacao_tipo: (pedido.desconto_implantacao_tipo as "R$" | "%") || "R$",
      desconto_implantacao_valor: (pedido.desconto_implantacao_valor ?? 0).toString(),
      desconto_mensalidade_tipo: (pedido.desconto_mensalidade_tipo as "R$" | "%") || "R$",
      desconto_mensalidade_valor: (pedido.desconto_mensalidade_valor ?? 0).toString(),
      modulos_adicionais: adicionais,
    });
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
        // Legado — mantemos compatibilidade
        valor_implantacao: valorImplantacaoFinal,
        valor_mensalidade: valorMensalidadeFinal,
        valor_total: valorTotal,
        comissao_percentual: parseFloat(form.comissao_percentual) || 0,
        comissao_valor: comissaoValor,
        observacoes: form.observacoes || null,
        // Novos campos
        valor_implantacao_original: form.valor_implantacao_original,
        valor_mensalidade_original: form.valor_mensalidade_original,
        desconto_implantacao_tipo: form.desconto_implantacao_tipo,
        desconto_implantacao_valor: parseFloat(form.desconto_implantacao_valor) || 0,
        valor_implantacao_final: valorImplantacaoFinal,
        desconto_mensalidade_tipo: form.desconto_mensalidade_tipo,
        desconto_mensalidade_valor: parseFloat(form.desconto_mensalidade_valor) || 0,
        valor_mensalidade_final: valorMensalidadeFinal,
        modulos_adicionais: form.modulos_adicionais,
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

  async function handleSaveCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!clienteForm.nome_fantasia.trim() || !clienteForm.cnpj_cpf.trim()) {
      toast.error("Nome fantasia e CNPJ/CPF são obrigatórios");
      return;
    }
    setSavingCliente(true);
    const filial_id = profile?.filial_id || (isAdmin ? form.filial_id || null : null);
    const { data, error } = await supabase.from("clientes").insert({
      nome_fantasia: clienteForm.nome_fantasia.trim(),
      razao_social: clienteForm.razao_social.trim() || null,
      cnpj_cpf: clienteForm.cnpj_cpf.trim(),
      contato_nome: clienteForm.contato_nome.trim() || null,
      telefone: clienteForm.telefone.trim() || null,
      email: clienteForm.email.trim() || null,
      cidade: clienteForm.cidade.trim() || null,
      uf: clienteForm.uf || null,
      filial_id,
      ativo: true,
    }).select().single();
    if (error) { toast.error("Erro ao cadastrar cliente: " + error.message); setSavingCliente(false); return; }
    toast.success("Cliente cadastrado! Já selecionado no pedido.");
    const { data: novosClientes } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome_fantasia");
    setClientes((novosClientes || []) as Cliente[]);
    if (data) setForm((f) => ({ ...f, cliente_id: data.id }));
    setClienteForm(emptyClienteForm);
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
                  <TableHead>Plano</TableHead>
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
                    <TableCell colSpan={12} className="text-center py-12">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">Nenhum pedido encontrado</TableCell>
                  </TableRow>
                ) : filtered.map((pedido) => {
                  const finStatus = pedido.financeiro_status as string || "Aguardando";
                  const finMotivo = pedido.financeiro_motivo as string | null;
                  const contratoLiberado = pedido.contrato_liberado as boolean;
                  const isReprovado = finStatus === "Reprovado";
                  const canEdit = isAdmin || (isVendedor && pedido.vendedor_id === profile?.user_id && (pedido.status_pedido === "Aguardando Financeiro" || isReprovado));
                  const vendedorNome = vendedores.find((v) => v.user_id === pedido.vendedor_id)?.full_name || "—";
                  const filialNome = (pedido as any).filiais?.nome || filiais.find(f => f.id === pedido.filial_id)?.nome || "—";
                  const impFinal = pedido.valor_implantacao_final ?? pedido.valor_implantacao;
                  const mensFinal = pedido.valor_mensalidade_final ?? pedido.valor_mensalidade;
                  return (
                    <TableRow key={pedido.id} className={isReprovado ? "bg-red-50/40" : undefined}>
                      <TableCell className="font-medium">{(pedido as any).clientes?.nome_fantasia || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{(pedido as any).planos?.nome || "—"}</TableCell>
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
                          {isVendedor && isReprovado && pedido.vendedor_id === profile?.user_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-warning hover:text-warning" onClick={() => openEdit(pedido)} title="Editar e reenviar">
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && !isReprovado && pedido.status_pedido === "Aguardando Financeiro" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pedido)} title="Editar pedido">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdmin && pedido.status_pedido !== "Cancelado" && (
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPedido ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-5">

            {/* ── Cliente ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Cliente *</Label>
                <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                  onClick={() => { setClienteForm(emptyClienteForm); setOpenClienteDialog(true); }}>
                  <UserPlus className="h-3.5 w-3.5" /> Novo cliente
                </Button>
              </div>
              <Select value={form.cliente_id} onValueChange={(v) => setForm((f) => ({ ...f, cliente_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                <SelectContent>
                  {clientesDisponiveis.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* ── Plano ── */}
            <div className="space-y-1.5">
              <Label>Plano *</Label>
              <Select value={form.plano_id} onValueChange={handlePlanoChange}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano..." /></SelectTrigger>
                <SelectContent>
                  {planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

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
                    setForm((f) => ({ ...f, vendedor_id: v, comissao_percentual: vend?.comissao_percentual?.toString() ?? f.comissao_percentual }));
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

            {/* ── Módulos do plano ── */}
            {form.plano_id && (
              <div className="space-y-2">
                <Label>Módulos do plano</Label>
                {loadingModulos ? (
                  <p className="text-sm text-muted-foreground">Carregando módulos...</p>
                ) : modulosOpcionais.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Nenhum módulo vinculado a este plano.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {modulosOpcionais.map((m) => {
                      const checked = form.modulos_adicionais.includes(m.id);
                      const isIncluso = m.incluso_no_plano;
                      return (
                        <div key={m.id} className={`flex items-center gap-3 px-4 py-2.5 ${!isIncluso ? "cursor-pointer hover:bg-muted/40 transition-colors" : "opacity-70"}`}
                          onClick={!isIncluso ? () => toggleModuloAdicional(m.id, !checked) : undefined}
                        >
                          {isIncluso ? (
                            <span className="h-4 w-4 flex-shrink-0 rounded-sm bg-primary/20 flex items-center justify-center">
                              <svg className="h-3 w-3 text-primary" fill="currentColor" viewBox="0 0 12 12"><path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          ) : (
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => toggleModuloAdicional(m.id, !!v)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <span className="flex-1 text-sm font-medium">{m.nome}</span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {isIncluso
                              ? <span className="text-primary font-medium">Incluso</span>
                              : <>
                                  {m.valor_implantacao_modulo != null && `Impl: ${fmtBRL(m.valor_implantacao_modulo)}`}
                                  {m.valor_implantacao_modulo != null && m.valor_mensalidade_modulo != null && " · "}
                                  {m.valor_mensalidade_modulo != null && `Mens: ${fmtBRL(m.valor_mensalidade_modulo)}`}
                                </>
                            }
                          </span>
                        </div>
                      );
                    })}
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
                    <Input readOnly value={fmtBRL(descontoAtivo ? form.valor_implantacao_original : valorImplantacaoFinal)} className="bg-background font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Mensalidade</Label>
                    <Input readOnly value={fmtBRL(descontoAtivo ? form.valor_mensalidade_original : valorMensalidadeFinal)} className="bg-background font-mono text-sm" />
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

            {/* ── Observações ── */}
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea placeholder="Observações opcionais..." value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>

            <DialogFooter>
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
      <Dialog open={openClienteDialog} onOpenChange={setOpenClienteDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Cadastrar Novo Cliente
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCliente} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input placeholder="Nome fantasia..." value={clienteForm.nome_fantasia} onChange={(e) => setClienteForm((f) => ({ ...f, nome_fantasia: e.target.value }))} required />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Razão Social</Label>
                <Input placeholder="Razão social..." value={clienteForm.razao_social} onChange={(e) => setClienteForm((f) => ({ ...f, razao_social: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>CNPJ / CPF *</Label>
                <Input placeholder="00.000.000/0000-00" value={clienteForm.cnpj_cpf} onChange={(e) => setClienteForm((f) => ({ ...f, cnpj_cpf: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Contato</Label>
                <Input placeholder="Nome do contato" value={clienteForm.contato_nome} onChange={(e) => setClienteForm((f) => ({ ...f, contato_nome: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input placeholder="(00) 00000-0000" value={clienteForm.telefone} onChange={(e) => setClienteForm((f) => ({ ...f, telefone: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" placeholder="email@empresa.com" value={clienteForm.email} onChange={(e) => setClienteForm((f) => ({ ...f, email: e.target.value }))} />
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
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenClienteDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={savingCliente}>
                {savingCliente && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Cadastrar cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
