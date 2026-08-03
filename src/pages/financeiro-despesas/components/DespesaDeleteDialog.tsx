import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDespesaMutations } from "../useDespesaMutations";
import type { DespesaRegistro, EscopoParcelas } from "../types";

interface Props {
  despesa: DespesaRegistro | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DespesaDeleteDialog({ despesa, open, onOpenChange }: Props) {
  const [escopo, setEscopo] = useState<EscopoParcelas>("parcela");
  const { excluirDespesaMut } = useDespesaMutations();

  useEffect(() => {
    if (open) setEscopo("parcela");
  }, [open]);

  if (!despesa) return null;

  const recorrente = despesa.parcela_total > 1;

  const confirmar = async () => {
    await excluirDespesaMut.mutateAsync({ despesa, escopo });
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir lançamento</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O registro ficará no histórico de auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {recorrente && (
          <div className="rounded-md border border-border p-3 space-y-2">
            <Label className="text-xs">Excluir</Label>
            <RadioGroup value={escopo} onValueChange={(v) => setEscopo(v as EscopoParcelas)}>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="parcela" id="del-parcela" />
                <Label htmlFor="del-parcela" className="font-normal">
                  Somente esta parcela ({despesa.parcela_numero}/{despesa.parcela_total})
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="futuras" id="del-futuras" />
                <Label htmlFor="del-futuras" className="font-normal">Esta e as parcelas futuras</Label>
              </div>
            </RadioGroup>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); confirmar(); }}
            disabled={excluirDespesaMut.isPending}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
