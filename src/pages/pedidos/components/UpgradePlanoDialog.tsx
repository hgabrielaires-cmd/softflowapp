import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle } from "lucide-react";
import type { Contrato } from "@/lib/supabase-types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contratoAtivo: Contrato | null;
  planoVigenteId: string | null;
  planos: any[];
  upgradePlanoId: string;
  setUpgradePlanoId: (v: string) => void;
  onConfirm: () => void;
}

export function UpgradePlanoDialog({
  open,
  onOpenChange,
  contratoAtivo,
  planoVigenteId,
  planos,
  upgradePlanoId,
  setUpgradePlanoId,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-primary" /> Upgrade de Plano
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {contratoAtivo && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
              <p className="text-muted-foreground text-xs">Contrato atual</p>
              <p className="font-medium">Nº {contratoAtivo.numero_registro} ({contratoAtivo.numero_exibicao})</p>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Novo plano *</Label>
            <Select value={upgradePlanoId} onValueChange={setUpgradePlanoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o novo plano..." /></SelectTrigger>
              <SelectContent>
                {(() => {
                  const planoAtualId = planoVigenteId || contratoAtivo?.plano_id;
                  const planoAtual = planos.find((p) => p.id === planoAtualId);
                  const ordemAtual = planoAtual?.ordem ?? 0;
                  const planosUpgrade = planos.filter((p) => p.id !== planoAtualId && p.ordem > ordemAtual);
                  return planosUpgrade.length === 0
                    ? <SelectItem value="__none__" disabled>Nenhum plano disponível para upgrade</SelectItem>
                    : planosUpgrade.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>);
                })()}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Apenas planos com ordem superior ao atual são exibidos.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={onConfirm} disabled={!upgradePlanoId}>
            <ArrowUpCircle className="h-4 w-4 mr-1.5" /> Confirmar Upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
