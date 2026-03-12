import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Loader2, X } from "lucide-react";
import { useCrmCamposPersonalizados } from "../useCrmParametrosQueries";
import { useCreateCampo, useUpdateCampo, useDeleteCampo } from "../useCrmParametrosForm";
import { nextOrdem } from "../helpers";
import type { CrmCampoPersonalizado } from "../types";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { TIPOS_CAMPO } from "../constants";

export function CamposPersonalizadosTab() {
  const { data: campos = [], isLoading } = useCrmCamposPersonalizados();
  const createCampo = useCreateCampo();
  const updateCampo = useUpdateCampo();
  const deleteCampo = useDeleteCampo();

  const [showCreate, setShowCreate] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoTipo, setNovoTipo] = useState("select");
  const [novaOpcao, setNovaOpcao] = useState("");
  const [opcoes, setOpcoes] = useState<string[]>([]);
  const [obrigatorio, setObrigatorio] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

  // Edit inline
  const [editId, setEditId] = useState<string | null>(null);
  const [editOpcao, setEditOpcao] = useState("");

  function addOpcao() {
    const val = novaOpcao.trim();
    if (!val || opcoes.includes(val)) return;
    setOpcoes([...opcoes, val]);
    setNovaOpcao("");
  }

  function removeOpcao(idx: number) {
    setOpcoes(opcoes.filter((_, i) => i !== idx));
  }

  async function handleCreate() {
    if (!novoNome.trim()) return;
    await createCampo.mutateAsync({
      nome: novoNome.trim(),
      tipo: novoTipo,
      opcoes,
      obrigatorio,
      ordem: nextOrdem(campos),
    });
    resetForm();
  }

  function resetForm() {
    setNovoNome("");
    setNovoTipo("select");
    setOpcoes([]);
    setNovaOpcao("");
    setObrigatorio(false);
    setShowCreate(false);
  }

  async function addOpcaoToExisting(campoId: string, campo: CrmCampoPersonalizado) {
    const val = editOpcao.trim();
    if (!val || campo.opcoes.includes(val)) return;
    await updateCampo.mutateAsync({ id: campoId, opcoes: [...campo.opcoes, val] });
    setEditOpcao("");
  }

  async function removeOpcaoFromExisting(campoId: string, campo: CrmCampoPersonalizado, idx: number) {
    await updateCampo.mutateAsync({ id: campoId, opcoes: campo.opcoes.filter((_, i) => i !== idx) });
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Campos Personalizados</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Campo
        </Button>
      </div>

      <div className="space-y-3">
        {campos.map((campo) => (
          <div key={campo.id} className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{campo.nome}</span>
                {campo.obrigatorio && <Badge variant="destructive" className="text-[10px]">Obrigatório</Badge>}
                <Badge variant="secondary" className="text-[10px]">
                  {TIPOS_CAMPO.find((t) => t.value === campo.tipo)?.label || campo.tipo}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={campo.ativo}
                  onCheckedChange={(ativo) => updateCampo.mutate({ id: campo.id, ativo })}
                />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget({ id: campo.id, nome: campo.nome })}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {campo.tipo === "select" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {campo.opcoes.map((opcao, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1 text-xs">
                      {opcao}
                      <button onClick={() => removeOpcaoFromExisting(campo.id, campo, idx)}
                        className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nova opção..."
                    className="h-8 text-sm"
                    value={editId === campo.id ? editOpcao : ""}
                    onFocus={() => setEditId(campo.id)}
                    onChange={(e) => { setEditId(campo.id); setEditOpcao(e.target.value); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOpcaoToExisting(campo.id, campo); } }}
                  />
                  <Button size="sm" variant="outline" className="h-8"
                    onClick={() => addOpcaoToExisting(campo.id, campo)}
                    disabled={!editOpcao.trim() || editId !== campo.id}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        {campos.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum campo personalizado cadastrado</p>
        )}
      </div>

      {/* Dialog: Novo Campo */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) resetForm(); else setShowCreate(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Novo Campo Personalizado</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nome do campo *</label>
              <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: Tipo de Atendimento" />
            </div>
            <div>
              <label className="text-sm font-medium">Tipo</label>
              <Select value={novoTipo} onValueChange={setNovoTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_CAMPO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {novoTipo === "select" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Opções de resposta</label>
                <div className="flex flex-wrap gap-1.5">
                  {opcoes.map((op, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1 text-xs">
                      {op}
                      <button onClick={() => removeOpcao(idx)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Digitar opção e pressionar Enter..."
                    value={novaOpcao}
                    onChange={(e) => setNovaOpcao(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOpcao(); } }}
                  />
                  <Button variant="outline" onClick={addOpcao} disabled={!novaOpcao.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox checked={obrigatorio} onCheckedChange={(v) => setObrigatorio(!!v)} id="obrigatorio" />
              <label htmlFor="obrigatorio" className="text-sm">Campo obrigatório</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!novoNome.trim() || createCampo.isPending}>
              {createCampo.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: Confirmar exclusão */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja remover o campo <strong>{deleteTarget?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteTarget) { deleteCampo.mutate(deleteTarget.id); setDeleteTarget(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
