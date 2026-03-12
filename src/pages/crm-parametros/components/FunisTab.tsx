import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ChevronRight, Loader2, GripVertical, Pencil } from "lucide-react";
import { useCrmFunis, useCrmEtapas } from "../useCrmParametrosQueries";
import { useCreateFunil, useUpdateFunil, useDeleteFunil, useCreateEtapa, useUpdateEtapa, useDeleteEtapa } from "../useCrmParametrosForm";
import { CORES_ETAPA, COR_PADRAO } from "../constants";
import { nextOrdem, sortByOrdem } from "../helpers";
import type { CrmEtapa } from "../types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function FunisTab() {
  const { data: funis = [], isLoading } = useCrmFunis();
  const { data: todasEtapas = [] } = useCrmEtapas();
  const createFunil = useCreateFunil();
  const updateFunil = useUpdateFunil();
  const deleteFunil = useDeleteFunil();
  const createEtapa = useCreateEtapa();
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();

  const [selectedFunilId, setSelectedFunilId] = useState<string | null>(null);
  const [showCreateFunil, setShowCreateFunil] = useState(false);
  const [novoFunilNome, setNovoFunilNome] = useState("");
  const [novoFunilDesc, setNovoFunilDesc] = useState("");
  const [novoFunilExibeCliente, setNovoFunilExibeCliente] = useState(true);

  // Funil editing
  const [editFunil, setEditFunil] = useState<{ id: string; nome: string; descricao: string; exibe_cliente: boolean } | null>(null);
  const [editFunilNome, setEditFunilNome] = useState("");
  const [editFunilDesc, setEditFunilDesc] = useState("");
  const [editFunilExibeCliente, setEditFunilExibeCliente] = useState(true);

  // Etapa creation
  const [showCreateEtapa, setShowCreateEtapa] = useState(false);
  const [novaEtapaNome, setNovaEtapaNome] = useState("");
  const [novaEtapaCor, setNovaEtapaCor] = useState(COR_PADRAO);

  // Etapa editing
  const [editEtapa, setEditEtapa] = useState<CrmEtapa | null>(null);
  const [editEtapaNome, setEditEtapaNome] = useState("");
  const [editEtapaCor, setEditEtapaCor] = useState(COR_PADRAO);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: "funil" | "etapa"; id: string; nome: string } | null>(null);

  // Drag and drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const selectedFunil = funis.find((f) => f.id === selectedFunilId);
  const etapasFunil = sortByOrdem(todasEtapas.filter((e) => e.funil_id === selectedFunilId));

  async function handleCreateFunil() {
    if (!novoFunilNome.trim()) return;
    await createFunil.mutateAsync({ nome: novoFunilNome.trim(), descricao: novoFunilDesc.trim() || undefined, ordem: nextOrdem(funis), exibe_cliente: novoFunilExibeCliente });
    setNovoFunilNome("");
    setNovoFunilDesc("");
    setNovoFunilExibeCliente(true);
    setShowCreateFunil(false);
  }

  function handleOpenEditFunil(funil: { id: string; nome: string; descricao: string | null; exibe_cliente?: boolean }) {
    setEditFunil({ id: funil.id, nome: funil.nome, descricao: funil.descricao || "", exibe_cliente: funil.exibe_cliente ?? true });
    setEditFunilNome(funil.nome);
    setEditFunilDesc(funil.descricao || "");
    setEditFunilExibeCliente(funil.exibe_cliente ?? true);
  }

  async function handleSaveEditFunil() {
    if (!editFunil || !editFunilNome.trim()) return;
    await updateFunil.mutateAsync({ id: editFunil.id, nome: editFunilNome.trim(), descricao: editFunilDesc.trim() || null, exibe_cliente: editFunilExibeCliente });
    setEditFunil(null);
  }

  async function handleCreateEtapa() {
    if (!novaEtapaNome.trim() || !selectedFunilId) return;
    await createEtapa.mutateAsync({ funil_id: selectedFunilId, nome: novaEtapaNome.trim(), cor: novaEtapaCor, ordem: nextOrdem(etapasFunil) });
    setNovaEtapaNome("");
    setNovaEtapaCor(COR_PADRAO);
    setShowCreateEtapa(false);
  }

  function handleOpenEditEtapa(etapa: CrmEtapa) {
    setEditEtapa(etapa);
    setEditEtapaNome(etapa.nome);
    setEditEtapaCor(etapa.cor);
  }

  async function handleSaveEditEtapa() {
    if (!editEtapa || !editEtapaNome.trim()) return;
    await updateEtapa.mutateAsync({ id: editEtapa.id, nome: editEtapaNome.trim(), cor: editEtapaCor });
    setEditEtapa(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "funil") {
      await deleteFunil.mutateAsync(deleteTarget.id);
      if (selectedFunilId === deleteTarget.id) setSelectedFunilId(null);
    } else {
      await deleteEtapa.mutateAsync(deleteTarget.id);
    }
    setDeleteTarget(null);
  }

  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const reordered = [...etapasFunil];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOverItem.current, 0, removed);

    // Update ordem for each moved etapa
    const updates = reordered.map((etapa, idx) => {
      if (etapa.ordem !== idx) {
        return updateEtapa.mutateAsync({ id: etapa.id, ordem: idx });
      }
      return null;
    }).filter(Boolean);

    dragItem.current = null;
    dragOverItem.current = null;

    await Promise.all(updates);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Funis list */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Funis de Venda</h3>
          <Button size="sm" onClick={() => setShowCreateFunil(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Funil
          </Button>
        </div>
        <div className="space-y-2">
          {sortByOrdem(funis).map((funil) => {
            const count = todasEtapas.filter((e) => e.funil_id === funil.id).length;
            const isSelected = funil.id === selectedFunilId;
            return (
              <div
                key={funil.id}
                onClick={() => setSelectedFunilId(funil.id)}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all gap-2 ${
                  isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="font-medium text-sm truncate">{funil.nome}</span>
                  {funil.descricao && <span className="text-xs text-muted-foreground truncate">{funil.descricao}</span>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="secondary" className="text-[10px] hidden sm:inline-flex">{count} etapas</Badge>
                  <Switch
                    checked={funil.ativo}
                    onCheckedChange={(ativo) => updateFunil.mutate({ id: funil.id, ativo })}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={(e) => { e.stopPropagation(); handleOpenEditFunil(funil); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: "funil", id: funil.id, nome: funil.nome }); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isSelected ? "rotate-90" : ""}`} />
                </div>
              </div>
            );
          })}
          {funis.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum funil cadastrado</p>
          )}
        </div>
      </div>

      {/* Etapas do funil selecionado */}
      <div className="space-y-4">
        {selectedFunil ? (
          <>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Etapas de <span className="text-primary">{selectedFunil.nome}</span>
              </h3>
              <Button size="sm" onClick={() => setShowCreateEtapa(true)}>
                <Plus className="h-4 w-4 mr-1" /> Nova Etapa
              </Button>
            </div>
            <div className="space-y-2">
              {etapasFunil.map((etapa, idx) => (
                <div
                  key={etapa.id}
                  draggable
                  onDragStart={() => { dragItem.current = idx; }}
                  onDragEnter={() => { dragOverItem.current = idx; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnd={handleDragEnd}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border bg-background hover:shadow-sm transition-shadow cursor-grab active:cursor-grabbing overflow-hidden"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: etapa.cor }} />
                  <span className="text-sm font-medium truncate flex-1">{etapa.nome}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Switch
                      checked={etapa.ativo}
                      onCheckedChange={(ativo) => updateEtapa.mutate({ id: etapa.id, ativo })}
                    />
                    {/* Color picker - hidden on mobile, use edit dialog instead */}
                    <div className="hidden md:flex gap-1">
                      {CORES_ETAPA.slice(0, 8).map((cor) => (
                        <button
                          key={cor}
                          onClick={() => updateEtapa.mutate({ id: etapa.id, cor })}
                          className={`w-4 h-4 rounded-full border-2 transition-all ${etapa.cor === cor ? "border-foreground scale-125" : "border-transparent hover:scale-110"}`}
                          style={{ backgroundColor: cor }}
                        />
                      ))}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEditEtapa(etapa)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget({ type: "etapa", id: etapa.id, nome: etapa.nome })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {etapasFunil.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma etapa neste funil</p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Selecione um funil para gerenciar suas etapas
          </div>
        )}
      </div>

      {/* Dialog: Novo Funil */}
      <Dialog open={showCreateFunil} onOpenChange={setShowCreateFunil}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Funil de Venda</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={novoFunilNome} onChange={(e) => setNovoFunilNome(e.target.value)} placeholder="Ex: Funil de Vendas" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input value={novoFunilDesc} onChange={(e) => setNovoFunilDesc(e.target.value)} placeholder="Descrição opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFunil(false)}>Cancelar</Button>
            <Button onClick={handleCreateFunil} disabled={!novoFunilNome.trim() || createFunil.isPending}>
              {createFunil.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Nova Etapa */}
      <Dialog open={showCreateEtapa} onOpenChange={setShowCreateEtapa}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Etapa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={novaEtapaNome} onChange={(e) => setNovaEtapaNome(e.target.value)} placeholder="Ex: Prospecção" />
            </div>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {CORES_ETAPA.map((cor) => (
                  <button
                    key={cor}
                    onClick={() => setNovaEtapaCor(cor)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${novaEtapaCor === cor ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateEtapa(false)}>Cancelar</Button>
            <Button onClick={handleCreateEtapa} disabled={!novaEtapaNome.trim() || createEtapa.isPending}>
              {createEtapa.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar Etapa */}
      <Dialog open={!!editEtapa} onOpenChange={(open) => !open && setEditEtapa(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Etapa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={editEtapaNome} onChange={(e) => setEditEtapaNome(e.target.value)} placeholder="Nome da etapa" />
            </div>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {CORES_ETAPA.map((cor) => (
                  <button
                    key={cor}
                    onClick={() => setEditEtapaCor(cor)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${editEtapaCor === cor ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEtapa(null)}>Cancelar</Button>
            <Button onClick={handleSaveEditEtapa} disabled={!editEtapaNome.trim() || updateEtapa.isPending}>
              {updateEtapa.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja excluir?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover {deleteTarget?.type === "funil" ? "o funil" : "a etapa"} <strong>{deleteTarget?.nome}</strong>?
              {deleteTarget?.type === "funil" && " Todas as etapas vinculadas também serão removidas."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog: Editar Funil */}
      <Dialog open={!!editFunil} onOpenChange={(open) => !open && setEditFunil(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Funil</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome *</label>
              <Input value={editFunilNome} onChange={(e) => setEditFunilNome(e.target.value)} placeholder="Nome do funil" />
            </div>
            <div>
              <label className="text-sm font-medium">Descrição</label>
              <Input value={editFunilDesc} onChange={(e) => setEditFunilDesc(e.target.value)} placeholder="Descrição opcional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditFunil(null)}>Cancelar</Button>
            <Button onClick={handleSaveEditFunil} disabled={!editFunilNome.trim() || updateFunil.isPending}>
              {updateFunil.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
