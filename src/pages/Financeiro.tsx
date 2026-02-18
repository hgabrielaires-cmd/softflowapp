import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";
import { Filial } from "@/lib/supabase-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { CheckCircle, XCircle, Loader2, Filter, Clock, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PedidoFila {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  filial_id: string;
  plano_id: string;
  valor_implantacao: number;
  valor_mensalidade: number;
  valor_total: number;
  comissao_percentual: number;
  comissao_valor: number;
  comissao_implantacao_percentual: number | null;
  comissao_implantacao_valor: number | null;
  comissao_mensalidade_percentual: number | null;
  comissao_mensalidade_valor: number | null;
  status_pedido: string;
  financeiro_status: string;
  financeiro_motivo: string | null;
  financeiro_aprovado_em: string | null;
  financeiro_aprovado_por: string | null;
  contrato_liberado: boolean;
  observacoes: string | null;
  created_at: string;
  clientes?: { nome_fantasia: string } | null;
  planos?: { nome: string } | null;
  filiais?: { nome: string } | null;
}

export default function Financeiro() {
  const { profile, roles, isAdmin } = useAuth();
  const isFinanceiro = roles.includes("financeiro");

  const [pedidos, setPedidos] = useState<PedidoFila[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterFilial, setFilterFilial] = useState("all");
  const [filterDe, setFilterDe] = useState("");
  const [filterAte, setFilterAte] = useState("");
  const [selected, setSelected] = useState<PedidoFila | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openReprovar, setOpenReprovar] = useState(false);
  const [motivoReprova, setMotivoReprova] = useState("");
  const [processando, setProcessando] = useState(false);

  const canAccess = isAdmin || isFinanceiro;

  async function loadData() {
    setLoading(true);
    const [{ data: pedidosData }, { data: filiaisData }] = await Promise.all([
      supabase
        .from("pedidos")
        .select("*, clientes(nome_fantasia), planos(nome), filiais(nome)")
        .eq("financeiro_status", "Aguardando")
        .order("created_at", { ascending: true }),
      supabase.from("filiais").select("*").eq("ativa", true).order("nome"),
    ]);
    setPedidos((pedidosData || []) as PedidoFila[]);
    setFiliais((filiaisData || []) as Filial[]);
    setLoading(false);
  }

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess]);

  if (!canAccess) return <Navigate to="/dashboard" replace />;

  const filtered = pedidos.filter((p) => {
    if (filterFilial !== "all" && p.filial_id !== filterFilial) return false;
    if (filterDe && p.created_at < filterDe) return false;
    if (filterAte && p.created_at > filterAte + "T23:59:59") return false;
    return true;
  });

  async function handleAprovar(pedido: PedidoFila) {
    setProcessando(true);
    const { error } = await supabase.from("pedidos").update({
      financeiro_status: "Aprovado",
      status_pedido: "Aprovado Financeiro",
      contrato_liberado: true,
      financeiro_aprovado_em: new Date().toISOString(),
      financeiro_aprovado_por: profile?.user_id,
      financeiro_motivo: null,
    }).eq("id", pedido.id);
    setProcessando(false);
    if (error) { toast.error("Erro ao aprovar pedido: " + error.message); return; }
    toast.success("Pedido aprovado! Contrato liberado.");
    setOpenDetail(false);
    loadData();
  }

  async function handleReprovar() {
    if (!selected) return;
    if (!motivoReprova.trim()) { toast.error("Informe o motivo da reprovação"); return; }
    setProcessando(true);
    const { error } = await supabase.from("pedidos").update({
      financeiro_status: "Reprovado",
      status_pedido: "Reprovado Financeiro",
      contrato_liberado: false,
      financeiro_motivo: motivoReprova.trim(),
      financeiro_aprovado_em: null,
      financeiro_aprovado_por: null,
    }).eq("id", selected.id);
    setProcessando(false);
    if (error) { toast.error("Erro ao reprovar pedido: " + error.message); return; }
    toast.success("Pedido reprovado.");
    setOpenReprovar(false);
    setOpenDetail(false);
    setMotivoReprova("");
    loadData();
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fila do Financeiro</h1>
            <p className="text-sm text-muted-foreground">Pedidos aguardando análise e aprovação</p>
          </div>
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <Clock className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-700">{filtered.length} aguardando</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" /> Filtros
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={filterFilial} onValueChange={setFilterFilial}>
              <SelectTrigger><SelectValue placeholder="Todas as filiais" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as filiais</SelectItem>
                {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={filterDe} onChange={(e) => setFilterDe(e.target.value)} title="Data inicial" />
            <Input type="date" value={filterAte} onChange={(e) => setFilterAte(e.target.value)} title="Data final" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead>Recebido em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                    Nenhum pedido aguardando análise
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">{pedido.clientes?.nome_fantasia || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pedido.planos?.nome || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pedido.filiais?.nome || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {pedido.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      <div className="space-y-0.5">
                        <p className="text-xs font-mono">{(pedido.comissao_implantacao_percentual ?? pedido.comissao_percentual)}% imp → <span className="font-semibold">{(pedido.comissao_implantacao_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
                        <p className="text-xs font-mono">{(pedido.comissao_mensalidade_percentual ?? pedido.comissao_percentual)}% mens → <span className="font-semibold">{(pedido.comissao_mensalidade_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
                        <p className="text-xs font-mono border-t border-border pt-0.5">Total: <span className="font-bold text-foreground">{pedido.comissao_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(pedido.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver detalhes"
                          onClick={() => { setSelected(pedido); setOpenDetail(true); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          title="Aprovar" disabled={processando}
                          onClick={() => handleAprovar(pedido)}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-red-50"
                          title="Reprovar"
                          onClick={() => { setSelected(pedido); setOpenReprovar(true); }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Detail Dialog */}
      {selected && (
        <Dialog open={openDetail} onOpenChange={setOpenDetail}>
          <DialogContent className="max-w-md" aria-describedby="detail-desc">
            <DialogHeader>
              <DialogTitle>Detalhe do Pedido</DialogTitle>
              <DialogDescription id="detail-desc">Analise os dados antes de aprovar ou reprovar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-semibold">{selected.clientes?.nome_fantasia}</p></div>
                <div><p className="text-muted-foreground text-xs">Plano</p><p className="font-semibold">{selected.planos?.nome}</p></div>
                <div><p className="text-muted-foreground text-xs">Filial</p><p className="font-semibold">{selected.filiais?.nome}</p></div>
                <div><p className="text-muted-foreground text-xs">Data</p><p className="font-semibold">{format(new Date(selected.created_at), "dd/MM/yyyy", { locale: ptBR })}</p></div>
                <div><p className="text-muted-foreground text-xs">Implantação</p><p className="font-mono">{selected.valor_implantacao.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
                <div><p className="text-muted-foreground text-xs">Mensalidade</p><p className="font-mono">{selected.valor_mensalidade.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Valor Total</p><p className="font-mono font-bold text-base">{selected.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div>
              </div>
              {/* Comissões separadas */}
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissões do Vendedor</p>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Implantação / Treinamento</span>
                    <span className="font-mono">{(selected.comissao_implantacao_percentual ?? selected.comissao_percentual)}% → {(selected.comissao_implantacao_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Mensalidade</span>
                    <span className="font-mono">{(selected.comissao_mensalidade_percentual ?? selected.comissao_percentual)}% → {(selected.comissao_mensalidade_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold border-t border-border pt-1">
                    <span>Total comissão</span>
                    <span className="font-mono">{selected.comissao_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              </div>
              {selected.observacoes && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Observações do vendedor</p>
                  <p>{selected.observacoes}</p>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAprovar(selected)} disabled={processando}>
                {processando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                Aprovar
              </Button>
              <Button variant="destructive" className="flex-1" onClick={() => { setOpenDetail(false); setOpenReprovar(true); }} disabled={processando}>
                <XCircle className="h-4 w-4 mr-2" /> Reprovar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Reproval Dialog */}
      <Dialog open={openReprovar} onOpenChange={(v) => { setOpenReprovar(v); if (!v) setMotivoReprova(""); }}>
        <DialogContent className="max-w-sm" aria-describedby="reprova-desc">
          <DialogHeader>
            <DialogTitle>Reprovar Pedido</DialogTitle>
            <DialogDescription id="reprova-desc">Informe o motivo. O vendedor poderá corrigir e reenviar.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Motivo da reprovação *</Label>
              <Textarea
                placeholder="Descreva o motivo para o vendedor..."
                value={motivoReprova}
                onChange={(e) => setMotivoReprova(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpenReprovar(false)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" onClick={handleReprovar} disabled={processando || !motivoReprova.trim()}>
                {processando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
