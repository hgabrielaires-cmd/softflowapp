import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Pedido, Cliente, Plano, Filial, Profile, ROLE_LABELS } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, Pencil, XCircle, Loader2, Filter, RefreshCw, CheckCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const UF_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const emptyClienteForm = {
  nome_fantasia: "",
  razao_social: "",
  cnpj_cpf: "",
  contato_nome: "",
  telefone: "",
  email: "",
  cidade: "",
  uf: "",
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

interface PedidoWithJoins extends Pedido {
  clientes?: { nome_fantasia: string } | null;
  planos?: { nome: string } | null;
  filiais?: { nome: string } | null;
  vendedor_profile?: { full_name: string } | null;
  financeiro_status?: string;
  financeiro_motivo?: string | null;
  contrato_liberado?: boolean;
}

interface FormState {
  cliente_id: string;
  plano_id: string;
  filial_id: string;
  vendedor_id: string;
  valor_implantacao: string;
  valor_mensalidade: string;
  comissao_percentual: string;
  observacoes: string;
}

const emptyForm: FormState = {
  cliente_id: "",
  plano_id: "",
  filial_id: "",
  vendedor_id: "",
  valor_implantacao: "0",
  valor_mensalidade: "0",
  comissao_percentual: "0",
  observacoes: "",
};

export default function Pedidos() {
  const { profile, roles, isAdmin } = useAuth();
  const isFinanceiro = roles.includes("financeiro");
  const isVendedor = roles.includes("vendedor");
  const isTecnico = roles.includes("tecnico") && !isAdmin && !isFinanceiro && !isVendedor;

  const [pedidos, setPedidos] = useState<PedidoWithJoins[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [vendedores, setVendedores] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

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
  const [saving, setSaving] = useState(false);

  // Dialog novo cliente rápido
  const [openClienteDialog, setOpenClienteDialog] = useState(false);
  const [clienteForm, setClienteForm] = useState(emptyClienteForm);
  const [savingCliente, setSavingCliente] = useState(false);

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
    if (error) {
      toast.error("Erro ao cadastrar cliente: " + error.message);
      setSavingCliente(false);
      return;
    }
    toast.success("Cliente cadastrado! Já selecionado no pedido.");
    // Recarregar lista de clientes e selecionar o novo
    const { data: novosClientes } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome_fantasia");
    setClientes((novosClientes || []) as Cliente[]);
    if (data) setForm((f) => ({ ...f, cliente_id: data.id }));
    setClienteForm(emptyClienteForm);
    setOpenClienteDialog(false);
    setSavingCliente(false);
  }

  // Computed
  const valorTotal = (parseFloat(form.valor_implantacao) || 0) + (parseFloat(form.valor_mensalidade) || 0);
  const comissaoValor = valorTotal * (parseFloat(form.comissao_percentual) || 0) / 100;

  if (isTecnico) return <Navigate to="/dashboard" replace />;

  async function loadData() {
    setLoading(true);
    const [
      { data: pedidosData },
      { data: clientesData },
      { data: planosData },
      { data: filiaisData },
      { data: vendedoresData },
    ] = await Promise.all([
      supabase
        .from("pedidos")
        .select("*, clientes(nome_fantasia), planos(nome), filiais(nome)")
        .order("created_at", { ascending: false }),
      supabase.from("clientes").select("*").eq("ativo", true).order("nome_fantasia"),
      supabase.from("planos").select("*").eq("ativo", true).order("nome"),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
      supabase.from("profiles").select("*").order("full_name"),
    ]);

    // Enrich pedidos with vendedor name
    const enriched: PedidoWithJoins[] = (pedidosData || []).map((p: any) => ({
      ...p,
    }));

    setPedidos(enriched);
    setClientes((clientesData || []) as Cliente[]);
    setPlanos((planosData || []) as Plano[]);
    setFiliais((filiaisData || []) as Filial[]);
    setVendedores((vendedoresData || []) as Profile[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function openCreate() {
    const defaultComissao = profile?.comissao_percentual?.toString() ?? "5";
    const defaultFilial = profile?.filial_id ?? "";
    const defaultVendedor = profile?.user_id ?? "";
    setForm({
      ...emptyForm,
      comissao_percentual: defaultComissao,
      filial_id: isAdmin ? "" : defaultFilial,
      vendedor_id: isAdmin ? "" : defaultVendedor,
    });
    setEditingPedido(null);
    setOpenDialog(true);
  }

  function openEdit(pedido: PedidoWithJoins) {
    setForm({
      cliente_id: pedido.cliente_id,
      plano_id: pedido.plano_id,
      filial_id: pedido.filial_id,
      vendedor_id: pedido.vendedor_id,
      valor_implantacao: pedido.valor_implantacao.toString(),
      valor_mensalidade: pedido.valor_mensalidade.toString(),
      comissao_percentual: pedido.comissao_percentual.toString(),
      observacoes: pedido.observacoes || "",
    });
    setEditingPedido(pedido);
    setOpenDialog(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        cliente_id: form.cliente_id,
        plano_id: form.plano_id,
        filial_id: form.filial_id || profile?.filial_id,
        vendedor_id: form.vendedor_id || profile?.user_id,
        valor_implantacao: parseFloat(form.valor_implantacao) || 0,
        valor_mensalidade: parseFloat(form.valor_mensalidade) || 0,
        valor_total: valorTotal,
        comissao_percentual: parseFloat(form.comissao_percentual) || 0,
        comissao_valor: comissaoValor,
        observacoes: form.observacoes || null,
      };

      if (editingPedido) {
        // Se está reeditando um pedido reprovado, reenviar para financeiro
        const isReprovado = editingPedido.financeiro_status === "Reprovado";
        const updatePayload: Record<string, unknown> = { ...payload };
        if (isReprovado) {
          updatePayload.financeiro_status = "Aguardando";
          updatePayload.financeiro_motivo = null;
          updatePayload.financeiro_aprovado_em = null;
          updatePayload.financeiro_aprovado_por = null;
          updatePayload.contrato_liberado = false;
          updatePayload.status_pedido = "Aguardando Financeiro";
        }
        const { error } = await supabase.from("pedidos").update(updatePayload).eq("id", editingPedido.id);
        if (error) throw error;
        toast.success(isReprovado ? "Pedido reenviado para o financeiro!" : "Pedido atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("pedidos")
          .insert({ ...payload, status_pedido: "Aguardando Financeiro", financeiro_status: "Aguardando", contrato_liberado: false });
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
    const { error } = await supabase
      .from("pedidos")
      .update({ status_pedido: "Cancelado", comissao_valor: 0 })
      .eq("id", pedido.id);
    if (error) { toast.error("Erro ao cancelar pedido"); return; }
    toast.success("Pedido cancelado");
    loadData();
  }

  // Filtering
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

  // Clientes filtered for vendedor
  const clientesDisponiveis = isAdmin || isFinanceiro
    ? clientes
    : clientes.filter((c) => c.filial_id === profile?.filial_id);

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
              <Plus className="h-4 w-4" />
              Novo Pedido
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {(isAdmin || isFinanceiro) && (
              <Select value={filterFilial} onValueChange={setFilterFilial}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as filiais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as filiais</SelectItem>
                  {filiais.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(isAdmin || isFinanceiro) && (
              <Select value={filterVendedor} onValueChange={setFilterVendedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {vendedores.map((v) => (
                    <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex gap-2">
              <Input
                type="date"
                value={filterDe}
                onChange={(e) => setFilterDe(e.target.value)}
                className="text-xs"
                placeholder="De"
                title="Data inicial"
              />
              <Input
                type="date"
                value={filterAte}
                onChange={(e) => setFilterAte(e.target.value)}
                className="text-xs"
                placeholder="Até"
                title="Data final"
              />
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
                {(isAdmin || isFinanceiro) && <TableHead>Filial</TableHead>}
                {(isAdmin || isFinanceiro) && <TableHead>Vendedor</TableHead>}
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Financeiro</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((pedido) => {
                  const finStatus = (pedido as any).financeiro_status as string || "Aguardando";
                  const finMotivo = (pedido as any).financeiro_motivo as string | null;
                  const contratoLiberado = (pedido as any).contrato_liberado as boolean;
                  const isReprovado = finStatus === "Reprovado";
                  const canEdit = (isAdmin || (isVendedor && pedido.vendedor_id === profile?.user_id && (pedido.status_pedido === "Aguardando Financeiro" || isReprovado)));
                  const vendedorNome = vendedores.find((v) => v.user_id === pedido.vendedor_id)?.full_name || "—";
                  const filialNome = (pedido as any).filiais?.nome || filiais.find(f => f.id === pedido.filial_id)?.nome || "—";
                  return (
                    <TableRow key={pedido.id} className={isReprovado ? "bg-red-50/40" : undefined}>
                      <TableCell className="font-medium">
                        {(pedido as any).clientes?.nome_fantasia || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {(pedido as any).planos?.nome || "—"}
                      </TableCell>
                      {(isAdmin || isFinanceiro) && (
                        <TableCell className="text-sm text-muted-foreground">{filialNome}</TableCell>
                      )}
                      {(isAdmin || isFinanceiro) && (
                        <TableCell className="text-sm text-muted-foreground">{vendedorNome}</TableCell>
                      )}
                      <TableCell className="text-right font-mono text-sm">
                        {pedido.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-muted-foreground">
                        {pedido.comissao_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        <span className="text-xs ml-1">({pedido.comissao_percentual}%)</span>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[pedido.status_pedido] || "bg-muted text-muted-foreground"}`}>
                          {pedido.status_pedido}
                        </span>
                      </TableCell>
                      {/* Coluna Financeiro */}
                      <TableCell>
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FIN_STATUS_COLORS[finStatus] || "bg-muted text-muted-foreground"}`}>
                            {finStatus}
                          </span>
                          {contratoLiberado && (
                            <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle className="h-3 w-3" /> Contrato liberado
                            </div>
                          )}
                          {isReprovado && finMotivo && (
                            <p className="text-xs text-red-600 max-w-[180px] truncate" title={finMotivo}>
                              ⚠ {finMotivo}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Botão reenviar (vendedor, apenas quando reprovado) */}
                          {isVendedor && isReprovado && pedido.vendedor_id === profile?.user_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => openEdit(pedido)}
                              title="Editar e reenviar para financeiro"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {canEdit && !isReprovado && pedido.status_pedido === "Aguardando Financeiro" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(pedido)}
                              title="Editar pedido"
                            >
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
                                    O pedido de {(pedido as any).clientes?.nome_fantasia} será cancelado e a comissão zerada. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Voltar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => cancelarPedido(pedido)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
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
                })
              )}
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

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPedido ? "Editar Pedido" : "Novo Pedido"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Cliente */}
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Cliente *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                    onClick={() => { setClienteForm(emptyClienteForm); setOpenClienteDialog(true); }}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Novo cliente
                  </Button>
                </div>
                <Select value={form.cliente_id} onValueChange={(v) => setForm((f) => ({ ...f, cliente_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientesDisponiveis.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Plano */}
              <div className="col-span-2 space-y-1.5">
                <Label>Plano *</Label>
                <Select value={form.plano_id} onValueChange={(v) => setForm((f) => ({ ...f, plano_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano..." />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Admin: selecionar filial e vendedor */}
              {isAdmin && (
                <>
                  <div className="space-y-1.5">
                    <Label>Filial *</Label>
                    <Select value={form.filial_id} onValueChange={(v) => setForm((f) => ({ ...f, filial_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {filiais.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Vendedor *</Label>
                    <Select value={form.vendedor_id} onValueChange={(v) => {
                      const vend = vendedores.find((vv) => vv.user_id === v);
                      setForm((f) => ({
                        ...f,
                        vendedor_id: v,
                        comissao_percentual: vend?.comissao_percentual?.toString() ?? f.comissao_percentual,
                      }));
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {vendedores.map((v) => (
                          <SelectItem key={v.user_id} value={v.user_id}>{v.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Valores */}
              <div className="space-y-1.5">
                <Label>Valor Implantação (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_implantacao}
                  onChange={(e) => setForm((f) => ({ ...f, valor_implantacao: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Valor Mensalidade (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_mensalidade}
                  onChange={(e) => setForm((f) => ({ ...f, valor_mensalidade: e.target.value }))}
                />
              </div>

              {/* Valor Total (readonly) */}
              <div className="space-y-1.5">
                <Label>Valor Total (R$)</Label>
                <Input
                  readOnly
                  value={valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  className="bg-muted font-mono"
                />
              </div>

              {/* Comissão % */}
              <div className="space-y-1.5">
                <Label>Comissão (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={form.comissao_percentual}
                  onChange={(e) => setForm((f) => ({ ...f, comissao_percentual: e.target.value }))}
                />
              </div>

              {/* Comissão R$ (readonly) */}
              <div className="col-span-2 space-y-1.5">
                <Label>Comissão (R$)</Label>
                <Input
                  readOnly
                  value={comissaoValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  className="bg-muted font-mono"
                />
              </div>

              {/* Observações */}
              <div className="col-span-2 space-y-1.5">
                <Label>Observações</Label>
                <Textarea
                  placeholder="Observações opcionais..."
                  value={form.observacoes}
                  onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || !form.cliente_id || !form.plano_id}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingPedido ? "Salvar alterações" : "Criar pedido"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog rápido de novo cliente */}
      <Dialog open={openClienteDialog} onOpenChange={setOpenClienteDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Cadastrar Novo Cliente
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCliente} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Nome Fantasia *</Label>
                <Input
                  placeholder="Nome fantasia..."
                  value={clienteForm.nome_fantasia}
                  onChange={(e) => setClienteForm((f) => ({ ...f, nome_fantasia: e.target.value }))}
                  required
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Razão Social</Label>
                <Input
                  placeholder="Razão social..."
                  value={clienteForm.razao_social}
                  onChange={(e) => setClienteForm((f) => ({ ...f, razao_social: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>CNPJ / CPF *</Label>
                <Input
                  placeholder="00.000.000/0000-00"
                  value={clienteForm.cnpj_cpf}
                  onChange={(e) => setClienteForm((f) => ({ ...f, cnpj_cpf: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Contato</Label>
                <Input
                  placeholder="Nome do contato"
                  value={clienteForm.contato_nome}
                  onChange={(e) => setClienteForm((f) => ({ ...f, contato_nome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={clienteForm.telefone}
                  onChange={(e) => setClienteForm((f) => ({ ...f, telefone: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com"
                  value={clienteForm.email}
                  onChange={(e) => setClienteForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input
                  placeholder="Cidade"
                  value={clienteForm.cidade}
                  onChange={(e) => setClienteForm((f) => ({ ...f, cidade: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={clienteForm.uf} onValueChange={(v) => setClienteForm((f) => ({ ...f, uf: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_LIST.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenClienteDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingCliente}>
                {savingCliente && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Cadastrar e selecionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
