import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
import { useJornadaQueries } from "@/pages/jornada-implantacao/useJornadaQueries";
import { useJornadaForm } from "@/pages/jornada-implantacao/useJornadaForm";
import { JornadaFormDialog } from "@/pages/jornada-implantacao/components/JornadaFormDialog";
import { EtapaDialog } from "@/pages/jornada-implantacao/components/EtapaDialog";
import { AtividadeDialog } from "@/pages/jornada-implantacao/components/AtividadeDialog";
import { ImportEtapaDialog } from "@/pages/jornada-implantacao/components/ImportEtapaDialog";
import { ViewJornadaDialog } from "@/pages/jornada-implantacao/components/ViewJornadaDialog";
import { ConfirmCloseDialog, DeleteConfirmDialog } from "@/pages/jornada-implantacao/components/ConfirmDialogs";

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

      <JornadaFormDialog
        open={f.dialogOpen}
        onOpenChange={f.handleDialogOpenChange}
        editing={f.editing}
        form={f.form}
        setForm={f.setForm}
        etapas={f.etapas}
        expandedEtapas={f.expandedEtapas}
        vinculoItems={f.vinculoItems}
        canSave={f.canSave}
        saving={f.saveMutation.isPending}
        onSave={() => f.saveMutation.mutate()}
        onClose={f.closeDialog}
        filiais={q.filiais}
        mesas={q.mesas}
        onOpenImportDialog={f.openImportDialog}
        onOpenNewEtapa={f.openNewEtapa}
        onOpenEditEtapa={f.openEditEtapa}
        onRemoveEtapa={f.removeEtapa}
        onToggleExpanded={f.toggleExpanded}
        onEtapaDragStart={f.handleEtapaDragStart}
        onEtapaDragEnter={f.handleEtapaDragEnter}
        onEtapaDragEnd={f.handleEtapaDragEnd}
        onOpenNewAtividade={f.openNewAtividade}
        onOpenEditAtividade={f.openEditAtividade}
        onRemoveAtividade={f.removeAtividade}
        onAtivDragStart={f.handleAtivDragStart}
        onAtivDragEnter={f.handleAtivDragEnter}
        onAtividadeDragEnd={f.handleAtividadeDragEnd}
      />

      <EtapaDialog
        open={f.etapaDialogOpen}
        onOpenChange={f.setEtapaDialogOpen}
        editingEtapa={f.editingEtapa}
        etapaForm={f.etapaForm}
        setEtapaForm={f.setEtapaForm}
        onSave={f.saveEtapa}
        painelEtapas={q.painelEtapas}
        mesas={q.mesas}
      />

      <AtividadeDialog
        open={f.atividadeDialogOpen}
        onOpenChange={f.setAtividadeDialogOpen}
        editingAtividade={f.editingAtividade}
        atividadeForm={f.atividadeForm}
        setAtividadeForm={f.setAtividadeForm}
        horasText={f.horasText}
        onHorasTextChange={f.handleHorasTextChange}
        onHorasTextBlur={f.handleHorasTextBlur}
        onSave={f.saveAtividade}
        mesas={q.mesas}
        etapas={f.etapas}
        currentEtapaTempId={f.currentEtapaTempId}
        onAddChecklistItem={f.addChecklistItem}
        onUpdateChecklistText={f.updateChecklistText}
        onUpdateChecklistTipo={f.updateChecklistTipo}
        onRemoveChecklistItem={f.removeChecklistItem}
        onMoveChecklistItem={f.moveChecklistItem}
      />

      <ImportEtapaDialog
        open={f.importDialogOpen}
        onOpenChange={f.setImportDialogOpen}
        clonableEtapas={f.clonableEtapas}
        onImport={f.importEtapa}
      />

      <ViewJornadaDialog
        open={f.viewDialogOpen}
        onOpenChange={f.setViewDialogOpen}
        viewJornada={f.viewJornada}
        viewEtapas={f.viewEtapas}
        viewExpandedEtapas={f.viewExpandedEtapas}
        setViewExpandedEtapas={f.setViewExpandedEtapas}
        resolveVinculoLabel={f.resolveVinculoLabel}
        mesas={q.mesas}
      />

      <ConfirmCloseDialog
        open={f.confirmCloseOpen}
        onOpenChange={f.setConfirmCloseOpen}
        onNo={f.handleConfirmNo}
        onYes={f.handleConfirmYes}
      />

      <DeleteConfirmDialog
        open={!!f.deleteConfirmId}
        onOpenChange={(v) => { if (!v) f.setDeleteConfirmId(null); }}
        onConfirm={f.handleDeleteConfirm}
      />
    </AppLayout>
  );
}
