import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Eye } from "lucide-react";
import type { Jornada, ChecklistItem, MesaAtendimento } from "@/lib/supabase-types";
import { CHECKLIST_TIPO_LABELS } from "@/lib/supabase-types";
import type { LocalEtapa } from "../types";

interface ViewJornadaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewJornada: Jornada | null;
  viewEtapas: LocalEtapa[];
  viewExpandedEtapas: Set<string>;
  setViewExpandedEtapas: React.Dispatch<React.SetStateAction<Set<string>>>;
  resolveVinculoLabel: (tipo: string, id: string) => string;
  mesas: MesaAtendimento[];
}

export function ViewJornadaDialog({
  open, onOpenChange, viewJornada, viewEtapas, viewExpandedEtapas, setViewExpandedEtapas, resolveVinculoLabel, mesas,
}: ViewJornadaDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" /> Visualizar Jornada
          </DialogTitle>
        </DialogHeader>
        {viewJornada && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <p className="text-sm font-medium">{viewJornada.nome}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Filial</label>
                <p className="text-sm">{viewJornada.filial?.nome || "Global"}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Vínculo</label>
                <p className="text-sm capitalize">{viewJornada.vinculo_tipo} — {resolveVinculoLabel(viewJornada.vinculo_tipo, viewJornada.vinculo_id)}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Badge variant={viewJornada.ativo ? "default" : "secondary"}>{viewJornada.ativo ? "Ativo" : "Inativo"}</Badge>
              </div>
            </div>
            {viewJornada.descricao && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                <p className="text-sm">{viewJornada.descricao}</p>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-3">Etapas ({viewEtapas.length})</h4>
              {viewEtapas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada.</p>
              ) : (
                <div className="space-y-2">
                  {viewEtapas.map((etapa, idx) => {
                    const isExpanded = viewExpandedEtapas.has(etapa.tempId);
                    return (
                      <div key={etapa.tempId} className="border rounded-lg">
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setViewExpandedEtapas(prev => {
                              const next = new Set(prev);
                              next.has(etapa.tempId) ? next.delete(etapa.tempId) : next.add(etapa.tempId);
                              return next;
                            });
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium text-sm">{idx + 1}. {etapa.nome}</span>
                            <Badge variant="outline" className="text-xs">{etapa.atividades.length} atividades</Badge>
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="px-4 pb-3 space-y-2">
                            {etapa.descricao && <p className="text-xs text-muted-foreground">{etapa.descricao}</p>}
                            {etapa.atividades.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nenhuma atividade.</p>
                            ) : (
                              <div className="space-y-2">
                                {etapa.atividades.map((a, aIdx) => (
                                  <div key={a.tempId} className="border rounded p-3 bg-muted/30">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">{aIdx + 1}. {a.nome}</span>
                                      <div className="flex items-center gap-2">
                                        {a.mesa_atendimento_id && a.mesa_atendimento_id !== etapa.mesa_atendimento_id && (() => {
                                          const mesaAtiv = mesas.find(m => m.id === a.mesa_atendimento_id);
                                          return mesaAtiv ? <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">{mesaAtiv.nome}</Badge> : null;
                                        })()}
                                        <Badge variant="outline" className="text-xs">{a.tipo_responsabilidade}</Badge>
                                        <span className="text-xs text-muted-foreground">{Math.floor(a.horas_estimadas)}h{String(Math.round((a.horas_estimadas % 1) * 60)).padStart(2, "0")}</span>
                                      </div>
                                    </div>
                                    {a.descricao && <p className="text-xs text-muted-foreground mt-1">{a.descricao}</p>}
                                    {a.checklist.length > 0 && (
                                      <div className="mt-2">
                                        <p className="text-xs font-medium mb-1">Checklist:</p>
                                        <ul className="space-y-1">
                                          {a.checklist.map((item, cIdx) => (
                                            <li key={cIdx} className="flex items-center gap-2 text-xs">
                                              <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{CHECKLIST_TIPO_LABELS[(item as ChecklistItem).tipo || 'check']}</Badge>
                                              <span>{item.texto || "(sem texto)"}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
