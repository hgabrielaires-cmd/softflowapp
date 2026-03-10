import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ArrowUpCircle, ArrowDownCircle, Package, Loader2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ClientePlanViewer } from "@/components/ClientePlanViewer";
import { Cliente, Contrato } from "@/lib/supabase-types";
import { fmtBRL, fmtDateTime } from "@/pages/clientes/helpers";
import { TIPO_PEDIDO_COLORS } from "@/pages/clientes/constants";
import type { PedidoHistorico, RentabilidadeConsolidada } from "@/pages/clientes/types";

interface HistoricoContratualDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cliente: Cliente | null;
  contratosList: Contrato[];
  pedidosHistorico: PedidoHistorico[];
  loading: boolean;
  podeVerRentabilidade: boolean;
  rentabilidadeConsolidada: RentabilidadeConsolidada | null;
  margemIdealHistorico: number | null;
}

export function HistoricoContratualDialog({
  open,
  onOpenChange,
  cliente,
  contratosList,
  pedidosHistorico,
  loading,
  podeVerRentabilidade,
  rentabilidadeConsolidada,
  margemIdealHistorico,
}: HistoricoContratualDialogProps) {
  const navigate = useNavigate();

  const contratosBase = contratosList.filter((c) => c.tipo === "Base");
  const contratosAditivos = contratosList.filter((c) => c.tipo === "Aditivo");
  const pedidosUpgrade = pedidosHistorico.filter((p) => p.tipo_pedido === "Upgrade");
  const pedidosDowngrade = pedidosHistorico.filter((p) => p.tipo_pedido === "Downgrade");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Histórico Contratual — {cliente?.nome_fantasia}
          </DialogTitle>
          {cliente && (
            <ClientePlanViewer clienteId={cliente.id} clienteNome={cliente.nome_fantasia} variant="icon" className="ml-auto shrink-0" />
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Rentabilidade Consolidada */}
            {podeVerRentabilidade && rentabilidadeConsolidada && (
              <div className="bg-muted rounded-lg p-4 space-y-2 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📊 Rentabilidade Consolidada (Mensal)</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Receita Mensal</span>
                    <span className="font-mono font-semibold">{fmtBRL(rentabilidadeConsolidada.receitaMensal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Custo Mensal</span>
                    <span className="font-mono font-semibold">{fmtBRL(rentabilidadeConsolidada.custoMensal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Margem Bruta</span>
                    <span className={`font-mono font-semibold ${rentabilidadeConsolidada.margem < 0 || (margemIdealHistorico != null && rentabilidadeConsolidada.margem < margemIdealHistorico) ? "text-destructive" : rentabilidadeConsolidada.margem < 30 ? "text-amber-600" : "text-emerald-600"}`}>
                      {rentabilidadeConsolidada.margem.toFixed(1)}%
                      {margemIdealHistorico != null && rentabilidadeConsolidada.margem < margemIdealHistorico && " ⚠️"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Markup</span>
                    <span className="font-mono font-semibold">{rentabilidadeConsolidada.markup.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="flex justify-between text-xs font-semibold border-t border-border pt-1.5">
                  <span>Lucro Bruto</span>
                  <span className={`font-mono ${rentabilidadeConsolidada.lucro < 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {fmtBRL(rentabilidadeConsolidada.lucro)}
                  </span>
                </div>
              </div>
            )}

            <Tabs defaultValue="contratos" className="mt-2">
              <TabsList className="w-full">
                <TabsTrigger value="contratos" className="flex-1">
                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                  Contratos ({contratosBase.length})
                </TabsTrigger>
                <TabsTrigger value="aditivos" className="flex-1">
                  <Package className="h-3.5 w-3.5 mr-1.5" />
                  Aditivos ({contratosAditivos.length})
                </TabsTrigger>
                <TabsTrigger value="upgrades" className="flex-1">
                  <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />
                  Upgrades ({pedidosUpgrade.length})
                </TabsTrigger>
                <TabsTrigger value="downgrades" className="flex-1">
                  <ArrowDownCircle className="h-3.5 w-3.5 mr-1.5" />
                  Downgrades ({pedidosDowngrade.length})
                </TabsTrigger>
              </TabsList>

              {/* Contratos Base */}
              <TabsContent value="contratos" className="mt-3">
                {contratosBase.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum contrato base.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {contratosBase.map((ct) => (
                      <div key={ct.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{ct.numero_exibicao}</p>
                          <p className="text-xs text-muted-foreground">{fmtDateTime(ct.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ct.status === "Ativo" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                            {ct.status}
                          </span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Visualizar contrato" onClick={() => { onOpenChange(false); navigate("/contratos"); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Aditivos */}
              <TabsContent value="aditivos" className="mt-3">
                {contratosAditivos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum termo aditivo.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {contratosAditivos.map((ct) => (
                      <div key={ct.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{ct.numero_exibicao}</p>
                          <p className="text-xs text-muted-foreground">{fmtDateTime(ct.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ct.status === "Ativo" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                            {ct.status}
                          </span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Visualizar aditivo" onClick={() => { onOpenChange(false); navigate("/contratos"); }}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Upgrades */}
              <TabsContent value="upgrades" className="mt-3">
                {pedidosUpgrade.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum upgrade registrado.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {pedidosUpgrade.map((p) => (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{p.planos?.nome || "—"}</p>
                            <p className="text-xs text-muted-foreground">{fmtDateTime(p.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs font-mono">{fmtBRL(p.valor_total)}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${p.status_pedido === "Cancelado" ? "bg-red-100 text-red-700" : TIPO_PEDIDO_COLORS[p.tipo_pedido] || "bg-muted text-muted-foreground"}`}>
                                {p.status_pedido === "Cancelado" ? "Cancelado" : p.tipo_pedido}
                              </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Visualizar pedido" onClick={() => { onOpenChange(false); navigate("/pedidos"); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Downgrades */}
              <TabsContent value="downgrades" className="mt-3">
                {pedidosDowngrade.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum downgrade registrado.</p>
                ) : (
                  <div className="rounded-lg border border-border divide-y divide-border">
                    {pedidosDowngrade.map((p) => (
                      <div key={p.id} className="px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">{p.planos?.nome || "—"}</p>
                            <p className="text-xs text-muted-foreground">{fmtDateTime(p.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right space-y-1">
                              <p className="text-xs font-mono">{fmtBRL(p.valor_total)}</p>
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${p.status_pedido === "Cancelado" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700 border border-amber-200"}`}>
                                {p.status_pedido === "Cancelado" ? "Cancelado" : "Downgrade"}
                              </span>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Visualizar pedido" onClick={() => { onOpenChange(false); navigate("/pedidos"); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
