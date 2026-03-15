import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { useUserFiliais } from "@/hooks/useUserFiliais";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCircle, XCircle, Filter, FileText, Search,
  DollarSign, AlertTriangle, Clock, Building2, Zap, MessageCircle, Eye,
} from "lucide-react";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import type { Fatura, NotaFiscal, FaturaFormState, NotaFiscalFormState } from "@/pages/faturamento";
import {
  STATUS_FATURA, TIPOS_FATURA, PAGE_SIZE,
  newFaturaFormDefaults, newNotaFiscalFormDefaults,
  useFaturasQueries, useNotasFiscaisQueries,
} from "@/pages/faturamento";
import {
  fmtCurrency, isVencida, getStatusFaturaColor,
  validateFaturaForm, validateNotaFiscalForm,
  buildFaturaPayload, buildNotaFiscalPayload,
  faturaToFormState,
} from "@/pages/faturamento";

import { FaturaEditorDialog } from "@/pages/faturamento/components/FaturaEditorDialog";
import { RegistrarPagamentoDialog } from "@/pages/faturamento/components/RegistrarPagamentoDialog";
import { NotaFiscalEditorDialog } from "@/pages/faturamento/components/NotaFiscalEditorDialog";
import { AguardandoFaturamentoTab } from "@/pages/faturamento/components/AguardandoFaturamentoTab";
import { GerarFaturasButton } from "@/pages/faturamento/components/GerarFaturasDialog";
import { CronLogsSection } from "@/pages/faturamento/components/CronLogsSection";
import { FaturaComposicaoDialog } from "@/pages/faturamento/components/FaturaComposicaoDialog";

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
  const [tab, setTab] = useState("aguardando");
  const { profile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { filiaisDoUsuario, filialPadraoId, isGlobal, loading: filiaisLoading } = useUserFiliais();

  const [filialFilter, setFilialFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!filiaisLoading && profile && filialFilter === null) {
      const favoritaId = profile.filial_favorita_id;
      if (favoritaId && filiaisDoUsuario.some(f => f.id === favoritaId)) {
        setFilialFilter(favoritaId);
      } else {
        setFilialFilter("all");
      }
    }
  }, [filiaisLoading, profile?.filial_favorita_id]);

  const effectiveFilter = filialFilter || "all";
  const showFilialFilter = filiaisDoUsuario.length > 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Faturamento
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie faturas, cobranças e notas fiscais
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && <GerarFaturasButton />}

          {isAdmin && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/financeiro/teste-asaas")}
            >
              <Zap className="h-4 w-4" />
              Teste Asaas
            </Button>
          )}

          {showFilialFilter && (
            <Select value={effectiveFilter} onValueChange={setFilialFilter}>
              <SelectTrigger className="h-9 w-56">
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue placeholder="Filial" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Filiais</SelectItem>
                {filiaisDoUsuario.map(f => (
                  <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="aguardando" className="gap-1.5">
            <Clock className="h-4 w-4" /> Aguardando Faturamento
          </TabsTrigger>
          <TabsTrigger value="faturas" className="gap-1.5">
            <DollarSign className="h-4 w-4" /> Faturas
          </TabsTrigger>
          <TabsTrigger value="notas" className="gap-1.5">
            <FileText className="h-4 w-4" /> Notas Fiscais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="aguardando">
          <AguardandoFaturamentoTab filialFilter={effectiveFilter} />
        </TabsContent>
        <TabsContent value="faturas">
          <FaturasTab filialFilter={effectiveFilter} />
        </TabsContent>
        <TabsContent value="notas">
          <NotasFiscaisTab filialFilter={effectiveFilter} />
        </TabsContent>
      </Tabs>

      {/* Cron logs (admin only) */}
      {isAdmin && <CronLogsSection />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FATURAS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function FaturasTab({ filialFilter }: { filialFilter: string }) {
  const { filialPadraoId } = useUserFiliais();
  const q = useFaturasQueries(filialFilter);

  const [openEditor, setOpenEditor] = useState(false);
  const [editingFatura, setEditingFatura] = useState<Fatura | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FaturaFormState>(newFaturaFormDefaults());
  const [detalheFatura, setDetalheFatura] = useState<Fatura | null>(null);
  const [composicaoFaturaId, setComposicaoFaturaId] = useState<string | null>(null);

  function openNew() {
    setEditingFatura(null);
    setForm(newFaturaFormDefaults());
    q.setContratos([]);
    setOpenEditor(true);
  }

  function openEdit(f: Fatura) {
    setEditingFatura(f);
    setForm(faturaToFormState(f));
    q.loadContratos(f.cliente_id);
    setOpenEditor(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const err = validateFaturaForm(form);
    if (err) { toast.error(err); return; }

    setSaving(true);
    const payload = buildFaturaPayload(form, filialPadraoId || null);

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
    q.loadFaturas();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("faturas").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Fatura excluída");
    setDeletingId(null);
    q.loadFaturas();
  }

  async function handleCancelar(id: string) {
    const { error } = await supabase.from("faturas").update({ status: "Cancelado" }).eq("id", id);
    if (error) { toast.error("Erro ao cancelar: " + error.message); return; }
    toast.success("Fatura cancelada");
    q.loadFaturas();
  }

  const [sendingWhatsApp, setSendingWhatsApp] = useState<string | null>(null);

  async function handleEnviarWhatsApp(f: Fatura) {
    if (!f.cliente_id) { toast.error("Fatura sem cliente vinculado"); return; }
    setSendingWhatsApp(f.id);
    try {
      // Get client data
      const { data: cliente } = await supabase
        .from("clientes")
        .select("nome_fantasia, telefone")
        .eq("id", f.cliente_id)
        .single();

      // Get decisor contact
      const { data: decisor } = await supabase
        .from("cliente_contatos")
        .select("telefone, nome")
        .eq("cliente_id", f.cliente_id)
        .eq("decisor", true)
        .eq("ativo", true)
        .maybeSingle();

      const phone = decisor?.telefone || cliente?.telefone;
      if (!phone) { toast.error("Nenhum telefone encontrado para o cliente"); setSendingWhatsApp(null); return; }

      // Get WhatsApp config
      const { data: whatsConfig } = await supabase
        .from("integracoes_config")
        .select("server_url, token, ativo")
        .eq("nome", "whatsapp")
        .maybeSingle();

      if (!whatsConfig?.ativo || !whatsConfig?.server_url || !whatsConfig?.token) {
        toast.error("Integração WhatsApp não configurada");
        setSendingWhatsApp(null);
        return;
      }

      // Get Financeiro sector instance
      const { data: setorFinanceiro } = await supabase
        .from("setores")
        .select("instance_name")
        .ilike("nome", "financeiro")
        .eq("ativo", true)
        .maybeSingle();

      const instanceName = setorFinanceiro?.instance_name || "Softflow_WhatsApp";

      const nomeContato = decisor?.nome || cliente?.nome_fantasia || "Cliente";
      const nomeFantasia = cliente?.nome_fantasia || "—";
      const valorFmt = f.valor_final.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const dataFmt = format(parseISO(f.data_vencimento), "dd/MM/yyyy");

      // If PIX code is missing but we have asaas_payment_id, try to fetch it
      let pixCode = f.asaas_pix_qrcode;
      if (!pixCode && f.asaas_payment_id && f.filial_id) {
        try {
          const { data: pixResult } = await supabase.functions.invoke("asaas", {
            body: {
              action: "fetch_pix",
              payment_id: f.asaas_payment_id,
              filial_id: f.filial_id,
            },
          });
          if (pixResult?.pix_qrcode) {
            pixCode = pixResult.pix_qrcode;
            // Save for future use
            await supabase.from("faturas").update({
              asaas_pix_qrcode: pixCode,
              asaas_pix_image: pixResult.pix_image || null,
            }).eq("id", f.id);
          }
        } catch (_pixErr) {
          console.warn("Could not fetch PIX code:", _pixErr);
        }
      }

      const billingType = (f.forma_pagamento || "").toUpperCase().includes("PIX") ? "PIX" : "BOLETO";

      let text = "";
      if (billingType === "PIX") {
        text = `Olá ${nomeContato}! 👋\n\nSua fatura está disponível:\n\nEmpresa: ${nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${dataFmt}*\n\n💠 PIX Copia e Cola:\n${pixCode || "—"}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
      } else {
        text = `Olá ${nomeContato}! 👋\n\nA fatura está disponível:\n\nEmpresa: ${nomeFantasia}\n\n💰 Valor: *R$ ${valorFmt}*\n📅 Vencimento: *${dataFmt}*\n\n🔗 Acesse o boleto: ${f.asaas_url || "—"}\n\nLinha digitável:\n${f.asaas_barcode || "—"}${pixCode ? `\n\n💠 PIX Copia e Cola:\n${pixCode}` : ""}\n\nQualquer dúvida, é só chamar! 😊\n\n_Softplus Tecnologia_`;
      }

      // Format phone number
      let formattedNumber = phone.replace(/\D/g, "");
      if (formattedNumber.startsWith("0")) formattedNumber = "55" + formattedNumber.substring(1);
      if (!formattedNumber.startsWith("55")) formattedNumber = "55" + formattedNumber;

      const baseUrl = whatsConfig.server_url.replace(/\/+$/, "");

      const { data: result, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send_text",
          instance_name: instanceName,
          number: formattedNumber,
          text,
        },
      });

      if (error) throw error;

      toast.success("Mensagem enviada com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar WhatsApp:", err);
      toast.error("Erro ao enviar mensagem: " + (err?.message || "Erro desconhecido"));
    } finally {
      setSendingWhatsApp(null);
    }
  }

  function getStatusBadge(status: string) {
    return <Badge className={`text-xs ${getStatusFaturaColor(status)}`}>{STATUS_FATURA.find(s => s.value === status)?.label || status}</Badge>;
  }

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nº ou cliente..."
              value={q.search}
              onChange={(e) => { q.setSearch(e.target.value); q.setPage(1); }}
              className="pl-9 h-9 w-64"
            />
          </div>
          <Select value={q.statusFilter} onValueChange={(v) => { q.setStatusFilter(v); q.setPage(1); }}>
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
          <Select value={q.tipoFilter} onValueChange={(v) => { q.setTipoFilter(v); q.setPage(1); }}>
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
      <FaturasResumo faturas={q.faturas} />

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
            {q.loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : q.faturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhuma fatura encontrada
                </TableCell>
              </TableRow>
            ) : q.faturas.map((f) => (
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
                      {(f.asaas_barcode || f.asaas_pix_qrcode || f.asaas_url) && (
                        <DropdownMenuItem onClick={() => setDetalheFatura(f)} className="cursor-pointer">
                          <Receipt className="h-4 w-4 mr-2" /> Detalhes Cobrança
                        </DropdownMenuItem>
                      )}
                      {f.status !== "Cancelado" && (
                        <DropdownMenuItem
                          onClick={() => handleEnviarWhatsApp(f)}
                          disabled={sendingWhatsApp === f.id}
                          className="cursor-pointer"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {sendingWhatsApp === f.id ? "Enviando..." : "Enviar Mensagem"}
                        </DropdownMenuItem>
                      )}
                      {f.status === "Pendente" && (
                        <DropdownMenuItem onClick={() => q.openRegistrarPagamento(f.id, f.forma_pagamento)} className="cursor-pointer">
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

      {q.totalPages > 1 && (
        <TablePagination currentPage={q.page} totalPages={q.totalPages} totalItems={q.total} itemsPerPage={PAGE_SIZE} onPageChange={q.setPage} />
      )}

      {/* Editor Dialog */}
      <FaturaEditorDialog
        open={openEditor}
        onOpenChange={setOpenEditor}
        editingFatura={editingFatura}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        clientes={q.clientes}
        contratos={q.contratos}
        loadContratos={q.loadContratos}
      />

      {/* Registrar Pagamento Dialog */}
      <RegistrarPagamentoDialog
        open={!!q.registrarPagamentoId}
        onOpenChange={() => q.setRegistrarPagamentoId(null)}
        pagamentoForm={q.pagamentoForm}
        setPagamentoForm={q.setPagamentoForm}
        onConfirm={q.handleRegistrarPagamento}
      />

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

      {/* Detalhes Cobrança Dialog */}
      <FaturaCobrancaDialog fatura={detalheFatura} onClose={() => setDetalheFatura(null)} />
    </div>
  );
}

// ─── Detalhes Cobrança Dialog ─────────────────────────────────────────────

function FaturaCobrancaDialog({ fatura, onClose }: { fatura: Fatura | null; onClose: () => void }) {
  if (!fatura) return null;

  const hasBoleto = !!fatura.asaas_barcode || !!fatura.asaas_bank_slip_url;
  const hasPix = !!fatura.asaas_pix_qrcode || !!fatura.asaas_pix_image;
  const hasAsaasUrl = !!fatura.asaas_url;

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  }

  return (
    <Dialog open={!!fatura} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Cobrança — {fatura.numero_fatura}
          </DialogTitle>
          <DialogDescription>
            {fatura.clientes?.nome_fantasia} • {fmtCurrency(fatura.valor_final)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Boleto section */}
          {hasBoleto && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Boleto
              </h4>
              {fatura.asaas_barcode && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Linha digitável</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={fatura.asaas_barcode}
                      className="font-mono text-xs h-9"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-9"
                      onClick={() => copyToClipboard(fatura.asaas_barcode!, "Linha digitável")}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
              {fatura.asaas_bank_slip_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => window.open(fatura.asaas_bank_slip_url!, "_blank")}
                >
                  <FileText className="h-4 w-4" /> Visualizar Boleto
                </Button>
              )}
            </div>
          )}

          {/* PIX section */}
          {hasPix && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" /> PIX
              </h4>
              {fatura.asaas_pix_image && (
                <div className="flex justify-center bg-white rounded-lg p-4 border">
                  <img
                    src={`data:image/png;base64,${fatura.asaas_pix_image}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              )}
              {fatura.asaas_pix_qrcode && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Copia e Cola</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={fatura.asaas_pix_qrcode}
                      className="font-mono text-xs h-9"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-9"
                      onClick={() => copyToClipboard(fatura.asaas_pix_qrcode!, "Código PIX")}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Link pagamento */}
          {hasAsaasUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => window.open(fatura.asaas_url!, "_blank")}
            >
              <DollarSign className="h-4 w-4" /> Abrir Link de Pagamento
            </Button>
          )}

          {/* Sem dados */}
          {!hasBoleto && !hasPix && !hasAsaasUrl && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma informação de cobrança disponível para esta fatura.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Summary cards ───────────────────────────────────────────────────────────

function FaturasResumo({ faturas }: { faturas: Fatura[] }) {
  const pendentes = faturas.filter(f => f.status === "Pendente");
  const vencidas = pendentes.filter(f => isVencida(f));
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

function NotasFiscaisTab({ filialFilter }: { filialFilter: string }) {
  const { filialPadraoId } = useUserFiliais();
  const q = useNotasFiscaisQueries(filialFilter);

  const [openEditor, setOpenEditor] = useState(false);
  const [editingNota, setEditingNota] = useState<NotaFiscal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<NotaFiscalFormState>(newNotaFiscalFormDefaults());

  function openNew() {
    setEditingNota(null);
    setForm(newNotaFiscalFormDefaults());
    q.setFaturasOptions([]);
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
    q.loadFaturasOptions(n.cliente_id);
    setOpenEditor(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const err = validateNotaFiscalForm(form);
    if (err) { toast.error(err); return; }

    setSaving(true);
    const payload = buildNotaFiscalPayload(form, filialPadraoId || null);

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
    q.loadNotas();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("notas_fiscais").delete().eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("NF excluída");
    setDeletingId(null);
    q.loadNotas();
  }

  async function handleCancelarNF(id: string) {
    const { error } = await supabase.from("notas_fiscais").update({ status: "Cancelada" }).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("NF cancelada");
    q.loadNotas();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nº NF ou cliente..." value={q.search} onChange={(e) => { q.setSearch(e.target.value); q.setPage(1); }} className="pl-9 h-9 w-64" />
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
            {q.loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : q.notas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhuma nota fiscal encontrada
                </TableCell>
              </TableRow>
            ) : q.notas.map((n) => (
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

      {q.totalPages > 1 && (
        <TablePagination currentPage={q.page} totalPages={q.totalPages} totalItems={q.total} itemsPerPage={PAGE_SIZE} onPageChange={q.setPage} />
      )}

      {/* NF Editor */}
      <NotaFiscalEditorDialog
        open={openEditor}
        onOpenChange={setOpenEditor}
        editingNota={editingNota}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        clientes={q.clientes}
        faturasOptions={q.faturasOptions}
        loadFaturasOptions={q.loadFaturasOptions}
      />

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
