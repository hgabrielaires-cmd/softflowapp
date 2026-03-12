import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Info, RefreshCw, FileText, Building2, User, Package, Layers, Wrench, MessageSquare, ArrowRight, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PainelCard } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any;
  loading: boolean;
  detailCard: PainelCard | null;
  planoAnteriorNome: string | null;
  podeVerValores: boolean;
  onVerPedido: (pedidoId: string) => void;
}

export function DetalhesDialog({ open, onOpenChange, data, loading, detailCard, planoAnteriorNome, podeVerValores, onVerPedido }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5 text-primary" />
            Detalhes do Atendimento
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : data && (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {/* PEDIDO */}
            {data.pedidoInfo && (
              <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center"><FileText className="h-4 w-4 text-primary" /></div>
                  <h4 className="text-sm font-bold text-foreground">Pedido</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Número</p><p className="text-sm font-semibold text-foreground">{data.pedidoInfo.numero_exibicao || "—"}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Data/Hora</p><p className="text-sm font-medium text-foreground">{data.pedidoInfo.created_at ? `${new Date(data.pedidoInfo.created_at).toLocaleDateString("pt-BR")} ${new Date(data.pedidoInfo.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "—"}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Vendedor</p><p className="text-sm font-medium text-foreground">{data.pedidoInfo.vendedor_nome}</p></div>
                </div>
              </div>
            )}

            {/* CONTRATO */}
            {data.contratoInfo && (
              <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-emerald-light flex items-center justify-center"><CheckSquare className="h-4 w-4 text-emerald" /></div>
                  <h4 className="text-sm font-bold text-foreground">Contrato</h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Número</p><p className="text-sm font-semibold text-foreground">{data.contratoInfo.numero_exibicao || "—"}</p></div>
                  <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Status</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="secondary" className={cn("text-[11px]", data.contratoInfo.assinado ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200")}>
                        {data.contratoInfo.status} {data.contratoInfo.assinado ? "• Assinado" : data.contratoInfo.statusZapsign ? `• ${data.contratoInfo.statusZapsign}` : ""}
                      </Badge>
                    </div>
                  </div>
                  <div><p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Assinatura</p><p className="text-sm font-medium text-foreground">{data.contratoInfo.dataAssinatura ? `${new Date(data.contratoInfo.dataAssinatura).toLocaleDateString("pt-BR")} ${new Date(data.contratoInfo.dataAssinatura).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "—"}</p></div>
                </div>
              </div>
            )}

            {/* DADOS DA EMPRESA */}
            {data.clienteInfo && (
              <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center"><Building2 className="h-4 w-4 text-primary" /></div>
                  <h4 className="text-sm font-bold text-foreground">Dados da Empresa</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div><span className="text-muted-foreground">Nome Fantasia:</span> <span className="font-medium text-foreground">{data.clienteInfo.nome_fantasia}</span></div>
                  <div><span className="text-muted-foreground">Razão Social:</span> <span className="font-medium text-foreground">{data.clienteInfo.razao_social || "—"}</span></div>
                  <div><span className="text-muted-foreground">CNPJ/CPF:</span> <span className="font-medium text-foreground">{data.clienteInfo.cnpj_cpf}</span></div>
                  <div><span className="text-muted-foreground">Inscrição Estadual:</span> <span className="font-medium text-foreground">{data.clienteInfo.inscricao_estadual || "—"}</span></div>
                  {data.clienteInfo.apelido && <div><span className="text-muted-foreground">Apelido:</span> <span className="font-medium text-foreground">{data.clienteInfo.apelido}</span></div>}
                  <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium text-foreground">{data.clienteInfo.telefone || "—"}</span></div>
                  <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium text-foreground">{data.clienteInfo.email || "—"}</span></div>
                  <div className="col-span-2"><span className="text-muted-foreground">Endereço:</span> <span className="font-medium text-foreground">{[data.clienteInfo.logradouro, data.clienteInfo.numero ? `nº ${data.clienteInfo.numero}` : null, data.clienteInfo.complemento, data.clienteInfo.bairro, data.clienteInfo.cidade, data.clienteInfo.uf].filter(Boolean).join(", ") || "—"}{data.clienteInfo.cep ? ` — CEP: ${data.clienteInfo.cep}` : ""}</span></div>
                </div>
                {data.contatos.length > 0 && (
                  <>
                    <div className="border-t my-3" />
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2">Contatos</p>
                    <div className="space-y-2">
                      {data.contatos.map((c: any, i: number) => (
                        <div key={i} className={cn("flex items-center justify-between text-xs rounded-md px-3 py-2 border", c.decisor ? "bg-primary/5 border-primary/20" : "bg-muted/30")}>
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-medium text-foreground">{c.nome}</span>
                            {c.cargo && <span className="text-muted-foreground">({c.cargo})</span>}
                            {c.decisor && <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-primary text-primary-foreground">Decisor</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {c.telefone && <span>📱 {c.telefone}</span>}
                            {c.email && <span>✉️ {c.email}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PLANO + MÓDULOS */}
            {data.planoNome && (
              <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)] space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center"><Package className="h-4 w-4 text-primary" /></div>
                    <h4 className="text-sm font-bold text-foreground">{detailCard?.tipo_operacao === "Upgrade" ? "Novo Plano Contratado" : "Plano Contratado"}</h4>
                    {podeVerValores && detailCard?.pedido_id && (
                      <Button variant="outline" size="sm" className="ml-auto h-7 text-xs px-2.5 gap-1" onClick={() => onVerPedido(detailCard.pedido_id!)}>
                        <FileText className="h-3.5 w-3.5" /> Ver Pedido
                      </Button>
                    )}
                  </div>
                  <p className="text-sm font-semibold ml-9">{data.planoNome}</p>
                  {detailCard?.tipo_operacao === "Upgrade" && planoAnteriorNome && (
                    <p className="text-xs text-muted-foreground ml-9 mt-0.5">Plano anterior: <span className="line-through">{planoAnteriorNome}</span></p>
                  )}
                </div>
                {data.planoDescricao && (
                  <div className="ml-9">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Módulos do Plano</p>
                    <div className="space-y-0.5">
                      {data.planoDescricao.split(",").map((item: string, i: number) => {
                        const trimmed = item.trim();
                        return trimmed ? <p key={i} className="text-xs text-foreground">• {trimmed}</p> : null;
                      })}
                    </div>
                  </div>
                )}
                {data.modulosAdicionais.length > 0 && (
                  <div className="ml-9 pt-2 border-t">
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-violet-600" /> Módulos Adicionais
                    </p>
                    <div className="space-y-0.5">
                      {data.modulosAdicionais.map((mod: { nome: string; quantidade: number }, i: number) => (
                        <p key={i} className="text-xs text-foreground">{mod.quantidade > 1 ? `${mod.quantidade} ` : ""}{mod.nome}</p>
                      ))}
                    </div>
                  </div>
                )}
                {/* Valores Implantação e Mensalidade */}
                {podeVerValores && data.pedidoInfo && (
                  <div className="ml-9 pt-2 border-t space-y-1.5">
                    <div className="flex items-center gap-2" title="Valor Implantação">
                      <span className="h-3 w-3 rounded-full bg-purple-500 shrink-0" />
                      <span className="text-xs text-muted-foreground">Implantação:</span>
                      <span className="text-sm font-semibold text-foreground">
                        {(data.pedidoInfo.valor_implantacao_final ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2" title="Valor Mensalidade">
                      <span className="h-3 w-3 rounded-full bg-green-500 shrink-0" />
                      <span className="text-xs text-muted-foreground">Mensalidade:</span>
                      <span className="text-sm font-semibold text-foreground">
                        {(data.pedidoInfo.valor_mensalidade_final ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SERVIÇOS (OA) */}
            {data.servicosOA.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-teal-100 flex items-center justify-center"><Wrench className="h-4 w-4 text-teal-600" /></div>
                  <h4 className="text-sm font-bold text-foreground">Serviços (OA)</h4>
                  {data.pedidoInfo?.tipo_atendimento && <Badge variant="secondary" className="ml-auto text-[10px]">{data.pedidoInfo.tipo_atendimento}</Badge>}
                </div>
                <div className="space-y-1">
                  {data.servicosOA.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded border bg-muted/20">
                      <span className="font-medium text-foreground">{s.nome || s.descricao || `Serviço ${i + 1}`}</span>
                      {s.quantidade && <span className="text-muted-foreground">x{s.quantidade}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OBSERVAÇÕES */}
            {(data.obsCard || data.observacoes.length > 0) && (
              <div className="rounded-lg border border-border bg-card p-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center"><MessageSquare className="h-4 w-4 text-muted-foreground" /></div>
                  <h4 className="text-sm font-bold text-foreground">Observações</h4>
                </div>
                {data.obsCard && <div className="p-2.5 rounded-md border bg-muted/20 text-xs whitespace-pre-wrap mb-2">{data.obsCard}</div>}
                {data.observacoes.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {data.observacoes.map((obs: any) => (
                      <div key={obs.created_at} className="p-2.5 rounded-md border bg-muted/20">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-foreground">{obs.profiles?.full_name || "—"}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(obs.created_at).toLocaleDateString("pt-BR")} {new Date(obs.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        <p className="text-xs whitespace-pre-wrap text-foreground">{obs.texto}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
