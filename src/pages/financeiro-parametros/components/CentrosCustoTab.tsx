import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCentrosCustoQuery, useFiliaisOptionsQuery } from "../useFinanceiroParametrosQueries";
import { useFinanceiroParametrosForm } from "../useFinanceiroParametrosForm";
import { NO_FILIAL, emptyCentroCustoForm } from "../constants";
import { buildCentroCustoPayload, validateCentroCustoForm } from "../helpers";
import type { CentroCusto, CentroCustoFormState } from "../types";

export function CentrosCustoTab() {
  const { data: centros = [], isLoading } = useCentrosCustoQuery();
  const { data: filiais = [] } = useFiliaisOptionsQuery();
  const { createMut, updateMut, toggleMut, deleteMut } = useFinanceiroParametrosForm("fin_centros_custo", "Centro de custo");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CentroCusto | null>(null);
  const [form, setForm] = useState<CentroCustoFormState>(emptyCentroCustoForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setForm(emptyCentroCustoForm);
    setShowForm(true);
  }

  function openEdit(c: CentroCusto) {
    setEditing(c);
    setForm({
      codigo: c.codigo || "",
      nome: c.nome,
      descricao: c.descricao || "",
      filial_id: c.filial_id || NO_FILIAL,
      ativo: c.ativo,
    });
    setShowForm(true);
  }

  function handleSave() {
    const err = validateCentroCustoForm(form);
    if (err) { toast.error(err); return; }
    const payload = buildCentroCustoPayload(form);
    if (editing) {
      updateMut.mutate({ id: editing.id, payload }, { onSuccess: () => setShowForm(false) });
    } else {
      createMut.mutate(payload, { onSuccess: () => setShowForm(false) });
    }
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Centros de Custo</h3>
          <p className="text-xs text-muted-foreground">Agrupamento de despesas por área ou filial</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Novo Centro de Custo</Button>
      </div>

      {centros.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhum centro de custo cadastrado.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {centros.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              {c.codigo && <span className="text-xs font-mono text-muted-foreground w-16 shrink-0">{c.codigo}</span>}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                {c.descricao && <p className="text-xs text-muted-foreground truncate">{c.descricao}</p>}
              </div>
              {c.filial_id && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  {filiais.find((f) => f.id === c.filial_id)?.nome || "Filial"}
                </Badge>
              )}
              <Switch checked={c.ativo} onCheckedChange={(v) => toggleMut.mutate({ id: c.id, ativo: v })} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Centro de Custo" : "Novo Centro de Custo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="CC01" />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Comercial" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Filial</Label>
              <Select value={form.filial_id} onValueChange={(v) => setForm({ ...form, filial_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_FILIAL}>Todas as filiais</SelectItem>
                  {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-normal">Ativo</Label>
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover centro de custo?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && deleteMut.mutate(deleteId, { onSuccess: () => setDeleteId(null) })}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
