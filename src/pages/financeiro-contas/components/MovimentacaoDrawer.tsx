import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowDown, ArrowLeftRight, ArrowUp, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CATEGORIAS_ENTRADA, CATEGORIAS_SAIDA, NENHUM, TIPOS_MOVIMENTACAO, emptyMovimentacaoForm,
} from "../constants";
import { isAutomatica, movimentacaoToForm } from "../helpers";
import { useMovimentacaoForm } from "../useMovimentacaoForm";
import type { ContaFinanceira } from "../../financeiro-parametros/types";
import type { Movimentacao, MovimentacaoFormState, MovimentacaoTipo } from "../types";

interface PlanoOption { id: string; codigo: string; nome: string; tipo: string }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contas: ContaFinanceira[];
  planos: PlanoOption[];
  movimentacao: Movimentacao | null;
  contaPadrao?: string;
}

export function MovimentacaoDrawer({ open, onOpenChange, contas, planos, movimentacao, contaPadrao }: Props) {
  const [form, setForm] = useState<MovimentacaoFormState>(emptyMovimentacaoForm);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { criarMut, editarMut, excluirMut } = useMovimentacaoForm();

  const automatica = movimentacao ? isAutomatica(movimentacao) : false;

  useEffect(() => {
    if (!open) return;
    if (movimentacao) setForm(movimentacaoToForm(movimentacao));
    else setForm({ ...emptyMovimentacaoForm, conta_financeira_id: contaPadrao || contas[0]?.id || "" });
  }, [open, movimentacao, contaPadrao, contas]);

  const filialDaConta = contas.find((c) => c.id === form.conta_financeira_id)?.filial_id ?? null;
  const planosFiltrados = planos.filter((p) =>
    form.tipo === "entrada" ? p.tipo === "receita" : form.tipo === "saida" ? p.tipo === "despesa" : true,
  );
  const categorias = form.tipo === "entrada" ? CATEGORIAS_ENTRADA : CATEGORIAS_SAIDA;

  function setTipo(tipo: MovimentacaoTipo) {
    setForm((f) => ({ ...f, tipo, plano_conta_id: NENHUM, categoria: "outros" }));
  }

  function handleSave() {
    if (movimentacao) {
      editarMut.mutate(
        { id: movimentacao.id, form, filialId: filialDaConta, somenteTexto: automatica },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      criarMut.mutate({ form, filialId: filialDaConta }, { onSuccess: () => onOpenChange(false) });
    }
  }

  const salvando = criarMut.isPending || editarMut.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{movimentacao ? "Editar Movimentação" : "Nova Movimentação"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {automatica && (
              <Badge variant="secondary" className="text-xs">Lançamento automático</Badge>
            )}

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <div className="grid grid-cols-3 gap-2">
                {TIPOS_MOVIMENTACAO.map((t) => {
                  const ativo = form.tipo === t.value;
                  const Icon = t.value === "entrada" ? ArrowUp : t.value === "saida" ? ArrowDown : ArrowLeftRight;
                  return (
                    <Button
                      key={t.value}
                      type="button"
                      variant={ativo ? "default" : "outline"}
                      size="sm"
                      disabled={automatica}
                      className={cn("rounded-xl", ativo && t.value === "entrada" && "bg-emerald-600 hover:bg-emerald-600/90",
                        ativo && t.value === "saida" && "bg-destructive hover:bg-destructive/90",
                        ativo && t.value === "transferencia" && "bg-blue-600 hover:bg-blue-600/90")}
                      onClick={() => setTipo(t.value)}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1" /> {t.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{form.tipo === "transferencia" ? "Conta de origem *" : "Conta financeira *"}</Label>
              <Select
                value={form.conta_financeira_id}
                onValueChange={(v) => setForm({ ...form, conta_financeira_id: v })}
                disabled={automatica}
              >
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {contas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.tipo === "transferencia" && (
              <div className="space-y-2">
                <Label>Conta de destino *</Label>
                <Select value={form.conta_destino_id} onValueChange={(v) => setForm({ ...form, conta_destino_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contas.filter((c) => c.id !== form.conta_financeira_id)
                      .map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={form.data_movimentacao}
                  disabled={automatica}
                  onChange={(e) => setForm({ ...form, data_movimentacao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.valor}
                  disabled={automatica}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>

            {form.tipo !== "transferencia" && (
              <>
                <div className="space-y-2">
                  <Label>Plano de contas</Label>
                  <Select
                    value={form.plano_conta_id}
                    onValueChange={(v) => setForm({ ...form, plano_conta_id: v })}
                    disabled={automatica}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NENHUM}>Sem classificação</SelectItem>
                      {planosFiltrados.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select
                    value={form.categoria}
                    onValueChange={(v) => setForm({ ...form, categoria: v })}
                    disabled={automatica}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categorias.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                rows={3}
                value={form.observacao}
                onChange={(e) => setForm({ ...form, observacao: e.target.value })}
              />
            </div>
          </div>

          <SheetFooter className="gap-2">
            {movimentacao && !automatica && (
              <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={salvando}>
              {salvando ? "Salvando..." : movimentacao ? "Salvar alterações" : "Salvar"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita e afeta o saldo da conta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                movimentacao &&
                excluirMut.mutate(movimentacao.id, {
                  onSuccess: () => { setConfirmDelete(false); onOpenChange(false); },
                })
              }
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
