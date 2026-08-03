import { useMemo, useState } from "react";
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
import { Plus, Pencil, Trash2, Loader2, ChevronRight, ChevronDown, CornerDownRight } from "lucide-react";
import { toast } from "sonner";
import { usePlanoContasQuery } from "../useFinanceiroParametrosQueries";
import { useFinanceiroParametrosForm } from "../useFinanceiroParametrosForm";
import { NO_PARENT, TIPOS_PLANO_CONTA, emptyPlanoContaForm } from "../constants";
import {
  buildPlanoContasTree, buildPlanoContaPayload, collectDescendantIds,
  planoContaToForm, validatePlanoContaForm,
} from "../helpers";
import type { PlanoConta, PlanoContaFormState, PlanoContaNode } from "../types";

export function PlanoContasTab() {
  const { data: contas = [], isLoading } = usePlanoContasQuery();
  const { createMut, updateMut, toggleMut, deleteMut } = useFinanceiroParametrosForm("fin_plano_contas", "Conta");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlanoConta | null>(null);
  const [form, setForm] = useState<PlanoContaFormState>(emptyPlanoContaForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const tree = useMemo(() => buildPlanoContasTree(contas), [contas]);

  const parentOptions = useMemo(() => {
    const blocked = editing ? collectDescendantIds(contas, editing.id) : new Set<string>();
    return contas.filter((c) => !blocked.has(c.id));
  }, [contas, editing]);

  function openNew(parentId?: string) {
    setEditing(null);
    setForm({ ...emptyPlanoContaForm, parent_id: parentId || NO_PARENT });
    setShowForm(true);
  }

  function openEdit(conta: PlanoConta) {
    setEditing(conta);
    setForm(planoContaToForm(conta));
    setShowForm(true);
  }

  function handleSave() {
    const err = validatePlanoContaForm(form);
    if (err) { toast.error(err); return; }
    const payload = buildPlanoContaPayload(form, contas);
    if (editing) {
      updateMut.mutate({ id: editing.id, payload }, { onSuccess: () => setShowForm(false) });
    } else {
      createMut.mutate(payload, { onSuccess: () => setShowForm(false) });
    }
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function renderNode(node: PlanoContaNode, depth: number) {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsed.has(node.id);
    return (
      <div key={node.id}>
        <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors">
          <div style={{ width: depth * 20 }} />
          {hasChildren ? (
            <button onClick={() => toggleCollapse(node.id)} className="text-muted-foreground shrink-0">
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          <span className="text-xs font-mono text-muted-foreground w-20 shrink-0">{node.codigo}</span>
          <span className="flex-1 text-sm font-medium text-foreground truncate">{node.nome}</span>
          <Badge variant="outline" className="shrink-0 text-xs">
            {node.tipo === "receita" ? "Receita" : "Despesa"}
          </Badge>
          <Badge variant="secondary" className="shrink-0 text-xs">Nível {node.nivel}</Badge>
          {!node.aceita_lancamento && (
            <Badge variant="outline" className="shrink-0 text-xs">Sintética</Badge>
          )}
          <Switch
            checked={node.ativo}
            onCheckedChange={(v) => toggleMut.mutate({ id: node.id, ativo: v })}
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Novo subnível" onClick={() => openNew(node.id)}>
            <CornerDownRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(node)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(node.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {hasChildren && !isCollapsed && (
          <div className="border-t">{node.children.map((c) => renderNode(c, depth + 1))}</div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const parentSelected = form.parent_id !== NO_PARENT ? contas.find((c) => c.id === form.parent_id) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Plano de Contas</h3>
          <p className="text-xs text-muted-foreground">Estrutura hierárquica de níveis e subníveis</p>
        </div>
        <Button size="sm" onClick={() => openNew()}>
          <Plus className="h-4 w-4 mr-1" /> Nova Conta
        </Button>
      </div>

      {tree.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conta cadastrada.</p>
      ) : (
        <div className="border rounded-lg divide-y">{tree.map((n) => renderNode(n, 0))}</div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Conta" : "Nova Conta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Conta Pai</Label>
              <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>Nenhuma (nível 1)</SelectItem>
                  {parentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="1.1.01" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={parentSelected ? parentSelected.tipo : form.tipo}
                  onValueChange={(v) => setForm({ ...form, tipo: v as PlanoContaFormState["tipo"] })}
                  disabled={!!parentSelected}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_PLANO_CONTA.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Despesas Administrativas" />
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-normal">Aceita lançamento (analítica)</Label>
              <Switch checked={form.aceita_lancamento} onCheckedChange={(v) => setForm({ ...form, aceita_lancamento: v })} />
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
            <AlertDialogTitle>Remover conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Contas com subníveis não podem ser removidas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
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
