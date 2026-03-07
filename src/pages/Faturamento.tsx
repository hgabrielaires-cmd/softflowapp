import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Receipt, Plus, Loader2, MoreHorizontal, Pencil, Trash2,
  CheckCircle, XCircle, Filter, FileText, Search, Calendar,
  DollarSign, AlertTriangle, Clock,
} from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { format, parseISO, isAfter, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Fatura {
  id: string;
  numero_fatura: string;
  contrato_id: string | null;
  cliente_id: string;
  filial_id: string | null;
  pedido_id: string | null;
  valor: number;
  valor_desconto: number;
  valor_final: number;
  data_emissao: string;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  referencia_mes: number | null;
  referencia_ano: number | null;
  tipo: string;
  gerado_automaticamente: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  clientes?: { nome_fantasia: string } | null;
  contratos?: { numero_exibicao: string } | null;
}

interface NotaFiscal {
  id: string;
  fatura_id: string | null;
  cliente_id: string;
  filial_id: string | null;
  numero_nf: string;
  serie: string | null;
  valor: number;
  data_emissao: string;
  status: string;
  xml_url: string | null;
  pdf_url: string | null;
  observacoes: string | null;
  created_at: string;
  clientes?: { nome_fantasia: string } | null;
  faturas?: { numero_fatura: string } | null;
}

interface ClienteOption {
  id: string;
  nome_fantasia: string;
}

interface ContratoOption {
  id: string;
  numero_exibicao: string;
}

const STATUS_FATURA = [
  { value: "Pendente", label: "Pendente", color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800" },
  { value: "Pago", label: "Pago", color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800" },
  { value: "Vencido", label: "Vencido", color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800" },
  { value: "Cancelado", label: "Cancelado", color: "bg-muted text-muted-foreground border-border" },
];

const TIPOS_FATURA = [
  { value: "Mensalidade", label: "Mensalidade" },
  { value: "Implantação", label: "Implantação" },
  { value: "Serviço", label: "Serviço" },
  { value: "Avulsa", label: "Avulsa" },
];

const FORMAS_PAGAMENTO = [
  { value: "Boleto", label: "Boleto" },
  { value: "Pix", label: "Pix" },
  { value: "Cartão de Crédito", label: "Cartão de Crédito" },
  { value: "Cartão de Débito", label: "Cartão de Débito" },
  { value: "Transferência", label: "Transferência" },
  { value: "Dinheiro", label: "Dinheiro" },
];

const PAGE_SIZE = 15;

function fmtCurrency(val: number) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Faturamento() {
  const { user, roles } = useAuth();
  const { permissions: menuPerms, loading: permLoading } = useMenuPermissions(roles);

  if (!permLoading && menuPerms && !menuPerms.has("menu.faturamento")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <AppLayout>
      <FaturamentoContent />
    </AppLayout>
  );
}

function FaturamentoContent() {
  const [tab, setTab] = useState("faturas");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          Faturamento
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie faturas, cobranças e notas fiscais
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="faturas" className="gap-1.5">
            <DollarSign className="h-4 w-4" /> Faturas
          </TabsTrigger>
          <TabsTrigger value="notas" className="gap-1.5">
            <FileText className="h-4 w-4" /> Notas Fiscais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faturas">
          <FaturasTab />
        </TabsContent>
        <TabsContent value="notas">
          <NotasFiscaisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATURAS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function FaturasTab() {
  const { filialPadraoId } = useUserFiliais();
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [openEditor, setOpenEditor] = useState(false);
  const [editingFatura, setEditingFatura] = useState<Fatura | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [contratos, setContratos] = useState<ContratoOption[]>([]);
  const [registrarPagamentoId, setRegistrarPagamentoId] = useState<string | null>(null);
  const [pagamentoForm, setPagamentoForm] = useState({ data_pagamento: "", forma_pagamento: "" });

  const [form, setForm] = useState({
    cliente_id: "",
    contrato_id: "",
    valor: "",
    valor_desconto: "0",
    data_vencimento: "",
    tipo: "Mensalidade",
    forma_pagamento: "",
    referencia_mes: "",
    referencia_ano: "",
    observacoes: "",
  });

  const loadFaturas = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("faturas")
      .select("*, clientes(nome_fantasia), contratos(numero_exibicao)", { count: "exact" });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    if (tipoFilter !== "all") query = query.eq("tipo", tipoFilter);
    if (search.trim()) {
      query = query.or(`numero_fatura.ilike.%${search.trim()}%,clientes.nome_fantasia.ilike.%${search.trim()}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query
      .order("data_vencimento", { ascending: false })
      .range(from, to);

    if (error) toast.error("Erro ao carregar faturas: " + error.message);
    setFaturas((data || []) as unknown as Fatura[]);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search, statusFilter, tipoFilter]);

  const loadClientes = useCallback(async () => {
    const { data } = await supabase
      .from("clientes")
      .select("id, nome_fantasia")
      .eq("ativo", true)
      .order("nome_fantasia")
      .limit(500);
    setClientes((data || []) as ClienteOption[]);
  }, []);

  const loadContratos = useCallback(async (clienteId: string) => {
    if (!clienteId) { setContratos([]); return; }
    const { data } = await supabase
      .from("contratos")
      .select("id, numero_exibicao")
      .eq("cliente_id", clienteId)
      .eq("status", "Ativo")
      .order("numero_exibicao");
    setContratos((data || []) as ContratoOption[]);
  }, []);

  useEffect(() => { loadFaturas(); }, [loadFaturas]);
  useEffect(() => { loadClientes(); }, [loadClientes]);

  function openNew() {
    setEditingFatura(null);
    setForm({
      cliente_id: "", contrato_id: "", valor: "", valor_desconto: "0",
      data_vencimento: "", tipo: "Mensalidade", forma_pagamento: "",
      referencia_mes: String(new Date().getMonth() + 1),
      referencia_ano: String(new Date().getFullYear()),
      observacoes: "",
    });
    setContratos([]);
    setOpenEditor(true);
  }

  function openEdit(f: Fatura) {
    setEditingFatura(f);
    setForm({
      cliente_id: f.cliente_id,
      contrato_id: f.contrato_id || "",
      valor: String(f.valor),
      valor_desconto: String(f.valor_desconto),
      data_vencimento: f.data_vencimento,
      tipo: f.tipo,
      forma_pagamento: f.forma_pagamento || "",
      referencia_mes: f.referencia_mes ? String(f.referencia_mes) : "",
      referencia_ano: f.referencia_ano ? String(f.referencia_ano) : "",
      observacoes: f.observacoes || "",
    });
    loadContratos(f.cliente_id);
    setOpenEditor(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_id) { toast.error("Selecione um cliente"); return; }
    if (!form.valor || Number(form.valor) <= 0) { toast.error("Informe o valor"); return; }
    if (!form.data_vencimento) { toast.error("Informe a data de vencimento"); return; }

    setSaving(true);
    const valor = Number(form.valor);
    const desconto = Number(form.valor_desconto) || 0;

    const payload = {
      cliente_id: form.cliente_id,
      contrato_id: form.contrato_id || null,
      filial_id: filialPadraoId || null,
      valor,
      valor_desconto: desconto,
      valor_final: valor - desconto,
      data_vencimento: form.data_vencimento,
      tipo: form.tipo,
      forma_pagamento: form.forma_pagamento || null,
      referencia_mes: form.referencia_mes ? Number(form.referencia_mes) : null,
      referencia_ano: form.referencia_ano ? Number(form.referencia_ano) : null,
      observacoes: form.observacoes.trim() || null,
    };

    if (editingFatura) {
      const { error } = await supabase.from("faturas").update(payload).eq("id", editingFatura.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("faturas").insert(payload);
      if (error) { toast.error("Erro ao criar: " + error.message); setSaving(false); return; }
    }

    toast.success(editingFatura ? "Fatura atualizada!" : "Fatura criada!");
    setSaving(false);
    setOpenEditor(false);
    loadFaturas();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("faturas").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Fatura excluída");
    setDeletingId(null);
    loadFaturas();
  }

  async function handleCancelar(id: string) {
    const { error } = await supabase.from("faturas").update({ status: "Cancelado" }).eq("id", id);
    if (error) { toast.error("Erro ao cancelar: " + error.message); return; }
    toast.success("Fatura cancelada");
    loadFaturas();
  }

  async function handleRegistrarPagamento() {
    if (!registrarPagamentoId) return;
    if (!pagamentoForm.data_pagamento) { toast.error("Informe a data do pagamento"); return; }

    const { error } = await supabase.from("faturas").update({
      status: "Pago",
      data_pagamento: pagamentoForm.data_pagamento,
      forma_pagamento: pagamentoForm.forma_pagamento || null,
    }).eq("id", registrarPagamentoId);

    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Pagamento registrado!");
    setRegistrarPagamentoId(null);
    loadFaturas();
  }

  function getStatusBadge(status: string) {
    const s = STATUS_FATURA.find(s => s.value === status);
    return <Badge className={`text-xs ${s?.color || "bg-muted text-muted-foreground"}`}>{s?.label || status}</Badge>;
  }

  function isVencida(f: Fatura) {
    return f.status === "Pendente" && isBefore(parseISO(f.data_vencimento), startOfDay(new Date()));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº ou cliente..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 h-9 w-64"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36">
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUS_FATURA.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tipoFilter} onValueChange={(v) => { setTipoFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {TIPOS_FATURA.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Nova Fatura
        </Button>
      </div>

      {/* Summary Cards */}
      <FaturasResumo faturas={faturas} />

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nº Fatura</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Contrato</TableHead>
              <TableHead>Referência</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
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
            ) : faturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhuma fatura encontrada
                </TableCell>
              </TableRow>
            ) : faturas.map((f) => (
              <TableRow key={f.id} className={isVencida(f) ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                <TableCell className="font-mono text-sm font-medium">{f.numero_fatura}</TableCell>
                <TableCell className="max-w-[180px] truncate">{f.clientes?.nome_fantasia || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{f.tipo}</Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{f.contratos?.numero_exibicao || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {f.referencia_mes && f.referencia_ano
                    ? `${String(f.referencia_mes).padStart(2, "0")}/${f.referencia_ano}`
                    : "—"}
                </TableCell>
                <TableCell className="text-right font-medium whitespace-nowrap">
                  {f.valor_desconto > 0 ? (
                    <div>
                      <span className="line-through text-muted-foreground text-xs mr-1">{fmtCurrency(f.valor)}</span>
                      <span>{fmtCurrency(f.valor_final)}</span>
                    </div>
                  ) : (
                    fmtCurrency(f.valor_final)
                  )}
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {isVencida(f) && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                    {format(parseISO(f.data_vencimento), "dd/MM/yyyy")}
                  </div>
                </TableCell>
                <TableCell>
                  {isVencida(f)
                    ? <Badge className="text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">Vencido</Badge>
                    : getStatusBadge(f.status)
                  }
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {f.status === "Pendente" && (
                        <DropdownMenuItem onClick={() => {
                          setRegistrarPagamentoId(f.id);
                          setPagamentoForm({ data_pagamento: format(new Date(), "yyyy-MM-dd"), forma_pagamento: f.forma_pagamento || "" });
                        }} className="cursor-pointer">
                          <CheckCircle className="h-4 w-4 mr-2" /> Registrar Pagamento
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => openEdit(f)} className="cursor-pointer">
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      {f.status === "Pendente" && (
                        <DropdownMenuItem onClick={() => handleCancelar(f.id)} className="cursor-pointer">
                          <XCircle className="h-4 w-4 mr-2" /> Cancelar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeletingId(f.id)} className="cursor-pointer text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <TablePagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
      )}

      {/* Editor Dialog */}
      <Dialog open={openEditor} onOpenChange={setOpenEditor}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              {editingFatura ? "Editar Fatura" : "Nova Fatura"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={(v) => { setForm(f => ({ ...f, cliente_id: v, contrato_id: "" })); loadContratos(v); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {contratos.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Contrato (opcional)</Label>
                <Select value={form.contrato_id || "_none"} onValueChange={(v) => setForm(f => ({ ...f, contrato_id: v === "_none" ? "" : v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum</SelectItem>
                    {contratos.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.numero_exibicao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_FATURA.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={form.forma_pagamento || "_none"} onValueChange={(v) => setForm(f => ({ ...f, forma_pagamento: v === "_none" ? "" : v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhuma</SelectItem>
                    {FORMAS_PAGAMENTO.map(fp => (
                      <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor *</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Desconto</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor_desconto} onChange={(e) => setForm(f => ({ ...f, valor_desconto: e.target.value }))} className="h-9" />
              </div>
            </div>

            {form.valor && Number(form.valor) > 0 && (
              <div className="text-sm font-medium text-right text-primary">
                Valor Final: {fmtCurrency(Number(form.valor) - (Number(form.valor_desconto) || 0))}
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Data de Vencimento *</Label>
              <Input type="date" value={form.data_vencimento} onChange={(e) => setForm(f => ({ ...f, data_vencimento: e.target.value }))} className="h-9" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mês Referência</Label>
                <Select value={form.referencia_mes} onValueChange={(v) => setForm(f => ({ ...f, referencia_mes: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Mês" /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {format(new Date(2024, i, 1), "MMMM", { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ano Referência</Label>
                <Input type="number" min="2020" max="2030" placeholder="2026" value={form.referencia_ano} onChange={(e) => setForm(f => ({ ...f, referencia_ano: e.target.value }))} className="h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea placeholder="Observações opcionais..." value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} className="min-h-[60px]" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEditor(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingFatura ? "Salvar" : "Criar Fatura"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Registrar Pagamento Dialog */}
      <Dialog open={!!registrarPagamentoId} onOpenChange={() => setRegistrarPagamentoId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" /> Registrar Pagamento
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data do Pagamento *</Label>
              <Input type="date" value={pagamentoForm.data_pagamento} onChange={(e) => setPagamentoForm(f => ({ ...f, data_pagamento: e.target.value }))} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={pagamentoForm.forma_pagamento || "_none"} onValueChange={(v) => setPagamentoForm(f => ({ ...f, forma_pagamento: v === "_none" ? "" : v }))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Nenhuma</SelectItem>
                  {FORMAS_PAGAMENTO.map(fp => (
                    <SelectItem key={fp.value} value={fp.value}>{fp.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRegistrarPagamentoId(null)}>Cancelar</Button>
              <Button onClick={handleRegistrarPagamento}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fatura?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Summary cards ───────────────────────────────────────────────────────────

function FaturasResumo({ faturas }: { faturas: Fatura[] }) {
  const pendentes = faturas.filter(f => f.status === "Pendente");
  const vencidas = pendentes.filter(f => isBefore(parseISO(f.data_vencimento), startOfDay(new Date())));
  const totalPendente = pendentes.reduce((sum, f) => sum + f.valor_final, 0);
  const totalVencido = vencidas.reduce((sum, f) => sum + f.valor_final, 0);
  const pagos = faturas.filter(f => f.status === "Pago");
  const totalPago = pagos.reduce((sum, f) => sum + f.valor_final, 0);

  const cards = [
    { label: "Pendentes", value: fmtCurrency(totalPendente), count: pendentes.length, icon: <Clock className="h-4 w-4 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-950/20" },
    { label: "Vencidas", value: fmtCurrency(totalVencido), count: vencidas.length, icon: <AlertTriangle className="h-4 w-4 text-red-500" />, bg: "bg-red-50 dark:bg-red-950/20" },
    { label: "Pagas", value: fmtCurrency(totalPago), count: pagos.length, icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, bg: "bg-emerald-50 dark:bg-emerald-950/20" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {cards.map((c) => (
        <div key={c.label} className={`rounded-lg border border-border p-3 ${c.bg}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {c.icon} {c.label} ({c.count})
          </div>
          <div className="text-lg font-bold">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTAS FISCAIS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function NotasFiscaisTab() {
  const { filialPadraoId } = useUserFiliais();
  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [openEditor, setOpenEditor] = useState(false);
  const [editingNota, setEditingNota] = useState<NotaFiscal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState<ClienteOption[]>([]);
  const [faturasOptions, setFaturasOptions] = useState<{ id: string; numero_fatura: string }[]>([]);

  const [form, setForm] = useState({
    cliente_id: "",
    fatura_id: "",
    numero_nf: "",
    serie: "1",
    valor: "",
    data_emissao: format(new Date(), "yyyy-MM-dd"),
    observacoes: "",
  });

  const loadNotas = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("notas_fiscais")
      .select("*, clientes(nome_fantasia), faturas(numero_fatura)", { count: "exact" });

    if (search.trim()) {
      query = query.or(`numero_nf.ilike.%${search.trim()}%,clientes.nome_fantasia.ilike.%${search.trim()}%`);
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, count, error } = await query
      .order("data_emissao", { ascending: false })
      .range(from, to);

    if (error) toast.error("Erro ao carregar notas: " + error.message);
    setNotas((data || []) as unknown as NotaFiscal[]);
    setTotal(count || 0);
    setLoading(false);
  }, [page, search]);

  const loadClientes = useCallback(async () => {
    const { data } = await supabase.from("clientes").select("id, nome_fantasia").eq("ativo", true).order("nome_fantasia").limit(500);
    setClientes((data || []) as ClienteOption[]);
  }, []);

  const loadFaturas = useCallback(async (clienteId: string) => {
    if (!clienteId) { setFaturasOptions([]); return; }
    const { data } = await supabase
      .from("faturas")
      .select("id, numero_fatura")
      .eq("cliente_id", clienteId)
      .order("numero_fatura", { ascending: false })
      .limit(50);
    setFaturasOptions((data || []) as { id: string; numero_fatura: string }[]);
  }, []);

  useEffect(() => { loadNotas(); }, [loadNotas]);
  useEffect(() => { loadClientes(); }, [loadClientes]);

  function openNew() {
    setEditingNota(null);
    setForm({ cliente_id: "", fatura_id: "", numero_nf: "", serie: "1", valor: "", data_emissao: format(new Date(), "yyyy-MM-dd"), observacoes: "" });
    setFaturasOptions([]);
    setOpenEditor(true);
  }

  function openEdit(n: NotaFiscal) {
    setEditingNota(n);
    setForm({
      cliente_id: n.cliente_id,
      fatura_id: n.fatura_id || "",
      numero_nf: n.numero_nf,
      serie: n.serie || "1",
      valor: String(n.valor),
      data_emissao: n.data_emissao,
      observacoes: n.observacoes || "",
    });
    loadFaturas(n.cliente_id);
    setOpenEditor(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.cliente_id) { toast.error("Selecione um cliente"); return; }
    if (!form.numero_nf.trim()) { toast.error("Informe o número da NF"); return; }
    if (!form.valor || Number(form.valor) <= 0) { toast.error("Informe o valor"); return; }

    setSaving(true);
    const payload = {
      cliente_id: form.cliente_id,
      fatura_id: form.fatura_id || null,
      filial_id: filialPadraoId || null,
      numero_nf: form.numero_nf.trim(),
      serie: form.serie || "1",
      valor: Number(form.valor),
      data_emissao: form.data_emissao,
      observacoes: form.observacoes.trim() || null,
    };

    if (editingNota) {
      const { error } = await supabase.from("notas_fiscais").update(payload).eq("id", editingNota.id);
      if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("notas_fiscais").insert(payload);
      if (error) { toast.error("Erro: " + error.message); setSaving(false); return; }
    }

    toast.success(editingNota ? "NF atualizada!" : "NF registrada!");
    setSaving(false);
    setOpenEditor(false);
    loadNotas();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("notas_fiscais").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("NF excluída");
    setDeletingId(null);
    loadNotas();
  }

  async function handleCancelarNF(id: string) {
    const { error } = await supabase.from("notas_fiscais").update({ status: "Cancelada" }).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("NF cancelada");
    loadNotas();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nº NF ou cliente..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9 w-64" />
        </div>
        <Button className="gap-2" onClick={openNew}>
          <Plus className="h-4 w-4" /> Nova NF
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Nº NF</TableHead>
              <TableHead>Série</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Fatura</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : notas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhuma nota fiscal encontrada
                </TableCell>
              </TableRow>
            ) : notas.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="font-mono text-sm font-medium">{n.numero_nf}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{n.serie}</TableCell>
                <TableCell className="max-w-[180px] truncate">{n.clientes?.nome_fantasia || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{n.faturas?.numero_fatura || "—"}</TableCell>
                <TableCell className="text-right font-medium">{fmtCurrency(n.valor)}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">{format(parseISO(n.data_emissao), "dd/MM/yyyy")}</TableCell>
                <TableCell>
                  <Badge className={`text-xs ${n.status === "Emitida"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                    : "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                  }`}>
                    {n.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => openEdit(n)} className="cursor-pointer">
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      {n.status === "Emitida" && (
                        <DropdownMenuItem onClick={() => handleCancelarNF(n.id)} className="cursor-pointer">
                          <XCircle className="h-4 w-4 mr-2" /> Cancelar NF
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeletingId(n.id)} className="cursor-pointer text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <TablePagination currentPage={page} totalPages={totalPages} totalItems={total} itemsPerPage={PAGE_SIZE} onPageChange={setPage} />
      )}

      {/* NF Editor */}
      <Dialog open={openEditor} onOpenChange={setOpenEditor}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {editingNota ? "Editar Nota Fiscal" : "Nova Nota Fiscal"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.cliente_id} onValueChange={(v) => { setForm(f => ({ ...f, cliente_id: v, fatura_id: "" })); loadFaturas(v); }}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nome_fantasia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {faturasOptions.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Fatura vinculada (opcional)</Label>
                <Select value={form.fatura_id || "_none"} onValueChange={(v) => setForm(f => ({ ...f, fatura_id: v === "_none" ? "" : v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhuma</SelectItem>
                    {faturasOptions.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.numero_fatura}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nº da NF *</Label>
                <Input placeholder="00001" value={form.numero_nf} onChange={(e) => setForm(f => ({ ...f, numero_nf: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Série</Label>
                <Input placeholder="1" value={form.serie} onChange={(e) => setForm(f => ({ ...f, serie: e.target.value }))} className="h-9" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Valor *</Label>
                <Input type="number" step="0.01" min="0" placeholder="0,00" value={form.valor} onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data de Emissão</Label>
                <Input type="date" value={form.data_emissao} onChange={(e) => setForm(f => ({ ...f, data_emissao: e.target.value }))} className="h-9" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea placeholder="Observações opcionais..." value={form.observacoes} onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))} className="min-h-[60px]" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenEditor(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingNota ? "Salvar" : "Registrar NF"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete NF */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir nota fiscal?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
