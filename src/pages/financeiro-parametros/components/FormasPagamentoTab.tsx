import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { useFormasPagamentoQuery } from "../useFinanceiroParametrosQueries";
import { useFinanceiroParametrosForm } from "../useFinanceiroParametrosForm";
import { TIPOS_FORMA_PAGAMENTO, emptyFormaPagamentoForm } from "../constants";
import { buildFormaPagamentoPayload, validateFormaPagamentoForm } from "../helpers";
import type { FormaPagamento, FormaPagamentoFormState } from "../types";

export function FormasPagamentoTab() {
  const { data: formas = [], isLoading } = useFormasPagamentoQuery();
  const { createMut, updateMut, toggleMut, deleteMut } = useFinanceiroParametrosForm("fin_formas_pagamento", "Forma de pagamento");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FormaPagamento | null>(null);
  const [form, setForm] = useState<FormaPagamentoFormState>(emptyFormaPagamentoForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setForm(emptyFormaPagamentoForm);
    setShowForm(true);
  }

  function openEdit(f: FormaPagamento) {
    setEditing(f);
    setForm({ nome: f.nome, tipo: f.tipo, exige_conta: f.exige_conta, ativo: f.ativo });
    setShowForm(true);
  }

  function handleSave() {
    const err = validateFormaPagamentoForm(form);
    if (err) { toast.error(err); return; }
    const payload = buildFormaPagamentoPayload(form);
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
          <h3 className="font-semibold text-foreground">Formas de Pagamento</h3>
          <p className="text-xs text-muted-foreground">Meios usados nos lançamentos financeiros</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Forma</Button>
      </div>

      {formas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma forma de pagamento cadastrada.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {formas.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-sm font-medium text-foreground truncate">{f.nome}</span>
              <Badge variant="outline" className="shrink-0 text-xs">{f.tipo}</Badge>
              {f.exige_conta && <Badge variant="secondary" className="shrink-0 text-xs">Exige conta</Badge>}
              <Switch checked={f.ativo} onCheckedChange={(v) => toggleMut.mutate({ id: f.id, ativo: v })} />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(f.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Pix Itaú" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_FORMA_PAGAMENTO.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Exige conta financeira</Label>
              <Switch checked={form.exige_conta} onCheckedChange={(v) => setForm({ ...form, exige_conta: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="font-normal">Ativa</Label>
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
            <AlertDialogTitle>Remover forma de pagamento?</AlertDialogTitle>
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
