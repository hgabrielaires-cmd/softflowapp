import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  loading: boolean;
}

export function VerPedidoDialog({ open, onOpenChange, data, loading }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh]" aria-describedby="ver-pedido-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes do Pedido
            {data?.numero_exibicao && <span className="ml-auto font-mono text-sm text-primary">{data.numero_exibicao}</span>}
          </DialogTitle>
          <p id="ver-pedido-desc" className="text-sm text-muted-foreground">Dados completos do pedido vinculado ao projeto.</p>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-8"><RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : data && (
          <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div><p className="text-muted-foreground text-xs">Cliente</p><p className="font-semibold text-sm">{(data.clientes as any)?.nome_fantasia}</p></div>
              <div><p className="text-muted-foreground text-xs">Plano</p><p className="font-semibold text-sm">{(data.planos as any)?.nome}</p></div>
              <div><p className="text-muted-foreground text-xs">Filial</p><p className="font-semibold text-sm">{(data.filiais as any)?.nome}</p></div>
              <div><p className="text-muted-foreground text-xs">Data</p><p className="font-semibold text-sm">{data.created_at ? format(new Date(data.created_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}</p></div>
            </div>

            {/* Itens do Pedido */}
            <div className="bg-muted rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📋 Itens do Pedido</p>
              {(data.tipo_pedido === "Novo" || data.tipo_pedido === "Upgrade") && (data.planos as any)?.nome && (
                <div className="bg-background rounded-md p-2.5 space-y-1">
                  <p className="text-xs font-medium">{data.tipo_pedido === "Upgrade" ? "⬆️ Upgrade de Plano" : "📦 Plano Contratado"}</p>
                  <p className="text-sm font-semibold">{(data.planos as any)?.nome}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Impl: <span className="font-mono">{(data.valor_implantacao_original || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></span>
                    <span>Mens: <span className="font-mono">{(data.valor_mensalidade_original || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></span>
                  </div>
                </div>
              )}
              {(() => {
                const adicionais = Array.isArray(data.modulos_adicionais) ? data.modulos_adicionais : [];
                if (adicionais.length === 0) return null;
                return (
                  <div className="bg-background rounded-md p-2.5 space-y-1.5">
                    <p className="text-xs font-medium">{data.tipo_pedido === "Aditivo" ? "➕ Módulos Adicionais (Aditivo)" : "➕ Módulos Adicionais"}</p>
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
              {(() => {
                const servicos = Array.isArray(data.servicos_pedido) ? data.servicos_pedido : [];
                if (data.tipo_pedido !== "OA" || servicos.length === 0) return null;
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
            </div>

            {/* Valores e Descontos */}
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Valores e Descontos</p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Implantação (original)</span>
                <span className="font-mono">{(data.valor_implantacao_original || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              {(data.acrescimo_implantacao_valor || 0) > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Acréscimo implantação ({data.acrescimo_implantacao_tipo})</span>
                  <span className="font-mono">+ {(data.acrescimo_implantacao_valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              )}
              {(data.desconto_implantacao_valor || 0) > 0 && (
                <div className="flex justify-between text-xs text-destructive">
                  <span>Desconto implantação ({data.desconto_implantacao_tipo})</span>
                  <span className="font-mono">- {(data.desconto_implantacao_valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-semibold">
                <span>Implantação final</span>
                <span className="font-mono">{(data.valor_implantacao_final || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="border-t border-border pt-1 mt-1" />
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Mensalidade (original)</span>
                <span className="font-mono">{(data.valor_mensalidade_original || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              {(data.acrescimo_mensalidade_valor || 0) > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Acréscimo mensalidade ({data.acrescimo_mensalidade_tipo})</span>
                  <span className="font-mono">+ {(data.acrescimo_mensalidade_valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              )}
              {(data.desconto_mensalidade_valor || 0) > 0 && (
                <div className="flex justify-between text-xs text-destructive">
                  <span>Desconto mensalidade ({data.desconto_mensalidade_tipo})</span>
                  <span className="font-mono">- {(data.desconto_mensalidade_valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-semibold">
                <span>Mensalidade final</span>
                <span className="font-mono">{(data.valor_mensalidade_final || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="border-t border-border pt-1 mt-1" />
              <div className="flex justify-between text-sm font-bold">
                <span>Valor Total</span>
                <span className="font-mono">{(data.valor_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            </div>

            {data.motivo_desconto && (
              <div className="bg-muted rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Motivo do desconto</p>
                <p className="text-xs">{data.motivo_desconto}</p>
              </div>
            )}

            {/* Comissões */}
            <div className="bg-muted rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Comissões do Vendedor</p>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Implantação</span>
                <span className="font-mono">{(data.comissao_implantacao_percentual ?? data.comissao_percentual ?? 0)}% → {(data.comissao_implantacao_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Mensalidade</span>
                <span className="font-mono">{(data.comissao_mensalidade_percentual ?? data.comissao_percentual ?? 0)}% → {(data.comissao_mensalidade_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Serviço</span>
                <span className="font-mono">{(data.comissao_servico_percentual ?? 0)}% → {(data.comissao_servico_valor ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold border-t border-border pt-1">
                <span>Total</span>
                <span className="font-mono">{((data.comissao_implantacao_valor ?? 0) + (data.comissao_mensalidade_valor ?? 0) + (data.comissao_servico_valor ?? 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
