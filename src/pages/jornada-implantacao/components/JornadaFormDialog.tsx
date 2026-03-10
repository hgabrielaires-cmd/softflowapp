import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Eye, GripVertical, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ChecklistItem, Filial, MesaAtendimento } from "@/lib/supabase-types";
import { CHECKLIST_TIPO_LABELS } from "@/lib/supabase-types";
import type { LocalEtapa, LocalAtividade, JornadaFormState } from "../types";

interface JornadaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: any;
  form: JornadaFormState;
  setForm: React.Dispatch<React.SetStateAction<JornadaFormState>>;
  etapas: LocalEtapa[];
  expandedEtapas: Set<string>;
  vinculoItems: { id: string; nome: string }[];
  canSave: boolean;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
  filiais: Filial[];
  mesas: MesaAtendimento[];
  // Etapa actions
  onOpenImportDialog: () => void;
  onOpenNewEtapa: () => void;
  onOpenEditEtapa: (etapa: LocalEtapa) => void;
  onRemoveEtapa: (tempId: string) => void;
  onToggleExpanded: (tempId: string) => void;
  onEtapaDragStart: (idx: number) => void;
  onEtapaDragEnter: (idx: number) => void;
  onEtapaDragEnd: () => void;
  // Atividade actions
  onOpenNewAtividade: (etapaTempId: string) => void;
  onOpenEditAtividade: (etapaTempId: string, atividade: LocalAtividade) => void;
  onRemoveAtividade: (etapaTempId: string, atividadeTempId: string) => void;
  onAtivDragStart: (etapaTempId: string, index: number) => void;
  onAtivDragEnter: (etapaTempId: string, index: number) => void;
  onAtividadeDragEnd: (etapaTempId: string) => void;
}

export function JornadaFormDialog({
  open, onOpenChange, editing, form, setForm, etapas, expandedEtapas,
  vinculoItems, canSave, saving, onSave, onClose, filiais, mesas,
  onOpenImportDialog, onOpenNewEtapa, onOpenEditEtapa, onRemoveEtapa,
  onToggleExpanded, onEtapaDragStart, onEtapaDragEnter, onEtapaDragEnd,
  onOpenNewAtividade, onOpenEditAtividade, onRemoveAtividade,
  onAtivDragStart, onAtivDragEnter, onAtividadeDragEnd,
}: JornadaFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Jornada" : "Nova Jornada de Implantação"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="dados">
          <TabsList className="w-full">
            <TabsTrigger value="dados" className="flex-1">Dados da Jornada</TabsTrigger>
            <TabsTrigger value="etapas" className="flex-1">Etapas e Atividades</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4 mt-4">
            {(() => {
              const totalMin = etapas.reduce((sum, e) => sum + e.atividades.reduce((s, a) => s + a.horas_estimadas * 60, 0), 0);
              if (totalMin <= 0) return null;
              const h = Math.floor(totalMin / 60);
              const m = Math.round(totalMin % 60);
              return (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <Eye className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total de horas estimadas (todas as etapas)</p>
                    <p className="text-xl font-bold text-primary">{h}:{m.toString().padStart(2, "0")}h</p>
                  </div>
                </div>
              );
            })()}

            <div>
              <label className="text-sm font-medium">Filial</label>
              <Select value={form.filial_id || "global"} onValueChange={(v) => setForm((p) => ({ ...p, filial_id: v === "global" ? "" : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todas as filiais)</SelectItem>
                  {filiais.map((fil) => <SelectItem key={fil.id} value={fil.id}>{fil.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Nome da Jornada *</label>
              <Input value={form.nome} onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Implantação e Treinamento Plano Essencial" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Tipo de Vínculo *</label>
                <Select value={form.vinculo_tipo} onValueChange={(v) => setForm((p) => ({ ...p, vinculo_tipo: v, vinculo_id: "", descricao: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plano">Plano</SelectItem>
                    <SelectItem value="modulo">Módulo Adicional</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Vínculo *</label>
                <Select value={form.vinculo_id} onValueChange={(v) => setForm((p) => ({ ...p, vinculo_id: v }))} disabled={!form.vinculo_tipo}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {vinculoItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={form.descricao} onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição preenchida automaticamente do vínculo..." rows={4} />
            </div>
          </TabsContent>

          <TabsContent value="etapas" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">Etapas</h3>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onOpenImportDialog}><Download className="h-4 w-4 mr-1" />Importar Etapa</Button>
                <Button size="sm" onClick={onOpenNewEtapa}><Plus className="h-4 w-4 mr-1" />Adicionar Etapa</Button>
              </div>
            </div>

            {etapas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa cadastrada. Clique em "Adicionar Etapa" para começar.</p>
            ) : (
              <div className="space-y-3">
                {etapas.map((etapa, idx) => {
                  const isExpanded = expandedEtapas.has(etapa.tempId);
                  const mesaNome = mesas.find((m) => m.id === etapa.mesa_atendimento_id)?.nome;
                  const totalHoras = etapa.atividades.reduce((sum, a) => sum + a.horas_estimadas, 0);
                  const totalH = Math.floor(totalHoras);
                  const totalM = Math.round((totalHoras - totalH) * 60);
                  return (
                    <div
                      key={etapa.tempId}
                      className="border rounded-lg"
                      draggable
                      onDragStart={() => onEtapaDragStart(idx)}
                      onDragEnter={() => onEtapaDragEnter(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDragEnd={onEtapaDragEnd}
                    >
                      <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                        <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => onToggleExpanded(etapa.tempId)}>
                          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <span className="font-medium text-sm">{idx + 1}. {etapa.nome}</span>
                          {mesaNome && <Badge variant="secondary" className="text-xs">{mesaNome}</Badge>}
                          <span className="text-xs text-muted-foreground">({etapa.atividades.length} atividades)</span>
                          {etapa.atividades.length > 0 && <Badge variant="outline" className="text-xs font-mono">{totalH}:{totalM.toString().padStart(2, "0")}h</Badge>}
                        </div>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenEditEtapa(etapa)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemoveEtapa(etapa.tempId)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 border-t space-y-2">
                          {etapa.descricao && <p className="text-xs text-muted-foreground mt-2">{etapa.descricao}</p>}
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs font-medium">Atividades</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onOpenNewAtividade(etapa.tempId)}>
                              <Plus className="h-3 w-3 mr-1" />Adicionar Atividade
                            </Button>
                          </div>
                          {etapa.atividades.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma atividade.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {etapa.atividades.map((a, aIdx) => (
                                <div
                                  key={a.tempId}
                                  className="flex items-start justify-between bg-muted/30 rounded-md p-2 cursor-grab active:cursor-grabbing"
                                  draggable
                                  onDragStart={(e) => { e.stopPropagation(); onAtivDragStart(etapa.tempId, aIdx); }}
                                  onDragEnter={(e) => { e.stopPropagation(); onAtivDragEnter(etapa.tempId, aIdx); }}
                                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                  onDragEnd={(e) => { e.stopPropagation(); onAtividadeDragEnd(etapa.tempId); }}
                                >
                                  <div className="flex items-start gap-2">
                                    <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div className="space-y-0.5">
                                      <p className="text-sm font-medium">{a.nome}</p>
                                      <div className="flex gap-2 text-xs text-muted-foreground flex-wrap items-center">
                                        <span>{Math.floor(a.horas_estimadas)}:{(Math.round((a.horas_estimadas - Math.floor(a.horas_estimadas)) * 60)).toString().padStart(2, "0")}h estimadas</span>
                                        <span>•</span>
                                        <span>{a.tipo_responsabilidade}</span>
                                        {a.checklist.length > 0 && <><span>•</span><span>{a.checklist.length} itens checklist</span></>}
                                        {a.mesa_atendimento_id && a.mesa_atendimento_id !== etapa.mesa_atendimento_id && (() => {
                                          const mesaAtiv = mesas.find(m => m.id === a.mesa_atendimento_id);
                                          return mesaAtiv ? <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">{mesaAtiv.nome}</Badge> : null;
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    {a.checklist.length > 0 && (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-6 w-6"><Eye className="h-3 w-3" /></Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 p-3" side="left">
                                          <p className="text-xs font-semibold mb-2">Checklist ({a.checklist.length} itens)</p>
                                          <ul className="space-y-1">
                                            {a.checklist.map((item, cidx) => (
                                              <li key={cidx} className="flex items-start gap-2 text-xs">
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 shrink-0">{CHECKLIST_TIPO_LABELS[(item as ChecklistItem).tipo || 'check']}</Badge>
                                                <span>{item.texto || "(sem texto)"}</span>
                                              </li>
                                            ))}
                                          </ul>
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onOpenEditAtividade(etapa.tempId, a)}><Pencil className="h-3 w-3" /></Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveAtividade(etapa.tempId, a.tempId)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                                  </div>
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
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} disabled={!canSave || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
