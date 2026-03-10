import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, CheckCircle, XCircle, Send, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PedidoComentarios } from "@/components/PedidoComentarios";
import { fmtBRL } from "../helpers";
import { STATUS_COLORS, FIN_STATUS_COLORS } from "../constants";
import type { PedidoWithJoins, ModuloAdicionadoItem, ServicoAdicionadoItem } from "../types";
import type { Profile, Filial } from "@/lib/supabase-types";

interface Props {
  pedido: PedidoWithJoins | null;
  onClose: () => void;
  vendedores: Profile[];
  filiais: Filial[];
  zapsignMap: Record<string, string>;
  contratoStatusMap: Record<string, string>;
  isAdmin: boolean;
  isFinanceiro: boolean;
  isVendedor: boolean;
}

export function VisualizarPedidoDialog({
  pedido,
  onClose,
  vendedores,
  filiais,
  zapsignMap,
  contratoStatusMap,
  isAdmin,
  isFinanceiro,
  isVendedor,
}: Props) {
  return (
    <Dialog open={!!pedido} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Visualizar Pedido
            {pedido?.numero_exibicao && <span className="ml-auto font-mono text-sm text-primary">{pedido.numero_exibicao}</span>}
          </DialogTitle>
        </DialogHeader>
        {pedido && (() => {
          const vp = pedido;
          const finStatus = vp.financeiro_status || "Aguardando";
          const impFinal = vp.valor_implantacao_final ?? vp.valor_implantacao;
          const mensFinal = vp.valor_mensalidade_final ?? vp.valor_mensalidade;
          const vendedorNome = vendedores.find((v) => v.user_id === vp.vendedor_id)?.full_name || "—";
          const filialNome = vp.filiais?.nome || filiais.find(f => f.id === vp.filial_id)?.nome || "—";
          const adicionais = (vp.modulos_adicionais || []) as ModuloAdicionadoItem[];
          return (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="font-medium">{vp.clientes?.nome_fantasia || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Plano</p>
                  <p className="font-medium">{vp.planos?.nome || "—"}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Filial</p>
                  <p>{filialNome}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Vendedor</p>
                  <p>{vendedorNome}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <p>{vp.tipo_pedido || "Novo"}</p>
                </div>
                {vp.tipo_pedido === "OA" && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Tipo Atendimento</p>
                    <p>{vp.tipo_atendimento || "—"}</p>
                  </div>
                )}
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p>{format(new Date(vp.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                </div>
              </div>

              {/* ── Detalhes do que foi lançado ── */}
              <div className="border-t border-border pt-3 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📋 Itens do Pedido</p>

                {/* Plano (Novo ou Upgrade) */}
                {(vp.tipo_pedido === "Novo" || vp.tipo_pedido === "Upgrade") && vp.planos?.nome && (
                  <div className="bg-muted/50 rounded-md p-2.5 space-y-1">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      {vp.tipo_pedido === "Upgrade" ? "⬆️ Upgrade de Plano" : "📦 Plano Contratado"}
                    </p>
                    <p className="text-sm font-semibold">{vp.planos?.nome}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Impl: <span className="font-mono">{fmtBRL(vp.valor_implantacao_original ?? vp.valor_implantacao)}</span></span>
                      <span>Mens: <span className="font-mono">{fmtBRL(vp.valor_mensalidade_original ?? vp.valor_mensalidade)}</span></span>
                    </div>
                  </div>
                )}

                {/* Módulos Adicionais */}
                {adicionais.length > 0 && (
                  <div className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                    <p className="text-xs font-medium flex items-center gap-1.5">
                      {vp.tipo_pedido === "Aditivo" ? "➕ Módulos Adicionais (Aditivo)" : "➕ Módulos Adicionais"}
                    </p>
                    {adicionais.map((m) => (
                      <div key={m.modulo_id} className="flex justify-between text-xs">
                        <span>{m.nome} {m.quantidade > 1 ? `(x${m.quantidade})` : ""}</span>
                        <div className="flex gap-3 font-mono text-muted-foreground">
                          <span>Impl: {fmtBRL(m.valor_implantacao_modulo * m.quantidade)}</span>
                          <span>Mens: {fmtBRL(m.valor_mensalidade_modulo * m.quantidade)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Serviços OA */}
                {vp.tipo_pedido === "OA" && (() => {
                  const servicos = (vp.servicos_pedido || []) as ServicoAdicionadoItem[];
                  if (servicos.length === 0) return null;
                  return (
                    <div className="bg-muted/50 rounded-md p-2.5 space-y-1.5">
                      <p className="text-xs font-medium flex items-center gap-1.5">🔧 Serviços (Ordem de Atendimento)</p>
                      {servicos.map((s, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>{s.nome} — {s.quantidade}x {s.unidade_medida || "un."}</span>
                          <span className="font-mono text-muted-foreground">{fmtBRL(s.valor_unitario * s.quantidade)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-xs font-semibold border-t border-border pt-1 mt-1">
                        <span>Total serviços</span>
                        <span className="font-mono">{fmtBRL(servicos.reduce((sum, s) => sum + s.valor_unitario * s.quantidade, 0))}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Se nenhum item */}
                {!((vp.tipo_pedido === "Novo" || vp.tipo_pedido === "Upgrade") && vp.planos?.nome) && adicionais.length === 0 && !(vp.tipo_pedido === "OA" && ((vp.servicos_pedido || []) as any[]).length > 0) && (
                  <p className="text-xs text-muted-foreground italic">Nenhum detalhe de itens disponível.</p>
                )}
              </div>

              {/* Acréscimo info */}
              {((vp.acrescimo_implantacao_valor ?? 0) > 0 || (vp.acrescimo_mensalidade_valor ?? 0) > 0) && (
                <div className="border-t border-border pt-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Acréscimos aplicados</p>
                  <div className="grid grid-cols-2 gap-3">
                    {(vp.acrescimo_implantacao_valor ?? 0) > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Implantação</p>
                        <p className="text-xs font-mono text-emerald-600">+{vp.acrescimo_implantacao_valor} {vp.acrescimo_implantacao_tipo === "%" ? "%" : "R$"}</p>
                      </div>
                    )}
                    {(vp.acrescimo_mensalidade_valor ?? 0) > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">Mensalidade</p>
                        <p className="text-xs font-mono text-emerald-600">+{vp.acrescimo_mensalidade_valor} {vp.acrescimo_mensalidade_tipo === "%" ? "%" : "R$"}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3 grid grid-cols-3 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Implantação</p>
                  <p className="font-mono font-semibold">{fmtBRL(impFinal)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Mensalidade</p>
                  <p className="font-mono font-semibold">{fmtBRL(mensFinal)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-mono font-bold text-primary">{fmtBRL(vp.valor_total)}</p>
                </div>
              </div>

              {(isAdmin || isFinanceiro || isVendedor) && (
                <div className="border-t border-border pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Comissões</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Implantação / Treinamento</p>
                      <p className="text-xs">{vp.comissao_implantacao_percentual ?? vp.comissao_percentual}% → <span className="font-mono">{fmtBRL(vp.comissao_implantacao_valor ?? 0)}</span></p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Mensalidade</p>
                      <p className="text-xs">{vp.comissao_mensalidade_percentual ?? vp.comissao_percentual}% → <span className="font-mono">{fmtBRL(vp.comissao_mensalidade_valor ?? 0)}</span></p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-muted-foreground">Serviço</p>
                      <p className="text-xs">{vp.comissao_servico_percentual ?? 0}% → <span className="font-mono">{fmtBRL(vp.comissao_servico_valor ?? 0)}</span></p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border">
                    <span className="text-xs text-muted-foreground">Total comissão</span>
                    <span className="font-mono font-semibold text-sm">{fmtBRL(vp.comissao_valor)}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-3 grid grid-cols-2 gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Status pedido</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[vp.status_pedido] || "bg-muted text-muted-foreground"}`}>
                    {vp.status_pedido}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">Status financeiro</p>
                  {(() => {
                    const zsStatus = zapsignMap[vp.id];
                    if (zsStatus === "Assinado") {
                      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3" />Contrato assinado</span>;
                    }
                    if (zsStatus === "Recusado") {
                      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600"><XCircle className="h-3 w-3" />Assinatura recusada</span>;
                    }
                    if (zsStatus === "Enviado" || zsStatus === "Pendente") {
                      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700"><Send className="h-3 w-3" />Aguardando assinatura</span>;
                    }
                    if (vp.contrato_liberado) {
                      const stGeracao = contratoStatusMap[vp.id];
                      if (stGeracao === 'Pendente' || stGeracao === 'Gerando') {
                        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><Loader2 className="h-3 w-3 animate-spin" />Aguardando geração</span>;
                      }
                      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><FileText className="h-3 w-3" />Contrato gerado</span>;
                    }
                    return (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${FIN_STATUS_COLORS[finStatus] || "bg-muted text-muted-foreground"}`}>
                        {finStatus}
                      </span>
                    );
                  })()}
                </div>
                {vp.financeiro_motivo && (
                  <div className="col-span-2 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Motivo reprovação</p>
                    <p className="text-destructive text-xs">{vp.financeiro_motivo}</p>
                  </div>
                )}
              </div>

              {vp.motivo_desconto && (
                <div className="border-t border-border pt-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Motivo do Desconto</p>
                  <p className="text-xs">{vp.motivo_desconto}</p>
                </div>
              )}

              {vp.observacoes && (
                <div className="border-t border-border pt-3 space-y-0.5">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-xs">{vp.observacoes}</p>
                </div>
              )}

              <PedidoComentarios pedidoId={vp.id} />
            </div>
          );
        })()}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
