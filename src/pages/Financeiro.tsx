import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { useMenuPermissions } from "@/hooks/useMenuPermissions";
import { Navigate } from "react-router-dom";
import { Filial } from "@/lib/supabase-types";
import { PedidoComentarios } from "@/components/PedidoComentarios";
import { useUserFiliais } from "@/hooks/useUserFiliais";
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
import { useNavigate } from "react-router-dom";
import { TablePagination } from "@/components/TablePagination";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ModuloAdicionadoItem {
  modulo_id: string;
  nome: string;
  quantidade: number;
  valor_implantacao_modulo: number;
  valor_mensalidade_modulo: number;
}

interface ServicoAdicionadoItem {
  servico_id: string;
  nome: string;
  quantidade: number;
  valor_unitario: number;
  unidade_medida: string;
}

interface PedidoFila {
  id: string;
  cliente_id: string;
  vendedor_id: string;
  filial_id: string;
  plano_id: string;
  tipo_pedido: string;
  tipo_atendimento: string | null;
  valor_implantacao: number;
  valor_mensalidade: number;
  valor_total: number;
  valor_implantacao_original: number;
  valor_mensalidade_original: number;
  valor_implantacao_final: number;
  valor_mensalidade_final: number;
  desconto_implantacao_tipo: string;
  desconto_implantacao_valor: number;
  desconto_mensalidade_tipo: string;
  desconto_mensalidade_valor: number;
  motivo_desconto: string | null;
  comissao_percentual: number;
  comissao_valor: number;
  comissao_implantacao_percentual: number | null;
  comissao_implantacao_valor: number | null;
  comissao_mensalidade_percentual: number | null;
  comissao_mensalidade_valor: number | null;
  comissao_servico_percentual: number | null;
  comissao_servico_valor: number | null;
  servicos_pedido: any[] | null;
  modulos_adicionais: any[] | null;
  status_pedido: string;
  financeiro_status: string;
  financeiro_motivo: string | null;
  financeiro_aprovado_em: string | null;
  financeiro_aprovado_por: string | null;
  contrato_liberado: boolean;
  observacoes: string | null;
  created_at: string;
  numero_exibicao?: string;
  clientes?: { nome_fantasia: string } | null;
  planos?: { nome: string } | null;
  filiais?: { nome: string } | null;
}

export default function Financeiro() {
  const { profile, roles, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isFinanceiro = roles.includes("financeiro");
  const { filiaisDoUsuario, filialPadraoId, isGlobal, todasFiliais } = useUserFiliais();

  const [pedidos, setPedidos] = useState<PedidoFila[]>([]);
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const [filterFilial, setFilterFilial] = useState("_init_");
  const [filterDe, setFilterDe] = useState("");
  const [filterAte, setFilterAte] = useState("");
  const [selected, setSelected] = useState<PedidoFila | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [openReprovar, setOpenReprovar] = useState(false);
  const [motivoReprova, setMotivoReprova] = useState("");
  const [processando, setProcessando] = useState(false);
  const [aprovadorDesconto, setAprovadorDesconto] = useState<string | null>(null);
  const [openValores, setOpenValores] = useState(false);
  const [pedidoPlano, setPedidoPlano] = useState<any>(null);
  const [pedidoModulos, setPedidoModulos] = useState<any[]>([]);

  const canAccess = isAdmin || isFinanceiro;

  async function loadData() {
    setLoading(true);
    const [{ data: pedidosData }, { data: filiaisData }] = await Promise.all([
      supabase
        .from("pedidos")
        .select("*, clientes(nome_fantasia), planos(nome), filiais(nome)")
        .eq("financeiro_status", "Aguardando")
        .eq("status_pedido", "Aguardando Financeiro")
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

  // Default filial filter from user access
  useEffect(() => {
    if (filterFilial === "_init_") {
      if (isGlobal && !profile?.filial_favorita_id) {
        setFilterFilial("all");
      } else if (filialPadraoId) {
        setFilterFilial(filialPadraoId);
      } else {
        setFilterFilial("all");
      }
    }
  }, [filialPadraoId, isGlobal, profile?.filial_favorita_id]);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filterFilial, filterDe, filterAte]);

  if (!canAccess) return <Navigate to="/dashboard" replace />;

  const filtered = pedidos.filter((p) => {
    if (filterFilial !== "all" && filterFilial !== "_init_" && p.filial_id !== filterFilial) return false;
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
    if (error) {
      setProcessando(false);
      toast.error("Erro ao aprovar pedido: " + error.message);
      return;
    }
    // Criar contrato - determinar tipo com base no tipo_pedido
    const tipoPedido = (pedido as any).tipo_pedido || "Novo";
    let tipoContrato = "Base";
    if (tipoPedido === "Upgrade" || tipoPedido === "Aditivo") tipoContrato = "Aditivo";
    else if (tipoPedido === "OA") tipoContrato = "OA";

    const { error: contratoError } = await supabase.from("contratos").insert({
      cliente_id: pedido.cliente_id,
      plano_id: pedido.plano_id,
      pedido_id: pedido.id,
      tipo: tipoContrato,
      status: "Ativo",
      contrato_origem_id: (pedido as any).contrato_id || null,
    });
    setProcessando(false);
    if (contratoError) {
      toast.error("Pedido aprovado, mas erro ao criar contrato: " + contratoError.message);
      return;
    }
    toast.success("Pedido aprovado! Contrato criado e liberado.");
    setOpenDetail(false);
    navigate("/contratos");
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
                {isGlobal && <SelectItem value="all">Todas as filiais</SelectItem>}
                {(filiaisDoUsuario.length > 0 ? filiaisDoUsuario : todasFiliais).map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
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
                <TableHead>Nº Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="text-right">Implantação</TableHead>
                <TableHead className="text-right">Mensalidade</TableHead>
                <TableHead className="text-right">Serviço</TableHead>
                <TableHead className="text-right">Valor Total</TableHead>
                <TableHead className="text-right">Comissão</TableHead>
                <TableHead>Recebido em</TableHead>
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
                    <TableCell colSpan={11} className="text-center py-16 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
                    Nenhum pedido aguardando análise
                  </TableCell>
                </TableRow>
              ) : (
                filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-mono text-xs font-semibold text-primary">{pedido.numero_exibicao || "—"}</TableCell>
                    <TableCell className="font-medium">{pedido.clientes?.nome_fantasia || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        pedido.tipo_pedido === 'Novo' ? 'bg-emerald-100 text-emerald-700' :
                        pedido.tipo_pedido === 'OA' ? 'bg-purple-100 text-purple-700' :
                        pedido.tipo_pedido === 'Upgrade' ? 'bg-blue-100 text-blue-700' :
                        pedido.tipo_pedido === 'Adicional' ? 'bg-amber-100 text-amber-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {pedido.tipo_pedido === 'Novo' ? 'Base' : pedido.tipo_pedido}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pedido.planos?.nome || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{pedido.filiais?.nome || "—"}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {pedido.tipo_pedido === "OA" ? "—" : pedido.valor_implantacao_final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {pedido.tipo_pedido === "OA" ? "—" : pedido.valor_mensalidade_final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {pedido.tipo_pedido === "OA" ? pedido.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : (() => {
                        const servicos = pedido.servicos_pedido as any[] | null;
                        if (!servicos || servicos.length === 0) return "—";
                        const total = servicos.reduce((acc: number, s: any) => acc + ((s.valor || 0) * (s.quantidade || 1)), 0);
                        return total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
                      })()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {pedido.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      <div className="space-y-0.5">
                        <p className="text-xs font-mono">{(pedido.comissao_implantacao_percentual ?? pedido.comissao_percentual)}% imp → <span className="font-semibold">{(pedido.comissao_implantacao_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
                        <p className="text-xs font-mono">{(pedido.comissao_mensalidade_percentual ?? pedido.comissao_percentual)}% mens → <span className="font-semibold">{(pedido.comissao_mensalidade_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
                        <p className="text-xs font-mono">{(pedido.comissao_servico_percentual ?? 0)}% serv → <span className="font-semibold">{(pedido.comissao_servico_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
                        <p className="text-xs font-mono border-t border-border pt-0.5">Total: <span className="font-bold text-foreground">{pedido.comissao_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(pedido.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver detalhes"
                          onClick={async () => {
                            setSelected(pedido);
                            setOpenDetail(true);
                            setAprovadorDesconto(null);
                            const { data: sol } = await supabase
                              .from("solicitacoes_desconto")
                              .select("aprovado_por")
                              .eq("pedido_id", pedido.id)
                              .eq("status", "Aprovado")
                              .maybeSingle();
                            if (sol?.aprovado_por) {
                              const { data: prof } = await supabase
                                .from("profiles")
                                .select("full_name")
                                .eq("user_id", sol.aprovado_por)
                                .maybeSingle();
                              setAprovadorDesconto(prof?.full_name || null);
                            }
                          }}>
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
        <>
        <Dialog open={openDetail} onOpenChange={setOpenDetail}>
          <DialogContent className="max-w-md max-h-[90vh]" aria-describedby="detail-desc">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">Detalhe do Pedido {selected.numero_exibicao && <span className="ml-auto font-mono text-sm text-primary">{selected.numero_exibicao}</span>}</DialogTitle>
              <DialogDescription id="detail-desc">Analise os dados antes de aprovar ou reprovar.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-semibold text-sm">{selected.clientes?.nome_fantasia}</p></div>
                <div><p className="text-muted-foreground text-xs">Plano</p><p className="font-semibold text-sm">{selected.planos?.nome}</p></div>
                <div><p className="text-muted-foreground text-xs">Filial</p><p className="font-semibold text-sm">{selected.filiais?.nome}</p></div>
                <div><p className="text-muted-foreground text-xs">Data</p><p className="font-semibold text-sm">{format(new Date(selected.created_at), "dd/MM/yyyy", { locale: ptBR })}</p></div>
              </div>

              {/* ── Itens do Pedido ── */}
              <div className="bg-muted rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📋 Itens do Pedido</p>

                {/* Plano (Novo ou Upgrade) */}
                {(selected.tipo_pedido === "Novo" || selected.tipo_pedido === "Upgrade") && selected.planos?.nome && (
                  <div className="bg-background rounded-md p-2.5 space-y-1">
                    <p className="text-xs font-medium">
                      {selected.tipo_pedido === "Upgrade" ? "⬆️ Upgrade de Plano" : "📦 Plano Contratado"}
                    </p>
                    <p className="text-sm font-semibold">{selected.planos.nome}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Impl: <span className="font-mono">{selected.valor_implantacao_original.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></span>
                      <span>Mens: <span className="font-mono">{selected.valor_mensalidade_original.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></span>
                    </div>
                  </div>
                )}

                {/* Módulos Adicionais */}
                {(() => {
                  const adicionais = Array.isArray(selected.modulos_adicionais) ? selected.modulos_adicionais : [];
                  if (adicionais.length === 0) return null;
                  return (
                    <div className="bg-background rounded-md p-2.5 space-y-1.5">
                      <p className="text-xs font-medium">
                        {selected.tipo_pedido === "Aditivo" ? "➕ Módulos Adicionais (Aditivo)" : "➕ Módulos Adicionais"}
                      </p>
                      {adicionais.map((m: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span>{m.nome} {m.quantidade > 1 ? `(x${m.quantidade})` : ""}</span>
                          <div className="flex gap-3 font-mono text-muted-foreground">
                            <span>Impl: {((m.valor_implantacao_modulo || 0) * (m.quantidade || 1)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                            <span>Mens: {((m.valor_mensalidade_modulo || 0) * (m.quantidade || 1)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Serviços OA */}
                {(() => {
                  const servicos = Array.isArray(selected.servicos_pedido) ? selected.servicos_pedido : [];
                  if (selected.tipo_pedido !== "OA" || servicos.length === 0) return null;
                  return (
                    <div className="bg-background rounded-md p-2.5 space-y-1.5">
                      <p className="text-xs font-medium">🔧 Serviços (Ordem de Atendimento)</p>
                      {servicos.map((s: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>{s.nome} — {s.quantidade || 1}x {s.unidade_medida || "un."}</span>
                          <span className="font-mono text-muted-foreground">{((s.valor_unitario || s.valor || 0) * (s.quantidade || 1)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-semibold border-t border-border pt-1 mt-1">
                        <span>Total serviços</span>
                        <span className="font-mono">{servicos.reduce((sum: number, s: any) => sum + ((s.valor_unitario || s.valor || 0) * (s.quantidade || 1)), 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Nenhum item */}
                {!((selected.tipo_pedido === "Novo" || selected.tipo_pedido === "Upgrade") && selected.planos?.nome) &&
                  !(Array.isArray(selected.modulos_adicionais) && selected.modulos_adicionais.length > 0) &&
                  !(selected.tipo_pedido === "OA" && Array.isArray(selected.servicos_pedido) && selected.servicos_pedido.length > 0) && (
                    <p className="text-xs text-muted-foreground italic">Nenhum detalhe de itens disponível.</p>
                  )}
              </div>

              {/* Valores resumidos */}
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valores do Pedido</p>
                  <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={async () => {
                    setOpenValores(true);
                    const [{ data: planoData }, { data: modulosData }] = await Promise.all([
                      supabase.from("planos").select("*").eq("id", selected.plano_id).maybeSingle(),
                      supabase.from("plano_modulos").select("*, modulos(*)").eq("plano_id", selected.plano_id),
                    ]);
                    setPedidoPlano(planoData);
                    setPedidoModulos(modulosData || []);
                  }}>
                    Detalhes
                  </Button>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Implantação final</span>
                  <span className="font-mono font-semibold">{selected.valor_implantacao_final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Mensalidade final</span>
                  <span className="font-mono font-semibold">{selected.valor_mensalidade_final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border pt-1">
                  <span>Valor Total</span>
                  <span className="font-mono">{selected.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                {aprovadorDesconto && (
                  <div className="pt-1 border-t border-border">
                    <p className="text-muted-foreground text-xs">Desconto aprovado por</p>
                    <p className="text-xs font-semibold">{aprovadorDesconto}</p>
                  </div>
                )}
              </div>

              {/* Comissões */}
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissões do Vendedor</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Implantação</span>
                  <span className="font-mono">{(selected.comissao_implantacao_percentual ?? selected.comissao_percentual)}% → {(selected.comissao_implantacao_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Mensalidade</span>
                  <span className="font-mono">{(selected.comissao_mensalidade_percentual ?? selected.comissao_percentual)}% → {(selected.comissao_mensalidade_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-mono">{((selected as any).comissao_servico_percentual ?? 0)}% → {((selected as any).comissao_servico_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold border-t border-border pt-1">
                  <span>Total</span>
                  <span className="font-mono">{selected.comissao_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              </div>

              {selected.observacoes && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Observações do vendedor</p>
                  <p className="text-xs">{selected.observacoes}</p>
                </div>
              )}

              {/* Comentários Internos */}
              <PedidoComentarios pedidoId={selected.id} />
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

        {/* Sub-dialog: Detalhes dos Valores */}
        <Dialog open={openValores} onOpenChange={setOpenValores}>
          <DialogContent className="max-w-md" aria-describedby="valores-desc">
            <DialogHeader>
              <DialogTitle>Detalhes do Pedido</DialogTitle>
              <DialogDescription id="valores-desc">Plano, módulos adicionais, valores e descontos.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm max-h-[65vh] overflow-y-auto pr-1">
              {/* Plano */}
              {pedidoPlano && (
                <div className="bg-muted rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Plano</p>
                  <p className="font-semibold">{pedidoPlano.nome}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Implantação padrão</span>
                    <span className="font-mono">{(pedidoPlano.valor_implantacao_padrao || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Mensalidade padrão</span>
                    <span className="font-mono">{(pedidoPlano.valor_mensalidade_padrao || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                </div>
              )}

              {/* Módulos adicionais */}
              {(() => {
                const mods = (selected as any).modulos_adicionais;
                const modsList = Array.isArray(mods) ? mods : [];
                if (modsList.length === 0) return null;
                return (
                  <div className="bg-muted rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Módulos Adicionais</p>
                    {modsList.map((m: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs border-b border-border pb-1 last:border-0 last:pb-0">
                        <span>{m.nome} {m.quantidade > 1 ? `(x${m.quantidade})` : ""}</span>
                        <div className="text-right font-mono">
                          <span>{((m.valor_mensalidade_modulo || 0) * (m.quantidade || 1)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês</span>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Serviços */}
              {(() => {
                const servs = (selected as any).servicos_pedido;
                const servsList = Array.isArray(servs) ? servs : [];
                if (servsList.length === 0) return null;
                return (
                  <div className="bg-muted rounded-lg p-3 space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Serviços</p>
                    {servsList.map((s: any, i: number) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{s.nome} {s.quantidade > 1 ? `(x${s.quantidade})` : ""}</span>
                        <span className="font-mono">{((s.valor || 0) * (s.quantidade || 1)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Valores e descontos */}
              <div className="bg-muted rounded-lg p-3 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valores e Descontos</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Implantação (original)</span>
                  <span className="font-mono">{selected.valor_implantacao_original.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                {selected.desconto_implantacao_valor > 0 && (
                  <div className="flex justify-between text-xs text-destructive">
                    <span>Desconto implantação ({selected.desconto_implantacao_tipo})</span>
                    <span className="font-mono">- {selected.desconto_implantacao_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold">
                  <span>Implantação final</span>
                  <span className="font-mono">{selected.valor_implantacao_final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="border-t border-border pt-1 mt-1" />
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Mensalidade (original)</span>
                  <span className="font-mono">{selected.valor_mensalidade_original.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                {selected.desconto_mensalidade_valor > 0 && (
                  <div className="flex justify-between text-xs text-destructive">
                    <span>Desconto mensalidade ({selected.desconto_mensalidade_tipo})</span>
                    <span className="font-mono">- {selected.desconto_mensalidade_valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-semibold">
                  <span>Mensalidade final</span>
                  <span className="font-mono">{selected.valor_mensalidade_final.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
                <div className="border-t border-border pt-1 mt-1" />
                <div className="flex justify-between text-sm font-bold">
                  <span>Valor Total</span>
                  <span className="font-mono">{selected.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              </div>

              {selected.motivo_desconto && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Motivo do desconto</p>
                  <p className="text-xs">{selected.motivo_desconto}</p>
                </div>
              )}

              {aprovadorDesconto && (
                <div className="bg-muted rounded-lg p-3">
                  <p className="text-muted-foreground text-xs">Desconto aprovado por</p>
                  <p className="text-xs font-semibold">{aprovadorDesconto}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        </>
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
