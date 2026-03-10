import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, Eye, GripVertical, Download, Calendar, Paperclip, Hash, ToggleLeft, Type, CheckSquare, ArrowUp, ArrowDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ChecklistItem, ChecklistItemTipo } from "@/lib/supabase-types";
import { CHECKLIST_TIPO_LABELS } from "@/lib/supabase-types";
import { useJornadaQueries } from "@/pages/jornada-implantacao/useJornadaQueries";
import { useJornadaForm } from "@/pages/jornada-implantacao/useJornadaForm";

export default function JornadaImplantacao() {
  const q = useJornadaQueries();
  const f = useJornadaForm({ planos: q.planos, modulos: q.modulos, servicos: q.servicos, mesas: q.mesas });

  const filtered = q.jornadas.filter((j) => {
    if (f.search && !j.nome.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.filterVinculo !== "todos" && j.vinculo_tipo !== f.filterVinculo) return false;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Jornadas de Implantação</h1>
          <Button onClick={f.openNew}><Plus className="h-4 w-4 mr-2" />Nova Jornada</Button>
        </div>

        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome..." value={f.search} onChange={(e) => f.setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={f.filterVinculo} onValueChange={f.setFilterVinculo}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vínculos</SelectItem>
              <SelectItem value="plano">Plano</SelectItem>
              <SelectItem value="modulo">Módulo Adicional</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Vínculo</TableHead>
                <TableHead>Filial</TableHead>
                <TableHead className="text-center">Total Horas</TableHead>
                <TableHead className="text-center">Qtd Etapas</TableHead>
                <TableHead className="w-24 text-center">Ativo</TableHead>
                <TableHead className="w-24 text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma jornada encontrada.</TableCell></TableRow>
              ) : (
                filtered.map((j) => {
                  const jAny = j as any;
                  const etapasArr = Array.isArray(jAny.jornada_etapas) ? jAny.jornada_etapas : [];
                  const totalMin = etapasArr.reduce((sum: number, e: any) => {
                    const ativs = Array.isArray(e.jornada_atividades) ? e.jornada_atividades : [];
                    return sum + ativs.reduce((s: number, a: any) => s + (Number(a.horas_estimadas) || 0) * 60, 0);
                  }, 0);
                  const h = Math.floor(totalMin / 60);
                  const m = Math.round(totalMin % 60);
                  return (
                    <TableRow key={j.id}>
                      <TableCell className="font-medium">{j.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{j.vinculo_tipo}</Badge>
                        <span className="ml-2 text-sm text-muted-foreground">{f.resolveVinculoLabel(j.vinculo_tipo, j.vinculo_id)}</span>
                      </TableCell>
                      <TableCell>{j.filial?.nome || <span className="text-muted-foreground">Global</span>}</TableCell>
                      <TableCell className="text-center font-medium">{h}:{m.toString().padStart(2, "0")}h</TableCell>
                      <TableCell className="text-center">{etapasArr.length}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={j.ativo} onCheckedChange={(v) => f.toggleMutation.mutate({ id: j.id, ativo: v })} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button variant="ghost" size="icon" title="Visualizar" onClick={() => f.openView(j)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => f.openEdit(j)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" title="Excluir" onClick={() => f.setDeleteConfirmId(j.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ─── Main Dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={f.dialogOpen} onOpenChange={f.handleDialogOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{f.editing ? "Editar Jornada" : "Nova Jornada de Implantação"}</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="dados">
            <TabsList className="w-full">
              <TabsTrigger value="dados" className="flex-1">Dados da Jornada</TabsTrigger>
              <TabsTrigger value="etapas" className="flex-1">Etapas e Atividades</TabsTrigger>
            </TabsList>

            <TabsContent value="dados" className="space-y-4 mt-4">
              {(() => {
                const totalMin = f.etapas.reduce((sum, e) => sum + e.atividades.reduce((s, a) => s + a.horas_estimadas * 60, 0), 0);
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
                <Select value={f.form.filial_id || "global"} onValueChange={(v) => f.setForm((p) => ({ ...p, filial_id: v === "global" ? "" : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (todas as filiais)</SelectItem>
                    {q.filiais.map((fil) => <SelectItem key={fil.id} value={fil.id}>{fil.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Nome da Jornada *</label>
                <Input value={f.form.nome} onChange={(e) => f.setForm((p) => ({ ...p, nome: e.target.value }))} placeholder="Ex: Implantação e Treinamento Plano Essencial" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo de Vínculo *</label>
                  <Select value={f.form.vinculo_tipo} onValueChange={(v) => f.setForm((p) => ({ ...p, vinculo_tipo: v, vinculo_id: "", descricao: "" }))}>
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
                  <Select value={f.form.vinculo_id} onValueChange={(v) => f.setForm((p) => ({ ...p, vinculo_id: v }))} disabled={!f.form.vinculo_tipo}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {f.vinculoItems.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea value={f.form.descricao} onChange={(e) => f.setForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Descrição preenchida automaticamente do vínculo..." rows={4} />
              </div>
            </TabsContent>

            <TabsContent value="etapas" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold">Etapas</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={f.openImportDialog}><Download className="h-4 w-4 mr-1" />Importar Etapa</Button>
                  <Button size="sm" onClick={f.openNewEtapa}><Plus className="h-4 w-4 mr-1" />Adicionar Etapa</Button>
                </div>
              </div>

              {f.etapas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa cadastrada. Clique em "Adicionar Etapa" para começar.</p>
              ) : (
                <div className="space-y-3">
                  {f.etapas.map((etapa, idx) => {
                    const isExpanded = f.expandedEtapas.has(etapa.tempId);
                    const mesaNome = q.mesas.find((m) => m.id === etapa.mesa_atendimento_id)?.nome;
                    const totalHoras = etapa.atividades.reduce((sum, a) => sum + a.horas_estimadas, 0);
                    const totalH = Math.floor(totalHoras);
                    const totalM = Math.round((totalHoras - totalH) * 60);
                    return (
                      <div
                        key={etapa.tempId}
                        className="border rounded-lg"
                        draggable
                        onDragStart={() => f.handleEtapaDragStart(idx)}
                        onDragEnter={() => f.handleEtapaDragEnter(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDragEnd={f.handleEtapaDragEnd}
                      >
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50">
                          <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => f.toggleExpanded(etapa.tempId)}>
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab flex-shrink-0" />
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <span className="font-medium text-sm">{idx + 1}. {etapa.nome}</span>
                            {mesaNome && <Badge variant="secondary" className="text-xs">{mesaNome}</Badge>}
                            <span className="text-xs text-muted-foreground">({etapa.atividades.length} atividades)</span>
                            {etapa.atividades.length > 0 && <Badge variant="outline" className="text-xs font-mono">{totalH}:{totalM.toString().padStart(2, "0")}h</Badge>}
                          </div>
                          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => f.openEditEtapa(etapa)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => f.removeEtapa(etapa.tempId)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-3 pb-3 border-t space-y-2">
                            {etapa.descricao && <p className="text-xs text-muted-foreground mt-2">{etapa.descricao}</p>}
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-xs font-medium">Atividades</span>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => f.openNewAtividade(etapa.tempId)}>
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
                                    onDragStart={(e) => { e.stopPropagation(); f.handleAtivDragStart(etapa.tempId, aIdx); }}
                                    onDragEnter={(e) => { e.stopPropagation(); f.handleAtivDragEnter(etapa.tempId, aIdx); }}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDragEnd={(e) => { e.stopPropagation(); f.handleAtividadeDragEnd(etapa.tempId); }}
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
                                           const mesaAtiv = q.mesas.find(m => m.id === a.mesa_atendimento_id);
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
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => f.openEditAtividade(etapa.tempId, a)}><Pencil className="h-3 w-3" /></Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => f.removeAtividade(etapa.tempId, a.tempId)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
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
            <Button variant="outline" onClick={f.closeDialog}>Cancelar</Button>
            <Button onClick={() => f.saveMutation.mutate()} disabled={!f.canSave || f.saveMutation.isPending}>
              {f.saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Etapa Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={f.etapaDialogOpen} onOpenChange={f.setEtapaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{f.editingEtapa ? "Editar Etapa" : "Adicionar Etapa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Etapa *</label>
              <Select value={f.etapaForm.nome || "placeholder"} onValueChange={(v) => f.setEtapaForm((p) => ({ ...p, nome: v === "placeholder" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a etapa..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="placeholder" disabled>Selecione a etapa...</SelectItem>
                  {q.painelEtapas.map((e) => <SelectItem key={e.id} value={e.nome}>{e.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={f.etapaForm.descricao} onChange={(e) => f.setEtapaForm((p) => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Nessa etapa certifique-se que está tudo dentro do padrão." />
            </div>
            <div>
              <label className="text-sm font-medium">Mesa de Atendimento</label>
              <Select value={f.etapaForm.mesa_atendimento_id || "none"} onValueChange={(v) => f.setEtapaForm((p) => ({ ...p, mesa_atendimento_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {q.mesas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Permite Clonar</label>
              <Switch checked={f.etapaForm.permite_clonar} onCheckedChange={(v) => f.setEtapaForm((p) => ({ ...p, permite_clonar: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => f.setEtapaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={f.saveEtapa} disabled={!f.etapaForm.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Atividade Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={f.atividadeDialogOpen} onOpenChange={f.setAtividadeDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{f.editingAtividade ? "Editar Atividade" : "Adicionar Atividade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome da Atividade *</label>
              <Input value={f.atividadeForm.nome} onChange={(e) => f.setAtividadeForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Horas Estimadas (hh:mm)</label>
              <Input
                placeholder="0:00"
                className="mt-1 w-32 font-mono text-base"
                value={f.horasText}
                onChange={(e) => f.handleHorasTextChange(e.target.value)}
                onBlur={f.handleHorasTextBlur}
              />
              <p className="text-xs text-muted-foreground mt-1">Ex: 0:15 = 15min, 1:30 = 1h30min</p>
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={f.atividadeForm.descricao} onChange={(e) => f.setAtividadeForm((p) => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Responsabilidade</label>
              <Select value={f.atividadeForm.tipo_responsabilidade} onValueChange={(v) => f.setAtividadeForm((p) => ({ ...p, tipo_responsabilidade: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Interna">Interna</SelectItem>
                  <SelectItem value="Externa">Externa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Mesa de Atendimento</label>
              <Select value={f.atividadeForm.mesa_atendimento_id || "none"} onValueChange={(v) => f.setAtividadeForm((p) => ({ ...p, mesa_atendimento_id: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="Herdar da etapa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Herdar da etapa</SelectItem>
                  {q.mesas.map((m) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {!f.atividadeForm.mesa_atendimento_id && (() => {
                const etapa = f.etapas.find(e => e.tempId === f.currentEtapaTempId);
                const mesaNome = etapa?.mesa_atendimento_id ? q.mesas.find(m => m.id === etapa.mesa_atendimento_id)?.nome : null;
                return mesaNome ? <p className="text-xs text-muted-foreground mt-1">Herdará: {mesaNome}</p> : null;
              })()}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Checklist</label>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={f.addChecklistItem}><Plus className="h-3 w-3 mr-1" />Adicionar Item</Button>
              </div>
              {f.atividadeForm.checklist.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhum item no checklist.</p>
              ) : (
                <div className="space-y-2">
                  {f.atividadeForm.checklist.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex flex-col gap-0.5">
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => f.moveChecklistItem(idx, "up")} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => f.moveChecklistItem(idx, "down")} disabled={idx === f.atividadeForm.checklist.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                      </div>
                      <Select value={item.tipo || "check"} onValueChange={(v) => f.updateChecklistTipo(idx, v as ChecklistItemTipo)}>
                        <SelectTrigger className="w-[140px] h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CHECKLIST_TIPO_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input value={item.texto} onChange={(e) => f.updateChecklistText(idx, e.target.value)} placeholder="Descrição do item..." className="flex-1 h-8 text-sm" />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => f.removeChecklistItem(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => f.setAtividadeDialogOpen(false)}>Cancelar</Button>
            <Button onClick={f.saveAtividade} disabled={!f.atividadeForm.nome.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Import Etapa Dialog ──────────────────────────────────────────────── */}
      <Dialog open={f.importDialogOpen} onOpenChange={f.setImportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Etapa</DialogTitle>
          </DialogHeader>
          {f.clonableEtapas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa com permissão de clonagem encontrada.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Selecione a etapa que deseja importar:</p>
              {f.clonableEtapas.map((etapa) => (
                <div key={etapa.id} className="border rounded-lg p-3 hover:bg-muted/50 cursor-pointer" onClick={() => f.importEtapa(etapa)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{etapa.nome}</p>
                      {etapa.descricao && <p className="text-xs text-muted-foreground mt-0.5">{etapa.descricao}</p>}
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{etapa.jornada_atividades?.length || 0} atividades</Badge>
                        {etapa.jornadas && <Badge variant="secondary" className="text-xs">Jornada: {etapa.jornadas.nome}</Badge>}
                      </div>
                    </div>
                    <Download className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => f.setImportDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── View Dialog (read-only) ─────────────────────────────────────────── */}
      <Dialog open={f.viewDialogOpen} onOpenChange={f.setViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" /> Visualizar Jornada
            </DialogTitle>
          </DialogHeader>
          {f.viewJornada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Nome</label>
                  <p className="text-sm font-medium">{f.viewJornada.nome}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Filial</label>
                  <p className="text-sm">{f.viewJornada.filial?.nome || "Global"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Vínculo</label>
                  <p className="text-sm capitalize">{f.viewJornada.vinculo_tipo} — {f.resolveVinculoLabel(f.viewJornada.vinculo_tipo, f.viewJornada.vinculo_id)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <Badge variant={f.viewJornada.ativo ? "default" : "secondary"}>{f.viewJornada.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
              </div>
              {f.viewJornada.descricao && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Descrição</label>
                  <p className="text-sm">{f.viewJornada.descricao}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-3">Etapas ({f.viewEtapas.length})</h4>
                {f.viewEtapas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma etapa cadastrada.</p>
                ) : (
                  <div className="space-y-2">
                    {f.viewEtapas.map((etapa, idx) => {
                      const isExpanded = f.viewExpandedEtapas.has(etapa.tempId);
                      return (
                        <div key={etapa.tempId} className="border rounded-lg">
                          <div
                            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                            onClick={() => {
                              f.setViewExpandedEtapas(prev => {
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
                                            const mesaAtiv = q.mesas.find(m => m.id === a.mesa_atendimento_id);
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
            <Button variant="outline" onClick={() => f.setViewDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Close Dialog ─────────────────────────────────────────────── */}
      <AlertDialog open={f.confirmCloseOpen} onOpenChange={f.setConfirmCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja salvar as alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Você possui alterações não salvas. Deseja salvar antes de sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={f.handleConfirmNo}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={f.handleConfirmYes}>Sim, salvar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão de jornada */}
      <AlertDialog open={!!f.deleteConfirmId} onOpenChange={(v) => { if (!v) f.setDeleteConfirmId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Jornada de Implantação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja excluir esta jornada de implantação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={f.handleDeleteConfirm}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
