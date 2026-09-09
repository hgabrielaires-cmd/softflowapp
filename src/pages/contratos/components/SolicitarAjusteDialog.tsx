import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { Contrato } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contrato: Contrato | null;
  saving: boolean;
  onConfirm: (motivo: string) => void;
}

export function SolicitarAjusteDialog({ open, onOpenChange, contrato, saving, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");

  function handleOpenChange(v: boolean) {
    if (!v) setMotivo("");
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            Solicitar Ajuste de Contrato
          </DialogTitle>
          <DialogDescription>
            O contrato será pausado e devolvido ao vendedor para edição. O link de
            assinatura atual continua válido até um novo contrato ser gerado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm space-y-1">
            <div><span className="text-muted-foreground">Contrato:</span> <strong>{contrato?.numero_exibicao || "—"}</strong></div>
            <div><span className="text-muted-foreground">Cliente:</span> <strong>{contrato?.clientes?.nome_fantasia || "—"}</strong></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="motivo-ajuste">Motivo do ajuste</Label>
            <Textarea
              id="motivo-ajuste"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder='Ex: "Cliente solicitou retirar o módulo XTAG"'
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(motivo)} disabled={saving || !motivo.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar Ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
