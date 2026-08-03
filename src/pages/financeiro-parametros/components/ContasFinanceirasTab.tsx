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
import { useContasFinanceirasQuery, useFiliaisOptionsQuery } from "../useFinanceiroParametrosQueries";
import { useFinanceiroParametrosForm } from "../useFinanceiroParametrosForm";
import { NO_FILIAL, TIPOS_CONTA_FINANCEIRA, emptyContaFinanceiraForm } from "../constants";
import { buildContaFinanceiraPayload, fmtCurrency, validateContaFinanceiraForm } from "../helpers";
import type { ContaFinanceira, ContaFinanceiraFormState } from "../types";

export function ContasFinanceirasTab() {
  const { data: contas = [], isLoading } = useContasFinanceirasQuery();
  const { data: filiais = [] } = useFiliaisOptionsQuery();
  const { createMut, updateMut, toggleMut, deleteMut } = useFinanceiroParametrosForm("fin_contas_financeiras", "Conta financeira");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ContaFinanceira | null>(null);
  const [form, setForm] = useState<ContaFinanceiraFormState>(emptyContaFinanceiraForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditing(null);
    setForm(emptyContaFinanceiraForm);
    setShowForm(true);
  }

  function openEdit(c: ContaFinanceira) {
    setEditing(c);
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      banco: c.banco || "",
      agencia: c.agencia || "",
      numero_conta: c.numero_conta || "",
      saldo_inicial: String(c.saldo_inicial ?? 0),
      filial_id: c.filial_id || NO_FILIAL,
      ativo: c.ativo,
    });
    setShowForm(true);
  }

  function handleSave() {
    const err = validateContaFinanceiraForm(form);
    if (err) { toast.error(err); return; }
    const payload = buildContaFinanceiraPayload(form);
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
          <h3 className="font-semibold text-foreground">Contas Financeiras</h3>
          <p className="text-xs text-muted-foreground">Caixas, bancos e cartões usados nas movimentações</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Nova Conta</Button>
      </div>

      {contas.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conta financeira cadastrada.</p>
      ) : (
        <div className="border rounded-lg divide-y">
          {contas.map((c) => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {[c.banco, c.agencia && `Ag. ${c.agencia}`, c.numero_conta && `Cc. ${c.numero_conta}`]
                    .filter(Boolean).join(" • ") || "Sem dados bancários"}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-xs">{c.tipo}</Badge>
              {c.filial_id && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {filiais.find((f) => f.id === c.filial_id)?.nome || "Filial"}
                </Badge>
              )}
              <span className="text-sm font-medium text-foreground shrink-0">{fmtCurrency(Number(c.saldo_inicial || 0))}</span>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Conta Financeira" : "Nova Conta Financeira"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Itaú Principal" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CONTA_FINANCEIRA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input value={form.banco} onChange={(e) => setForm({ ...form, banco: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input value={form.agencia} onChange={(e) => setForm({ ...form, agencia: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <Input value={form.numero_conta} onChange={(e) => setForm({ ...form, numero_conta: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Saldo Inicial</Label>
                <Input type="number" step="0.01" value={form.saldo_inicial} onChange={(e) => setForm({ ...form, saldo_inicial: e.target.value })} />
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
            <AlertDialogTitle>Remover conta financeira?</AlertDialogTitle>
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
