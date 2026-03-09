import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { History, RefreshCw, Clock, CheckSquare, AlertTriangle, Layers, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSLA } from "../helpers";
import { renderMentionText } from "@/components/MentionInput";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: any[];
  loading: boolean;
  responsaveis: any[];
}

export function HistoricoDialog({ open, onOpenChange, data, loading, responsaveis }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-5 w-5 text-amber-500" />
            Histórico de Etapas
          </DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Carregando...
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8 italic">Nenhum histórico de etapas anteriores.</p>
        ) : (
          <div className="space-y-3 overflow-y-auto flex-1 pr-1">
            {data.map((stage: any, idx: number) => (
              <div key={idx} className="rounded-lg border border-border bg-card shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]">
                <div className="px-4 py-2.5 bg-muted/40 rounded-t-lg flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs font-semibold">{stage.etapa_nome}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(stage.entrada_em).toLocaleDateString("pt-BR")} → {new Date(stage.saida_em).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {stage.sla_previsto_horas != null && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground">SLA: {formatSLA(stage.sla_previsto_horas)}</span>
                      <span className="text-muted-foreground">Real: {formatSLA(stage.tempo_real_horas)}</span>
                      {stage.sla_cumprido === true && (
                        <Badge className="text-[9px] px-1.5 py-0 gap-0.5 bg-emerald-100 text-emerald-700 border-emerald-200" variant="outline">
                          <CheckSquare className="h-2.5 w-2.5" /> SLA OK
                        </Badge>
                      )}
                      {stage.sla_cumprido === false && (
                        <Badge className="text-[9px] px-1.5 py-0 gap-0.5 bg-red-100 text-red-700 border-red-200" variant="outline">
                          <AlertTriangle className="h-2.5 w-2.5" /> SLA Excedido
                        </Badge>
                      )}
                    </div>
                  )}
                  {stage.atraso_inicio_horas != null && stage.atraso_inicio_horas > 0 && (
                    <div className="flex items-center gap-2 mt-2 text-[11px]">
                      <Badge className="text-[9px] px-1.5 py-0 gap-0.5 bg-orange-100 text-orange-700 border-orange-200" variant="outline">
                        <Clock className="h-2.5 w-2.5" /> Início demorou {formatSLA(stage.atraso_inicio_horas)}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {stage.atividades.length > 0 && (
                    <div className="space-y-2">
                      {stage.atividades.map((atividade: any, aIdx: number) => {
                        const items = Array.isArray(atividade.checklist) ? atividade.checklist : [];
                        if (items.length === 0) return null;
                        return (
                          <div key={aIdx}>
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <p className="text-xs font-medium text-muted-foreground">{atividade.nome}</p>
                              {atividade.mesas_atendimento?.nome && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-1 bg-purple-50 text-purple-700 border-purple-200">
                                  <Layers className="h-2.5 w-2.5" /> {atividade.mesas_atendimento.nome}
                                </Badge>
                              )}
                            </div>
                            <ul className="space-y-1 pl-1">
                              {items.map((item: any, cIdx: number) => {
                                const key = `${atividade.id}_${cIdx}`;
                                const prog = stage.progressoMap[key] || { concluido: false };
                                return (
                                  <li key={cIdx} className="flex flex-col gap-0.5 text-xs border-b border-border/30 pb-1.5 last:border-0 last:pb-0">
                                    <div className="flex items-center gap-2">
                                      <div className={cn("h-4 w-4 rounded-sm border flex items-center justify-center shrink-0", prog.concluido ? "bg-emerald-500 border-emerald-500 text-white" : "border-muted-foreground/30")}>
                                        {prog.concluido && <CheckSquare className="h-3 w-3" />}
                                      </div>
                                      <span className={cn("flex-1", prog.concluido && "line-through text-muted-foreground")}>{item.texto || "(sem texto)"}</span>
                                      {prog.valor_texto && (
                                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                          {prog.valor_texto === 'sim' ? '✓ Sim' : prog.valor_texto === 'nao' ? '✗ Não' : prog.valor_texto}
                                        </Badge>
                                      )}
                                    </div>
                                    {prog.concluido && prog.concluido_por_nome && (
                                      <div className="flex items-center gap-1.5 pl-6 text-[10px] text-muted-foreground">
                                        <User className="h-2.5 w-2.5" />
                                        <span>{prog.concluido_por_nome}</span>
                                        {prog.concluido_em && (
                                          <><span>·</span><span>{new Date(prog.concluido_em).toLocaleDateString("pt-BR")} {new Date(prog.concluido_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span></>
                                        )}
                                      </div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {stage.comentarios.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-2 flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> Comentários
                      </p>
                      <div className="space-y-1.5">
                        {stage.comentarios.map((com: any) => {
                          const autor = responsaveis.find((r: any) => r.user_id === com.criado_por || r.id === com.criado_por) || { full_name: "Usuário" };
                          return (
                            <div key={com.id} className="bg-muted/50 rounded p-2 text-xs">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-medium text-foreground">{(autor as any).full_name?.split(" ")[0]}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(com.created_at).toLocaleDateString("pt-BR")} {new Date(com.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                              <p className="text-foreground/80">{renderMentionText(com.texto, responsaveis as any)}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {stage.atividades.length === 0 && stage.comentarios.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-2">Nenhum registro nesta etapa</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
